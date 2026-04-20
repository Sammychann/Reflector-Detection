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

## 🖥️ Page Guide

The application is a single-page React app with **three views** accessible from the header navigation tabs: **Inspect**, **History**, and **Analytics**. A global dark/light theme toggle is available in the header alongside a live system status indicator.

---

### 📷 Inspect Page (`view = "inspect"`)

The primary workspace for running vehicle reflector inspections. It uses a **three-panel layout**:

#### Left Panel — Input & Results (340 px)

| Section | Description |
|---|---|
| **Image Upload** | Drag-and-drop zone or click-to-browse file picker. Accepts `JPG`, `PNG`, and `WEBP` formats. Displays a thumbnail preview once an image is loaded, with a dismiss (✕) button to clear it. |
| **Progress Bar** | Appears during analysis — shows a stepped progress indicator (15% → 35% → 55% → 72% → 85% → 95% → 100%) with an animated indigo gradient fill and percentage readout. |
| **Run Inspection Button** | Triggers the analysis pipeline. Disabled when no image is loaded or an analysis is already in progress. Displays a spinning loader during processing. |
| **Verdict Banner** | Shows a large **Compliant** (green) or **Non-Compliant** (red) verdict card after analysis, with a corresponding icon. |
| **Vehicle Registration** | Displays the auto-generated vehicle registration number derived from pixel data (state code + district + series + number). |
| **Confidence Gauge** | Horizontal progress bar showing detection confidence percentage, color-coded green (>70%), yellow (40–70%), or red (<40%). |
| **Compliance Checklist** | Three check items with pass/fail indicators: |
| | • **Reflector Presence** — Whether a reflective region was detected |
| | • **Correct Placement** — Whether the reflector is within the expected zone on the vehicle |
| | • **Vendor Record** — Whether the vehicle matches a known installation record |
| **Metadata Grid** | 2×2 grid showing: Latency (ms), Model (YOLOv8-n), Clusters (count), and Timestamp. |
| **Download Report** | Generates a plain-text compliance report file for the current inspection. |

#### Center Panel — Detection Canvas

| Element | Description |
|---|---|
| **Image Viewport** | Renders the uploaded vehicle image with `object-fit: contain`. When no image is loaded, shows an animated floating placeholder icon. |
| **Scan Animation** | During analysis, a horizontal laser-line sweeps vertically across the image with a glowing border pulse effect. |
| **Vehicle Bounding Box** | A blue-indigo rectangle outlines the detected vehicle region with a confidence label tag (e.g., `VEHICLE 0.95`). |
| **Reflector Bounding Boxes** | Green (correct placement) or red (incorrect placement) rectangles highlight each detected reflector cluster with a confidence percentage label. Up to 3 clusters are shown. |
| **"No Reflector Detected" Overlay** | If no reflective region is found, a centered dark overlay badge displays the message. |
| **Bottom Info Bar** | Gradient footer showing model name, confidence score, latency, and a **COMPLIANT / NON-COMPLIANT** status pill. |
| **Overlay Toggle** | Header button to show/hide detection overlays on the canvas (`◉ Overlay` / `○ Overlay`). |

#### Right Sidebar — Stats & Timeline (250 px)

| Section | Description |
|---|---|
| **Compliance Ring** | SVG donut chart showing the overall compliance rate across all inspections. Color shifts from green (>70%) to yellow (40–70%) to red (<40%). Displays the percentage at center. |
| **Pass / Fail Counters** | Side-by-side numeric counters for compliant and non-compliant inspections. |
| **Summary Stats** | 2-column grid showing **Total** inspections and **Avg Latency**. |
| **Recent Timeline** | Vertical timeline of the 12 most recent inspections. Each entry shows the vehicle number, status (Compliant/Non-compliant), and timestamp. Clicking an entry loads its result into the main canvas. |

---

### 📜 History Page (`view = "history"`)

A tabular log of every inspection performed during the session (persisted in `localStorage`, up to 200 records).

| Element | Description |
|---|---|
| **Header** | Page title "History" with a subtitle showing the total number of inspections recorded. |
| **Export CSV Button** | Downloads the full inspection log as a `.csv` file containing: Vehicle, Compliant, Reflector, Placement, Confidence, Latency, and Date columns. |
| **Clear Button** | Deletes all history from memory and `localStorage` (with a confirmation prompt). Only visible when records exist. |
| **Inspection Table** | Glassmorphic table with the following columns: |
| | • **Vehicle** — Registration number (monospaced, bold) |
| | • **Status** — Color-coded pill badge showing "Pass" (green) or "Fail" (red) |
| | • **Reflector** — ✓ or ✕ indicator for reflector detection |
| | • **Placement** — ✓ or ✕ indicator for correct placement |
| | • **Confidence** — Percentage value (monospaced) |
| | • **Latency** — Processing time in milliseconds |
| | • **Date** — Timestamp of the inspection |
| **Row Interaction** | Hovering highlights the row. Clicking any row navigates back to the **Inspect** page and loads that record's results onto the detection canvas. |
| **Empty State** | Displays "No records" centered text when no inspections have been performed. |

---

### 📊 Analytics Page (`view = "analytics"`)

A dashboard providing aggregate performance metrics and system configuration details.

#### Top Stats Row (4 cards)

| Card | Icon | Metric | Description |
|---|---|---|---|
| **Inspections** | 📋 | Total count | Total number of vehicle inspections processed |
| **Compliant** | ✅ | Pass count | Number of vehicles that passed compliance, with percentage rate |
| **Non-Compliant** | 🚨 | Fail count | Number of vehicles that failed compliance, with percentage rate |
| **Avg Latency** | ⚡ | Time in ms | Average image processing time across all inspections |

Each card features a glassmorphic background, hover lift animation, and a shadow effect on interaction.

#### Bottom Section (3 columns)

| Panel | Description |
|---|---|
| **Compliance Rate Ring** | Large (170 px) SVG donut chart with the overall compliance percentage. Accompanied by a status label: 🟢 Excellent (≥80%), 🟡 Moderate (50–79%), 🔴 Needs attention (<50%), or "No data yet" when empty. |
| **Detection Breakdown** | Three horizontal progress bars tracking sub-metrics across all inspections: |
| | • **Reflector Found** — Count of images where a reflector was detected (indigo bar) |
| | • **Correct Placement** — Count of images with correctly placed reflectors (green bar) |
| | • **Vendor Verified** — Count of images matching a known vendor installation record (amber bar) |
| | Each bar shows `count / total` and a proportional fill animation. |
| **System Configuration** | Key-value list of technical parameters: |
| | • Model: YOLOv8-nano |
| | • Processing: Client-side |
| | • Grid: 32 × 32 |
| | • Min Area: 5% |
| | • Sampling: 2px step |
| | • Max Clusters: 3 |
| | • Version: 2.1.0 |
| | • Status: ● Online (green) |

---

### 🌗 Global Components (All Pages)

| Component | Description |
|---|---|
| **Header Bar** | Fixed 56 px top bar with: app logo ("R" gradient badge), app name "Reflector v2.1", tab navigation (Inspect / History / Analytics), theme toggle (☀️/🌙), and system status indicator (● Online). |
| **Theme Toggle** | Switches between **dark** and **light** mode. Preference is persisted in `localStorage`. All colors are driven by CSS custom properties for instant theme switching. |
| **Ambient Background** | Two soft radial gradient blobs (indigo and purple) positioned behind content for depth. Automatically adapts opacity for light/dark themes. |

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
