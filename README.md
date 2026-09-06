# Line Striping Trainer

**3D** browser-based training simulator for parking lot line striping. Drive a striping truck around a Supercenter-style retail lot (BFR / OCR, ADA near vestibules, SECP crosswalk, fire-lane yellow curb, EV zone, cart corrals), spray paint onto asphalt, and score against ghost guides.

Layout inspired by a real Supercenter restriping plan. No trademarked logos — generic STORE branding only.

## Play online

**Live:** https://tetedmerde.github.io/line-striping-trainer/

## Controls

| Input | Action |
|-------|--------|
| **W / Up** | Accelerate |
| **S / Down** | Brake / reverse |
| **A D / arrows** | Steer |
| **Space** or **Left mouse** | Spray paint |
| **1 / 2 / 3** | White / Yellow / Blue |
| **Enter** | Submit score |
| **Shift+R** | Clear paint (practice) |

Chase camera follows the truck. Align the side boom over ghost guides, then spray.

## Missions (GC restriping packages)

1. **Stall Lines (4 inch White)** — customer bay dividers
2. **Accessible / Van ADA** — blue borders, aisle hashes, symbol pads near entrance
3. **SECP Crosswalk / Stop Bars / Arrows** — white stop bar + crosswalk; yellow arrows, fire-lane curb, island hashes

## Modes

- **Practice** — clear translucent ghost guides
- **Test** — guides fade as time passes

## Scoring

Coverage vs guides, overspray penalty, wrong-color penalty. Pass at 70%.

## Stack

Vite + Three.js (vanilla JS). base set for GitHub Pages.
