import { useState } from 'react';
import './FileCard.css';

export const FileCard = ({
  drawing,
  viewMode,
  isSelected,
  onOpen,
  onRename,
  onDuplicate,
  onDelete,
  onToggleSelect
}) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState(drawing.title);
  const [showMenu, setShowMenu] = useState(false);

  const pageCount = drawing.pages?.length || 0;
  const lastModified = new Date(drawing.lastModified).toLocaleDateString();
  const thumbnail = drawing.pages?.[0]?.imageData;

  const handleRename = () => {
    if (newTitle.trim() && newTitle !== drawing.title) {
      onRename(newTitle.trim());
    }
    setIsRenaming(false);
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    setShowMenu(true);
  };

  const handleMenuAction = (action) => {
    setShowMenu(false);
    switch (action) {
      case 'open':
        onOpen();
        break;
      case 'rename':
        setIsRenaming(true);
        break;
      case 'duplicate':
        onDuplicate();
        break;
      case 'delete':
        onDelete();
        break;
    }
  };

  if (viewMode === 'list') {
    return (
      <div
        className={`file-list-item ${isSelected ? 'selected' : ''}`}
        onContextMenu={handleContextMenu}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          onClick={(e) => e.stopPropagation()}
        />
        <div className="list-thumbnail">
          {thumbnail ? (
            <img src={thumbnail} alt={drawing.title} />
          ) : (
            <div className="thumbnail-empty">📄</div>
          )}
        </div>
        <div className="list-title" onClick={onOpen}>
          {isRenaming ? (
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span onDoubleClick={() => setIsRenaming(true)}>{drawing.title}</span>
          )}
        </div>
        <div className="list-modified">{lastModified}</div>
        <div className="list-pages">{pageCount} page{pageCount !== 1 ? 's' : ''}</div>
        <button
          className="list-menu-btn"
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
        >
          ⋮
        </button>

        {showMenu && (
          <>
            <div className="menu-backdrop" onClick={() => setShowMenu(false)} />
            <div className="context-menu">
              <button onClick={() => handleMenuAction('open')}>Open</button>
              <button onClick={() => handleMenuAction('rename')}>Rename</button>
              <button onClick={() => handleMenuAction('duplicate')}>Duplicate</button>
              <button onClick={() => handleMenuAction('delete')} className="danger">Delete</button>
            </div>
          </>
        )}
      </div>
    );
  }

  // Grid view
  return (
    <div
      className={`file-card ${isSelected ? 'selected' : ''}`}
      onContextMenu={handleContextMenu}
    >
      {isSelected && <div className="selection-overlay" />}
      <input
        type="checkbox"
        className="card-checkbox"
        checked={isSelected}
        onChange={onToggleSelect}
        onClick={(e) => e.stopPropagation()}
      />

      <div className="card-thumbnail" onClick={onOpen}>
        {thumbnail ? (
          <img src={thumbnail} alt={drawing.title} />
        ) : (
          <div className="thumbnail-empty">📄</div>
        )}
        {pageCount > 1 && (
          <div className="page-badge">{pageCount} pages</div>
        )}
      </div>

      <div className="card-info">
        {isRenaming ? (
          <input
            type="text"
            className="rename-input"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <h3
            className="card-title"
            onDoubleClick={() => setIsRenaming(true)}
            onClick={onOpen}
          >
            {drawing.title}
          </h3>
        )}
        <p className="card-date">{lastModified}</p>
      </div>

      <div className="card-actions">
        <button onClick={onOpen} title="Open">📂</button>
        <button onClick={onDuplicate} title="Duplicate">📋</button>
        <button onClick={onDelete} title="Delete" className="danger">🗑</button>
      </div>

      {showMenu && (
        <>
          <div className="menu-backdrop" onClick={() => setShowMenu(false)} />
          <div className="context-menu">
            <button onClick={() => handleMenuAction('open')}>Open</button>
            <button onClick={() => handleMenuAction('rename')}>Rename</button>
            <button onClick={() => handleMenuAction('duplicate')}>Duplicate</button>
            <button onClick={() => handleMenuAction('delete')} className="danger">Delete</button>
          </div>
        </>
      )}
    </div>
  );
};
