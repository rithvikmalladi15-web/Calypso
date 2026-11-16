# Visual asset attribution

- Active cabin cartoon: AI-assisted SVG code illustration in `src/components/CabinDiagram.tsx`. A transparent “Made by AI” caption sits beside the image; its embedded SVG label also survives PNG export.
- Crew body map: AI-assisted SVG code illustration in `src/components/CrewHealthPanel.tsx`, labeled “Made by AI”. It is research context, not physiological output.
- Roger mascot: AI-assisted SVG code illustration in `src/components/Roger.tsx`. Its launcher and conversation header both show “Made by AI”.
- `cabin-crew.svg`: archived ImageGen astronaut asset, not displayed by the current cabin schematic. The SVG wrapper includes a semi-transparent “Made by AI” watermark without an opaque badge. Original generated bitmap is unchanged. Applicable OpenAI terms govern generated output rights.
- `favicon.svg`: original AI-assisted vector symbol with an embedded attribution label; browser-tab size limits legibility.
- Interface icons: Lucide library assets, not generated images.

Charts render deterministic model output or the supplied NASA CSV. They are not labeled as AI-generated measurements. Design and implementation used AI assistance. All active illustration captions use transparent backgrounds and remain readable against the dark surfaces.

- Interactive 3D cabin, crew and body: original AI-assisted procedural geometry in `src/components/ScientificScene.tsx`, rendered with Three.js. On-screen attribution and exported PNG watermarks read “Made by AI”. No third-party model assets were downloaded. These are conceptual illustrations, not geometry-resolved model outputs.
