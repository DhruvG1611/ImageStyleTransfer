import torch

def calc_mean_std(features: torch.Tensor, eps: float = 1e-5) -> tuple[torch.Tensor, torch.Tensor]:
    """Calculate the spatial mean and standard deviation per channel for a 4D tensor."""
    size = features.size()
    assert len(size) == 4
    N, C = size[:2]
    feat_flat = features.view(N, C, -1)
    feat_var = feat_flat.var(dim=2, keepdim=True)
    feat_mean = feat_flat.mean(dim=2, keepdim=True)
    feat_std = torch.sqrt(feat_var + eps)
    return feat_mean.view(N, C, 1, 1), feat_std.view(N, C, 1, 1)

def adain(content_features: torch.Tensor, style_features: torch.Tensor) -> torch.Tensor:
    """Align content feature statistics with style feature statistics (pure normalization, no blending).
    
    Returns the fully AdaIN-normalized result. Feature blending is handled
    by the caller (transfer.py) for cleaner separation of concerns.
    """
    content_mean, content_std = calc_mean_std(content_features)
    style_mean, style_std = calc_mean_std(style_features)
    style_std = torch.clamp(style_std, max=0.8)
    
    normalized = (content_features - content_mean) / content_std
    stylized = normalized * style_std + style_mean
    return stylized
