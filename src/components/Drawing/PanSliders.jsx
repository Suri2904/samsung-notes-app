import { useRef, useCallback } from 'react';
import './PanSliders.css';

export const PanSliders = ({ zoom, pan, onPanChange, canvasRef }) => {
  const horizontalSliderRef = useRef(null);
  const verticalSliderRef = useRef(null);
  const isDraggingHorizontal = useRef(false);
  const isDraggingVertical = useRef(false);

  // Only show sliders when zoomed in
  if (zoom <= 1) return null;

  const getCanvasBounds = () => {
    if (!canvasRef.current) return { width: 0, height: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
      scaledWidth: rect.width * zoom,
      scaledHeight: rect.height * zoom
    };
  };

  // Calculate slider positions (0 to 1)
  const getSliderPositions = () => {
    const bounds = getCanvasBounds();

    // Calculate how much we can pan (overflow amount)
    const maxPanX = Math.max(0, bounds.scaledWidth - bounds.width);
    const maxPanY = Math.max(0, bounds.scaledHeight - bounds.height);

    // Current pan as percentage (inverted because pan is negative when scrolled right/down)
    const horizontalPos = maxPanX > 0 ? Math.max(0, Math.min(1, -pan.x / maxPanX)) : 0;
    const verticalPos = maxPanY > 0 ? Math.max(0, Math.min(1, -pan.y / maxPanY)) : 0;

    return { horizontalPos, verticalPos, maxPanX, maxPanY };
  };

  const { horizontalPos, verticalPos, maxPanX, maxPanY } = getSliderPositions();

  // Handle horizontal slider drag
  const handleHorizontalDrag = useCallback((e) => {
    if (!isDraggingHorizontal.current || !horizontalSliderRef.current) return;

    const rect = horizontalSliderRef.current.getBoundingClientRect();
    const x = e.clientX || e.touches?.[0]?.clientX;
    const relativeX = (x - rect.left) / rect.width;
    const clampedX = Math.max(0, Math.min(1, relativeX));

    onPanChange({
      x: -clampedX * maxPanX,
      y: pan.y
    });
  }, [maxPanX, pan.y, onPanChange]);

  // Handle vertical slider drag
  const handleVerticalDrag = useCallback((e) => {
    if (!isDraggingVertical.current || !verticalSliderRef.current) return;

    const rect = verticalSliderRef.current.getBoundingClientRect();
    const y = e.clientY || e.touches?.[0]?.clientY;
    const relativeY = (y - rect.top) / rect.height;
    const clampedY = Math.max(0, Math.min(1, relativeY));

    onPanChange({
      x: pan.x,
      y: -clampedY * maxPanY
    });
  }, [maxPanY, pan.x, onPanChange]);

  // Mouse/touch event handlers
  const startHorizontalDrag = (e) => {
    isDraggingHorizontal.current = true;
    handleHorizontalDrag(e);
  };

  const startVerticalDrag = (e) => {
    isDraggingVertical.current = true;
    handleVerticalDrag(e);
  };

  const stopDrag = () => {
    isDraggingHorizontal.current = false;
    isDraggingVertical.current = false;
  };

  // Global mouse/touch move and up listeners
  const handleGlobalMove = useCallback((e) => {
    if (isDraggingHorizontal.current) {
      e.preventDefault();
      handleHorizontalDrag(e);
    }
    if (isDraggingVertical.current) {
      e.preventDefault();
      handleVerticalDrag(e);
    }
  }, [handleHorizontalDrag, handleVerticalDrag]);

  const handleGlobalUp = useCallback(() => {
    stopDrag();
  }, []);

  // Attach global listeners
  if (typeof window !== 'undefined') {
    window.addEventListener('mousemove', handleGlobalMove);
    window.addEventListener('mouseup', handleGlobalUp);
    window.addEventListener('touchmove', handleGlobalMove, { passive: false });
    window.addEventListener('touchend', handleGlobalUp);
  }

  return (
    <>
      {/* Horizontal slider */}
      <div className="pan-slider horizontal-slider">
        <div
          ref={horizontalSliderRef}
          className="slider-track"
          onMouseDown={startHorizontalDrag}
          onTouchStart={startHorizontalDrag}
        >
          <div
            className="slider-thumb"
            style={{ left: `${horizontalPos * 100}%` }}
          />
        </div>
      </div>

      {/* Vertical slider */}
      <div className="pan-slider vertical-slider">
        <div
          ref={verticalSliderRef}
          className="slider-track"
          onMouseDown={startVerticalDrag}
          onTouchStart={startVerticalDrag}
        >
          <div
            className="slider-thumb"
            style={{ top: `${verticalPos * 100}%` }}
          />
        </div>
      </div>
    </>
  );
};
