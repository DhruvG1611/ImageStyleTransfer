# StyleTransfer — Local AdaIN Image Style Transfer

A full-stack web application that applies neural style transfer to your images entirely on your local machine. Upload a content photo and a style painting — the app blends them using **Adaptive Instance Normalization (AdaIN)** and returns the stylized result in seconds.

**Stack:** FastAPI · PyTorch · React · Vite · Tailwind CSS

---

## Project Structure

```
image-gen-proj/
├── backend/
│   ├── model/
│   │   ├── adain.py          # AdaIN core algorithm
│   │   ├── network.py        # Encoder (VGG) + Decoder architecture
│   │   ├── transfer.py       # End-to-end stylize() pipeline
│   │   ├── decoder.pth       # ← download manually (see below)
│   │   └── vgg_normalised.pth# ← download manually (see below)
│   ├── main.py               # FastAPI app & /stylize endpoint
│   ├── schemas.py            # Pydantic request/response models
│   ├── validator.py          # Image upload validation
│   ├── requirements.txt      # Python dependencies
│   └── .env                  # Backend config (create from example below)
├── frontend/
│   ├── src/
│   │   ├── App.jsx           # Main UI
│   │   ├── components/       # ImageUploadPanel, ResultPanel, etc.
│   │   └── lib/api.js        # Axios client → backend
│   ├── package.json
│   └── .env                  # Frontend config (create from example below)
├── images/                   # Sample test images
├── .gitignore
└── README.md
```

---

## Prerequisites

| Requirement | Version |
|-------------|---------|
| Python | 3.10 or higher |
| Node.js | 18 or higher |
| npm | 9 or higher |
| Git | any |

> **GPU optional.** The app runs on CPU by default. A CUDA GPU will make inference ~10× faster but is not required.

---

## Step 1 — Download Model Weights

The two `.pth` weight files are too large for git and must be downloaded manually. Place both files inside `backend/model/`.

### `decoder.pth` (~14 MB)
Trained decoder from the official pytorch-AdaIN repo:
```
https://drive.google.com/file/d/1bMfhMMwPeXnYSQI6cDWElSZxOxc6dbC3
```

### `vgg_normalised.pth` (~76 MB)
Custom VGG19 encoder with a learned normalisation conv at layer 0:
```
https://drive.google.com/file/d/108uza-dsmwvbW2zv-G73jtVcMU_2Nb7Y
```

After downloading, verify the layout:
```
backend/model/
├── decoder.pth          ✓
└── vgg_normalised.pth   ✓
```

---

## Step 2 — Backend Setup

### 2a. Create a virtual environment
Run from the **project root** (`image-gen-proj/`):
```bash
python -m venv .venv
```

### 2b. Activate the virtual environment

**Windows (PowerShell):**
```powershell
.\.venv\Scripts\activate
```

**macOS / Linux:**
```bash
source .venv/bin/activate
```

Your terminal prompt will change to `(.venv)`.

### 2c. Install Python dependencies
```bash
pip install -r backend/requirements.txt
```

> **PyTorch note:** The above installs the CPU build of PyTorch.
> For a CUDA GPU, install the matching wheel from https://pytorch.org/get-started/locally/ before running the command above.

### 2d. Create the backend `.env` file
Create `backend/.env` with the following content:
```env
MAX_FILE_SIZE_MB=5
ALLOWED_ORIGINS=http://localhost:5173
STYLE_ALPHA=1.0
OUTPUT_SIZE=512
```

| Variable | Description | Default |
|----------|-------------|---------|
| `MAX_FILE_SIZE_MB` | Maximum upload size per image | `5` |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | `http://localhost:5173` |
| `STYLE_ALPHA` | Default style strength (0.0–1.0) | `1.0` |
| `OUTPUT_SIZE` | Output image resolution (px) | `512` |

---

## Step 3 — Frontend Setup

### 3a. Install Node dependencies
```bash
cd frontend
npm install
```

### 3b. Create the frontend `.env` file
Create `frontend/.env`:
```env
VITE_API_BASE_URL=http://localhost:8000
```

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | URL of the running FastAPI backend |

---

## Step 4 — Run the App

Open **two separate terminals**, both with the virtual environment activated (`.venv`).

### Terminal 1 — Backend
```bash
# From project root, with .venv active
cd backend
uvicorn main:app --reload --port 8000
```

Expected startup output:
```
VGG encoder (vgg_normalised.pth) loaded successfully.
Decoder loaded. Missing: 0, Unexpected: 0
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8000
```

### Terminal 2 — Frontend
```bash
cd frontend
npm run dev
```

Expected output:
```
  VITE v8.x.x  ready in xxx ms
  ➜  Local:   http://localhost:5173/
```

Open **http://localhost:5173** in your browser.

---

## How to Use

1. Click **Content Image** — upload the photo you want to stylize
2. Click **Style Image** — upload a painting or texture to apply as style
3. Adjust the **Alpha slider** — controls style intensity (0 = content only, 1 = full style)
4. Click **Stylize** — wait ~3–10 seconds for the result
5. Right-click the result image to save it

---

## API Reference

The backend exposes two endpoints:

### `GET /health`
Returns server status.
```json
{ "status": "ok", "message": "Style Transfer API is running" }
```

### `POST /stylize`
Runs style transfer and returns a PNG image.

| Field | Type | Description |
|-------|------|-------------|
| `content_image` | `File` | Content image (JPEG/PNG, ≤ 5 MB) |
| `style_image` | `File` | Style image (JPEG/PNG, ≤ 5 MB) |
| `alpha` | `float` (form field) | Style strength 0.0–1.0 (optional, default from `.env`) |

**Response:** `image/png` binary stream

Interactive API docs available at: `http://localhost:8000/docs`

---

## Troubleshooting

### `FileNotFoundError: vgg_normalised.pth not found`
The encoder weights are missing. Re-read Step 1 and confirm both `.pth` files are in `backend/model/`.

### `uvicorn` not found
The virtual environment is not activated. Run `.\.venv\Scripts\activate` (Windows) or `source .venv/bin/activate` (macOS/Linux) first.

### Output image looks identical to the content image
- Confirm `VITE_API_BASE_URL=http://localhost:8000` is set in `frontend/.env`
- **Restart the Vite dev server** after editing `.env` — Vite only reads env vars at startup
- Check the backend terminal for `POST /stylize 200` log lines to confirm requests are arriving

### CORS error in browser console
Add your frontend origin to `ALLOWED_ORIGINS` in `backend/.env` and restart uvicorn.

### Style transfer is slow
- CPU inference takes 5–15 seconds per image at 512×512; this is normal
- Reduce `OUTPUT_SIZE` in `backend/.env` (e.g. `256`) for faster results
- Use a CUDA GPU for ~10× speedup

---

## Model Architecture

This project implements the **pytorch-AdaIN** algorithm by Huang & Belongie (2017).

- **Encoder:** Official pytorch-AdaIN VGG19 with a learned 1×1 normalisation conv, sliced at `relu4_1`. Loaded from `vgg_normalised.pth`.
- **AdaIN:** Aligns content feature statistics (mean/std per channel) to match the style image's feature statistics.
- **Decoder:** Mirror of the encoder. Trained to reconstruct images from AdaIN-aligned features. Loaded from `decoder.pth`.

> **Why not torchvision's VGG19?** The decoder was trained against the *custom* pytorch-AdaIN encoder which differs in padding (ReflectionPad vs zero-pad) and includes an extra learned normalisation layer. Using torchvision's VGG produces mismatched features and garbled output.

Paper: *Arbitrary Style Transfer in Real-time with Adaptive Instance Normalization* — [arxiv.org/abs/1703.06868](https://arxiv.org/abs/1703.06868)  
Reference implementation: [github.com/naoto0804/pytorch-AdaIN](https://github.com/naoto0804/pytorch-AdaIN)

---

## License

MIT — free to use, modify, and distribute.
