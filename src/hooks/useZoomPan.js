import { useState, useCallback, useRef, useEffect } from 'react';

export const useZoomPan = (canvasRef) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showZoomIndicator, setShowZoomIndicator] = useState(false);

  const isPanning = useRef(false);
  const lastPanPoint = useRef(null);
  const lastPinchDistance = useRef(null);
  const zoomIndicatorTimeout = useRef(null);

  // Transform screen coordinates to canvas coordinates
  const screenToCanvas = useCallback((screenX, screenY) => {
    if (!canvasRef.current) return { x: screenX, y: screenY };

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (screenX - rect.left - pan.x) / zoom;
    const y = (screenY - rect.top - pan.y) / zoom;

    return { x, y };
  }, [zoom, pan]);

  // Show zoom indicator temporarily
  const flashZoomIndicator = useCallback(() => {
    setShowZoomIndicator(true);
    if (zoomIndicatorTimeout.current) {
      clearTimeout(zoomIndicatorTimeout.current);
    }
    zoomIndicatorTimeout.current = setTimeout(() => {
      setShowZoomIndicator(false);
    }, 1500);
  }, []);

  // Handle zoom
  const handleZoom = useCallback((newZoom, centerX, centerY) => {
    const clampedZoom = Math.min(Math.max(newZoom, 0.25), 4);

    if (clampedZoom === zoom) return;

    // Zoom towards the center point
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const x = centerX - rect.left;
      const y = centerY - rect.top;

      // Adjust pan to zoom towards the point
      const newPan = {
        x: x - (x - pan.x) * (clampedZoom / zoom),
        y: y - (y - pan.y) * (clampedZoom / zoom)
      };

      setPan(newPan);
    }

    setZoom(clampedZoom);
    flashZoomIndicator();
  }, [zoom, pan, flashZoomIndicator]);

  // Handle pinch gesture
  const handlePinch = useCallback((touches) => {
    if (touches.length !== 2) return;

    const touch1 = touches[0];
    const touch2 = touches[1];

    const distance = Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) +
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );

    if (lastPinchDistance.current !== null) {
      const delta = distance - lastPinchDistance.current;
      const zoomDelta = delta * 0.01;

      // Center point between two fingers
      const centerX = (touch1.clientX + touch2.clientX) / 2;
      const centerY = (touch1.clientY + touch2.clientY) / 2;

      handleZoom(zoom + zoomDelta, centerX, centerY);
    }

    lastPinchDistance.current = distance;
  }, [zoom, handleZoom]);

  // Handle two-finger pan
  const handleTwoFingerPan = useCallback((touches) => {
    if (touches.length !== 2) return;

    const centerX = (touches[0].clientX + touches[1].clientX) / 2;
    const centerY = (touches[0].clientY + touches[1].clientY) / 2;

    if (lastPanPoint.current) {
      const dx = centerX - lastPanPoint.current.x;
      const dy = centerY - lastPanPoint.current.y;

      setPan(prev => ({
        x: prev.x + dx,
        y: prev.y + dy
      }));
    }

    lastPanPoint.current = { x: centerX, y: centerY };
  }, []);

  // Touch start handler
  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      isPanning.current = true;
      lastPanPoint.current = null;
      lastPinchDistance.current = null;
    }
  }, []);

  // Touch move handler
  const handleTouchMove = useCallback((e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      handlePinch(e.touches);
      handleTwoFingerPan(e.touches);
    }
  }, [handlePinch, handleTwoFingerPan]);

  // Touch end handler
  const handleTouchEnd = useCallback(() => {
    isPanning.current = false;
    lastPanPoint.current = null;
    lastPinchDistance.current = null;
  }, []);

  // Wheel zoom (desktop)
  const handleWheel = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = -e.deltaY * 0.01;
      handleZoom(zoom + delta, e.clientX, e.clientY);
    }
  }, [zoom, handleZoom]);

  // Fit to page
  const fitToPage = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    flashZoomIndicator();
  }, [flashZoomIndicator]);

  // Double tap to toggle zoom
  const lastTapTime = useRef(0);
  const handleDoubleTap = useCallback((e) => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapTime.current;

    if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
      // Double tap detected
      if (zoom === 1) {
        handleZoom(2, e.clientX || e.touches[0].clientX, e.clientY || e.touches[0].clientY);
      } else {
        fitToPage();
      }
    }

    lastTapTime.current = now;
  }, [zoom, handleZoom, fitToPage]);

  // Attach event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, handleWheel]);

  return {
    zoom,
    pan,
    showZoomIndicator,
    screenToCanvas,
    fitToPage,
    handleDoubleTap
  };
};
