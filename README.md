# HOOKERS — Line Striping Trainer

**Top-down** browser LineLazer-style trainer for the **HOOKERS** paint crew. The real Supercenter **#2855** (Shawnee KS) site plan is the lot. Place a reflective target, lock the green laser, and lay a smooth 4″ airless coat along stall guides.

No trademarked store or equipment logos — crew branding **HOOKERS** stays.

## Play online

**Live:** https://tetedmerde.github.io/line-striping-trainer/

Hard-refresh (Ctrl/Cmd+Shift+R) after deploys so the new build loads.

## Core loop

1. Pick a mission (stalls / ADA / arrows-stop-firelane)
2. **T** — cycle/place the reflective **target box** at the end of a guide
3. Drive (**WASD**) so the green laser hits the target
4. **L** / **F** — **LOCK** path
5. Hold **Space** while moving — smooth continuous stripe
6. **Enter** — score coverage vs guides

## Controls

| Input | Action |
|-------|--------|
| **WASD** / arrows | Move / steer |
| **G** | Toggle laser |
| **T** | Cycle target to next guide end |
| **L** or **F** | Lock when on-target / unlock |
| **Space** or LMB | Spray (smooth airless coat) |
| **1 / 2 / 3** | White / Yellow / Blue |
| **Enter** | Submit score |
| **R** | Clear paint |
| **Scroll** | Zoom |
| **Shift+drag** / RMB drag | Pan |

## Missions

1. **Angled Stall Lines (Yellow)** — multi-bay laser-lock runs on the front field
2. **ADA Near Vestibules** — blue borders & hashes
3. **Stop / SECP / Fire Lane** — white stop bar & crosswalk ticks; yellow fire-lane & arrows

## Stack

Vite + vanilla Canvas 2D. `base: '/line-striping-trainer/'` for GitHub Pages. Plan asset: `public/walmart-plan-2855.jpg`.
