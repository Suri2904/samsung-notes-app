import { useState, useMemo, useRef } from 'react';
import { storage } from '../../utils/storage';
import { migrateToCurrentSchema, detectSchemaVersion, validateV2Schema } from '../../utils/schemaMigration';
import { FileCard } from './FileCard';
import { useToastContext } from '../../context/ToastContext';
import './FileHub.css';

export const FileHub = ({ onOpenDrawing, onNewDrawing }) => {
  const [drawings, setDrawings] = useState(storage.getAllDrawings());
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [sortBy, setSortBy] = useState('modified'); // 'modified', 'created', 'name', 'pages'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const toast = useToastContext();

  // Refresh drawings list
  const refreshDrawings = () => {
    setDrawings(storage.getAllDrawings());
  };

  // Filter and sort drawings
  const filteredDrawings = useMemo(() => {
    let filtered = [...drawings];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(d =>
        d.title.toLowerCase().includes(query)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'modified':
          return new Date(b.lastModified) - new Date(a.lastModified);
        case 'created':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'name':
          return a.title.localeCompare(b.title);
        case 'pages':
          return (b.pages?.length || 0) - (a.pages?.length || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [drawings, searchQuery, sortBy]);

  // Recent files (last 5)
  const recentDrawings = useMemo(() => {
    return [...drawings]
      .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))
      .slice(0, 5);
  }, [drawings]);

  // Handle actions
  const handleOpen = (drawing) => {
    onOpenDrawing(drawing);
  };

  const handleRename = (id, newTitle) => {
    try {
      storage.renameDrawing(id, newTitle);
      refreshDrawings();
      toast.success('Drawing renamed');
    } catch (err) {
      toast.error('Failed to rename drawing');
    }
  };

  const handleDuplicate = (id) => {
    try {
      storage.duplicateDrawing(id);
      refreshDrawings();
      toast.success('Drawing duplicated');
    } catch (err) {
      toast.error('Failed to duplicate drawing');
    }
  };

  const handleDelete = (id) => {
    if (confirm('Delete this drawing? This cannot be undone.')) {
      try {
        storage.deleteDrawing(id);
        refreshDrawings();
        setSelectedIds(prev => prev.filter(sid => sid !== id));
        toast.success('Drawing deleted');
      } catch (err) {
        toast.error('Failed to delete drawing');
      }
    }
  };

  const handleBulkDelete = () => {
    if (confirm(`Delete ${selectedIds.length} drawing(s)? This cannot be undone.`)) {
      try {
        selectedIds.forEach(id => storage.deleteDrawing(id));
        refreshDrawings();
        setSelectedIds([]);
        toast.success(`${selectedIds.length} drawing(s) deleted`);
      } catch (err) {
        toast.error('Failed to delete drawings');
      }
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  // Import JSON file
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target.result);

        // Validate basic structure
        if (!importedData.title || !importedData.pages) {
          toast.error('Invalid drawing file format');
          return;
        }

        // Detect version and auto-migrate to V2
        const version = detectSchemaVersion(importedData);
        const migratedData = version < 2 ? migrateToCurrentSchema(importedData) : importedData;

        // Ensure it has a unique ID
        if (!migratedData.id) {
          migratedData.id = crypto.randomUUID();
        }

        // Validate V2 schema
        const validation = validateV2Schema(migratedData);
        if (!validation.valid) {
          console.warn('Schema validation warnings:', validation.errors);
          // Continue anyway - migration should have fixed most issues
        }

        // Save to localStorage (storage.js will ensure V2 format)
        storage.saveDrawing(migratedData);
        refreshDrawings();

        const versionInfo = version < 2 ? ` (migrated from V${version})` : '';
        toast.success(`Imported: ${migratedData.title}${versionInfo}`);

        // Reset file input
        e.target.value = '';
      } catch (err) {
        toast.error('Failed to import file. Please make sure it\'s a valid .samsungnote.json file.');
        console.error('Import failed:', err);
      }
    };
    reader.readAsText(file);
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.name.endsWith('.json') && !file.name.endsWith('.samsungnote.json')) {
      toast.error('Please drop a .json or .samsungnote.json file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target.result);

        if (!importedData.title || !importedData.pages) {
          toast.error('Invalid drawing file format');
          return;
        }

        // Auto-migrate to V2 schema
        const version = detectSchemaVersion(importedData);
        const migratedData = version < 2 ? migrateToCurrentSchema(importedData) : importedData;

        if (!migratedData.id) {
          migratedData.id = crypto.randomUUID();
        }

        storage.saveDrawing(migratedData);
        refreshDrawings();

        const versionInfo = version < 2 ? ` (migrated from V${version})` : '';
        toast.success(`Imported: ${migratedData.title}${versionInfo}`);
      } catch (err) {
        toast.error('Failed to import file');
        console.error('Import failed:', err);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      className={`file-hub ${isDragging ? 'dragging' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.samsungnote.json"
        style={{ display: 'none' }}
        onChange={handleFileImport}
      />

      {/* Drag overlay */}
      {isDragging && (
        <div className="drag-overlay">
          <div className="drag-message">
            <div className="drag-icon">📥</div>
            <h2>Drop to Import</h2>
            <p>Drop your .samsungnote.json file here</p>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="file-hub-header">
        <h1>Samsung Notes</h1>
        <div className="header-actions">
          <button className="btn-import-drawing" onClick={handleImportClick}>
            📥 Import
          </button>
          <button className="btn-new-drawing" onClick={onNewDrawing}>
            ✏️ New Drawing
          </button>
        </div>
      </div>

      {/* Recent Files Strip */}
      {recentDrawings.length > 0 && (
        <div className="recent-section">
          <h2>Recent</h2>
          <div className="recent-strip">
            {recentDrawings.map(drawing => (
              <div
                key={drawing.id}
                className="recent-item"
                onClick={() => handleOpen(drawing)}
              >
                <div className="recent-thumbnail">
                  {drawing.pages?.[0]?.imageData ? (
                    <img src={drawing.pages[0].imageData} alt={drawing.title} />
                  ) : (
                    <div className="recent-thumbnail-empty">📄</div>
                  )}
                </div>
                <div className="recent-title">{drawing.title}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="file-toolbar">
        <div className="file-toolbar-left">
          <input
            type="text"
            className="search-input"
            placeholder="Search drawings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <select
            className="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="modified">Last Modified</option>
            <option value="created">Date Created</option>
            <option value="name">Name A-Z</option>
            <option value="pages">Page Count</option>
          </select>
        </div>

        <div className="file-toolbar-right">
          <button
            className={`view-toggle ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            title="Grid view"
          >
            ⊞
          </button>
          <button
            className={`view-toggle ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            title="List view"
          >
            ☰
          </button>
        </div>
      </div>

      {/* Bulk actions bar */}
      {selectedIds.length > 0 && (
        <div className="bulk-actions-bar">
          <span>{selectedIds.length} selected</span>
          <div className="bulk-actions">
            <button onClick={handleBulkDelete}>Delete</button>
            <button onClick={() => setSelectedIds([])}>Clear selection</button>
          </div>
        </div>
      )}

      {/* Files Grid/List */}
      <div className={`files-container files-${viewMode}`}>
        {filteredDrawings.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <h3>No drawings yet</h3>
            <p>Create your first drawing to get started</p>
            <button className="btn-create-first" onClick={onNewDrawing}>
              Create Drawing
            </button>
          </div>
        ) : (
          filteredDrawings.map(drawing => (
            <FileCard
              key={drawing.id}
              drawing={drawing}
              viewMode={viewMode}
              isSelected={selectedIds.includes(drawing.id)}
              onOpen={() => handleOpen(drawing)}
              onRename={(newTitle) => handleRename(drawing.id, newTitle)}
              onDuplicate={() => handleDuplicate(drawing.id)}
              onDelete={() => handleDelete(drawing.id)}
              onToggleSelect={() => toggleSelect(drawing.id)}
            />
          ))
        )}
      </div>
    </div>
  );
};
