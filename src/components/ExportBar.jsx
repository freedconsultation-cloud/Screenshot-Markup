import { useState } from 'react';

export default function ExportBar({ stageRef, onUndo, onRedo, canUndo, canRedo, hasImage }) {
  const [copied, setCopied] = useState(false);

  async function getDataUrl(format = 'png') {
    if (!stageRef.current) return null;
    return stageRef.current.toDataURL({
      mimeType: format === 'jpg' ? 'image/jpeg' : 'image/png',
      quality: 0.95,
      pixelRatio: 2,
    });
  }

  async function copyToClipboard() {
    const dataUrl = await getDataUrl('png');
    if (!dataUrl) return;
    await window.api.exportClipboard(dataUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function savePng() {
    const dataUrl = await getDataUrl('png');
    if (dataUrl) await window.api.exportSave(dataUrl, 'png');
  }

  async function saveJpg() {
    const dataUrl = await getDataUrl('jpg');
    if (dataUrl) await window.api.exportSave(dataUrl, 'jpg');
  }

  return (
    <div className="export-bar">
      <button className="icon-btn" onClick={onUndo} disabled={!canUndo} title="Undo (⌘Z)">↩</button>
      <button className="icon-btn" onClick={onRedo} disabled={!canRedo} title="Redo (⌘⇧Z)">↪</button>

      <div className="export-bar-sep" />

      <span style={{ fontSize: 11, color: 'var(--muted)', marginRight: 4 }}>Export:</span>

      <button
        className={`export-btn ${copied ? 'copied' : 'primary'}`}
        onClick={copyToClipboard}
        disabled={!hasImage}
      >
        {copied ? '✓ Copied' : '⎘ Copy PNG'}
      </button>

      <button className="export-btn secondary" onClick={savePng} disabled={!hasImage}>
        ↓ PNG
      </button>

      <button className="export-btn secondary" onClick={saveJpg} disabled={!hasImage}>
        ↓ JPG
      </button>

      <div className="export-bar-sep" style={{ marginLeft: 'auto' }} />

      <button
        className="export-btn secondary"
        onClick={() => window.api.startCapture()}
        title="New capture"
      >
        + New Capture
      </button>
    </div>
  );
}
