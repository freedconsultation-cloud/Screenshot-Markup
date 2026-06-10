# Screenshot Markup

A desktop app for capturing and annotating screenshots. Select any region of your screen, annotate it with shapes and text, then export to clipboard or file.

**Requires macOS, Windows, or Linux — no mobile support.**

---

## Download

> Packaged installers coming soon. For now, run from source (takes ~2 minutes).

---

## Run from Source

### Prerequisites

- [Node.js](https://nodejs.org) v18 or later
- [Git](https://git-scm.com)

### Steps

```bash
# 1. Clone the repo
git clone https://github.com/freedconsultation-cloud/Screenshot-Markup.git
cd Screenshot-Markup

# 2. Install dependencies
npm install

# 3. Start the app
npm start
```

The app window will open automatically.

---

## macOS: Screen Recording Permission

On first use, macOS requires Screen Recording permission to capture screenshots.

1. A prompt will appear — click **Open System Settings**
2. Go to **Privacy & Security → Screen Recording**
3. Enable **Screenshot Markup**
4. Restart the app

---

## How to Use

### Capturing a Screenshot

**Option A — Keyboard shortcut:**  
Press `⌘ Shift X` (Mac) or `Ctrl Shift X` (Windows/Linux)

**Option B — In-app button:**  
Click **Capture Screen** in the annotator window, or **+ New Capture** in the bottom bar

A dimmed overlay appears over your screen. Click and drag to select the region you want to capture. Release the mouse to open it in the annotator.

Press `Esc` at any time to cancel the capture.

---

### Annotation Tools

Select a tool from the left toolbar:

| Icon | Tool | Usage |
|------|------|-------|
| ↖ | **Select** | Click shapes to select/move them |
| ↗ | **Arrow** | Click and drag to draw an arrow |
| ▭ | **Rectangle** | Click and drag to draw a rectangle |
| ◯ | **Circle** | Click and drag to draw an ellipse |
| ✏️ | **Pen** | Freehand drawing |
| T | **Text** | Click anywhere to type. Press `Enter` or click away to confirm, `Esc` to cancel |
| ▓ | **Highlight** | Semi-transparent colored rectangle |
| ■ | **Redact** | Solid black rectangle to hide sensitive content |

**Color** — Click any color swatch in the toolbar, or use the color wheel at the bottom for a custom color.

**Stroke width** — Click one of the four thickness bars below the color picker.

---

### Undo / Redo

- **Undo:** `⌘Z` (Mac) / `Ctrl Z` (Windows/Linux) or the ↩ button
- **Redo:** `⌘⇧Z` (Mac) / `Ctrl Shift Z` (Windows/Linux) or the ↪ button

---

### Exporting

| Button | Action |
|--------|--------|
| **⎘ Copy PNG** | Copies the annotated image to your clipboard — paste directly into Slack, email, etc. |
| **↓ PNG** | Saves as a PNG file (lossless) |
| **↓ JPG** | Saves as a JPG file (smaller file size) |

---

## System Tray

The app lives in your system tray (menu bar on macOS) so it's always one click away. Closing the annotator window keeps the app running in the background — right-click the tray icon to access **Capture** or **Quit**.

---

## Stack

- [Electron](https://www.electronjs.org) — desktop shell
- [React](https://react.dev) — UI
- [Konva / react-konva](https://konvajs.org) — canvas annotation layer
- [electron-store](https://github.com/sindresorhus/electron-store) — settings persistence
- [Vite](https://vitejs.dev) + [electron-forge](https://www.electronforge.io) — build tooling
