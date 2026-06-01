from typing import Tuple
from pydantic import BaseModel

class ImageMeta(BaseModel):
    filename: str
    format: str
    size_kb: float
    dimensions: Tuple[int, int]

class UploadResponse(BaseModel):
    status: str
    content_image: ImageMeta
    style_image: ImageMeta

class ErrorResponse(BaseModel):
    status: str
    error: str

StylizeResponse = ErrorResponse

