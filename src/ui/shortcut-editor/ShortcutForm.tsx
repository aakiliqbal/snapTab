import { useRef, type FormEvent, type PointerEvent } from "react";
import { getHighResolutionFaviconUrl } from "../widgets/shortcut-grid/shortcuts/ShortcutIcon";
import { brandIcons, type BrandIcon } from "../../domain/brandIcons";
import type { ShortcutDraft } from "../../domain/drafts";

type ShortcutFormProps = {
  draft: ShortcutDraft;
  iconRecommendations: BrandIcon[];
  onApplyRecommendedIcon: (icon: BrandIcon) => void;
  onCancel: () => void;
  onChangeDraft: (draft: ShortcutDraft) => void;
  onDelete?: () => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  onUploadIcon: (file: File | null) => void;
  saveLabel?: string;
};

export function ShortcutForm({
  draft,
  iconRecommendations,
  onApplyRecommendedIcon,
  onCancel,
  onChangeDraft,
  onDelete,
  onSave,
  onUploadIcon,
  saveLabel = "Save"
}: ShortcutFormProps) {
  const imageZoom = draft.iconZoom ?? 1;
  const imageFit = draft.iconFit ?? "contain";
  const setZoom = (zoom: number) => onChangeDraft({ ...draft, iconZoom: Math.min(6, Math.max(0.2, Math.round(zoom * 100) / 100)) });
  const palette = ["transparent", "#ffffff", "#f5a623", "#e74c3c", "#7ed321", "#4a90e2", "#50e3c2", "#bd10e0", "#9013fe", "#417505", "#4a4a4a", "#000000"];
  const dragRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);
  const offsetX = draft.iconOffsetX ?? 0;
  const offsetY = draft.iconOffsetY ?? 0;
  const isRemoteFavicon = !!draft.iconImageDataUrl && draft.iconImageDataUrl.startsWith("https://t0.gstatic.com/faviconV2?");
  const editorMode = draft.brandIconId ? "site" : draft.iconImageDataUrl ? (isRemoteFavicon ? "site" : "image") : "text";
  function startPan(event: PointerEvent<HTMLDivElement>) {
    if (!draft.iconImageDataUrl) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { x: event.clientX, y: event.clientY, offsetX, offsetY };
  }
  function movePan(event: PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    const start = dragRef.current;
    onChangeDraft({ ...draft, iconOffsetX: Math.max(-200, Math.min(200, start.offsetX + event.clientX - start.x)), iconOffsetY: Math.max(-200, Math.min(200, start.offsetY + event.clientY - start.y)) });
  }
  function endPan() { dragRef.current = null; }

  return (
    <form className="quick-link-form" onSubmit={onSave}>
      <label>
        <span>Title</span>
        <input
          autoFocus
          autoComplete="off"
          autoCapitalize="words"
          spellCheck={false}
          value={draft.title}
          onChange={(event) => onChangeDraft({ ...draft, title: event.target.value })}
          required
        />
      </label>

      <label>
        <span>URL</span>
        <input
          inputMode="url"
          autoComplete="url"
          autoCapitalize="off"
          spellCheck={false}
          placeholder="https://example.com"
          value={draft.url}
          onChange={(event) => onChangeDraft({ ...draft, url: event.target.value })}
          required
        />
      </label>

      <section className="icon-editor" aria-label="Shortcut icon editor">
        <div className="icon-editor-heading">
          <div><strong>Icon editor</strong><p>Choose an icon, then zoom or drag to position it.</p></div>
          <div className="icon-editor-modes" role="group" aria-label="Icon source">
            <button type="button" className={editorMode === "site" ? "selected" : ""} title="Use website favicon" onClick={() => onChangeDraft({ ...draft, iconImageDataUrl: getHighResolutionFaviconUrl(draft.url) || null, iconMediaId: null, brandIconId: null, iconZoom: 1, iconOffsetX: 0, iconOffsetY: 0 })}>Website</button>
            <button type="button" className={editorMode === "image" ? "selected" : ""} title="Use uploaded image" onClick={() => { if (draft.iconImageDataUrl && !isRemoteFavicon) onChangeDraft({ ...draft, brandIconId: null }); }}>Image</button>
            <button type="button" className={editorMode === "text" ? "selected" : ""} title="Use text label" onClick={() => onChangeDraft({ ...draft, iconImageDataUrl: null, iconMediaId: null, brandIconId: null, iconZoom: 1, iconOffsetX: 0, iconOffsetY: 0 })}>Text</button>
          </div>
        </div>
        <div className="icon-workspace">
          <div
            className="icon-editor-stage"
            role="img"
            aria-label="Interactive icon preview. Drag the image to reposition it."
            onPointerDown={startPan}
            onPointerMove={movePan}
            onPointerUp={endPan}
            onPointerCancel={endPan}
            style={{ "--quick-link-icon-radius": "var(--quick-link-icon-radius, 22%)" } as React.CSSProperties}
          >
            <span className={`quick-link-icon ${draft.iconImageDataUrl || (draft.brandIconId && brandIcons[draft.brandIconId]) ? "image-icon" : ""}`} style={{ backgroundColor: draft.iconBackground }}>
              {draft.iconImageDataUrl ? (
                <img draggable={false} src={draft.iconImageDataUrl} alt="" style={{ objectFit: imageFit, transform: `translate(${offsetX}px, ${offsetY}px) scale(${imageZoom})` }} />
              ) : draft.brandIconId && brandIcons[draft.brandIconId] ? (
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d={brandIcons[draft.brandIconId].path} /></svg>
              ) : (
                <span className="icon-editor-text">{(draft.iconLabel || draft.title.slice(0, 1) || "?").toUpperCase()}</span>
              )}
            </span>
          </div>
          <div className="icon-editor-tools">
            <div className="icon-transform-controls" role="group" aria-label="Image zoom and fit controls">
              <button type="button" title="Zoom out" aria-label="Zoom out" disabled={imageZoom <= 0.2} onClick={() => setZoom(imageZoom - 0.2)}>−</button>
              <button type="button" title="Zoom in" aria-label="Zoom in" disabled={imageZoom >= 6} onClick={() => setZoom(imageZoom + 0.2)}>+</button>
              <button type="button" title="Fit image inside the icon" aria-label="Fit image" className={imageFit === "contain" ? "selected" : ""} onClick={() => onChangeDraft({ ...draft, iconFit: "contain", iconZoom: 1, iconOffsetX: 0, iconOffsetY: 0 })}>Fit</button>
              <button type="button" title="Fill the icon with the image" aria-label="Fill icon" className={imageFit === "cover" ? "selected" : ""} onClick={() => onChangeDraft({ ...draft, iconFit: "cover", iconZoom: 1, iconOffsetX: 0, iconOffsetY: 0 })}>Fill</button>
              <output className="icon-zoom-value">{Math.round(imageZoom * 100)}%</output>
            </div>
            <label className="icon-label-field"><span>Icon text</span><input maxLength={32} value={draft.iconLabel} onChange={(event) => onChangeDraft({ ...draft, iconLabel: event.target.value, iconImageDataUrl: null, iconMediaId: null, brandIconId: null })} /></label>
            <div className="icon-color-editor">
              <span>Background color</span>
              <div className="icon-color-palette" role="group" aria-label="Icon background color">
                {palette.map((color) => (
                  <button key={color} type="button" className={draft.iconBackground === color ? "selected" : ""} title={color === "transparent" ? "Transparent" : color} aria-label={color === "transparent" ? "Transparent background" : `Background ${color}`} aria-pressed={draft.iconBackground === color} style={{ background: color === "transparent" ? "repeating-conic-gradient(#aaa 0% 25%, #fff 0% 50%) 50% / 12px 12px" : color }} onClick={() => onChangeDraft({ ...draft, iconBackground: color })} />
                ))}
              </div>
            </div>
            <p className="icon-editor-hint">Drag the preview to reposition. Zoom and framing are saved with the shortcut.</p>
          </div>
        </div>
      </section>
      {iconRecommendations.length > 0 ? (
        <div className="recommended-icons" aria-label="Recommended icons">
          <span>Recommended icons</span>
          <div className="recommended-icon-row">
            {iconRecommendations.map((icon) => (
              <button
                className={draft.brandIconId === icon.id ? "selected" : ""}
                type="button"
                key={icon.id}
                onClick={() => onApplyRecommendedIcon(icon)}
                aria-label={`Use ${icon.title} icon`}
                title={icon.title}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d={icon.path} />
                </svg>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="icon-image-actions">
        <label className="secondary-button file-button">
          Upload icon image
          <input
            accept="image/*"
            type="file"
            onChange={(event) => {
              onUploadIcon(event.target.files?.[0] ?? null);
              event.currentTarget.value = "";
            }}
          />
        </label>
      </div>

      <div className="modal-actions">
        {draft.id && onDelete ? (
          <button className="danger-button" type="button" onClick={onDelete}>
            Delete
          </button>
        ) : null}
        <button className="secondary-button" type="button" onClick={onCancel}>
          Cancel
        </button>
        <button className="primary-button" type="submit">
          {saveLabel}
        </button>
      </div>
    </form>
  );
}
