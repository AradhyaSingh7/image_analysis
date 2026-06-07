import os
import sys
from PIL import Image
from PIL.ExifTags import TAGS          
import exifread


def read_metadata_exifread(image_path: str) -> dict:
    """Read raw EXIF metadata from an image file using exifread."""
    metadata = {}

    with open(image_path, "rb") as f:
        tags = exifread.process_file(f, details=False)  

    for tag_name, value in tags.items():
        metadata[tag_name] = str(value)   

    return metadata


def extract_metadata(image_path: str) -> dict:
    """
    Extract a concise, structured metadata summary from an image.
    Returns a dict with standardised keys suitable for JSON API responses.

    Keys returned (value is None when the tag is absent):
        camera_make, camera_model, resolution, iso,
        exposure_time, aperture, focal_length,
        software, flash, white_balance, orientation, datetime
    Also includes 'all_tags' with every raw tag for the "View Full Metadata" modal.
    """
    raw = read_metadata_exifread(image_path)

    # --- helpers -----------------------------------------------------------
    def _get(*candidates):
        """Return the first matching tag value, or None."""
        for key in candidates:
            # exifread prefixes tags with IFD name, e.g. "Image Make", "EXIF ISOSpeedRatings"
            for raw_key, raw_val in raw.items():
                if raw_key.endswith(key):
                    return str(raw_val).strip()
        return None

    # --- resolution via Pillow (more reliable than EXIF tags) ---------------
    try:
        with Image.open(image_path) as img:
            width, height = img.size
        resolution = f"{width}×{height}"
    except Exception:
        w = _get("ImageWidth", "ExifImageWidth", "PixelXDimension")
        h = _get("ImageLength", "ExifImageLength", "PixelYDimension")
        resolution = f"{w}×{h}" if w and h else None

    # --- build concise summary ---------------------------------------------
    summary = {
        "camera_make":   _get("Make"),
        "camera_model":  _get("Model"),
        "resolution":    resolution,
        "iso":           _get("ISOSpeedRatings"),
        "exposure_time": _get("ExposureTime"),
        "aperture":      _get("FNumber"),
        "focal_length":  _get("FocalLength"),
        # extras for full-metadata modal
        "software":      _get("Software"),
        "flash":         _get("Flash"),
        "white_balance": _get("WhiteBalance"),
        "orientation":   _get("Orientation"),
        # raw dump for "View Full Metadata"
        "all_tags":      raw,
    }

    return summary


# ───────────────────────────── PRETTY PRINTER ──────────────────────────────

def print_metadata(metadata: dict, title: str):
    if not metadata:
        print("  (no data found)")
        return

    camera_tags   = ["Make", "Model", "Software"]
    settings_tags = ["FocalLength", "FNumber", "ISOSpeedRatings",
                     "ExposureTime", "Flash", "WhiteBalance", "ExposureMode"]
    image_tags    = ["ImageWidth", "ImageLength", "Orientation",
                     "XResolution", "YResolution", "DateTime"]

    def print_group(label, keys):
        found = {k: v for k, v in metadata.items() if k in keys}
        if found:
            print(f"\n  {label}")
            for k, v in found.items():
                print(f"     {k:<25} : {v}")

    print_group("Camera Info",     camera_tags)
    print_group("Shoot Settings",  settings_tags)
    print_group("Image Properties",image_tags)

   
    shown = set(camera_tags + settings_tags + image_tags)
    extras = {k: v for k, v in metadata.items() if k not in shown}
    if extras:
        print(f"\n  📋 Other Tags")
        for k, v in extras.items():
            print(f"     {k:<25} : {v}")


if __name__ == "__main__":

    if len(sys.argv) > 1:
        image_path = sys.argv[1]
    else:
        image_path = "sample.jpg"      

    print(f"\n Reading metadata from: {image_path}")

    # Structured summary
    summary = extract_metadata(image_path)
    print("\n── Concise Summary ──")
    for key in ["camera_make", "camera_model", "resolution", "iso",
                "exposure_time", "aperture", "focal_length"]:
        val = summary.get(key) or "(not available)"
        print(f"   {key:<16} : {val}")

    # Full raw dump
    exifread_meta = read_metadata_exifread(image_path)
    print_metadata(exifread_meta, "Full EXIF — exifread")

    print(f"\nSummary")
    print(f"   exifread found : {len(exifread_meta)} tags")