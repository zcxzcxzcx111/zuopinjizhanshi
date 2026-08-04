Create one horizontal animation strip for Codex pet `sanji`, state `jumping`.

Use the attached canonical base for identity. Use the attached layout guide only for slot count, spacing, centering, and padding; do not draw the guide.

Output exactly 5 full-body frames in one left-to-right row on flat pure cyan #00FFFF. Treat the row as 5 invisible equal-width slots: one centered complete pose per slot, evenly spaced, with no overlap, clipping, empty slots, labels, or borders.

Identity: same pet in every frame: Faithfully recreate the exact character appearance shown in the supplied image: Sanji in super-deformed chibi proportions, oversized head, sweeping golden-blond side-parted hair covering the screen-right eye, visible curled eyebrow above the screen-left violet-gray eye, small goatee, black double-breasted pinstripe suit, pale blue shirt, dark tie, black flared trousers and shoes. Keep the same palette, face, hair silhouette, outfit, proportions, and cool confident demeanor. The cigarette is part of the reference identity but omit it from animation states when it would become a detached or unsafe sprite element.. Preserve silhouette, face, proportions, markings, palette, material, style, and props.
Style: Pet-safe sprite: compact full-body mascot, readable in a 192x208 cell, clear silhouette, simple face, stable palette/materials, and crisp edges for chroma-key extraction. Style `sticker`: Polished sticker mascot with bold clean shapes, crisp outline, flat colors, and minimal highlight detail. User style notes: Match the supplied soft anime chibi illustration as closely as possible: warm yellow hair highlights, pale skin, plum-brown outlines, subtle blush and soft cel shading, clean compact whole-body sticker sprite..
Animation continuity: keep apparent pet scale and baseline stable within the row unless the state itself intentionally changes vertical position, such as `jumping`. Move the pose within the slot instead of redrawing the pet larger or smaller frame to frame.

State action: Hover jump loop: anticipation, lift, airborne peak, descent, and settle through body height.

State requirements:
- Show the jump through pose and vertical body position only: anticipation, lift, airborne peak, descent, settle.
- Do not draw ground shadows, contact shadows, drop shadows, oval shadows, landing marks, dust, smears, bounce pads, or motion marks under the pet.
- Keep the background outside the pet perfectly flat chroma key with no darker key-colored patches.

Clean extraction: crisp opaque edges, safe padding, no scenery, text, guide marks, checkerboard, shadows, glows, motion blur, speed lines, dust, detached effects, stray pixels, or chroma-key colors inside the pet.
