# HOOKERS — Line Striping Trainer

**3D** browser game for the **HOOKERS** paint crew. Drive a **LineLazer-style** ride-on airless striper around Supercenter **#2855** (Shawnee KS site plan), lock a LazerGuide-style target for straight multi-bay lines, and lay a smooth 4" coat — while your crew mates wander the lot.

Layout mapped from the real #2855 site plan sheet. No trademarked store or equipment logos — generic STORE / “airless striper” labeling only. Crew branding **HOOKERS** stays.

## Play online

**Live:** https://tetedmerde.github.io/line-striping-trainer/

Hard-refresh (Ctrl/Cmd+Shift+R) after deploys so the new build loads.

## Recommended workflow (laser lock)

1. **T** — cycle / place the reflective **target box** at the far end of a guide (across multiple stall bays).
2. Line up so the **green laser** from the tip sits on the target (HUD → **ON TARGET**).
3. **L** (or **F**) — **LOCK** the stripe path (assist steering / hold heading).
4. **Space** / LMB — spray a continuous airless tip band while driving forward/back along the lock.
5. **L** again or hard steer — unlock. Freehand spray remains as advanced/hard mode.

## Controls

| Input | Action |
|-------|--------|
| **W / Up** | Accelerate |
| **S / Down** | Brake / reverse |
| **A D / arrows** | Steer (works at low/zero speed; hard steer breaks lock) |
| **Shift** | Precision crawl |
| **Space** or **Left mouse** | Spray paint (best results when locked) |
| **G** | Toggle laser on/off |
| **T** | Cycle target box to next guide / bay end |
| **L** or **F** | Lock path when laser on-target / unlock |
| **1 / 2 / 3** or **HUD swatches** | White / Yellow / Blue (always) |
| **Q / E / C** | Cycle paint color |
| **V** | Toggle chase / top-down assist |
| **Enter** | Submit score |
| **Shift+R** | Clear paint |

## Missions

1. **Angled Stall Lines (Yellow)** — front bay dividers (laser lock across bays)
2. **ADA Near Vestibules** — blue borders, hashes, pads
3. **SECP / Stop Bars / Fire Lane** — white crosswalk + stop bar; yellow arrows & fire lane

Wrong color still sprays — scoring penalizes mismatch vs guides.

## Stack

Vite + Three.js. `base: '/line-striping-trainer/'` for GitHub Pages.
