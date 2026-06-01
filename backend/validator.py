from io import BytesIO
from typing import Tuple
from fastapi import UploadFile, HTTPException
from PIL import Image
from schemas import ImageMeta

ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}

async def validate_image(file: UploadFile, max_mb: float) -> Tuple[Image.Image, ImageMeta]:
    # 1. Read bytes asynchronously
    contents = await file.read()
    size_bytes = len(contents)
    
    # 2. Check size
    max_bytes = max_mb * 1024 * 1024
    if size_bytes > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File size exceeds maximum limit of {max_mb} MB"
        )
    
    # 3. Load image in-memory
    try:
        img = Image.open(BytesIO(contents))
        img.load()  # Force decode and verify integrity
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Invalid or corrupted image file"
        )
    
    # 4. Check format
    fmt = img.format or "UNKNOWN"
    if fmt not in ALLOWED_FORMATS:
        raise HTTPException(
            status_code=400,
            detail="Unsupported image format. Allowed formats: JPEG, PNG, WEBP"
        )
    
    # 5. Check dimensions
    width, height = img.size
    if not (64 <= width <= 2048 and 64 <= height <= 2048):
        raise HTTPException(
            status_code=400,
            detail="Image dimensions must be between 64x64 and 2048x2048 pixels"
        )
    
    # 6. Create metadata
    size_kb = round(size_bytes / 1024.0, 2)
    meta = ImageMeta(
        filename=file.filename or "unknown",
        format=fmt,
        size_kb=size_kb,
        dimensions=(width, height)
    )
    
    return img, meta
