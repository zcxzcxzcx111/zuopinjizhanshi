Create one horizontal animation strip for Codex pet `sanji`, state `running-right`.

Use the attached canonical base for identity. Use the attached layout guide only for slot count, spacing, centering, and padding; do not draw the guide.

Output exactly 8 full-body frames in one left-to-right row on flat pure cyan #00FFFF. Treat the row as 8 invisible equal-width slots: one centered complete pose per slot, evenly spaced, with no overlap, clipping, empty slots, labels, or borders.

Identity: same pet in every frame: Faithfully recreate the exact character appearance shown in the supplied image: Sanji in super-deformed chibi proportions, oversized head, sweeping golden-blond side-parted hair covering the screen-right eye, visible curled eyebrow above the screen-left violet-gray eye, small goatee, black double-breasted pinstripe suit, pale blue shirt, dark tie, black flared trousers and shoes. Keep the same palette, face, hair silhouette, outfit, proportions, and cool confident demeanor. The cigarette is part of the reference identity but omit it from animation states when it would become a detached or unsafe sprite element.. Preserve silhouette, face, proportions, markings, palette, material, style, and props.
Style: Pet-safe sprite: compact full-body mascot, readable in a 192x208 cell, clear silhouette, simple face, stable palette/materials, and crisp edges for chroma-key extraction. Style `sticker`: Polished sticker mascot with bold clean shapes, crisp outline, flat colors, and minimal highlight detail. User style notes: Match the supplied soft anime chibi illustration as closely as possible: warm yellow hair highlights, pale skin, plum-brown outlines, subtle blush and soft cel shading, clean compact whole-body sticker sprite..
Animation continuity: keep apparent pet scale and baseline stable within the row unless the state itself intentionally changes vertical position, such as `jumping`. Move the pose within the slot instead of redrawing the pet larger or smaller frame to frame.

State action: Dragging-right loop: show directional movement to the right through body and limb poses only.

State requirements:
- Show directional drag movement to the right through body, limb, and prop movement only.
- The row must unmistakably face and travel right.
- The movement cadence must alternate visibly across the 8 frames instead of repeating one nearly static stride.
- Do not draw speed lines, dust clouds, floor shadows, motion trails, or detached motion effects.

Clean extraction: crisp opaque edges, safe padding, no scenery, text, guide marks, checkerboard, shadows, glows, motion blur, speed lines, dust, detached effects, stray pixels, or chroma-key colors inside the pet.
