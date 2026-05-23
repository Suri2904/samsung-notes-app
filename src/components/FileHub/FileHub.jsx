import { useState, useMemo } from 'react';
import { storage } from '../../utils/storage';
import { FileCard } from './FileCard';
import { useToastContext } from '../../context/ToastContext';
import './FileHub.css';

export const FileHub = ({ onOpenDrawing, onNewDrawing }) => {
  const [drawings, setDrawings] = useState(storage.getAllDrawings());
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [sortBy, setSortBy] = useState('modified'); // 'modified', 'created', 'name', 'pages'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
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

  return (
    <div className="file-hub">
      {/* Header */}
      <div className="file-hub-header">
        <h1>Samsung Notes</h1>
        <button className="btn-new-drawing" onClick={onNewDrawing}>
          ✏️ New Drawing
        </button>
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
