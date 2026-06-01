import type { FormEvent } from "react";
import { Folder as FolderIcon } from "lucide-react";
import { type FolderEditDraft } from "../../domain/drafts";

type FolderModalProps = {
  draft: FolderEditDraft;
  onChangeDraft: (draft: FolderEditDraft) => void;
  onClose: () => void;
  onDelete: () => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
};

export function FolderModal({ draft, onChangeDraft, onClose, onDelete, onSave }: FolderModalProps) {
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
      <section className="quick-link-modal" role="dialog" aria-modal="true" aria-labelledby="folder-title">
        <div className="modal-header">
          <h1 id="folder-title">Edit folder</h1>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Close">
            x
          </button>
        </div>

        <form className="quick-link-form" onSubmit={onSave}>
          <label>
            <span>Title</span>
            <input autoFocus value={draft.title} onChange={(event) => onChangeDraft({ ...draft, title: event.target.value })} required />
          </label>

          <div className="form-row">
            <label>
              <span>Icon label</span>
              <input
                maxLength={2}
                value={draft.iconLabel}
                onChange={(event) => onChangeDraft({ ...draft, iconLabel: event.target.value })}
              />
            </label>

            <label>
              <span>Icon color</span>
              <input
                className="color-input"
                type="color"
                value={draft.iconBackground}
                onChange={(event) => onChangeDraft({ ...draft, iconBackground: event.target.value })}
              />
            </label>
          </div>

          <div className="form-preview">
            <span className="quick-link-icon folder-icon" style={{ backgroundColor: draft.iconBackground }} aria-hidden="true">
              <FolderIcon strokeWidth={2.25} />
            </span>
          </div>

          <div className="modal-actions">
            <button className="danger-button" type="button" onClick={onDelete}>
              Delete
            </button>
            <button className="secondary-button" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="primary-button" type="submit">
              Save
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
