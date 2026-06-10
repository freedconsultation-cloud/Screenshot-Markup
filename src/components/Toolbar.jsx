const TOOLS = [
  { id: 'select', icon: '↖', label: 'Select' },
  { id: 'arrow', icon: '↗', label: 'Arrow' },
  { id: 'rect', icon: '▭', label: 'Rectangle' },
  { id: 'circle', icon: '◯', label: 'Circle' },
  { id: 'pen', icon: '✏️', label: 'Pen' },
  { id: 'text', icon: 'T', label: 'Text' },
  { id: 'highlight', icon: '▓', label: 'Highlight' },
  { id: 'redact', icon: '■', label: 'Redact' },
];

const PRESET_COLORS = ['#F88379', '#ff4136', '#ff851b', '#ffdc00', '#2ecc40', '#0074d9', '#b10dc9', '#ffffff', '#000000'];

const STROKE_SIZES = [2, 4, 6, 10];

export default function Toolbar({ tool, color, strokeWidth, onTool, onColor, onStroke }) {
  return (
    <div className="toolbar">
      {TOOLS.map((t, i) => (
        <div key={t.id}>
          {i === 1 && <div className="toolbar-sep" />}
          {i === 6 && <div className="toolbar-sep" />}
          <button
            className={`tool-btn ${tool === t.id ? 'active' : ''}`}
            onClick={() => onTool(t.id)}
            title={t.label}
          >
            {t.icon}
          </button>
        </div>
      ))}

      <div className="toolbar-sep" />

      {/* Color swatches */}
      {PRESET_COLORS.map((c) => (
        <button
          key={c}
          onClick={() => onColor(c)}
          style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: c,
            border: color === c ? '2px solid var(--accent)' : '2px solid transparent',
            outline: color === c ? '1.5px solid #fff' : 'none',
            outlineOffset: '1px',
            flexShrink: 0,
            marginBottom: 1,
          }}
          title={c}
        />
      ))}

      {/* Custom color picker */}
      <div className="color-swatch" title="Custom color" style={{ marginTop: 2 }}>
        <div className="color-preview" style={{ background: color }} />
        <input type="color" value={color} onChange={(e) => onColor(e.target.value)} />
      </div>

      <div className="toolbar-sep" />

      {/* Stroke sizes */}
      {STROKE_SIZES.map((s) => (
        <button
          key={s}
          onClick={() => onStroke(s)}
          title={`Stroke ${s}px`}
          style={{
            width: 36,
            height: 28,
            borderRadius: 6,
            background: strokeWidth === s ? 'var(--accent-bg)' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{
            width: 20,
            height: s,
            borderRadius: s,
            background: strokeWidth === s ? 'var(--accent)' : 'var(--muted)',
          }} />
        </button>
      ))}
    </div>
  );
}
