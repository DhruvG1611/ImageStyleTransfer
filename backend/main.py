import os
import traceback
import asyncio
from contextlib import asynccontextmanager
from io import BytesIO
from pathlib import Path
from typing import Any, Dict, List
from fastapi import FastAPI, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.base import BaseHTTPMiddleware

from schemas import UploadResponse, ErrorResponse
from validator import validate_image
from model.transfer import stylize

# Load env variables from .env
env_path: Path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

# Retrieve configuration
MAX_FILE_SIZE_MB: float = float(os.getenv("MAX_FILE_SIZE_MB", "5.0"))
STYLE_ALPHA: float = float(os.getenv("STYLE_ALPHA", "1.0"))
OUTPUT_SIZE: int = int(os.getenv("OUTPUT_SIZE", "512"))
origins_str: str = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173")
origins: List[str] = [origin.strip() for origin in origins_str.split(",") if origin.strip()]

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    print("Application starting up...")
    print(f"Max file size: {MAX_FILE_SIZE_MB}MB")
    print(f"Allowed CORS origins: {origins}")
    print(f"Default Style Alpha: {STYLE_ALPHA}")
    print(f"Output Size: {OUTPUT_SIZE}")
    yield
    # Shutdown logic
    print("Application shutting down...")

app: FastAPI = FastAPI(
    title="Style Transfer API",
    version="1.0.0",
    lifespan=lifespan
)

class MaxBodySizeMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > 10 * 1024 * 1024:
            return JSONResponse(
                status_code=413,
                content={"status": "error", "error": "Request body too large"}
            )
        return await call_next(request)

# CORS configuration (added first, runs last on request phase)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type"],
    max_age=600,
)

# Max size middleware (added second, runs first on request phase)
app.add_middleware(MaxBodySizeMiddleware)

@app.get("/health", response_model=Dict[str, str])
async def health_check() -> Dict[str, str]:
    return {"status": "ok", "message": "Style Transfer API is running"}

@app.get("/", response_model=Dict[str, Any])
async def root() -> Dict[str, Any]:
    # Extract endpoint metadata dynamically
    endpoints: List[Dict[str, Any]] = []
    for route in app.routes:
        if hasattr(route, "methods") and hasattr(route, "path"):
            endpoints.append({
                "path": route.path,
                "methods": list(route.methods)
            })
    return {
        "app": "Style Transfer API",
        "version": "1.0.0",
        "endpoints": endpoints
    }

@app.exception_handler(Exception)
async def generic_exception_handler(request, exc) -> JSONResponse:
    print(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"status": "error", "error": "Internal server error"}
    )

@app.post("/upload", response_model=UploadResponse, responses={400: {"model": ErrorResponse}})
async def upload_images(
    content_image: UploadFile,
    style_image: UploadFile
) -> Any:
    try:
        _, content_meta = await validate_image(content_image, MAX_FILE_SIZE_MB)
        _, style_meta = await validate_image(style_image, MAX_FILE_SIZE_MB)
        return UploadResponse(
            status="success",
            content_image=content_meta,
            style_image=style_meta
        )
    except HTTPException as e:
        return JSONResponse(
            status_code=e.status_code,
            content={"status": "error", "error": e.detail}
        )
@app.post("/stylize", responses={400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}})
async def stylize_endpoint(
    content_image: UploadFile,
    style_image: UploadFile,
    alpha: float = Form(default=None)
) -> Any:
    try:
        content_pil, _ = await validate_image(content_image, MAX_FILE_SIZE_MB)
        style_pil, _ = await validate_image(style_image, MAX_FILE_SIZE_MB)
    except HTTPException as e:
        return JSONResponse(
            status_code=e.status_code,
            content={"status": "error", "error": e.detail}
        )
    
    if alpha is None:
        target_alpha = STYLE_ALPHA
    else:
        target_alpha = max(0.0, min(1.0, alpha))
        
    try:
        output_img = await asyncio.to_thread(
            stylize, content_pil, style_pil, target_alpha, OUTPUT_SIZE
        )
        
        buf = BytesIO()
        output_img.save(buf, format="PNG")
        buf.seek(0)
        
        return StreamingResponse(
            buf,
            media_type="image/png",
            headers={"Content-Disposition": "attachment; filename=stylized.png"}
        )
    except Exception as e:
        print(f"Style transfer execution failed: {e}", flush=True)
        print(traceback.format_exc(), flush=True)
        return JSONResponse(
            status_code=500,
            content={"status": "error", "error": "Style transfer failed — please try different images"}
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
