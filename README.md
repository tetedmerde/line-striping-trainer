# HOOKERS — Line Striping Trainer (3D)

Browser **LineLazer-style** striping trainer for the **HOOKERS** paint crew. Hyper-real-ish Three.js lot built from Supercenter **#2855** (Shawnee KS) site plan. Aim the green laser at your helper’s reflective target box, lock the path, and lay a smooth 4″ airless coat.

No trademarked store or equipment logos — crew branding **HOOKERS** stays. Facade reads **STORE**.

## Play online

**Live:** https://tetedmerde.github.io/line-striping-trainer/

Hard-refresh (Ctrl/Cmd+Shift+R) after deploys so the new build loads.

## Core loop

1. Pick a mission (stalls / ADA / arrows-stop-firelane)
2. Helper holds the reflective **target box** at the far end of a guide
3. Drive (**WASD**) so the green laser hits the box → HUD **ON TARGET**
4. **L** / **F** — **LOCK** path (tip constrained to the guide)
5. Hold **Space** while moving — smooth continuous stripe
6. Helper **auto-advances** the box down the row / to the next bay as you coat
7. **Enter** — score coverage vs guides

## Controls

| Input | Action |
|-------|--------|
| **WASD** / arrows | Drive / steer |
| **G** | Toggle laser |
| **T** | Jump target to next bay / guide |
| **[** / **]** or **,** / **.** | Nudge target along current guide |
| **H** or **=** | Call helper forward (hold) |
| **-** | Call helper back (hold) |
| **L** or **F** | Lock when on-target / unlock |
| **Space** or LMB | Spray (smooth airless coat) |
| **V** | Toggle top-down assist |
| **C** | Toggle shoulder cam |
| **1 / 2 / 3** | White / Yellow / Blue |
| **Enter** | Submit score |
| **R** | Clear paint |

## Missions

1. **Angled Stall Lines (Yellow)** — multi-bay laser-lock runs on the front field
2. **ADA Near Vestibules** — blue borders & hashes
3. **Stop / SECP / Fire Lane** — white stop bar & crosswalk ticks; yellow fire-lane & arrows

## Stack

Vite + Three.js r169. `base: '/line-striping-trainer/'` for GitHub Pages. Plan asset: `public/walmart-plan-2855.jpg`.

## Honest limitations

- Browser-honest “hyper-real”: wet asphalt sheen, plan-based lot, PBR-ish materials, soft shadows, subtle bloom — not Unreal 5.
- Plan sheet is the ground albedo (readable as #2855), not a full photogrammetry rebuild of every island curb.
- Helper is a stylized crew NPC; auto-advance covers the field workflow (box walks ahead / next bay) plus manual nudge.
- Paint is a canvas coat projected on the lot (convincing from chase/top cams; not a volumetric fluid sim).
