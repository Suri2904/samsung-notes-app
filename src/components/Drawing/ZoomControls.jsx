import { useState } from 'react';
import './ZoomControls.css';

export const ZoomControls = ({ zoom, onZoomChange, onFitToPage }) => {
  const zoomPercentage = Math.round(zoom * 100);

  const handleZoomIn = () => {
    const newZoom = Math.min(zoom + 0.25, 4);
    onZoomChange(newZoom);
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoom - 0.25, 0.25);
    onZoomChange(newZoom);
  };

  return (
    <div className="zoom-controls">
      <button
        className="zoom-btn zoom-out"
        onClick={handleZoomOut}
        disabled={zoom <= 0.25}
        title="Zoom out"
      >
        −
      </button>

      <div className="zoom-percentage" onClick={onFitToPage} title="Click to fit page">
        {zoomPercentage}%
      </div>

      <button
        className="zoom-btn zoom-in"
        onClick={handleZoomIn}
        disabled={zoom >= 4}
        title="Zoom in"
      >
        +
      </button>
    </div>
  );
};
