---
name: object-capture
description: Turn a set of photos of a real object or pet (e.g. Sijo's cat Shea) into a 3D model on this Mac with Apple's Object Capture (RealityKit PhotogrammetrySession), then convert it for the site. Use when Sijo sends photos to scan, or asks to make a 3D model of something real.
---

# Object Capture (photos → 3D, on-device)

Nothing is uploaded; the model is Sijo's own (no licence issues).

## Photos needed
40–80 photos, full circle at subject height + a second circle from above, ~70% overlap, subject fills the frame,
soft even light, no flash, subject still. 8 photos from one side fail (`processError`) — tested 2026-10-09.

## Run
```bash
swiftc -O .claude/skills/object-capture/scan.swift -o <scratch>/scan
<scratch>/scan <folder of HEIC/JPG> <scratch>/model.usdz      # detail .reduced; edit scan.swift for .medium/.full
```
Then convert USDZ → GLB for three.js (e.g. Blender `--background --python` import usd / export gltf, or
`usdzconvert`), decimate to ≤ 30k triangles, textures ≤ 1024 px JPEG, and check it in the room with site-qa.
