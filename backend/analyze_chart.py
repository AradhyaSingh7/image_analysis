"""
analyze_chart.py
----------------
Full pipeline:
  1. Detect ArUco corner markers in a chart photo
  2. Rectify (perspective-correct) the chart
  3. Extract the 24 colour patches
  4. Run sharpness / noise / dynamic-range / colour-accuracy metrics
  5. Compare two camera results 

"""

import cv2
import numpy as np
from skimage.color import deltaE_ciede2000
from skimage.metrics import structural_similarity as ssim_func

# ─────────────────────────────────────────────────────────────────
# REFERENCE DATA
# ─────────────────────────────────────────────────────────────────

COLORCHECKER_LAB = [
    (37.99, 13.56,  14.06), (65.71, 18.13,  17.81), (49.93, -4.88, -21.93),
    (43.14,-13.10,  21.91), (55.11,  8.84, -25.40), (70.72,-33.40,  -0.20),
    (62.66, 36.07,  57.10), (40.02, 10.41, -45.96), (51.12, 48.24,  16.25),
    (30.33, 22.98, -21.59), (72.53,-23.71,  57.26), (71.94, 19.36,  67.86),
    (28.78, 14.18, -50.30), (55.26,-38.34,  31.37), (42.10, 53.38,  28.19),
    (81.73,  4.04,  79.82), (51.94, 49.99, -14.57), (51.04,-28.63, -28.64),
    (96.54, -0.43,   1.19), (81.26, -0.64,  -0.34), (66.77, -0.73,  -0.50),
    (50.87, -0.15,  -0.27), (35.66, -0.42,  -1.23), (20.46, -0.08,  -0.97),
]

PATCH_NAMES = [
    "Dark Skin","Light Skin","Blue Sky","Foliage","Blue Flower","Bluish Green",
    "Orange","Purplish Blue","Moderate Red","Purple","Yellow Green","Orange Yellow",
    "Blue","Green","Red","Yellow","Magenta","Cyan",
    "White","Neutral 8","Neutral 65","Neutral 5","Neutral 35","Black"
]


# ─────────────────────────────────────────────────────────────────
# STEP 1 — CHART DETECTION & RECTIFICATION
# ─────────────────────────────────────────────────────────────────

def detect_and_rectify_chart(img, target_w=1200, target_h=900):
    """
    Finds the 4 ArUco corner markers (IDs 0-3) in img.
    Computes the homography that maps those 4 points to a flat rectangle,
    then warps the image so the chart fills the output canvas perfectly.

    Why homography?
      A chart photographed at an angle is a perspective distortion of the
      ideal flat chart. A homography is a 3x3 matrix that undoes exactly
      that distortion — it maps any quadrilateral to a rectangle.

    Returns:
      rectified (H×W BGR image) | None on failure
      detected_corners (4×2 array of pixel coords) | None
      success (bool)
    """
    aruco_dict   = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)
    aruco_params = cv2.aruco.DetectorParameters()
    detector     = cv2.aruco.ArucoDetector(aruco_dict, aruco_params)

    corners_raw, ids, _ = detector.detectMarkers(img)

    if ids is None or len(ids) < 4:
        return None, None, False

    # Map each detected marker ID → its centre pixel coordinate
    id_to_centre = {}
    for i, marker_id in enumerate(ids.flatten()):
        marker_corners = corners_raw[i][0]          # shape (4, 2)
        id_to_centre[int(marker_id)] = marker_corners.mean(axis=0)

    if not all(k in id_to_centre for k in [0, 1, 2, 3]):
        return None, None, False

    # Source: where markers sit in the actual (possibly angled) photo
    # ID assignment: 0=TL, 1=TR, 2=BR, 3=BL  (matches generate_chart.py)
    src_pts = np.array([
        id_to_centre[0],   # top-left
        id_to_centre[1],   # top-right
        id_to_centre[2],   # bottom-right
        id_to_centre[3],   # bottom-left
    ], dtype=np.float32)

    # Destination: perfect rectangle corners of the output canvas
    dst_pts = np.array([
        [0,            0           ],
        [target_w - 1, 0           ],
        [target_w - 1, target_h - 1],
        [0,            target_h - 1],
    ], dtype=np.float32)

    H_mat, _ = cv2.findHomography(src_pts, dst_pts)
    rectified = cv2.warpPerspective(img, H_mat, (target_w, target_h))

    return rectified, src_pts, True

# ─────────────────────────────────────────────────────────────────
# STEP 2 — PATCH EXTRACTION
# ─────────────────────────────────────────────────────────────────

def extract_patches(rectified_img, cols=6, rows=4,
                    border_frac=0.08, sample_frac=0.5):
    """
    Divides the rectified chart into a 6×4 grid and samples the centre
    of each cell to get the colour of that patch.

    border_frac  — fraction of chart edge to skip (handles marker area)
    sample_frac  — fraction of each cell interior to sample
                   (avoids colour bleeding at patch boundaries)

    Returns:
      patches_bgr — list of 24 mean BGR values
      patches_lab — list of 24 mean CIELAB values (true scale, not OpenCV)
    """
    H, W = rectified_img.shape[:2]
    bx = int(W * border_frac)
    by = int(H * border_frac)
    inner_w = W - 2 * bx
    inner_h = H - 2 * by
    cell_w   = inner_w // cols
    cell_h   = inner_h // rows

    # Convert whole image to true CIELAB once
    img_lab = cv2.cvtColor(rectified_img, cv2.COLOR_BGR2LAB).astype(np.float32)
    img_lab[:,:,0] *= 100.0 / 255.0   # L: [0,255] → [0,100]
    img_lab[:,:,1] -= 128.0            # a: [0,255] → [-128,127]
    img_lab[:,:,2] -= 128.0            # b: [0,255] → [-128,127]

    patches_bgr, patches_lab = [], []

    for row in range(rows):
        for col in range(cols):
            cx1 = bx + col * cell_w
            cy1 = by + row * cell_h
            cx2 = cx1 + cell_w
            cy2 = cy1 + cell_h

            # Shrink to centre sample area
            mx = int(cell_w * (1 - sample_frac) / 2)
            my = int(cell_h * (1 - sample_frac) / 2)

            patch_bgr = rectified_img[cy1+my : cy2-my, cx1+mx : cx2-mx]
            patch_lab = img_lab       [cy1+my : cy2-my, cx1+mx : cx2-mx]

            patches_bgr.append(patch_bgr.reshape(-1, 3).mean(axis=0).tolist())
            patches_lab.append(patch_lab.reshape(-1, 3).mean(axis=0).tolist())

    return patches_bgr, patches_lab


# ─────────────────────────────────────────────────────────────────
# STEP 3 — METRIC FUNCTIONS (same as your existing ones)
# ─────────────────────────────────────────────────────────────────

def analyze_sharpness(img):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    laplacian = cv2.Laplacian(gray, cv2.CV_64F)
    variance = laplacian.var()
    sobelx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
    sobely = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
    gradient_magnitude = np.sqrt(sobelx**2 + sobely**2).mean()
    tenengrad = (sobelx**2 + sobely**2).mean()
    return {
        "laplacian_variance":  round(variance, 2),
        "gradient_magnitude":  round(gradient_magnitude, 2),
        "tenengrad_score":     round(tenengrad, 2),
        "is_sharp":            variance > 100
    }

def estimate_noise(img):
    gray    = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float64)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    noise_std   = (gray - blurred).std()
    signal_power = gray.mean() ** 2
    noise_power  = noise_std ** 2
    snr_db = 10 * np.log10(signal_power / noise_power) if noise_power > 0 else float('inf')
    channel_noise = {}
    for i, ch in enumerate(['B', 'G', 'R']):
        ch_f = img[:,:,i].astype(np.float64)
        channel_noise[ch] = round((ch_f - cv2.GaussianBlur(ch_f, (5,5), 0)).std(), 3)
    return {
        "noise_std":     round(noise_std, 3),
        "snr_db":        round(snr_db, 2),
        "channel_noise": channel_noise
    }

def analyze_dynamic_range(img):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    total = gray.size
    p1, p99 = np.percentile(gray, 1), np.percentile(gray, 99)
    hist = cv2.calcHist([gray], [0], None, [256], [0,256]).flatten()
    hn   = hist / hist.sum()
    entropy = -np.sum(hn[hn > 0] * np.log2(hn[hn > 0]))
    return {
        "effective_range":        round(float(p99 - p1), 2),
        "shadow_clipping_pct":    round(float(np.sum(gray <= 5)   / total * 100), 2),
        "highlight_clipping_pct": round(float(np.sum(gray >= 250) / total * 100), 2),
        "histogram_entropy":      round(float(entropy), 3)
    }


# ─────────────────────────────────────────────────────────────────
# STEP 4 — COLOUR ACCURACY (chart-aware)
# ─────────────────────────────────────────────────────────────────

def analyze_color_accuracy(patches_lab):
    """
    Compares each measured patch LAB value against the published
    ColorChecker reference values using ΔE2000.

    ΔE < 2  → imperceptible difference
    ΔE 2-5  → noticeable only by trained observers
    ΔE > 5  → clearly visible to most people
    """
    results = []
    for idx, (measured_lab, ref_lab) in enumerate(zip(patches_lab, COLORCHECKER_LAB)):
        mL, ma, mb = measured_lab
        rL, ra, rb = ref_lab

        de = float(deltaE_ciede2000(
            np.array([[[mL, ma, mb]]]),
            np.array([[[rL, ra, rb]]])
        ).flat[0])

        results.append({
            "patch_id":    idx,
            "patch_name":  PATCH_NAMES[idx],
            "measured_lab": [round(mL,2), round(ma,2), round(mb,2)],
            "reference_lab":[round(rL,2), round(ra,2), round(rb,2)],
            "delta_e_2000": round(de, 3)
        })

    des   = [r["delta_e_2000"] for r in results]
    worst = max(results, key=lambda r: r["delta_e_2000"])

    return {
        "per_patch":       results,
        "mean_delta_e":    round(float(np.mean(des)), 3),
        "max_delta_e":     round(float(np.max(des)), 3),
        "worst_patch":     worst["patch_name"],
        "patches_under_2": sum(1 for d in des if d < 2),
        "patches_under_5": sum(1 for d in des if d < 5),
    }

def analyze_blur(img, threshold=100):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # 1. Laplacian variance (primary defocus metric)
    lap_var = cv2.Laplacian(gray, cv2.CV_64F).var()

    # 2. FFT high-frequency energy ratio
    fft = np.fft.fft2(gray)
    fshift = np.fft.fftshift(fft)
    magnitude = np.abs(fshift)

    H, W = gray.shape
    cy, cx = H // 2, W // 2

    radius = min(H, W) // 8  # high-freq = outside this radius

    mask = np.zeros((H, W), dtype=bool)
    y_idx, x_idx = np.ogrid[:H, :W]
    mask[(y_idx - cy) ** 2 + (x_idx - cx) ** 2 > radius ** 2] = True

    hf_ratio = magnitude[mask].mean() / (magnitude.mean() + 1e-6)

    # 3. Directional gradient anisotropy (motion blur has strong axis)
    sobelx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
    sobely = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)

    gx_energy = (sobelx ** 2).mean()
    gy_energy = (sobely ** 2).mean()

    anisotropy = abs(gx_energy - gy_energy) / (gx_energy + gy_energy + 1e-6)
    blur_direction = "horizontal" if gx_energy < gy_energy else "vertical"

    # 4. Local variance map (find blurry regions)
    local_var = cv2.Laplacian(gray, cv2.CV_64F) ** 2
    blurry_mask = (local_var < threshold).astype(np.uint8) * 255
    blurry_region_pct = (blurry_mask > 0).mean() * 100

    # Classify
    is_blurry = lap_var < threshold

    if is_blurry:
        blur_type = "motion" if anisotropy > 0.3 else "defocus"
    else:
        blur_type = "none"

    return {
        "laplacian_variance": round(lap_var, 2),
        "hf_energy_ratio": round(hf_ratio, 4),
        "anisotropy": round(anisotropy, 4),
        "blur_direction": blur_direction,
        "blurry_region_pct": round(blurry_region_pct, 1),
        "is_blurry": is_blurry,
        "blur_type": blur_type
    }
def analyze_exposure(img):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Luminance histogram (256 bins)
    hist = cv2.calcHist([gray], [0], None, [256], [0, 256]).flatten()
    total_pixels = gray.size

    # Shadow/highlight clipping (bottom/top 5% of range)
    clip_thresh = 5
    shadow_clip = hist[:clip_thresh].sum() / total_pixels * 100
    highlight_clip = hist[-clip_thresh:].sum() / total_pixels * 100

    # Mean brightness & standard deviation
    mean_brightness = gray.mean()
    brightness_std = gray.std()

    # Percentile distribution
    p5, p25, p50, p75, p95 = np.percentile(gray, [5, 25, 50, 75, 95])

    # HSV value channel for perceptual brightness
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    value_mean = hsv[:, :, 2].mean()

    return {
        "mean_brightness": round(mean_brightness, 2),
        "brightness_std": round(brightness_std, 2),
        "shadow_clip_pct": round(shadow_clip, 2),
        "highlight_clip_pct": round(highlight_clip, 2),
        "percentiles": {
            "p5": int(p5),
            "p25": int(p25),
            "p50": int(p50),
            "p75": int(p75),
            "p95": int(p95)
        },
        "hsv_value_mean": round(value_mean, 2),
    }
    
def generate_histogram(img):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    hist = cv2.calcHist([gray], [0], None, [256], [0, 256])

    return hist.flatten().tolist()

# ─────────────────────────────────────────────────────────────────
# STEP 5 — MAIN PIPELINE
# ─────────────────────────────────────────────────────────────────

def analyze_chart_photo(image_path):
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Could not load image: {image_path}")

    rectified, _, success = detect_and_rectify_chart(img)
    # cv2.imwrite("rectified_output.jpg", rectified)
    # print("Saved rectified_output.jpg")
    if not success:
        raise RuntimeError("Could not detect all 4 ArUco markers.")

    patches_bgr, patches_lab = extract_patches(rectified)

    return {
        "sharpness":     analyze_sharpness(rectified),
        "noise":         estimate_noise(rectified),
        "dynamic_range": analyze_dynamic_range(rectified),
        "color_accuracy":analyze_color_accuracy(patches_lab),
        "blur":          analyze_blur(rectified),       
        "exposure":      analyze_exposure(rectified),
        "histogram":     generate_histogram(rectified),   
    }
def compute_similarity_from_arrays(img_a, img_b):
    
    if img_a.shape != img_b.shape:
        img_b = cv2.resize(img_b, (img_a.shape[1], img_a.shape[0]))

    hist_corr = []
    for i in range(3):
        h1 = cv2.calcHist([img_a], [i], None, [256], [0, 256])
        h2 = cv2.calcHist([img_b], [i], None, [256], [0, 256])
        cv2.normalize(h1, h1)
        cv2.normalize(h2, h2)
        hist_corr.append(cv2.compareHist(h1, h2, cv2.HISTCMP_CORREL))
    hist_correlation = float(np.mean(hist_corr))

    mean_abs_diff = float(np.mean(np.abs(
        img_a.astype(np.float32) - img_b.astype(np.float32)
    )))

    mse  = float(np.mean((img_a.astype(np.float32) - img_b.astype(np.float32)) ** 2))
    psnr = float(cv2.PSNR(img_a, img_b))

   
    hist_score = hist_correlation                          # already 0-1
    diff_score = max(0.0, 1.0 - mean_abs_diff / 255.0)   # 0 diff = 1.0, 255 diff = 0.0
    overall_similarity = (hist_score * 0.7) + (diff_score * 0.3)

    return {
        "overall_similarity_pct": round(overall_similarity * 100, 2),
        "hist_correlation":       round(hist_correlation, 4),
        "mean_abs_diff":          round(mean_abs_diff, 3),
        "mse":                    round(mse, 3),
        "psnr_db":                round(psnr, 2),
    }

def compare_two_cameras(image_path_A, image_path_B):
    img_a = cv2.imread(image_path_A)
    img_b = cv2.imread(image_path_B)

    rect_a, _, ok_a = detect_and_rectify_chart(img_a)
    rect_b, _, ok_b = detect_and_rectify_chart(img_b)

    if not ok_a or not ok_b:
        raise RuntimeError("Could not detect chart in one or both images.")

    patches_bgr_a, patches_lab_a = extract_patches(rect_a)
    patches_bgr_b, patches_lab_b = extract_patches(rect_b)

    return {
        "camera_A": {
            "sharpness":     analyze_sharpness(rect_a),
            "noise":         estimate_noise(rect_a),
            "dynamic_range": analyze_dynamic_range(rect_a),
            "color_accuracy":analyze_color_accuracy(patches_lab_a),
            "blur":          analyze_blur(rect_a),
            "exposure":      analyze_exposure(rect_a),
            "histogram":     generate_histogram(rect_a),
        },
        "camera_B": {
            "sharpness":     analyze_sharpness(rect_b),
            "noise":         estimate_noise(rect_b),
            "dynamic_range": analyze_dynamic_range(rect_b),
            "color_accuracy":analyze_color_accuracy(patches_lab_b),
            "blur":          analyze_blur(rect_b),
            "exposure":      analyze_exposure(rect_b),
            "histogram":     generate_histogram(rect_b),
        },
        # Similarity runs on the two rectified images against each other
        "similarity":    compute_similarity_from_arrays(rect_a, rect_b),
    }
def print_comparison(comparison):
    for camera in ["camera_A", "camera_B"]:
        print(f"\n{'='*45}")
        print(f"  {camera}")
        print(f"{'='*45}")
        result = comparison[camera]

        print("\n── Sharpness ──────────────────────────")
        for k, v in result["sharpness"].items():
            print(f"  {k}: {v}")

        print("\n── Blur ───────────────────────────────")
        for k, v in result["blur"].items():
            print(f"  {k}: {v}")

        print("\n── Noise ──────────────────────────────")
        for k, v in result["noise"].items():
            print(f"  {k}: {v}")

        print("\n── Exposure ───────────────────────────")
        for k, v in result["exposure"].items():
            if k == "percentiles":
                print(f"  percentiles: {v}")
            else:
                print(f"  {k}: {v}")

        print("\n── Dynamic Range ──────────────────────")
        for k, v in result["dynamic_range"].items():
            print(f"  {k}: {v}")

        print("\n── Colour Accuracy ────────────────────")
        ca = result["color_accuracy"]
        print(f"  mean ΔE2000 : {ca['mean_delta_e']}")
        print(f"  max  ΔE2000 : {ca['max_delta_e']}")
        print(f"  worst patch : {ca['worst_patch']}")
        print(f"  under ΔE 2  : {ca['patches_under_2']}/24")
        print(f"  under ΔE 5  : {ca['patches_under_5']}/24")

        print("\n── Per-patch (first 6) ────────────────")
        for p in ca["per_patch"][:6]:
            print(f"  [{p['patch_id']:2d}] {p['patch_name']:<20}  ΔE={p['delta_e_2000']}")

    print(f"\n{'='*45}")
    print("  SIMILARITY  (A vs B)")
    print(f"{'='*45}")
    for k, v in comparison["similarity"].items():
        print(f"  {k}: {v}")

# ─────────────────────────────────────────────────────────────────
# SELF-TEST
# ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import json, sys

    # path = sys.argv[1] if len(sys.argv) > 1 else "colorchecker_chart.png"
    # print(f"Analysing: {path}\n")

    # result = analyze_chart_photo(path)
    if len(sys.argv) == 2:
        path = sys.argv[1]
        result = analyze_chart_photo(path)

        print("── Sharpness ──────────────────────────")
        for k, v in result["sharpness"].items():
            print(f"  {k}: {v}")

        print("\n── Noise ──────────────────────────────")
        for k, v in result["noise"].items():
            print(f"  {k}: {v}")

        print("\n── Dynamic Range ──────────────────────")
        for k, v in result["dynamic_range"].items():
            print(f"  {k}: {v}")

        print("\n── Blur Detection ──────────────────────")
        for k, v in result["blur"].items():
            print(f"  {k}: {v}")

        print("\n── Exposure ──────────────────────")
        for k, v in result["exposure"].items():
            print(f"  {k}: {v}")

        print("\n── Colour Accuracy ────────────────────")
        ca = result["color_accuracy"]
        print(f"  mean ΔE2000 : {ca['mean_delta_e']}")
        print(f"  max  ΔE2000 : {ca['max_delta_e']}")
        print(f"  worst patch : {ca['worst_patch']}")
        print(f"  under ΔE 2  : {ca['patches_under_2']}/24")
        print(f"  under ΔE 5  : {ca['patches_under_5']}/24")

        print("\n── Per-patch (first 6) ────────────────")
        for p in ca["per_patch"][:6]:
            print(f"  [{p['patch_id']:2d}] {p['patch_name']:<20}  ΔE={p['delta_e_2000']}")
    elif len(sys.argv) == 3:
        image_a = sys.argv[1]
        image_b = sys.argv[2]

        comparison = compare_two_cameras(image_a, image_b)

        print_comparison(comparison)

    else:
        print("Usage:")
        print("  python analyze_chart.py image.jpg")
        print("  python analyze_chart.py imageA.jpg imageB.jpg")
