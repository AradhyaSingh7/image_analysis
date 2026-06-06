import os
import sys
from PIL import Image
from PIL.ExifTags import TAGS          
import exifread

def read_metadata_exifread(image_path: str) -> dict:

    metadata = {}

    with open(image_path, "rb") as f:
        tags = exifread.process_file(f, details=False)  

    for tag_name, value in tags.items():
        metadata[tag_name] = str(value)   

    return metadata


# PRETTY PRINTER

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

    exifread_meta = read_metadata_exifread(image_path)

    print_metadata(exifread_meta, "METHOD 2 — exifread")

    # --- Quick comparison ---
    print(f"\nSummary")
    print(f"   exifread found : {len(exifread_meta)} tags")