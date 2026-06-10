import { useRef, useEffect, useState } from 'react';
import Canvas from './Canvas';
import Toolbar from './Toolbar';
import ExportBar from './ExportBar';
import { useHistory } from '../hooks/useHistory';

export default function App() {
  const stageRef = useRef(null);
  const [image, setImage] = useState(null);
  const [tool, setTool] = useState('arrow');
  const [color, setColor] = useState('#F88379');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const { shapes, push, undo, redo, canUndo, canRedo, reset } = useHistory([]);

  useEffect(() => {
    if (!window.api) return;
    window.api.onImageReady((dataUrl) => {
      setImage(dataUrl);
      reset([]);
    });

    // Load settings
    window.api.getSettings().then((s) => {
      if (s?.defaultColor) setColor(s.defaultColor);
      if (s?.defaultStrokeWidth) setStrokeWidth(s.defaultStrokeWidth);
    });
  }, [reset]);

  // Keyboard undo/redo via custom events from Canvas
  useEffect(() => {
    window.addEventListener('markup:undo', undo);
    window.addEventListener('markup:redo', redo);
    return () => {
      window.removeEventListener('markup:undo', undo);
      window.removeEventListener('markup:redo', redo);
    };
  }, [undo, redo]);

  function handleShapeAdd(shape) {
    push([...shapes, shape]);
  }

  return (
    <div className="app-root">
      <div className="app-nav">
        <span className="app-nav-title">✂ Screenshot Markup</span>
        <div className="app-nav-spacer" />
      </div>

      <div className="app-body">
        <Toolbar
          tool={tool}
          color={color}
          strokeWidth={strokeWidth}
          onTool={setTool}
          onColor={setColor}
          onStroke={setStrokeWidth}
        />
        <div className="canvas-area">
          <Canvas
            ref={stageRef}
            shapes={shapes}
            image={image}
            tool={tool}
            color={color}
            strokeWidth={strokeWidth}
            onShapeAdd={handleShapeAdd}
          />
        </div>
      </div>

      <ExportBar
        stageRef={stageRef}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        hasImage={!!image}
      />
    </div>
  );
}
