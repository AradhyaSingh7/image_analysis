# Image Quality Analysis

> **Intelligent, side-by-side image quality comparison powered by computer vision.**

Upload a **reference** image and a **test** image — the app compares them across a set of perceptual and technical metrics (sharpness, noise, exposure, colour accuracy, blur detection, structural similarity, dynamic range) and gives you a clear, actionable quality report.

---

## Project Idea

Modern photography, machine learning datasets, and product photography all share a common problem: **how do you programmatically know whether an image is "good"?**

This tool provides a structured answer:

| What you bring | What the tool gives back |
|---|---|
| A **reference** (ground-truth / baseline) image | Per-metric quality scores |
| A **test** (candidate / processed) image | Side-by-side visual diff slider |
| Any common raster format (JPG, PNG, WEBP, TIFF, BMP) | Full EXIF / camera metadata for both images |

**Use-cases include:**
- Comparing RAW-processed exports against originals
- Verifying that image compression pipelines don't degrade quality
- QA for datasets used in machine-learning model training
- Checking lens/camera performance across settings

---

## Project Structure

```
image_analysis/
├── frontend/          # React + Vite UI
│   ├── src/
│   │   ├── components/
│   │   │   ├── ImageUploader.jsx   # Drag-and-drop upload zone + EXIF overlay
│   │   │   ├── AnalysisPanel.jsx   # Per-metric results panel
│   │   │   ├── MetricTabs.jsx      # Metric tab switcher
│   │   │   ├── SubmitButton.jsx    # Animated analysis trigger button
│   │   │   └── metric-views/       # Individual metric visualisations
│   │   ├── config/
│   │   │   └── metricsConfig.js    # Metric definitions & labels
│   │   ├── utils/
│   │   │   └── extractMetadata.js  # Client-side EXIF extraction (exifr)
│   │   ├── App.jsx                 # Root component & state orchestration
│   │   ├── App.css                 # Global layout & design tokens
│   │   └── index.css               # CSS reset & font imports
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
└── backend/           # Python analysis engine (Flask REST API)
    ├── app.py          # Flask API server — POST /analyze, GET /health
    ├── analyze_chart.py # All CV metrics (sharpness, noise, SSIM, etc.)
    ├── metadata.py     # EXIF extraction with Pillow + exifread
    └── requirements.txt
```

---

## Frontend

The frontend is a **React 19 + Vite** single-page application styled with plain CSS (no Tailwind). It is fully integrated with the Flask backend.

### Features (implemented)

- **Drag-and-drop or click-to-browse** image upload for both reference and test slots
- **Client-side EXIF metadata** extraction (via `exifr`) displayed as an overlay on each uploaded image — camera make/model, ISO, exposure, aperture, focal length, resolution
- **"View Full Metadata"** button stub — will open a detailed modal listing every raw EXIF tag
- **Interactive comparison slider** (`ImageComparison`) — drag to reveal reference vs test side-by-side
- **Metric pills** — visual preview of the seven metrics that will be computed: Sharpness, Noise, Exposure, Colour Accuracy, Blur Detection, Similarity, Dynamic Range
- **Upload-status stepper** — shows completion of step 1 (reference), step 2 (test), step 3 (ready)
- **Clear images** button to reset both slots

### Tech Stack

| Package | Version | Purpose |
|---|---|---|
| `react` | ^19 | UI framework |
| `react-dom` | ^19 | DOM rendering |
| `exifr` | ^7.1.3 | Client-side EXIF/IPTC/XMP parsing |
| `recharts` | ^3 | Metric chart & histogram visualisations |
| `vite` | ^8 | Build tool & dev server |
| `@vitejs/plugin-react` | ^6 | Vite React transform |

### Setup & Running

```bash
# 1. Navigate to the frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Start the development server (default: http://localhost:5173)
npm run dev

# 4. Build for production
npm run build

# 5. Preview production build locally
npm run preview
```

> **Node version:** 18 or higher recommended.

### Linting

```bash
npm run lint
```

The project uses ESLint with `eslint-plugin-react-hooks` and `eslint-plugin-react-refresh`.

---

## Backend

The backend is a **Python + Flask** REST API that accepts two image files, runs computer-vision analysis, and returns a structured JSON report. It listens on **port 5000** by default.

### Metrics

| Metric | Method |
|---|---|
| **Sharpness** | Laplacian variance (OpenCV) |
| **Noise level** | Sigma estimation (scikit-image) |
| **Exposure** | Mean & std of luminance histogram |
| **Colour accuracy** | Delta-E in CIELAB colour space |
| **Blur detection** | Laplacian blur score |
| **Structural similarity (SSIM)** | `skimage.metrics.structural_similarity` |
| **Dynamic range** | Pixel intensity spread analysis |


### Setup

```bash
# 1. Navigate to the backend directory
cd backend

# 2. Create and activate a virtual environment (recommended)
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt
```

### Requirements

See [`backend/requirements.txt`](backend/requirements.txt) for the full list. Key packages:

| Package | Purpose |
|---|---|
| `Pillow` | Image I/O, pixel ops, basic metadata |
| `opencv-python` | Computer vision algorithms |
| `scikit-image` | SSIM, structural similarity metrics |
| `numpy` | Numerical array operations |
| `exifread` | Raw EXIF tag reading |
| `flask` | REST API framework |
| `flask-cors` | Cross-origin request support (Vite dev server) |
| `python-dotenv` | Environment variable loading |
| `piexif` | EXIF read/write support |

### Running the API

```bash
# From the backend/ directory (with .venv activated)
python app.py
```

The server starts on **http://localhost:5000**. The frontend sends a `POST /analyze` request with two image files and receives a JSON response containing all metric scores and metadata.

To verify the server is running:
```bash
curl http://localhost:5000/health
# expected: {"status": "ok"}
```

---

## Roadmap 

- [x] Backend Flask server with `/analyze` endpoint
- [x] Full metric computation (sharpness, noise, SSIM, colour accuracy, dynamic range)
- [x] Results panel in the UI showing per-metric scores with visual indicators
- [ ] "View Full Metadata" modal (raw EXIF tag table)
- [ ] PDF / JSON export of analysis report
- [ ] Batch comparison mode (multiple test images against one reference)

