import { useEffect, useState, type FormEvent } from "react";
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
  const [imageZoom, setImageZoom] = useState(1);
  const [imageFit, setImageFit] = useState<"contain" | "cover">("contain");

  useEffect(() => {
    setImageZoom(1);
    setImageFit("contain");
  }, [draft.iconImageDataUrl]);

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

      <section className="icon-editor" aria-label="Shortcut icon">
        <div className="icon-preview-card">
          <span
            className={`quick-link-icon ${draft.iconImageDataUrl ? "image-icon" : ""}`}
            style={{ backgroundColor: draft.iconBackground }}
            aria-hidden="true"
          >
            {draft.iconImageDataUrl ? (
              <img src={draft.iconImageDataUrl} alt="" style={{ objectFit: imageFit, transform: "scale(" + imageZoom + ")" }} />
            ) : draft.brandIconId && brandIcons[draft.brandIconId] ? (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d={brandIcons[draft.brandIconId].path} />
              </svg>
            ) : (
              (draft.iconLabel || draft.title.slice(0, 1) || "?").slice(0, 2).toUpperCase()
            )}
          </span>
          <div>
            <strong>Shortcut icon</strong>
            <p>Website favicon by default. You can also use a brand icon or upload an image.</p>
          </div>
        </div>

        <div className="icon-transform-controls" role="group" aria-label="Image zoom and fit controls">
          <button type="button" title="Zoom out" aria-label="Zoom out" disabled={imageZoom <= 0.5} onClick={() => setImageZoom((zoom) => Math.max(0.5, Number((zoom - 0.25).toFixed(2))))}>−</button>
          <button type="button" title="Zoom in" aria-label="Zoom in" disabled={imageZoom >= 3} onClick={() => setImageZoom((zoom) => Math.min(3, Number((zoom + 0.25).toFixed(2))))}>+</button>
          <button type="button" title="Fit image inside the icon" aria-label="Fit image" className={imageFit === "contain" ? "selected" : ""} onClick={() => { setImageFit("contain"); setImageZoom(1); }}>Fit</button>
          <button type="button" title="Fill the icon with the image" aria-label="Fill icon" className={imageFit === "cover" ? "selected" : ""} onClick={() => { setImageFit("cover"); setImageZoom(1); }}>Fill</button>
        </div>

        <div className="icon-control-row">
          <label>
            <span>Icon label</span>
            <input
              maxLength={2}
              value={draft.iconLabel}
              onChange={(event) => onChangeDraft({ ...draft, iconLabel: event.target.value, iconImageDataUrl: null, iconMediaId: null, brandIconId: null })}
            />
          </label>

          <label>
            <span>Icon color</span>
            <input
              className="color-input"
              type="color"
              value={draft.iconBackground}
              onChange={(event) => onChangeDraft({ ...draft, iconBackground: event.target.value, iconImageDataUrl: null, iconMediaId: null, brandIconId: null })}
            />
          </label>
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
