# HOOKERS — Line Striping Trainer (3D)

Browser **LineLazer-style** striping trainer for the **HOOKERS** paint crew. Hyper-real-ish Three.js lot built from Supercenter **#2855** (Shawnee KS) site plan geometry on **real asphalt blacktop** — not a plan-sheet wallpaper. Crew lays **AutoLayout pre-mark dots**; you connect them with **LazerGuide**.

No trademarked store or equipment logos — crew branding **HOOKERS** stays. Facade reads **STORE**.

## Play online

**Live:** https://tetedmerde.github.io/line-striping-trainer/

Hard-refresh (Ctrl/Cmd+Shift+R) after deploys so the new build loads.

## Core loop (Graco field flow)

1. Pick a mission (stalls / ADA / arrows-stop-firelane)
2. **LAYOUT** — 2–3 Hookers guys walk the bay and place paint **pre-mark dots** along guides
3. **STRIPE** — aim green laser through dots / at helper’s reflective target box → HUD **ON TARGET** / **DOTS ALIGN**
4. **L** / **F** — **LOCK** path (tip constrained to the guide / dot run)
5. Hold **Space** while moving — smooth continuous stripe connecting the dots
6. Helper **auto-advances** the box down the row / to the next bay as you coat
7. **Enter** — score coverage (prefers clean dot connects)

Press **Y** anytime in LAYOUT to skip straight to STRIPE. **P** toggles a faint plan reference overlay (debug; default is blacktop only).

## Controls

| Input | Action |
|-------|--------|
| **WASD** / arrows | Drive / steer |
| **Y** | Skip LAYOUT → STRIPE |
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
- Layout crew and helper are stylized NPCs; AutoLayout dots approximate field pre-mark spacing.
- Paint is a canvas coat projected on the lot (convincing from chase/top cams; not a volumetric fluid sim).
