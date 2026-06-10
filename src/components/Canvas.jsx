import { useRef, useState, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react';
import { Stage, Layer, Image as KImage, Arrow, Rect, Ellipse, Line, Text } from 'react-konva';

function nanoid() {
  return Math.random().toString(36).slice(2, 10);
}

function ShapeRenderer({ shape }) {
  const common = {
    key: shape.id,
    stroke: shape.color,
    strokeWidth: shape.strokeWidth,
    lineCap: 'round',
    lineJoin: 'round',
  };

  switch (shape.type) {
    case 'arrow':
      return (
        <Arrow
          {...common}
          points={[shape.x1, shape.y1, shape.x2, shape.y2]}
          fill={shape.color}
          pointerLength={Math.max(8, shape.strokeWidth * 3)}
          pointerWidth={Math.max(7, shape.strokeWidth * 2.5)}
        />
      );
    case 'rect':
      return (
        <Rect
          key={shape.id}
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          stroke={shape.color}
          strokeWidth={shape.strokeWidth}
          fill="transparent"
          lineCap="round"
        />
      );
    case 'circle':
      return (
        <Ellipse
          key={shape.id}
          x={shape.cx}
          y={shape.cy}
          radiusX={shape.rx}
          radiusY={shape.ry}
          stroke={shape.color}
          strokeWidth={shape.strokeWidth}
          fill="transparent"
        />
      );
    case 'pen':
      return (
        <Line
          {...common}
          points={shape.points}
          tension={0.4}
          fill="transparent"
        />
      );
    case 'text':
      return (
        <Text
          key={shape.id}
          x={shape.x}
          y={shape.y}
          text={shape.text}
          fill={shape.color}
          fontSize={shape.fontSize || 18}
          fontFamily="ui-sans-serif, system-ui, sans-serif"
        />
      );
    case 'highlight':
      return (
        <Rect
          key={shape.id}
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          fill={shape.color}
          opacity={0.35}
        />
      );
    case 'redact':
      return (
        <Rect
          key={shape.id}
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          fill="#000000"
        />
      );
    default:
      return null;
  }
}

const Canvas = forwardRef(function Canvas({ shapes, image, tool, color, strokeWidth, onShapeAdd }, stageRef) {
  const containerRef = useRef(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [bgImage, setBgImage] = useState(null);
  const [currentShape, setCurrentShape] = useState(null);
  const [editingText, setEditingText] = useState(null);
  const [textValue, setTextValue] = useState('');
  const isDrawing = useRef(false);

  // Resize observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Load background image
  useEffect(() => {
    if (!image) { setBgImage(null); return; }
    const img = new window.Image();
    img.src = image;
    img.onload = () => setBgImage(img);
  }, [image]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        // bubbles up to App via custom event
        window.dispatchEvent(new CustomEvent(e.shiftKey ? 'markup:redo' : 'markup:undo'));
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const getPos = useCallback(() => {
    const stage = stageRef.current;
    return stage ? stage.getPointerPosition() : null;
  }, [stageRef]);

  // Compute image display rect (letterbox)
  const imgRect = (() => {
    if (!bgImage) return null;
    const scaleX = size.width / bgImage.naturalWidth;
    const scaleY = size.height / bgImage.naturalHeight;
    const scale = Math.min(scaleX, scaleY, 1);
    const w = bgImage.naturalWidth * scale;
    const h = bgImage.naturalHeight * scale;
    return { x: (size.width - w) / 2, y: (size.height - h) / 2, width: w, height: h, scale };
  })();

  function handleMouseDown(e) {
    if (tool === 'select' || !bgImage) return;
    if (e.target === stageRef.current) {
      // Clicking empty area while text editing → commit
      if (editingText) { commitText(); return; }
    }

    isDrawing.current = true;
    const pos = getPos();
    if (!pos) return;

    if (tool === 'text') {
      setEditingText(pos);
      setTextValue('');
      isDrawing.current = false;
      return;
    }

    const base = { id: nanoid(), type: tool, color, strokeWidth };
    if (tool === 'arrow') {
      setCurrentShape({ ...base, x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y });
    } else if (tool === 'rect' || tool === 'highlight' || tool === 'redact') {
      setCurrentShape({ ...base, x: pos.x, y: pos.y, _sx: pos.x, _sy: pos.y, width: 0, height: 0 });
    } else if (tool === 'circle') {
      setCurrentShape({ ...base, cx: pos.x, cy: pos.y, _sx: pos.x, _sy: pos.y, rx: 0, ry: 0 });
    } else if (tool === 'pen') {
      setCurrentShape({ ...base, points: [pos.x, pos.y] });
    }
  }

  function handleMouseMove() {
    if (!isDrawing.current || !currentShape) return;
    const pos = getPos();
    if (!pos) return;

    setCurrentShape((s) => {
      if (s.type === 'arrow') return { ...s, x2: pos.x, y2: pos.y };
      if (s.type === 'rect' || s.type === 'highlight' || s.type === 'redact') {
        return {
          ...s,
          x: Math.min(s._sx, pos.x),
          y: Math.min(s._sy, pos.y),
          width: Math.abs(pos.x - s._sx),
          height: Math.abs(pos.y - s._sy),
        };
      }
      if (s.type === 'circle') {
        const rx = Math.abs(pos.x - s._sx) / 2;
        const ry = Math.abs(pos.y - s._sy) / 2;
        return { ...s, cx: (s._sx + pos.x) / 2, cy: (s._sy + pos.y) / 2, rx, ry };
      }
      if (s.type === 'pen') return { ...s, points: [...s.points, pos.x, pos.y] };
      return s;
    });
  }

  function handleMouseUp() {
    if (!isDrawing.current || !currentShape) return;
    isDrawing.current = false;
    const s = currentShape;
    const isValid =
      (s.type === 'arrow' && (Math.abs(s.x2 - s.x1) > 4 || Math.abs(s.y2 - s.y1) > 4)) ||
      (s.type === 'pen' && s.points.length >= 4) ||
      (['rect', 'highlight', 'redact'].includes(s.type) && s.width > 4 && s.height > 4) ||
      (s.type === 'circle' && s.rx > 2 && s.ry > 2);
    if (isValid) onShapeAdd({ ...s, _sx: undefined, _sy: undefined });
    setCurrentShape(null);
  }

  function commitText() {
    if (editingText && textValue.trim()) {
      onShapeAdd({
        id: nanoid(),
        type: 'text',
        x: editingText.x,
        y: editingText.y,
        text: textValue.trim(),
        color,
        fontSize: Math.max(14, strokeWidth * 5),
      });
    }
    setEditingText(null);
    setTextValue('');
  }

  const allShapes = [...shapes, ...(currentShape ? [currentShape] : [])];

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{ cursor: tool === 'select' ? 'default' : 'crosshair' }}
      >
        <Layer>
          {bgImage && imgRect && (
            <KImage
              image={bgImage}
              x={imgRect.x}
              y={imgRect.y}
              width={imgRect.width}
              height={imgRect.height}
            />
          )}
          {allShapes.map((s) => <ShapeRenderer key={s.id} shape={s} />)}
        </Layer>
      </Stage>

      {!bgImage && (
        <div className="empty-state">
          <div className="empty-state-icon">📸</div>
          <h2>No screenshot yet</h2>
          <p>Press <kbd style={{ background: 'var(--surface-2)', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>⌘⇧X</kbd> or click below to capture</p>
          <button className="capture-btn" onClick={() => window.api.startCapture()}>
            Capture Screen
          </button>
        </div>
      )}

      {editingText && (
        <textarea
          className="text-input-overlay"
          autoFocus
          value={textValue}
          onChange={(e) => setTextValue(e.target.value)}
          onBlur={commitText}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { setEditingText(null); setTextValue(''); }
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitText(); }
          }}
          style={{
            top: editingText.y,
            left: editingText.x,
            color,
            fontSize: Math.max(14, strokeWidth * 5),
          }}
        />
      )}
    </div>
  );
});

export default Canvas;
