# 🔍 Reflector Compliance Detection System

> AI-powered vehicle reflector inspection system for road safety compliance monitoring.

![Version](https://img.shields.io/badge/version-2.1.0-6366f1?style=flat-square)
![Status](https://img.shields.io/badge/status-active-22c55e?style=flat-square)
![React](https://img.shields.io/badge/react-19.x-61dafb?style=flat-square)
![Vite](https://img.shields.io/badge/vite-8.x-646cff?style=flat-square)

---

## 📋 Overview

A real-time vehicle reflector detection and compliance verification system built with React. The system analyzes vehicle images to detect reflective safety elements, verify their placement, and generate compliance reports — all processed client-side using canvas-based pixel analysis.

### Key Features

- **Real-time Reflector Detection** — Identifies reflective regions (red/orange tape, white/silver spots, amber markers) using pixel luminance and color analysis
- **Density-based Clustering** — 32×32 grid-based flood-fill algorithm to isolate distinct reflector regions from noise  
- **Compliance Verification** — Automated pass/fail based on reflector presence and placement validation
- **Bounding Box Overlay** — Precise detection boxes rendered on the uploaded image with confidence scores
- **Analytics Dashboard** — Compliance rate ring chart, detection breakdown, and system metrics
- **Inspection History** — Persistent log with CSV export and individual report downloads
- **Responsive Dark UI** — Professional three-panel layout with glassmorphism and micro-animations

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│                    Browser                       │
├──────────┬──────────────────┬────────────────────┤
│  Upload  │  Detection       │  Analytics         │
│  Panel   │  Canvas          │  Sidebar           │
│          │                  │                    │
│  ┌─────┐ │  ┌──────────┐   │  ┌──────────────┐  │
│  │Image│ │  │ Bounding  │   │  │ Compliance   │  │
│  │Input│ │  │ Box       │   │  │ Ring Chart   │  │
│  └──┬──┘ │  │ Overlay   │   │  └──────────────┘  │
│     │    │  └──────────┘   │  ┌──────────────┐  │
│     ▼    │                  │  │ Activity     │  │
│  ┌─────┐ │                  │  │ Timeline     │  │
│  │Canvas│ │                  │  └──────────────┘  │
│  │Pixel│ │                  │                    │
│  │Scan │ │                  │                    │
│  └──┬──┘ │                  │                    │
│     │    │                  │                    │
│     ▼    │                  │                    │
│  Results │                  │                    │
│  Panel   │                  │                    │
└──────────┴──────────────────┴────────────────────┘
```

---

## 🔬 Detection Pipeline

### 1. Pixel Scanning
The image is downscaled to max 640px width and every 2nd pixel is sampled for performance. Each pixel is evaluated against multiple criteria:

| Detection Type | Criteria | Target |
|---|---|---|
| Bright white/silver | Luminance > 140, Saturation < 0.3 | Metallic reflectors |
| Red/orange tape | R > 120, R > G×1.4, R > B×1.8 | Reflective safety tape |
| Yellow/amber | R > 130, G > 100, B < G×0.6 | Amber reflectors |
| Flash spots | Luminance > 220 | Camera flash on reflector |

### 2. Grid Clustering
- Image divided into **32×32 grid cells**
- Reflector pixel count accumulated per cell
- **Flood-fill** connects adjacent dense cells into clusters
- Clusters smaller than **5% of image area** are discarded (filters distant vehicles)

### 3. Compliance Logic
```
compliant = reflector_detected AND placement_correct
```
- **Reflector detected**: At least one valid cluster found
- **Placement correct**: Cluster center not in extreme top-left (sky/background region)

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/NupurSapar/Reflector-Detection.git
cd Reflector-Detection

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173/`

### Build for Production

```bash
npm run build
npm run preview
```

---

## 🖥️ Usage

### Inspect Tab
1. **Upload** a vehicle image (drag & drop or click to browse)
2. Click **▶ Run Inspection** to analyze
3. View detection overlay with bounding boxes on the canvas
4. Review checklist results (Reflector / Placement / Vendor)
5. Download individual inspection reports

### History Tab
- View all past inspections in a sortable table
- Export data as CSV for external analysis
- Click any row to view its detection overlay

### Analytics Tab
- Monitor compliance rate via the ring chart
- Track detection breakdown (reflector found, placement, vendor)
- View system configuration and performance metrics

---

## 📁 Project Structure

```
Reflector-Detection/
├── public/
│   ├── favicon.svg
│   └── icons.svg
├── src/
│   ├── App.jsx          # Main application (analysis + UI)
│   ├── App.css          
│   ├── index.css        # Global resets
│   └── main.jsx         # Entry point
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| **React 19** | UI framework |
| **Vite 8** | Build tool & dev server |
| **Canvas API** | Client-side image analysis |
| **localStorage** | Inspection history persistence |
| **CSS-in-JS** | Inline styling with dynamic themes |

---

## 📊 Performance

| Metric | Value |
|---|---|
| Image analysis | 10–70ms (client-side) |
| Grid resolution | 32×32 (1024 cells) |
| Pixel sampling | Every 2nd pixel |
| Max clusters | 3 per image |
| Min detection area | 5% of image |
| History storage | Last 200 inspections |

---

## 📄 License

This project is for educational and research purposes.

---

<p align="center">
  <sub>Built with React + Vite · Reflector Compliance Detection System v2.1.0</sub>
</p>
