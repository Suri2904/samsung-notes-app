import { useEffect, useState, useCallback, useMemo } from 'react';
import { useDrawing } from '../../hooks/useDrawing';
import { useAutoSave } from '../../hooks/useAutoSave';
import { useZoomPan } from '../../hooks/useZoomPan';
import { useToastContext } from '../../context/ToastContext';
import { storage } from '../../utils/storage';
import { migrateToCurrentSchema, detectSchemaVersion } from '../../utils/schemaMigration';
import { DrawingToolbar } from './DrawingToolbar';
import { PageManager } from './PageManager';
import { ZoomControls } from './ZoomControls';
import { PanSliders } from './PanSliders';
import jsPDF from 'jspdf';
import './DrawingCanvas.css';

export const DrawingCanvas = ({ drawing, onBack }) => {
  // Auto-migrate drawing to V2 schema if needed
  const migratedDrawing = useMemo(() => {
    const version = detectSchemaVersion(drawing);
    return version < 2 ? migrateToCurrentSchema(drawing) : drawing;
  }, [drawing]);

  const [editableTitle, setEditableTitle] = useState(migratedDrawing.title || 'Untitled Drawing');
  const [pages, setPages] = useState(migratedDrawing.pages || [{
    id: crypto.randomUUID(),
    size: 'A4',
    orientation: 'landscape',
    backgroundPattern: 'plain',
    strokes: []
  }]);
  const [currentPage, setCurrentPage] = useState(migratedDrawing.currentPageIndex || 0);
  const [showBackgroundMenu, setShowBackgroundMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPageSizeMenu, setShowPageSizeMenu] = useState(false);

  // Per-page size/orientation (V2 schema)
  const currentPageConfig = pages[currentPage] || { size: 'A4', orientation: 'landscape' };
  const [pageSize, setPageSize] = useState((currentPageConfig.size || 'A4').toLowerCase());
  const [pageOrientation, setPageOrientation] = useState(currentPageConfig.orientation || 'landscape');

  const toast = useToastContext();

  const {
    canvasRef,
    initCanvas,
    startDrawing,
    draw,
    stopDrawing,
    currentTool,
    setCurrentTool,
    currentColor,
    setCurrentColor,
    currentSize,
    setCurrentSize,
    background,
    setBackground,
    undo,
    redo,
    clearCanvas,
    getCanvasDataURL,
    getDrawingData,
    loadDrawingData,
    canUndo,
    canRedo
  } = useDrawing(pageSize, pageOrientation);

  // Get complete drawing data for auto-save (V2 schema)
  const getCompleteDrawingData = useCallback(() => {
    // Save current page first
    const currentPageData = getDrawingData();

    // Update pages with V2 schema structure
    const allPages = pages.map((page, i) => {
      if (i === currentPage) {
        // Current page: merge fresh drawing data
        return {
          id: page.id || crypto.randomUUID(),
          size: pageSize.toUpperCase(),
          orientation: pageOrientation,
          backgroundPattern: currentPageData.backgroundPattern || currentPageData.background || 'plain',
          strokes: currentPageData.strokes || []
        };
      } else {
        // Other pages: ensure V2 format
        return {
          id: page.id || crypto.randomUUID(),
          size: (page.size || 'A4').toUpperCase(),
          orientation: page.orientation || 'landscape',
          backgroundPattern: page.backgroundPattern || page.background || 'plain',
          strokes: page.strokes || []
        };
      }
    });

    return {
      schemaVersion: 2,
      id: migratedDrawing.id,
      title: editableTitle,
      createdAt: migratedDrawing.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      zoom: zoom,
      pan: pan,
      currentPageIndex: currentPage,
      pages: allPages
    };
  }, [editableTitle, pageSize, pageOrientation, pages, currentPage, getDrawingData, zoom, pan, migratedDrawing]);

  // Auto-save integration
  const { lastSaved, isSaving, debouncedSave } = useAutoSave(
    drawing.id,
    getCompleteDrawingData,
    30000 // 30 seconds
  );

  // Format last saved time
  const lastSavedText = useMemo(() => {
    if (!lastSaved) return '';
    const seconds = Math.floor((Date.now() - lastSaved.getTime()) / 1000);
    if (seconds < 5) return '● Saved';
    if (seconds < 60) return `Saved ${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return `Saved ${minutes}m ago`;
  }, [lastSaved]);

  // Zoom and Pan
  const { zoom, pan, screenToCanvas, fitToPage, handleDoubleTap, setZoomLevel, setPanPosition } = useZoomPan(canvasRef);

  // Helper: Update current page size (V2 per-page config)
  const updatePageSize = useCallback((newSize) => {
    setPageSize(newSize);
    setPages(prev => {
      const updated = [...prev];
      if (updated[currentPage]) {
        updated[currentPage] = {
          ...updated[currentPage],
          size: newSize.toUpperCase()
        };
      }
      return updated;
    });
  }, [currentPage]);

  // Helper: Update current page orientation (V2 per-page config)
  const updatePageOrientation = useCallback((newOrientation) => {
    setPageOrientation(newOrientation);
    setPages(prev => {
      const updated = [...prev];
      if (updated[currentPage]) {
        updated[currentPage] = {
          ...updated[currentPage],
          orientation: newOrientation
        };
      }
      return updated;
    });
  }, [currentPage]);

  // Initialize canvas on mount
  useEffect(() => {
    initCanvas();
  }, [initCanvas]);

  // Load initial data once on mount
  useEffect(() => {
    if (drawing.pages?.[0]) {
      setTimeout(() => {
        loadDrawingData(drawing.pages[0]);
      }, 100);
    }
  }, []); // Only run once on mount

  // Trigger auto-save on stroke end, page change, tool change
  useEffect(() => {
    debouncedSave();
  }, [pages, currentPage, currentTool, background]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // Save current page data when switching pages
  const saveCurrentPage = useCallback(() => {
    const drawingData = getDrawingData();
    setPages(prev => {
      const updated = [...prev];
      updated[currentPage] = drawingData;
      return updated;
    });
  }, [currentPage, getDrawingData]);

  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage < 0 || newPage >= pages.length) return;

    // Save current page before switching
    saveCurrentPage();

    // Load new page
    setCurrentPage(newPage);

    // Wait for next tick to load page data
    setTimeout(() => {
      if (pages[newPage]) {
        loadDrawingData(pages[newPage]);
      } else {
        clearCanvas();
      }
    }, 50);
  };

  // Add new page (V2 schema with page config)
  const handleAddPage = () => {
    saveCurrentPage();
    const newPage = {
      id: crypto.randomUUID(),
      size: 'A4',
      orientation: 'landscape',
      backgroundPattern: 'plain',
      strokes: []
    };
    setPages(prev => [...prev, newPage]);
    setCurrentPage(pages.length);
    setTimeout(() => clearCanvas(), 50);
  };

  // Delete current page
  const handleDeletePage = (pageIndex) => {
    if (pages.length === 1) return; // Can't delete last page

    setPages(prev => prev.filter((_, i) => i !== pageIndex));

    // Adjust current page after deletion
    if (pageIndex === pages.length - 1) {
      // Deleted last page, go to previous
      setCurrentPage(pageIndex - 1);
    } else if (pageIndex < currentPage) {
      // Deleted page before current, adjust index
      setCurrentPage(currentPage - 1);
    }
    // If deleted page after current, currentPage stays same

    // Load the new current page
    setTimeout(() => {
      const newIndex = pageIndex === pages.length - 1 ? pageIndex - 1 :
                       pageIndex < currentPage ? currentPage - 1 : currentPage;
      const pageData = pages[newIndex];

      if (pageData) {
        loadDrawingData(pageData);
      } else {
        clearCanvas();
      }
    }, 50);
  };

  // Export drawing as JSON file (V2 schema)
  const handleExportJSON = () => {
    saveCurrentPage();

    // Use the V2 schema from getCompleteDrawingData
    const drawingFile = getCompleteDrawingData();

    const blob = new Blob([JSON.stringify(drawingFile, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${editableTitle}.samsungnote.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success('Drawing exported as JSON');
  };

  // Export as PDF
  const handleDownloadPDF = async () => {
    saveCurrentPage();

    const canvas = canvasRef.current;
    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = canvas.height / (window.devicePixelRatio || 1);

    const pdf = new jsPDF({
      orientation: width > height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [width, height]
    });

    for (let i = 0; i < pages.length; i++) {
      if (i > 0) pdf.addPage();

      const pageData = i === currentPage ? getDrawingData() : pages[i];
      if (pageData && pageData.imageData) {
        pdf.addImage(pageData.imageData, 'PNG', 0, 0, width, height);
      }
    }

    pdf.save(`${editableTitle}.pdf`);
    toast.success('PDF downloaded');
  };

  // Share (copy as image)
  const handleShare = async () => {
    try {
      const dataURL = getCanvasDataURL();
      const blob = await (await fetch(dataURL)).blob();

      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      toast.success('Copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.error('Failed to copy drawing');
    }
  };

  // Delete confirmation
  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    try {
      storage.deleteDrawing(drawing.id);
      toast.success('Drawing deleted');
      onBack();
    } catch (err) {
      toast.error('Failed to delete drawing');
    }
  };

  // Handle pointer events (with zoom/pan transformation)
  const handlePointerDown = (e) => {
    if (e.touches && e.touches.length === 2) return; // Let zoom/pan handle this
    e.preventDefault();
    handleDoubleTap(e);
    startDrawing(e);
  };

  const handlePointerMove = (e) => {
    if (e.touches && e.touches.length === 2) return; // Let zoom/pan handle this
    e.preventDefault();
    draw(e);
  };

  const handlePointerUp = (e) => {
    e.preventDefault();
    stopDrawing(e);
  };

  return (
    <div className="drawing-canvas-container">
      {/* Top toolbar */}
      <div className="drawing-top-toolbar">
        <button className="back-btn" onClick={onBack} title="Back">
          ← Back
        </button>

        <input
          type="text"
          className="drawing-title-input"
          value={editableTitle}
          onChange={(e) => setEditableTitle(e.target.value)}
          placeholder="Drawing Title"
        />

        {/* Auto-save indicator */}
        {lastSavedText && (
          <div className="save-indicator">
            {lastSavedText}
          </div>
        )}

        <div className="top-toolbar-actions">
          <button
            className="toolbar-action-btn"
            onClick={() => {
              setShowPageSizeMenu(!showPageSizeMenu);
              setShowBackgroundMenu(false);
            }}
            title="Page Size"
          >
            📄 {pageSize.toUpperCase()} {pageOrientation === 'landscape' ? '↔' : '↕'}
          </button>

          {showPageSizeMenu && (
            <div className="page-size-menu">
              <div className="menu-section">
                <div className="menu-label">Size</div>
                <button
                  className={pageSize === 'a4' ? 'active' : ''}
                  onClick={() => { updatePageSize('a4'); setShowPageSizeMenu(false); }}
                >
                  A4 (210 × 297mm)
                </button>
                <button
                  className={pageSize === 'a3' ? 'active' : ''}
                  onClick={() => { updatePageSize('a3'); setShowPageSizeMenu(false); }}
                >
                  A3 (297 × 420mm)
                </button>
              </div>
              <div className="menu-divider" />
              <div className="menu-section">
                <div className="menu-label">Orientation</div>
                <button
                  className={pageOrientation === 'portrait' ? 'active' : ''}
                  onClick={() => { updatePageOrientation('portrait'); setShowPageSizeMenu(false); }}
                >
                  ↕ Portrait
                </button>
                <button
                  className={pageOrientation === 'landscape' ? 'active' : ''}
                  onClick={() => { updatePageOrientation('landscape'); setShowPageSizeMenu(false); }}
                >
                  ↔ Landscape
                </button>
              </div>
            </div>
          )}

          <button
            className="toolbar-action-btn"
            onClick={() => {
              setShowBackgroundMenu(!showBackgroundMenu);
              setShowPageSizeMenu(false);
            }}
            title="Background"
          >
            ▦
          </button>

          {showBackgroundMenu && (
            <div className="background-menu">
              <button onClick={() => { setBackground('plain'); setShowBackgroundMenu(false); }}>
                Plain
              </button>
              <button onClick={() => { setBackground('ruled'); setShowBackgroundMenu(false); }}>
                Ruled
              </button>
              <button onClick={() => { setBackground('grid'); setShowBackgroundMenu(false); }}>
                Grid
              </button>
              <button onClick={() => { setBackground('dots'); setShowBackgroundMenu(false); }}>
                Dots
              </button>
            </div>
          )}

          <button className="toolbar-action-btn" onClick={handleExportJSON} title="Export as JSON (Editable)">
            💾 Export
          </button>

          <button className="toolbar-action-btn" onClick={handleDownloadPDF} title="Download PDF (Read-only)">
            📄 PDF
          </button>

          <button className="toolbar-action-btn" onClick={handleShare} title="Share">
            ⬆ Share
          </button>

          <button className="delete-btn" onClick={handleDeleteClick} title="Delete">
            🗑 Delete
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="canvas-wrapper">
        <div
          className="canvas-transform-wrapper"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0'
          }}
        >
          <canvas
            ref={canvasRef}
            className="drawing-canvas"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
            style={{ touchAction: 'none' }}
          />
        </div>

      </div>

      {/* Zoom Controls */}
      <ZoomControls
        zoom={zoom}
        onZoomChange={setZoomLevel}
        onFitToPage={fitToPage}
      />

      {/* Pan Sliders */}
      <PanSliders
        zoom={zoom}
        pan={pan}
        onPanChange={setPanPosition}
        canvasRef={canvasRef}
      />

      {/* Left toolbar */}
      <DrawingToolbar
        currentTool={currentTool}
        onToolChange={setCurrentTool}
        currentColor={currentColor}
        onColorChange={setCurrentColor}
        currentSize={currentSize}
        onSizeChange={setCurrentSize}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
      />

      {/* Page manager */}
      <PageManager
        pages={pages}
        currentPage={currentPage}
        onPageChange={handlePageChange}
        onAddPage={handleAddPage}
        onDeletePage={handleDeletePage}
      />

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Drawing?</h3>
            <p>This action cannot be undone. All pages will be permanently deleted.</p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
              <button className="btn-delete" onClick={handleDeleteConfirm}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
