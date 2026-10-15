# Progressive Web App Guide

## Included

- Next.js web app manifest at `/manifest.webmanifest`.
- App name, short name, standalone display mode, theme/background colors, `/transactions` start URL, and 192/512-pixel Omkar Marketing icons.
- `public/sw.js` is registered by the root layout. It activates updates immediately and claims clients.
- The service worker precaches only `offline.html` and the app icons. It does not cache authenticated pages, API responses, or business data.
- A failed page navigation displays `/offline.html`, which explains that Google Sheets operations need connectivity.

## Install and test

1. Deploy or serve the site on HTTPS (localhost is also treated as secure for development).
2. Open the app in a supported browser after loading it once online.
3. Use the browser's Install/Add to Home Screen action where available. iOS installation is performed from Safari's Share menu.
4. Disconnect the device and navigate to a page; confirm the offline message appears and no saved business data is presented.
5. Reconnect and reload; confirm the normal authenticated app becomes available.

Browser-specific install prompts and update timing vary. Device-level installation, iOS behavior, offline recovery, and Vercel HTTPS deployment still require manual verification. The app is not an offline transaction-entry system.
