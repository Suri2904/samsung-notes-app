import { useState } from 'react';
import { DrawingCanvas } from './components/Drawing/DrawingCanvas';
import { FileHub } from './components/FileHub/FileHub';
import { useToastContext } from './context/ToastContext';
import { storage } from './utils/storage';
import './styles/variables.css';

function App() {
  const [activeDrawing, setActiveDrawing] = useState(null);
  const toast = useToastContext();

  const handleOpenDrawing = (drawing) => {
    setActiveDrawing(drawing);
  };

  const handleNewDrawing = () => {
    const newDrawing = {
      id: crypto.randomUUID(),
      title: 'Untitled Drawing',
      pageSize: 'a4',
      orientation: 'landscape',
      pages: [null],
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };
    setActiveDrawing(newDrawing);
  };

  const handleCloseDrawing = () => {
    setActiveDrawing(null);
  };

  return (
    <div className="app">
      {activeDrawing ? (
        <DrawingCanvas
          drawing={activeDrawing}
          onBack={handleCloseDrawing}
        />
      ) : (
        <FileHub
          onOpenDrawing={handleOpenDrawing}
          onNewDrawing={handleNewDrawing}
        />
      )}
    </div>
  );
}

export default App;
