import { useEffect, useRef, useState } from 'react';
import { storage } from '../utils/storage';

export const useAutoSave = (drawingId, getDrawingData, interval = 30000) => {
  const [lastSaved, setLastSaved] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef(null);
  const intervalRef = useRef(null);

  const saveDrawing = async () => {
    if (!drawingId) return;

    try {
      setIsSaving(true);
      const drawingData = getDrawingData();
      storage.saveDrawing({
        id: drawingId,
        ...drawingData
      });
      setLastSaved(new Date());
    } catch (err) {
      console.error('Auto-save failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Debounced save (for immediate changes like strokes)
  const debouncedSave = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(saveDrawing, 2000); // 2s debounce
  };

  // Periodic auto-save
  useEffect(() => {
    if (!drawingId) return;

    intervalRef.current = setInterval(saveDrawing, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [drawingId, interval]);

  // Save on unmount
  useEffect(() => {
    return () => {
      if (drawingId && getDrawingData) {
        saveDrawing();
      }
    };
  }, [drawingId]);

  return {
    lastSaved,
    isSaving,
    saveNow: saveDrawing,
    debouncedSave
  };
};
