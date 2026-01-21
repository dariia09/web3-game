# River Club visual assets

Original artwork was generated with built-in ImageGen for this project in September 2026. The shipped version uses optimized WebP files; no new artwork was generated for this optimization.

- `player-cutouts.webp`: transparent 3-column x 4-row character atlas, 1086 x 1448. Columns: Atlas, Mika, Nova. Rows: idle, thinking, chip action, winner. Lossless WebP preserves all original RGBA pixels. CSS selects poses and adds breathing, lean, chip-reach and celebration movement. These are 2D sprites, not rigged 3D models.
- `neon-arena.webp`: cinematic symmetrical arena environment, 1672 x 941. Optimized at WebP quality 90 without resizing. The poker table is rendered separately in CSS.

Original prompt direction: fully clothed fictional adult card-game competitors, realistic stylized 3D rendering, consistent identities across four poses, transparent backgrounds; cinematic navy arena with architectural lighting, peripheral seating, empty central floor and no people, table, cards or UI.

The unused original `player-poses.png` and `midnight-room.png` files were removed in version 2.2; no active component references them.

## Typography

Self-hosted Roboto, Fira Sans Bold and Rajdhani Medium/Bold are converted to WOFF2 with all glyphs retained. Original Google Fonts licenses are included under `public/fonts/OFL-*.txt`.

## Interface and documentation

Lobby cards/chips and roulette wheel use CSS artwork. README images in `docs/images/` now use WebP. Gameplay screenshots are lossless; concept/environment illustrations use quality 90. See `docs/ASSET-OPTIMIZATION.md` for exact before/after sizes.
