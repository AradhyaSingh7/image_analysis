import exifr from 'exifr';

/**
 * Extract EXIF metadata from an image File object.
 * Returns a structured summary for the metadata overlay,
 * plus the full raw EXIF data for the "View Full Metadata" modal.
 */
export async function extractMetadata(file) {
  try {
    const exif = await exifr.parse(file, {
      // Pull all useful tags
      pick: [
        'Make', 'Model',
        'ImageWidth', 'ImageHeight',
        'ExifImageWidth', 'ExifImageHeight',
        'ISO', 'ISOSpeedRatings',
        'ExposureTime', 'FNumber', 'FocalLength',
        'Software', 'Flash', 'WhiteBalance',
        'Orientation', 'DateTimeOriginal', 'CreateDate',
      ],
    });

    if (!exif) return null;

    // Also grab full raw tags for the modal
    const allTags = await exifr.parse(file);

    // Build camera string
    const make = exif.Make || '';
    const model = exif.Model || '';
    const camera = [make, model].filter(Boolean).join(' ') || null;

    // Normalise resolution
    const width = exif.ExifImageWidth || exif.ImageWidth;
    const height = exif.ExifImageHeight || exif.ImageHeight;
    const resolution = width && height ? `${width}×${height}` : null;

    // ISO
    const iso = exif.ISO ?? exif.ISOSpeedRatings ?? null;

    // Exposure time formatting
    let exposureTime = null;
    if (exif.ExposureTime != null) {
      if (exif.ExposureTime < 1) {
        exposureTime = `1/${Math.round(1 / exif.ExposureTime)}s`;
      } else {
        exposureTime = `${exif.ExposureTime}s`;
      }
    }

    // Aperture
    const aperture = exif.FNumber != null ? `f/${exif.FNumber}` : null;

    // Focal length
    const focalLength = exif.FocalLength != null ? `${exif.FocalLength}mm` : null;

    // Extras for full modal
    const software = exif.Software || null;
    const flash = exif.Flash != null ? String(exif.Flash) : null;
    const whiteBalance = exif.WhiteBalance != null ? String(exif.WhiteBalance) : null;
    const datetime = exif.DateTimeOriginal || exif.CreateDate || null;

    return {
      camera,
      resolution,
      iso: iso != null ? String(iso) : null,
      exposureTime,
      aperture,
      focalLength,
      // extras
      software,
      flash,
      whiteBalance,
      datetime: datetime ? new Date(datetime).toLocaleString() : null,
      // raw for "View Full Metadata"
      allTags: allTags || {},
    };
  } catch {
    return null;
  }
}
