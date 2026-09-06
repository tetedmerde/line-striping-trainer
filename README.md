# HOOKERS — Line Striping Trainer (3D)

Browser **LineLazer-style** striping trainer for the **HOOKERS** paint crew. Hyper-real-ish Three.js lot built from Supercenter **#2855** (Shawnee KS) site plan geometry on **real asphalt blacktop** — not a plan-sheet wallpaper. **Start/stop endpoint marks** on each bay run; connect them with **LazerGuide**. Helper walks the reflective target box down the stalls.

No trademarked store or equipment logos — crew branding **HOOKERS** stays. Facade reads **STORE**.

## Play online

**Live:** https://tetedmerde.github.io/line-striping-trainer/

Hard-refresh (Ctrl/Cmd+Shift+R) after deploys so the new build loads.

## Core loop

1. Pick a mission (stalls / ADA / arrows-stop-firelane)
2. **STRIPE** immediately — start & stop marks at endpoints of each stripe / bay run (no layout parade)
3. Aim green laser through marks / at helper’s reflective target box → HUD **ON TARGET** / **DOTS ALIGN**
4. **L** / **F** — **LOCK** path (tip constrained to the guide / endpoint run)
5. Hold **Space** while moving — smooth continuous stripe connecting start→stop
6. Helper **auto-advances** the box down the row / to the next bay as you coat (active marks highlight)
7. **Enter** — score coverage (endpoint hits + path coat)

**P** toggles a faint plan reference overlay (debug; default is blacktop only).

## Controls

| Input | Action |
|-------|--------|
| **WASD** / arrows | Drive / steer |
| **G** | Toggle laser |
| **T** | Jump target to next bay / guide |
| **[** / **]** or **,** / **.** | Nudge target along current guide |
| **H** or **=** | Call helper forward (hold) |
| **-** | Call helper back (hold) |
| **L** or **F** | Lock when on-target / dots-aligned / unlock |
| **Space** or LMB | Spray (smooth airless coat) |
| **P** | Toggle faint plan reference (debug) |
| **V** | Toggle top-down assist |
| **C** | Toggle shoulder cam |
| **1 / 2 / 3** | White / Yellow / Blue |
| **Enter** | Submit score |
| **R** | Clear paint |

## Missions

1. **Angled Stall Lines (Yellow)** — multi-bay laser-lock runs on the front field
2. **ADA Near Vestibules** — blue borders & hashes at GR/GM doors
3. **Stop / SECP / Fire Lane** — white stop bar & crosswalk ticks; yellow fire-lane & arrows

## Stack

Vite + Three.js r169. `base: '/line-striping-trainer/'` for GitHub Pages. Optional plan asset: `public/walmart-plan-2855.jpg` (debug overlay only). Lot geometry lives in `src/game/lotLayout.js`.

## Honest limitations

- Browser-honest “hyper-real”: wet asphalt sheen, plan-derived islands/stalls/building, soft shadows, subtle bloom — not Unreal 5.
- Default ground is **PBR asphalt**; plan sheet is optional debug, not the primary look.
- Helper and ambient crew are stylized NPCs; marks are start/stop endpoints only (no dotted layout ceremony).
- Paint is a canvas coat projected on the lot (convincing from chase/top cams; not a volumetric fluid sim).
