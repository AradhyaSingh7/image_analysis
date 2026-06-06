import { useState, useRef, useCallback } from 'react';
import './ImageUploader.css';

export default function ImageUploader({ label, sublabel, onImageSelect, image, id }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      onImageSelect({
        url: e.target.result,
        name: file.name,
        size: file.size,
        type: file.type,
      });
      setIsLoading(false);
    };
    reader.readAsDataURL(file);
  }, [onImageSelect]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    handleFile(file);
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    onImageSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="uploader" id={id}>
      <div className="uploader__label-row">
        <span className="uploader__label">{label}</span>
        <span className="uploader__sublabel">{sublabel}</span>
      </div>

      <div
        className={`uploader__zone ${isDragOver ? 'uploader__zone--drag' : ''} ${image ? 'uploader__zone--has-image' : ''} ${isLoading ? 'uploader__zone--loading' : ''}`}
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        role="button"
        tabIndex={0}
        aria-label={`Upload ${label}`}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(); }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="uploader__input"
          aria-hidden="true"
          id={`${id}-input`}
        />

        {isLoading && (
          <div className="uploader__loading">
            <div className="uploader__spinner"></div>
            <span>Processing...</span>
          </div>
        )}

        {!image && !isLoading && (
          <div className="uploader__placeholder">
            <div className="uploader__icon-wrapper">
              <svg className="uploader__icon" width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="6" width="32" height="28" rx="4" stroke="currentColor" strokeWidth="1.5" opacity="0.6"/>
                <circle cx="14" cy="16" r="3" stroke="currentColor" strokeWidth="1.5" opacity="0.8"/>
                <path d="M4 28L12.5 20.5C13.3 19.8 14.5 19.8 15.3 20.5L22 26.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>
                <path d="M22 24L25.5 20.5C26.3 19.7 27.7 19.7 28.5 20.5L36 28" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>
              </svg>
            </div>
            <div className="uploader__text-group">
              <span className="uploader__text-primary">
                Drop your image here, or <span className="uploader__browse">browse</span>
              </span>
              <span className="uploader__text-secondary">
                Supports PNG, JPG, WEBP, TIFF, BMP
              </span>
            </div>
          </div>
        )}

        {image && !isLoading && (
          <div className="uploader__preview">
            <img
              src={image.url}
              alt={`${label} preview`}
              className="uploader__preview-img"
            />
            <div className="uploader__preview-overlay">
              <button
                className="uploader__remove-btn"
                onClick={handleRemove}
                aria-label={`Remove ${label}`}
                id={`${id}-remove`}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M4 4L14 14M14 4L4 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
              <button
                className="uploader__change-btn"
                onClick={(e) => { e.stopPropagation(); handleClick(); }}
                id={`${id}-change`}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 10L9 3L11 5L4 12H2V10Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                </svg>
                Change
              </button>
            </div>
            <div className="uploader__file-info">
              <span className="uploader__file-name">{image.name}</span>
              <span className="uploader__file-size">{formatSize(image.size)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
