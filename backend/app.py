"""
app.py — Flask REST API for image quality analysis
---------------------------------------------------
POST /analyze   multipart: reference=<file>, test=<file>
GET  /health    liveness check
"""

import os
import tempfile
import traceback

import cv2
import numpy as np
from flask import Flask, jsonify, request
from flask.json.provider import DefaultJSONProvider
from flask_cors import CORS

from analyze_chart import (
    analyze_blur,
    analyze_chart_photo,
    analyze_color,
    analyze_dynamic_range,
    analyze_exposure,
    analyze_lca,
    analyze_sharpness_dispatch,
    analyze_tonal,
    analyze_wb,
    compute_similarity_from_arrays,
    detect_and_rectify_chart,
    estimate_noise,
    extract_patches,
    generate_histogram,
)


class NumpyJSONProvider(DefaultJSONProvider):
    """Handles numpy scalar types that the default encoder can't serialize."""

    def default(self, o):
        if isinstance(o, (np.bool_,)):
            return bool(o)
        if isinstance(o, (np.integer,)):
            return int(o)
        if isinstance(o, (np.floating,)):
            return float(o)
        if isinstance(o, np.ndarray):
            return o.tolist()
        return super().default(o)


app = Flask(__name__)
app.json_provider_class = NumpyJSONProvider
app.json = NumpyJSONProvider(app)
CORS(app)   # allow requests from the Vite dev server


# ─────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────

def _save_temp(file_storage) -> str:
    """Save a werkzeug FileStorage to a temp file and return its path."""
    suffix = os.path.splitext(file_storage.filename)[1] or ".jpg"
    fd, path = tempfile.mkstemp(suffix=suffix)
    os.close(fd)
    file_storage.save(path)
    return path


def _analyze_single(image_path: str) -> dict:
    """
    Run all metrics on a single image.
    Chart-dependent metrics (color, tonal, white balance) automatically
    fall back to generic reference-free analysis when no chart is detected.
    """
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Could not decode image: {image_path}")

    # Attempt chart detection — dispatchers handle the fallback
    rectified, _, chart_ok = detect_and_rectify_chart(img)
    patches_lab = patches_bgr = None
    if chart_ok:
        patches_bgr, patches_lab = extract_patches(rectified)

    return {
        "sharpness":      analyze_sharpness_dispatch(img),
        "noise":          estimate_noise(img),
        "exposure":       analyze_exposure(img),
        "dynamic_range":  analyze_dynamic_range(img),
        "blur":           analyze_blur(img),
        "histogram":      generate_histogram(img),
        "lca":            analyze_lca(img),
        # Dispatchers — chart-based or generic automatically
        "color_accuracy": analyze_color(img, patches_lab),
        "tonal_response": analyze_tonal(img, patches_lab, patches_bgr),
        "white_balance":  analyze_wb(img, patches_bgr),
    }


# ─────────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


@app.route("/analyze", methods=["POST"])
def analyze():
    if "reference" not in request.files or "test" not in request.files:
        return jsonify({"error": "Both 'reference' and 'test' image files are required."}), 400

    ref_path = test_path = None
    try:
        ref_path  = _save_temp(request.files["reference"])
        test_path = _save_temp(request.files["test"])

        ref_result  = _analyze_single(ref_path)
        test_result = _analyze_single(test_path)

        # Similarity between the two images (resize test to ref dims if needed)
        img_ref  = cv2.imread(ref_path)
        img_test = cv2.imread(test_path)
        if img_ref.shape != img_test.shape:
            img_test = cv2.resize(img_test, (img_ref.shape[1], img_ref.shape[0]))
        similarity = compute_similarity_from_arrays(img_ref, img_test)

        return jsonify({
            "reference":  ref_result,
            "test":       test_result,
            "similarity": similarity,
        })

    except Exception as exc:
        traceback.print_exc()
        return jsonify({"error": str(exc)}), 500

    finally:
        for p in [ref_path, test_path]:
            if p and os.path.exists(p):
                try:
                    os.remove(p)
                except OSError:
                    pass


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
