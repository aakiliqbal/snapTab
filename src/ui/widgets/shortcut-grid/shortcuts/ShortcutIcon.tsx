import { useState } from "react";
import { brandIcons } from "../../../../domain/brandIcons";
import type { Shortcut } from "../../../../domain/tabState";

export function getHighResolutionFaviconUrl(url: string, size = 256): string {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return "";
    const siteUrl = parsed.origin;
    return `https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(siteUrl)}&size=${size}`;
  } catch {
    return "";
  }
}

export function ShortcutIcon({ shortcut }: { shortcut: Shortcut }) {
  const brandIcon =
    shortcut.icon.type === "brand" && shortcut.icon.brandIconId
      ? brandIcons[shortcut.icon.brandIconId]
      : null;
  const favicon = getHighResolutionFaviconUrl(shortcut.url);
  const [faviconFailed, setFaviconFailed] = useState(false);

  return (
    <span
      className={`quick-link-icon ${shortcut.icon.type === "image" || brandIcon || (favicon && !faviconFailed) ? "image-icon" : ""}`}
      style={{ backgroundColor: shortcut.icon.background }}
      aria-hidden="true"
    >
      {shortcut.icon.type === "image" && shortcut.icon.imageDataUrl ? (
        <img src={shortcut.icon.imageDataUrl} alt="" />
      ) : brandIcon ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d={brandIcon.path} />
        </svg>
      ) : favicon && !faviconFailed ? (
        <img
          className="shortcut-favicon"
          src={favicon}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFaviconFailed(true)}
        />
      ) : (
        shortcut.icon.label
      )}
    </span>
  );
}
