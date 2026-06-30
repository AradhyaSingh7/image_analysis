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
NEUTRAL_PATCH_INDICES = [18, 19, 20, 21, 22, 23]
NEUTRAL_L_VALUES      = [96.54, 81.26, 66.77, 50.87, 35.66, 20.46]
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
def analyze_lca(img, num_sample_edges=100):
    """
    Lateral Chromatic Aberration (LCA)

    Measures sub-pixel displacement between:
        R vs G
        B vs G

    using edge positions detected on the green channel.

    Positive shift:
        channel edge lies right of green edge

    Negative shift:
        channel edge lies left of green edge
    """

    H, W = img.shape[:2]

    b_ch = img[:, :, 0].astype(np.float32)
    g_ch = img[:, :, 1].astype(np.float32)
    r_ch = img[:, :, 2].astype(np.float32)

    # --------------------------------------------------
    # Detect strong edges from green channel
    # --------------------------------------------------

    g_uint8 = cv2.normalize(
        g_ch, None, 0, 255, cv2.NORM_MINMAX
    ).astype(np.uint8)

    edges = cv2.Canny(g_uint8, 80, 180)

    edge_coords = np.column_stack(np.where(edges > 0))

    if len(edge_coords) < 20:
        return {
            "mean_r_shift_px": 0.0,
            "mean_b_shift_px": 0.0,
            "center_r_shift_px": 0.0,
            "center_b_shift_px": 0.0,
            "outer_r_shift_px": 0.0,
            "outer_b_shift_px": 0.0,
            "lca_severity": "unknown"
        }

    # --------------------------------------------------
    # Random sampling
    # --------------------------------------------------

    rng = np.random.default_rng(42)

    sample_idx = rng.choice(
        len(edge_coords),
        size=min(num_sample_edges, len(edge_coords)),
        replace=False
    )

    cy, cx = H / 2, W / 2
    max_dist = np.sqrt(cx**2 + cy**2)

    r_shifts = []
    b_shifts = []

    r_center = []
    b_center = []

    r_outer = []
    b_outer = []

    half_win = 10

    # --------------------------------------------------
    # Subpixel edge localization
    # --------------------------------------------------

    def subpixel_edge_position(profile):

        grad = np.abs(np.gradient(profile))

        peak = np.argmax(grad)

        if peak <= 0 or peak >= len(grad) - 1:
            return float(peak)

        y1 = grad[peak - 1]
        y2 = grad[peak]
        y3 = grad[peak + 1]

        denom = (y1 - 2 * y2 + y3)

        if abs(denom) < 1e-8:
            return float(peak)

        offset = 0.5 * (y1 - y3) / denom

        return float(peak + offset)

    # --------------------------------------------------
    # Measure channel edge offsets
    # --------------------------------------------------

    for idx in sample_idx:

        row, col = edge_coords[idx]

        c1 = max(0, col - half_win)
        c2 = min(W, col + half_win + 1)

        if (c2 - c1) < 7:
            continue

        prof_r = r_ch[row, c1:c2]
        prof_g = g_ch[row, c1:c2]
        prof_b = b_ch[row, c1:c2]

        r_pos = subpixel_edge_position(prof_r)
        g_pos = subpixel_edge_position(prof_g)
        b_pos = subpixel_edge_position(prof_b)

        r_shift = r_pos - g_pos
        b_shift = b_pos - g_pos

        if abs(r_shift) > 5 or abs(b_shift) > 5:
            continue

        r_shifts.append(r_shift)
        b_shifts.append(b_shift)

        dist = np.sqrt(
            (col - cx) ** 2 +
            (row - cy) ** 2
        ) / max_dist

        if dist < 0.5:
            r_center.append(r_shift)
            b_center.append(b_shift)
        else:
            r_outer.append(r_shift)
            b_outer.append(b_shift)

    # --------------------------------------------------
    # Helper
    # --------------------------------------------------

    def safe_mean(lst):
        return float(np.mean(lst)) if len(lst) else 0.0

    mean_r = safe_mean(r_shifts)
    mean_b = safe_mean(b_shifts)

    center_r = safe_mean(r_center)
    center_b = safe_mean(b_center)

    outer_r = safe_mean(r_outer)
    outer_b = safe_mean(b_outer)

    worst_shift = max(
        abs(outer_r),
        abs(outer_b)
    )

    # --------------------------------------------------
    # Severity
    # --------------------------------------------------

    if worst_shift < 0.2:
        severity = "none"
    elif worst_shift < 0.5:
        severity = "low"
    elif worst_shift < 1.0:
        severity = "moderate"
    else:
        severity = "high"

    return {
        "mean_r_shift_px": round(mean_r, 3),
        "mean_b_shift_px": round(mean_b, 3),

        "center_r_shift_px": round(center_r, 3),
        "center_b_shift_px": round(center_b, 3),

        "outer_r_shift_px": round(outer_r, 3),
        "outer_b_shift_px": round(outer_b, 3),

        "lca_severity": severity
    }
 
 
def analyze_tonal_response(patches_lab, patches_bgr):
    """
    Fits a gamma / tonal response curve using the 6 neutral gray patches.
 
    How it works:
      - The 6 neutral patches have known reference L* values
        (96.5, 81.3, 66.8, 50.9, 35.7, 20.5) — white to black.
      - L* is a perceptual scale, but it's close to a power-law
        transformation of linear light. We convert our reference L*
        values to "linear scene reflectance" and compare against the
        measured pixel values.
      - By fitting pixel_value = a * (linear_light ^ gamma) we get the
        camera's effective encoding gamma.
      - A camera that encodes with sRGB has gamma ≈ 0.45 (1/2.2).
        The "display gamma" to decode it is ~2.2.
 
    Returns:
      neutral_patches       — measured vs reference for each gray patch
      estimated_gamma       — best-fit exponent
      r_squared             — goodness of fit (1.0 = perfect)
      tonal_verdict         — interpretation string
    """
    neutral_data = []
 
    for patch_idx, ref_L in zip(NEUTRAL_PATCH_INDICES, NEUTRAL_L_VALUES):
        measured_lab = patches_lab[patch_idx]
        measured_bgr = patches_bgr[patch_idx]
        measured_L   = measured_lab[0]
 
        # Convert reference L* → approximate linear reflectance
        # (inverse of the CIE L* formula)
        L_norm = ref_L / 100.0
        if L_norm > 0.08856:
            linear_ref = ((L_norm + 0.16) / 1.16) ** 3
        else:
            linear_ref = L_norm / 9.033
 
        # Mean pixel value (0-255) → normalised (0-1)
        pixel_val = np.mean(measured_bgr) / 255.0
 
        neutral_data.append({
            "patch_name":    PATCH_NAMES[patch_idx],
            "reference_L":   ref_L,
            "measured_L":    round(measured_L, 2),
            "linear_ref":    round(linear_ref, 4),
            "pixel_val_norm": round(pixel_val, 4),
        })
 
    # Fit gamma via least-squares in log space:
    #   log(pixel) = gamma * log(linear) + log(a)
    linear_refs = np.array([d["linear_ref"] for d in neutral_data])
    pixel_vals  = np.array([d["pixel_val_norm"] for d in neutral_data])
 
    # Guard against zeros before log
    valid = (linear_refs > 1e-4) & (pixel_vals > 1e-4)
    if valid.sum() >= 2:
        log_x = np.log(linear_refs[valid])
        log_y = np.log(pixel_vals[valid])
 
        # np.polyfit does a linear fit to log_y = gamma * log_x + b
        coeffs = np.polyfit(log_x, log_y, 1)
        estimated_gamma = float(coeffs[0])
 
        # R² — how well does a pure power law fit?
        y_pred = np.polyval(coeffs, log_x)
        ss_res = np.sum((log_y - y_pred) ** 2)
        ss_tot = np.sum((log_y - log_y.mean()) ** 2)
        r_squared = float(1.0 - ss_res / ss_tot) if ss_tot > 0 else 0.0
    else:
        estimated_gamma = float("nan")
        r_squared = 0.0
 
    # Interpret: typical camera-to-screen pipeline has encode gamma ~0.45
    if np.isnan(estimated_gamma):
        verdict = "insufficient data"
    elif 0.40 <= estimated_gamma <= 0.55:
        verdict = "normal sRGB-like encoding"
    elif estimated_gamma < 0.40:
        verdict = "lower than typical (darker midtones)"
    else:
        verdict = "higher than typical (brighter midtones)"
 
    return {
        "neutral_patches":  neutral_data,
        "estimated_gamma":  round(estimated_gamma, 4) if not np.isnan(estimated_gamma) else None,
        "r_squared":        round(r_squared, 4),
        "tonal_verdict":    verdict,
    }
 
 
def analyze_white_balance(patches_bgr):

    neutral_data = []
    rg_ratios, bg_ratios = [], []
 
    for patch_idx in NEUTRAL_PATCH_INDICES:
        b_val, g_val, r_val = patches_bgr[patch_idx]
 
        # Avoid division by zero on near-black or saturated patches
        if g_val < 10:
            continue
 
        rg = r_val / g_val
        bg = b_val / g_val
 
        neutral_data.append({
            "patch_name": PATCH_NAMES[patch_idx],
            "r_val": round(r_val, 2),
            "g_val": round(g_val, 2),
            "b_val": round(b_val, 2),
            "rg_ratio": round(rg, 4),
            "bg_ratio": round(bg, 4),
        })
        rg_ratios.append(rg)
        bg_ratios.append(bg)
 
    if not rg_ratios:
        return {"wb_verdict": "insufficient data"}
 
    mean_rg = float(np.mean(rg_ratios))
    mean_bg = float(np.mean(bg_ratios))
 
    rg_error_pct = (mean_rg - 1.0) * 100
    bg_error_pct = (mean_bg - 1.0) * 100
 
    rb_ratio = mean_rg / mean_bg if mean_bg > 0 else 1.0

    estimated_cct = max(1500.0, min(15000.0, 5000.0 / (rb_ratio ** 0.8)))
 
    # Verdict
    if abs(rg_error_pct) < 5 and abs(bg_error_pct) < 5:
        verdict = "neutral"
    elif rg_error_pct > 5 and bg_error_pct < -5:
        verdict = "warm (excess red, deficit blue)"
    elif rg_error_pct < -5 and bg_error_pct > 5:
        verdict = "cool (deficit red, excess blue)"
    elif rg_error_pct > 5:
        verdict = "slightly warm (excess red)"
    elif bg_error_pct > 5:
        verdict = "slightly cool (excess blue)"
    else:
        verdict = "mixed"
 
    return {
        "per_patch":        neutral_data,
        "mean_rg_ratio":    round(mean_rg, 4),
        "mean_bg_ratio":    round(mean_bg, 4),
        "rg_error_pct":     round(rg_error_pct, 2),
        "bg_error_pct":     round(bg_error_pct, 2),
        "estimated_cct_K":  round(estimated_cct, 0),
        "wb_verdict":       verdict,
    }
# ─────────────────────────────────────────────────────────────────
# GENERIC (REFERENCE-FREE) ANALYSIS FUNCTIONS
# ─────────────────────────────────────────────────────────────────

def analyze_color_generic(img):
    """
    Reference-free colour statistics for arbitrary images.
    Does NOT attempt ΔE or any chart-based measurement.

    Returns colorfulness, channel means, HSV stats, colour cast,
    and dominant colours (via k-means on a small thumbnail).
    """
    h, w = img.shape[:2]

    # --- Channel means (BGR → RGB for output) ---
    b_mean, g_mean, r_mean = [float(img[:, :, c].mean()) for c in range(3)]

    # --- Colorfulness (Hasler & Süsstrunk 2003) ---
    R, G, B = img[:, :, 2].astype(np.float64), img[:, :, 1].astype(np.float64), img[:, :, 0].astype(np.float64)
    rg = R - G
    yb = 0.5 * (R + G) - B
    sigma_rg, mu_rg = rg.std(), rg.mean()
    sigma_yb, mu_yb = yb.std(), yb.mean()
    sigma_rgyb = np.sqrt(sigma_rg ** 2 + sigma_yb ** 2)
    mu_rgyb    = np.sqrt(mu_rg ** 2 + mu_yb ** 2)
    colorfulness = float(sigma_rgyb + 0.3 * mu_rgyb)

    # --- HSV statistics ---
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV).astype(np.float64)
    # Hue is 0-180 in OpenCV; convert to 0-360
    hue_chan = hsv[:, :, 0] * 2.0
    sat_chan = hsv[:, :, 1] / 255.0
    val_chan = hsv[:, :, 2] / 255.0

    hsv_stats = {
        "mean_hue":           round(float(hue_chan.mean()), 2),
        "std_hue":            round(float(hue_chan.std()), 2),
        "mean_saturation":    round(float(sat_chan.mean()), 4),
        "std_saturation":     round(float(sat_chan.std()), 4),
        "mean_value":         round(float(val_chan.mean()), 4),
    }

    # --- Colour cast estimate ---
    rb_diff = r_mean - b_mean
    if rb_diff > 15:
        color_cast = "warm"
    elif rb_diff < -15:
        color_cast = "cool"
    else:
        color_cast = "neutral"

    # --- Dominant colours via k-means (on a small thumbnail for speed) ---
    thumb_size = 64
    thumb = cv2.resize(img, (thumb_size, thumb_size), interpolation=cv2.INTER_AREA)
    pixels = thumb.reshape(-1, 3).astype(np.float32)

    k = 5
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 20, 1.0)
    _, labels, centres = cv2.kmeans(pixels, k, None, criteria, 3, cv2.KMEANS_PP_CENTERS)

    label_counts = np.bincount(labels.flatten(), minlength=k)
    total = label_counts.sum()
    dominant_colors = []
    for idx in np.argsort(-label_counts):
        bgr = centres[idx]
        dominant_colors.append({
            "rgb": [int(bgr[2]), int(bgr[1]), int(bgr[0])],
            "percentage": round(float(label_counts[idx] / total * 100), 1),
        })

    return {
        "colorfulness":    round(colorfulness, 2),
        "channel_means":   {"R": round(r_mean, 2), "G": round(g_mean, 2), "B": round(b_mean, 2)},
        "hsv_stats":       hsv_stats,
        "color_cast":      color_cast,
        "dominant_colors":  dominant_colors,
    }


def analyze_tonal_generic(img):
  
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float64)
    total = gray.size

    mean_brightness = float(gray.mean())
    brightness_std  = float(gray.std())

    g_min, g_max = float(gray.min()), float(gray.max())
    michelson = (g_max - g_min) / (g_max + g_min) if (g_max + g_min) > 0 else 0.0
    rms_contrast = float(np.sqrt(np.mean((gray - mean_brightness) ** 2)))

    # Histogram entropy
    hist = cv2.calcHist([gray.astype(np.uint8)], [0], None, [256], [0, 256]).flatten()
    hn = hist / hist.sum()
    entropy = float(-np.sum(hn[hn > 0] * np.log2(hn[hn > 0])))

    # Zone percentages
    shadow_pct    = float(np.sum(gray < 30) / total * 100)
    midtone_pct   = float(np.sum((gray >= 30) & (gray <= 225)) / total * 100)
    highlight_pct = float(np.sum(gray > 225) / total * 100)

    # Dynamic range estimate
    p1, p5, p25, p50, p75, p95, p99 = np.percentile(gray, [1, 5, 25, 50, 75, 95, 99])
    dynamic_range_estimate = float(p99 - p1)

    return {
        "mean_brightness":        round(mean_brightness, 2),
        "brightness_std":         round(brightness_std, 2),
        "contrast_michelson":     round(michelson, 4),
        "rms_contrast":           round(rms_contrast, 2),
        "histogram_entropy":      round(entropy, 3),
        "shadow_pct":             round(shadow_pct, 2),
        "midtone_pct":            round(midtone_pct, 2),
        "highlight_pct":          round(highlight_pct, 2),
        "dynamic_range_estimate": round(dynamic_range_estimate, 2),
        "percentiles": {
            "p5":  int(p5),
            "p25": int(p25),
            "p50": int(p50),
            "p75": int(p75),
            "p95": int(p95),
        },
    }


def analyze_wb_generic(img):
    """
    Gray World–based white balance estimation for arbitrary images.
    Does NOT compare against any reference chart.

    The Gray World assumption says the average colour of a scene should be
    neutral grey. Deviations from equal R:G:B means indicate a colour cast.
    """
    b_mean = float(img[:, :, 0].mean())
    g_mean = float(img[:, :, 1].mean())
    r_mean = float(img[:, :, 2].mean())

    rg_ratio = r_mean / g_mean if g_mean > 0 else 1.0
    bg_ratio = b_mean / g_mean if g_mean > 0 else 1.0

    # Gray World correction gains (normalise to G channel)
    r_gain = g_mean / r_mean if r_mean > 0 else 1.0
    b_gain = g_mean / b_mean if b_mean > 0 else 1.0

    # Rough CCT from R/B ratio (same empirical formula used in chart WB)
    rb_ratio = rg_ratio / bg_ratio if bg_ratio > 0 else 1.0
    estimated_cct = max(1500.0, min(15000.0, 5000.0 / (rb_ratio ** 0.8)))

    # Cast verdict
    rg_err = (rg_ratio - 1.0) * 100
    bg_err = (bg_ratio - 1.0) * 100

    if abs(rg_err) < 5 and abs(bg_err) < 5:
        cast = "neutral"
    elif rg_err > 5 and bg_err < -5:
        cast = "warm (excess red, deficit blue)"
    elif rg_err < -5 and bg_err > 5:
        cast = "cool (deficit red, excess blue)"
    elif rg_err > 5:
        cast = "slightly warm (excess red)"
    elif bg_err > 5:
        cast = "slightly cool (excess blue)"
    else:
        cast = "mixed"

    return {
        "mean_r":          round(r_mean, 2),
        "mean_g":          round(g_mean, 2),
        "mean_b":          round(b_mean, 2),
        "rg_ratio":        round(rg_ratio, 4),
        "bg_ratio":        round(bg_ratio, 4),
        "estimated_cast":  cast,
        "gray_world_correction": {
            "r_gain": round(r_gain, 4),
            "g_gain": 1.0,
            "b_gain": round(b_gain, 4),
        },
        "estimated_cct_K": round(estimated_cct, 0),
    }



def analyze_color(img, patches_lab=None):
    """
    Colour analysis dispatcher.
    If patches_lab (from a detected ColorChecker) is provided, runs the
    existing ΔE2000 chart analysis.  Otherwise runs generic colour stats.
    Every return dict includes 'analysis_mode': 'chart' | 'generic'.
    """
    if patches_lab is not None:
        result = analyze_color_accuracy(patches_lab)
        result["analysis_mode"] = "chart"
        return result
    else:
        result = analyze_color_generic(img)
        result["analysis_mode"] = "generic"
        return result


def analyze_tonal(img, patches_lab=None, patches_bgr=None):

    if patches_lab is not None and patches_bgr is not None:
        result = analyze_tonal_response(patches_lab, patches_bgr)
        result["analysis_mode"] = "chart"
        return result
    else:
        result = analyze_tonal_generic(img)
        result["analysis_mode"] = "generic"
        return result


def analyze_wb(img, patches_bgr=None):
  
    if patches_bgr is not None:
        result = analyze_white_balance(patches_bgr)
        result["analysis_mode"] = "chart"
        return result
    else:
        result = analyze_wb_generic(img)
        result["analysis_mode"] = "generic"
        return result


def analyze_sharpness_dispatch(img, mtf_patches=None):

    if mtf_patches is not None:
        # Future: MTF chart-based sharpness analysis
        # result = analyze_sharpness_mtf(img, mtf_patches)
        # result["analysis_mode"] = "chart"
        # return result
        pass

    result = analyze_sharpness(img)
    result["analysis_mode"] = "generic"
    return result


# ─────────────────────────────────────────────────────────────────
# STEP 5 — MAIN PIPELINE
# ─────────────────────────────────────────────────────────────────

def analyze_chart_photo(image_path):

    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Could not load image: {image_path}")

    rectified, _, chart_ok = detect_and_rectify_chart(img)
    patches_lab = patches_bgr = None
    target_img = img                      # analyse original image by default
    if chart_ok:
        patches_bgr, patches_lab = extract_patches(rectified)
        target_img = rectified            # use rectified chart for all metrics

    return {
        "sharpness":      analyze_sharpness_dispatch(target_img),
        "noise":          estimate_noise(target_img),
        "dynamic_range":  analyze_dynamic_range(target_img),
        "color_accuracy": analyze_color(target_img, patches_lab),
        "blur":           analyze_blur(target_img),
        "exposure":       analyze_exposure(target_img),
        "histogram":      generate_histogram(target_img),
        "lca":            analyze_lca(target_img),
        "tonal_response": analyze_tonal(target_img, patches_lab, patches_bgr),
        "white_balance":  analyze_wb(target_img, patches_bgr),
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

    def full_metrics(img, rectified, chart_ok):
        patches_lab = patches_bgr = None
        target_img = img
        if chart_ok:
            patches_bgr, patches_lab = extract_patches(rectified)
            target_img = rectified
        return {
            "sharpness":      analyze_sharpness_dispatch(target_img),
            "noise":          estimate_noise(target_img),
            "dynamic_range":  analyze_dynamic_range(target_img),
            "color_accuracy": analyze_color(target_img, patches_lab),
            "blur":           analyze_blur(target_img),
            "exposure":       analyze_exposure(target_img),
            "histogram":      generate_histogram(target_img),
            "lca":            analyze_lca(target_img),
            "tonal_response": analyze_tonal(target_img, patches_lab, patches_bgr),
            "white_balance":  analyze_wb(target_img, patches_bgr),
        }

    target_a = rect_a if ok_a else img_a
    target_b = rect_b if ok_b else img_b

    return {
        "camera_A":   full_metrics(img_a, rect_a, ok_a),
        "camera_B":   full_metrics(img_b, rect_b, ok_b),
        "similarity": compute_similarity_from_arrays(target_a, target_b),
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



if __name__ == "__main__":
    import json, sys

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

        print("\n── LCA (Chromatic Aberration) ─────────")
        lca = result["lca"]
        print(f"  mean R shift : {lca['mean_r_shift_px']} px")
        print(f"  mean B shift : {lca['mean_b_shift_px']} px")
        print(f"  outer R shift: {lca['outer_r_shift_px']} px")
        print(f"  outer B shift: {lca['outer_b_shift_px']} px")
        print(f"  severity     : {lca['lca_severity']}")
    
        print("\n── Tonal Response / Gamma ─────────────")
        tr = result["tonal_response"]
        print(f"  estimated gamma : {tr['estimated_gamma']}")
        print(f"  R²              : {tr['r_squared']}")
        print(f"  verdict         : {tr['tonal_verdict']}")
        print("  neutral patches:")
        for p in tr["neutral_patches"]:
            print(f"    {p['patch_name']:<12}  ref L={p['reference_L']:5.1f}  "
                f"measured L={p['measured_L']:5.1f}  pixel={p['pixel_val_norm']:.3f}")
    
        print("\n── White Balance ──────────────────────")
        wb = result["white_balance"]
        print(f"  R/G ratio      : {wb['mean_rg_ratio']}  (error: {wb['rg_error_pct']:+.1f}%)")
        print(f"  B/G ratio      : {wb['mean_bg_ratio']}  (error: {wb['bg_error_pct']:+.1f}%)")
        print(f"  estimated CCT  : {wb['estimated_cct_K']} K")
        print(f"  verdict        : {wb['wb_verdict']}")
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
