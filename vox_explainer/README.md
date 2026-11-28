# Vox-Style Motion Graphics Explainer — *Why Every World Map Lies to You*

Code-driven **Vox-style** editorial motion graphics video rendered programmatically at **1920×1080 @ 30fps (36s)** with synchronized procedural audio.

## Deliverables
- `vox_explainer.mp4` — Full HD 1080p H.264 video with AAC stereo audio
- `thumb_vox.jpg` — 1280×720 editorial thumbnail
- `voxRenderer.ts` — Canvas 2D + `d3-geo` motion graphics engine (Orthographic globe, Mercator, Tissot's Indicatrix, Greenland-vs-Africa scale comparison, live Mercator → Equal Earth morph)
- `voxAudio.ts` — 48 kHz procedural felt marimba + editorial SFX synthesizer
- `render_mp4.mjs` — Headless Skia (`@napi-rs/canvas`) + FFmpeg MP4 render pipeline
