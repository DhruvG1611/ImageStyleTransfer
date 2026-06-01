"""
network.py — fixed encoder/decoder for AdaIN style transfer.

ROOT CAUSE OF THE BUG
---------------------
The original code used torchvision's VGG19 (`models.vgg19(weights=DEFAULT)`)
as the encoder, but `decoder.pth` was trained against the pytorch-AdaIN
*custom* VGG encoder defined in naoto0804's net.py.  The two architectures
differ in three critical ways:

  1. The official encoder starts with a 1×1 Conv2d(3→3) that performs
     channel-wise normalisation learned jointly with the decoder.
     torchvision VGG has no such layer.

  2. Every conv block in the official encoder is preceded by
     ReflectionPad2d, not zero-padding (which torchvision uses internally).

  3. Because of the extra layers, relu4_1 is at index 30 in the official
     architecture, not index 20 as in torchvision.

These differences mean the encoder produces completely different feature
statistics.  The decoder — which learned to invert the *official* encoder's
features — receives garbage and outputs a noisy/unrecognisable image.

FIX
---
1. Replace the encoder with the exact architecture from net.py.
2. Load it from `vgg_normalised.pth` (place in backend/model/ alongside
   decoder.pth).  Download from:
   https://drive.google.com/file/d/108uza-dsmwvbW2zv-G73jtVcMU_2Nb7Y/view
   (linked from https://github.com/naoto0804/pytorch-AdaIN)
3. Slice the encoder at [:31]  (through relu4_1 inclusive).
4. Remove ImageNet normalisation from preprocessing — the normalisation is
   now handled by the learned 1×1 conv inside the encoder itself.
"""

import os
import torch
import torch.nn as nn

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# ---------------------------------------------------------------------------
# Official pytorch-AdaIN VGG encoder architecture
# Source: https://github.com/naoto0804/pytorch-AdaIN/blob/master/net.py
# ---------------------------------------------------------------------------
_vgg_full = nn.Sequential(
    nn.Conv2d(3, 3, (1, 1)),             # 0  ← learned channel normalisation
    nn.ReflectionPad2d((1, 1, 1, 1)),   # 1
    nn.Conv2d(3, 64, (3, 3)),            # 2
    nn.ReLU(),                           # 3   relu1-1
    nn.ReflectionPad2d((1, 1, 1, 1)),   # 4
    nn.Conv2d(64, 64, (3, 3)),           # 5
    nn.ReLU(),                           # 6   relu1-2
    nn.MaxPool2d((2, 2), (2, 2), (0, 0), ceil_mode=True),  # 7
    nn.ReflectionPad2d((1, 1, 1, 1)),   # 8
    nn.Conv2d(64, 128, (3, 3)),          # 9
    nn.ReLU(),                           # 10  relu2-1
    nn.ReflectionPad2d((1, 1, 1, 1)),   # 11
    nn.Conv2d(128, 128, (3, 3)),         # 12
    nn.ReLU(),                           # 13  relu2-2
    nn.MaxPool2d((2, 2), (2, 2), (0, 0), ceil_mode=True),  # 14
    nn.ReflectionPad2d((1, 1, 1, 1)),   # 15
    nn.Conv2d(128, 256, (3, 3)),         # 16
    nn.ReLU(),                           # 17  relu3-1
    nn.ReflectionPad2d((1, 1, 1, 1)),   # 18
    nn.Conv2d(256, 256, (3, 3)),         # 19
    nn.ReLU(),                           # 20  relu3-2
    nn.ReflectionPad2d((1, 1, 1, 1)),   # 21
    nn.Conv2d(256, 256, (3, 3)),         # 22
    nn.ReLU(),                           # 23  relu3-3
    nn.ReflectionPad2d((1, 1, 1, 1)),   # 24
    nn.Conv2d(256, 256, (3, 3)),         # 25
    nn.ReLU(),                           # 26  relu3-4
    nn.MaxPool2d((2, 2), (2, 2), (0, 0), ceil_mode=True),  # 27
    nn.ReflectionPad2d((1, 1, 1, 1)),   # 28
    nn.Conv2d(256, 512, (3, 3)),         # 29
    nn.ReLU(),                           # 30  relu4-1  ← cut here
    # layers 31+ not used for inference
    nn.ReflectionPad2d((1, 1, 1, 1)),   # 31
    nn.Conv2d(512, 512, (3, 3)),         # 32
    nn.ReLU(),                           # 33  relu4-2
    nn.ReflectionPad2d((1, 1, 1, 1)),   # 34
    nn.Conv2d(512, 512, (3, 3)),         # 35
    nn.ReLU(),                           # 36  relu4-3
    nn.ReflectionPad2d((1, 1, 1, 1)),   # 37
    nn.Conv2d(512, 512, (3, 3)),         # 38
    nn.ReLU(),                           # 39  relu4-4
    nn.MaxPool2d((2, 2), (2, 2), (0, 0), ceil_mode=True),  # 40
    nn.ReflectionPad2d((1, 1, 1, 1)),   # 41
    nn.Conv2d(512, 512, (3, 3)),         # 42
    nn.ReLU(),                           # 43  relu5-1
    nn.ReflectionPad2d((1, 1, 1, 1)),   # 44
    nn.Conv2d(512, 512, (3, 3)),         # 45
    nn.ReLU(),                           # 46  relu5-2
    nn.ReflectionPad2d((1, 1, 1, 1)),   # 47
    nn.Conv2d(512, 512, (3, 3)),         # 48
    nn.ReLU(),                           # 49  relu5-3
    nn.ReflectionPad2d((1, 1, 1, 1)),   # 50
    nn.Conv2d(512, 512, (3, 3)),         # 51
    nn.ReLU(),                           # 52  relu5-4
)


def get_encoder():
    """
    Load the official pytorch-AdaIN VGG encoder sliced at relu4_1 (index 30).
    Requires vgg_normalised.pth in the same directory as this file.
    Download: https://drive.google.com/file/d/108uza-dsmwvbW2zv-G73jtVcMU_2Nb7Y
    """
    weights_path = os.path.join(os.path.dirname(__file__), "vgg_normalised.pth")
    if not os.path.exists(weights_path):
        raise FileNotFoundError(
            "vgg_normalised.pth not found in backend/model/.\n"
            "Download it from the pytorch-AdaIN Google Drive link:\n"
            "  https://drive.google.com/file/d/108uza-dsmwvbW2zv-G73jtVcMU_2Nb7Y\n"
            "and place it alongside decoder.pth."
        )

    _vgg_full.load_state_dict(torch.load(weights_path, map_location=DEVICE, weights_only=True))
    print("VGG encoder (vgg_normalised.pth) loaded successfully.")

    # Slice at layer 31 → includes relu4_1 at index 30
    encoder = nn.Sequential(*list(_vgg_full.children())[:31])
    for param in encoder.parameters():
        param.requires_grad = False
    return encoder.to(DEVICE).eval()


def get_decoder():
    """
    Exact decoder architecture from pytorch-AdaIN.  Weights from decoder.pth.
    Architecture is unchanged — the decoder was never the bug.
    """
    decoder = nn.Sequential(
        nn.ReflectionPad2d((1, 1, 1, 1)),
        nn.Conv2d(512, 256, (3, 3)),
        nn.ReLU(),
        nn.Upsample(scale_factor=2, mode='nearest'),
        nn.ReflectionPad2d((1, 1, 1, 1)),
        nn.Conv2d(256, 256, (3, 3)),
        nn.ReLU(),
        nn.ReflectionPad2d((1, 1, 1, 1)),
        nn.Conv2d(256, 256, (3, 3)),
        nn.ReLU(),
        nn.ReflectionPad2d((1, 1, 1, 1)),
        nn.Conv2d(256, 256, (3, 3)),
        nn.ReLU(),
        nn.ReflectionPad2d((1, 1, 1, 1)),
        nn.Conv2d(256, 128, (3, 3)),
        nn.ReLU(),
        nn.Upsample(scale_factor=2, mode='nearest'),
        nn.ReflectionPad2d((1, 1, 1, 1)),
        nn.Conv2d(128, 128, (3, 3)),
        nn.ReLU(),
        nn.ReflectionPad2d((1, 1, 1, 1)),
        nn.Conv2d(128, 64, (3, 3)),
        nn.ReLU(),
        nn.Upsample(scale_factor=2, mode='nearest'),
        nn.ReflectionPad2d((1, 1, 1, 1)),
        nn.Conv2d(64, 64, (3, 3)),
        nn.ReLU(),
        nn.ReflectionPad2d((1, 1, 1, 1)),
        nn.Conv2d(64, 3, (3, 3)),
    )
    weights_path = os.path.join(os.path.dirname(__file__), "decoder.pth")
    if os.path.exists(weights_path):
        state_dict = torch.load(weights_path, map_location=DEVICE, weights_only=True)
        missing, unexpected = decoder.load_state_dict(state_dict, strict=True)
        print(f"Decoder loaded. Missing: {len(missing)}, Unexpected: {len(unexpected)}")
    else:
        print("WARNING: decoder.pth not found")
    return decoder.to(DEVICE).eval()