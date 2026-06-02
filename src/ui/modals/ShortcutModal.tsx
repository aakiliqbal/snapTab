import type { FormEvent } from "react";
import { type BrandIcon } from "../../domain/brandIcons";
import { type ShortcutDraft } from "../../domain/drafts";
import { ShortcutForm } from "../shortcut-editor";

type ShortcutModalProps = {
  draft: ShortcutDraft;
  iconRecommendations: BrandIcon[];
  onApplyRecommendedIcon: (icon: BrandIcon) => void;
  onChangeDraft: (draft: ShortcutDraft) => void;
  onClose: () => void;
  onDelete: () => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  onUploadIcon: (file: File | null) => void;
};

export function ShortcutModal({
  draft,
  iconRecommendations,
  onApplyRecommendedIcon,
  onChangeDraft,
  onClose,
  onDelete,
  onSave,
  onUploadIcon
}: ShortcutModalProps) {
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section className="quick-link-modal" role="dialog" aria-modal="true" aria-labelledby="quick-link-title">
        <div className="modal-header">
          <h1 id="quick-link-title">{draft.id ? "Edit shortcut" : "Add shortcut"}</h1>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Close">
            <span>Close</span>
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <ShortcutForm
          draft={draft}
          iconRecommendations={iconRecommendations}
          onApplyRecommendedIcon={onApplyRecommendedIcon}
          onCancel={onClose}
          onChangeDraft={onChangeDraft}
          onDelete={onDelete}
          onSave={onSave}
          onUploadIcon={onUploadIcon}
        />
      </section>
    </div>
  );
}
