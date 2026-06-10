import { useRef, useEffect, useState } from 'react';

export default function Overlay() {
  const canvasRef = useRef(null);
  const screenshotRef = useRef(null);
  const selRef = useRef(null); // { x, y, w, h, active }
  const [hint, setHint] = useState('Click and drag to select a region — Esc to cancel');

  useEffect(() => {
    if (!window.overlay) return;
    window.overlay.onScreenshot((dataUrl) => {
      const img = new Image();
      img.src = dataUrl;
      img.onload = () => {
        screenshotRef.current = img;
        draw();
      };
    });
  }, []);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') window.overlay?.cancel();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function draw() {
    const canvas = canvasRef.current;
    const img = screenshotRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    const { width: cw, height: ch } = canvas;

    // Draw dimmed screenshot
    ctx.clearRect(0, 0, cw, ch);
    ctx.globalAlpha = 1;
    ctx.drawImage(img, 0, 0, cw, ch);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, cw, ch);

    const sel = selRef.current;
    if (sel && sel.active) {
      const { x, y, w, h } = normRect(sel.x, sel.y, sel.w, sel.h);
      if (w > 0 && h > 0) {
        // Reveal selected region
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.fillRect(x, y, w, h);
        ctx.globalCompositeOperation = 'source-over';
        // Redraw image in selection — scale source coords by DPR since
        // the screenshot is captured at physical (Retina) resolution
        const dpr = window.devicePixelRatio || 1;
        ctx.drawImage(img, x * dpr, y * dpr, w * dpr, h * dpr, x, y, w, h);
        // Selection border
        ctx.strokeStyle = '#F88379';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);
        // Dimensions label
        const label = `${Math.round(w)} × ${Math.round(h)}`;
        ctx.font = 'bold 12px ui-sans-serif, system-ui, sans-serif';
        const textW = ctx.measureText(label).width;
        const lx = x + w / 2 - textW / 2 - 6;
        const ly = y + h + 6;
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.beginPath();
        ctx.roundRect(lx, ly, textW + 12, 22, 4);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillText(label, lx + 6, ly + 15);
      }
    }
  }

  function normRect(x, y, w, h) {
    return {
      x: w < 0 ? x + w : x,
      y: h < 0 ? y + h : y,
      w: Math.abs(w),
      h: Math.abs(h),
    };
  }

  function getRelativePos(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onMouseDown(e) {
    const pos = getRelativePos(e);
    selRef.current = { x: pos.x, y: pos.y, w: 0, h: 0, active: true };
    setHint('Release to capture — Esc to cancel');
    draw();
  }

  function onMouseMove(e) {
    if (!selRef.current?.active) return;
    const pos = getRelativePos(e);
    selRef.current.w = pos.x - selRef.current.x;
    selRef.current.h = pos.y - selRef.current.y;
    draw();
  }

  function onMouseUp() {
    const sel = selRef.current;
    if (!sel?.active) return;
    selRef.current.active = false;
    const { x, y, w, h } = normRect(sel.x, sel.y, sel.w, sel.h);
    if (w > 10 && h > 10) {
      window.overlay?.sendRegion({ x, y, width: w, height: h });
    }
  }

  return (
    <div className="overlay-root">
      <canvas
        ref={canvasRef}
        className="overlay-canvas"
        width={window.screen.width}
        height={window.screen.height}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
      />
      <div className="overlay-hint">{hint}</div>
    </div>
  );
}
