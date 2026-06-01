import { brandIcons } from "../../../../domain/brandIcons";
import type { Shortcut } from "../../../../domain/tabState";

export function ShortcutIcon({ shortcut }: { shortcut: Shortcut }) {
  const brandIcon =
    shortcut.icon.type === "brand" && shortcut.icon.brandIconId
      ? brandIcons[shortcut.icon.brandIconId]
      : null;

  return (
    <span
      className={`quick-link-icon ${shortcut.icon.type === "image" || brandIcon ? "image-icon" : ""}`}
      style={{ backgroundColor: shortcut.icon.background }}
      aria-hidden="true"
    >
      {shortcut.icon.type === "image" && shortcut.icon.imageDataUrl ? (
        <img src={shortcut.icon.imageDataUrl} alt="" />
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
