# Fullscreen Prototype Design

## Goal

Remove the simulated iPhone hardware and preview decorations from the Web build so the MemoryMap prototype itself fills the browser viewport.

## Scope

- Keep `IPhoneAirFrame` as the shared outer component.
- On Web, render a lightweight container sized to the full viewport.
- Preserve the existing global Web reset, font loading, and shared animation styles.
- On native platforms, continue rendering children without an additional wrapper.
- Remove the desktop preview header, device chassis, side buttons, simulated status bar, dynamic island, Home indicator, footer note, and decorative desktop background.
- Do not change map, timeline, uploader, modal, navigation, or data behavior.

## Layout

The Web container uses the full available viewport (`100vw` by `100vh`), hides page-level overflow, and renders the app content with `flex: 1`. The app remains responsible for its own bottom navigation and internal overlays.

## Verification

- Run the Expo Web build and confirm it compiles.
- Confirm the page responds on both localhost and the LAN address.
- Inspect a desktop viewport and a mobile-sized viewport to ensure only app content is visible and the content fills the screen.
