import { useEffect, useState } from "react";
import { brandIcons } from "../../../../domain/brandIcons";
import type { Shortcut } from "../../../../domain/tabState";

export function getHighResolutionFaviconUrl(url: string, size = 256): string {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return "";
    return `https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(parsed.origin)}&size=${size}`;
  } catch {
    return "";
  }
}

export function ShortcutIcon({ shortcut }: { shortcut: Shortcut }) {
  const brandIcon =
    shortcut.icon.type === "brand" && shortcut.icon.brandIconId
      ? brandIcons[shortcut.icon.brandIconId]
      : null;
  const iconImage = shortcut.icon.type === "image" ? shortcut.icon.imageDataUrl : null;
  const isRemoteFavicon = typeof iconImage === "string" && iconImage.startsWith("https://t0.gstatic.com/faviconV2?");
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [shortcut.url, shortcut.icon.type, shortcut.icon.imageDataUrl, shortcut.icon.brandIconId]);

  return (
    <span
      className={`quick-link-icon ${(iconImage && !imageFailed) || brandIcon ? "image-icon" : ""}`}
      style={{ backgroundColor: shortcut.icon.background }}
      aria-hidden="true"
    >
      {iconImage && !imageFailed ? (
        <img
          className={isRemoteFavicon ? "shortcut-favicon" : undefined}
          style={{ objectFit: shortcut.icon.fit ?? "contain", transform: `translate(${shortcut.icon.offsetX ?? 0}px, ${shortcut.icon.offsetY ?? 0}px) scale(${shortcut.icon.zoom ?? 1})` }}
          src={isRemoteFavicon ? getHighResolutionFaviconUrl(shortcut.url) || iconImage : iconImage}
          alt=""
          loading={isRemoteFavicon ? "lazy" : undefined}
          decoding="async"
          onError={() => setImageFailed(true)}
        />
      ) : brandIcon ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d={brandIcon.path} />
        </svg>
      ) : (
        shortcut.icon.label
      )}
    </span>
  );
}
