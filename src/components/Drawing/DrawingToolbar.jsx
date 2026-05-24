import { useState } from 'react';
import './DrawingToolbar.css';

const TOOLS = [
  { id: 'pen', icon: '✏️', label: 'Pen' },
  { id: 'fountain', icon: '🖊️', label: 'Fountain Pen' },
  { id: 'highlighter', icon: '🖍️', label: 'Highlighter' },
  { id: 'eraser', icon: '🧹', label: 'Eraser' },
  { id: 'lasso', icon: '⭕', label: 'Lasso' },
  { id: 'hand', icon: '✋', label: 'Pan' }
];

const SIZES = [1, 2, 4, 8]; // S, M, L, XL

const COLORS = [
  '#000000', '#434343', '#666666', '#999999', '#CCCCCC', '#FFFFFF',
  '#FF0000', '#FF4500', '#FF8C00', '#FFD700', '#ADFF2F', '#00FF7F',
  '#00BFFF', '#1259C3', '#8A2BE2', '#FF1493', '#FF69B4', '#A0522D'
];

export const DrawingToolbar = ({
  currentTool,
  onToolChange,
  currentColor,
  onColorChange,
  currentSize,
  onSizeChange,
  palmRejection,
  onPalmRejectionToggle,
  onUndo,
  onRedo,
  canUndo,
  canRedo
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [customColor, setCustomColor] = useState('#000000');
  const [isExpanded, setIsExpanded] = useState(true);

  const handleToolClick = (toolId) => {
    onToolChange(toolId);
    // Collapse toolbar after selecting a tool
    if (toolId !== 'hand') {
      setIsExpanded(false);
    }
  };

  const toggleToolbar = () => {
    setIsExpanded(!isExpanded);
  };

  // Get current tool info for collapsed view
  const currentToolInfo = TOOLS.find(t => t.id === currentTool) || TOOLS[0];

  return (
    <div className={`drawing-toolbar ${isExpanded ? 'expanded' : 'collapsed'}`}>
      {/* Collapsed view - just show current tool */}
      {!isExpanded && (
        <div className="collapsed-toolbar">
          <button
            className="current-tool-btn active"
            onClick={toggleToolbar}
            title={`${currentToolInfo.label} - Click to change tool`}
          >
            <span className="tool-icon">{currentToolInfo.icon}</span>
          </button>
        </div>
      )}

      {/* Expanded view - show all tools */}
      {isExpanded && (
        <>
          {/* Tools */}
          <div className="toolbar-section tools-section">
            {TOOLS.map(tool => (
              <button
                key={tool.id}
                className={`tool-btn ${currentTool === tool.id ? 'active' : ''}`}
                onClick={() => handleToolClick(tool.id)}
                title={tool.label}
              >
                <span className="tool-icon">{tool.icon}</span>
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="toolbar-divider" />

          {/* Sizes - show as dots */}
          {currentTool !== 'hand' && (
            <>
              <div className="toolbar-section size-section">
                {SIZES.map(size => (
                  <button
                    key={size}
                    className={`size-btn ${currentSize === size ? 'active' : ''}`}
                    onClick={() => onSizeChange(size)}
                    title={`Size ${size}`}
                  >
                    <span
                      className="size-dot"
                      style={{
                        width: `${Math.min(size * 3, 12)}px`,
                        height: `${Math.min(size * 3, 12)}px`
                      }}
                    />
                  </button>
                ))}
              </div>

              <div className="toolbar-divider" />
            </>
          )}

          {/* Colors */}
          {currentTool !== 'eraser' && currentTool !== 'hand' && (
            <div className="toolbar-section color-section">
              <div className="color-grid">
                {COLORS.map(color => (
                  <button
                    key={color}
                    className={`color-btn ${currentColor === color ? 'active' : ''}`}
                    style={{
                      backgroundColor: color,
                      border: color === '#FFFFFF' ? '1px solid #E0E0E0' : 'none'
                    }}
                    onClick={() => onColorChange(color)}
                    title={color}
                  />
                ))}
              </div>

              {/* Custom color picker */}
              <div className="custom-color-wrapper">
                <input
                  type="color"
                  value={customColor}
                  onChange={(e) => {
                    setCustomColor(e.target.value);
                    onColorChange(e.target.value);
                  }}
                  className="custom-color-input"
                  title="Custom color"
                />
                <span className="custom-color-label">+</span>
              </div>
            </div>
          )}

          {/* Undo/Redo */}
          <div className="toolbar-section undo-section">
            <button
              className="undo-btn"
              onClick={onUndo}
              disabled={!canUndo}
              title="Undo (⌘Z)"
            >
              ↶
            </button>
            <button
              className="redo-btn"
              onClick={onRedo}
              disabled={!canRedo}
              title="Redo (⌘⇧Z)"
            >
              ↷
            </button>
          </div>

          {/* Divider */}
          <div className="toolbar-divider" />

          {/* Palm Rejection Toggle */}
          <div className="toolbar-section palm-rejection-section">
            <button
              className={`palm-rejection-btn ${palmRejection ? 'active' : ''}`}
              onClick={() => onPalmRejectionToggle(!palmRejection)}
              title={palmRejection ? "Palm Rejection: ON (touch disabled)" : "Palm Rejection: OFF (touch enabled)"}
            >
              <span className="palm-icon">✋</span>
              <span className="palm-status">{palmRejection ? 'ON' : 'OFF'}</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
