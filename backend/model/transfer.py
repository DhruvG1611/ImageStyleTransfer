"""
transfer.py — fixed preprocessing to match the pytorch-AdaIN encoder.

KEY CHANGE from the buggy version
----------------------------------
The original code applied ImageNet normalisation (mean/std) in preprocess_*
and then reversed it with denormalize() in stylize().

With the corrected encoder (vgg_normalised.pth), the learned 1×1 conv at
layer 0 of the VGG performs its own normalisation internally.  The encoder
expects raw [0, 1] pixel tensors, NOT ImageNet-normalised tensors.

Applying ImageNet normalisation before the encoder shifts the feature
distribution away from what the decoder was trained on, contributing
(alongside the wrong architecture) to noisy output.

Changes made:
  - preprocess_content / preprocess_style: removed Normalize transform
  - stylize: removed denormalize() call (no longer needed)
  - adain clamp on style_std removed (was a workaround, not a fix)
  - alpha restored to 1.0 (full style — tune down if content structure
    is too lost, but start here to verify the fix works)
"""

from PIL import Image, ImageOps
import torch
import torchvision.transforms as transforms
from .network import get_encoder, get_decoder
from .adain import adain

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

encoder = get_encoder().to(device)
decoder = get_decoder().to(device)


def preprocess_content(img: Image.Image, output_size: int) -> torch.Tensor:
    """Centre-crop and resize content image.  No ImageNet normalisation."""
    img = img.convert("RGB")
    img = ImageOps.fit(img, (output_size, output_size), method=Image.Resampling.LANCZOS)
    tf = transforms.Compose([
        transforms.ToTensor(),  # → [0, 1] float tensor
        # NO Normalize — the encoder's layer-0 conv handles normalisation
    ])
    return tf(img).unsqueeze(0).to(device)


def preprocess_style(img: Image.Image, output_size: int) -> torch.Tensor:
    """Resize style image.  No ImageNet normalisation."""
    img = img.convert("RGB")
    img = img.resize((output_size, output_size), Image.Resampling.LANCZOS)
    tf = transforms.Compose([
        transforms.ToTensor(),  # → [0, 1] float tensor
        # NO Normalize
    ])
    return tf(img).unsqueeze(0).to(device)


def stylize(content_img: Image.Image, style_img: Image.Image,
            alpha: float = 1.0, output_size: int = 512) -> Image.Image:
    """
    Run AdaIN style transfer.

    alpha: 1.0 = full style, 0.0 = content only.
    Tune between 0.6–1.0 once the fix is verified.
    """
    with torch.no_grad():
        content_tensor = preprocess_content(content_img, output_size)
        style_tensor = preprocess_style(style_img, output_size)

        content_features = encoder(content_tensor)
        style_features = encoder(style_tensor)

        print(f"Content features — shape: {content_features.shape}, "
              f"mean: {content_features.mean():.4f}, std: {content_features.std():.4f}", flush=True)
        print(f"Style features  — shape: {style_features.shape}, "
              f"mean: {style_features.mean():.4f}, std: {style_features.std():.4f}", flush=True)

        # AdaIN + alpha blend (standard formulation)
        stylized_features = adain(content_features, style_features)
        blended = alpha * stylized_features + (1 - alpha) * content_features

        output_tensor = decoder(blended)

        # Decoder outputs raw [0,1] values — just clamp and convert
        output_tensor = output_tensor.squeeze(0).cpu()
        output_tensor = torch.clamp(output_tensor, 0.0, 1.0)

        return transforms.ToPILImage()(output_tensor)