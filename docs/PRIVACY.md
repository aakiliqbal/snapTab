# Privacy Policy for SnapTab

**Last updated:** July 2026

SnapTab is a local-first Chrome extension that replaces the new tab page with a customizable workspace. This privacy policy explains how the extension handles data.

## Data Collection

**SnapTab does not collect, store, or transmit any personal data.** There are no analytics, no telemetry, no tracking scripts, and no third-party data services embedded in the extension.

All user data — shortcuts, settings, wallpaper images, RSS subscriptions, and widget configuration — is stored exclusively in `chrome.storage.local` on your local device. This data never leaves your browser.

## Network Requests

SnapTab makes only the following network requests:

1. **Weather data** — When you configure the Weather Widget, SnapTab fetches forecast data from [Open-Meteo](https://open-meteo.com/), a free and open-source weather API. The request includes the latitude and longitude you configured. No personal identifiers are sent.

2. **RSS/Atom feeds** — When you add feed subscriptions to the Snap Feed Widget, SnapTab fetches those feeds directly from the URLs you provide. This is identical to visiting those URLs in your browser. SnapTab has no control over what data those third-party servers may collect.

3. **Favicons** — SnapTab may load favicon images for search providers, saved shortcuts, or feeds from the relevant website or from Google's favicon service. These requests are used only to display icons in the local new tab page.

No analytics, telemetry, tracking, backend account, or sync-service requests are made.

## Data Sharing

SnapTab does not share, sell, or transmit any user data to third parties. Because all data stays in `chrome.storage.local` on your device, SnapTab cannot access your data — it has no servers to receive it.

## Permissions

SnapTab requests the following Chrome permissions:

| Permission | Purpose |
|------------|---------|
| `storage` | Store your shortcuts, settings, and configuration locally. |
| `activeTab` | Temporarily read the current tab's title and URL when you use the toolbar popup to save a shortcut. Only used when you click the extension icon. |
| Host permissions (optional) | Fetch RSS/Atom feeds from URLs you explicitly subscribe to. SnapTab requests access only when needed for a feed domain, and the permission is used only for RSS/Atom fetches. |

## Data Retention and Deletion

All data is stored locally in `chrome.storage.local`. You can:
- **Export** your data at any time via the JSON Backup feature in Settings.
- **Delete** all data by uninstalling the extension from `chrome://extensions/`.

There is no server-side data to delete.

## Open Source

SnapTab is open source. The full source code is available on GitHub for independent audit. Anyone can verify that no data collection exists.

## Contact

For questions about this privacy policy or the extension, open an issue on the GitHub repository.

## Changes to This Policy

If this policy changes, the "Last updated" date at the top will reflect the revision. Since SnapTab has no server-side component, policy changes relate to the extension's declared behavior, not to changes in server-side data handling.
