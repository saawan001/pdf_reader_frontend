
import { TrashIcon } from "./Icons";

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  isDangerous?: boolean;
  isBusy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  title,
  message,
  confirmLabel = "Confirm",
  isDangerous = false,
  isBusy = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="modal-card__header">
          {isDangerous && (
            <div className="modal-card__icon-wrap modal-card__icon-wrap--danger">
              <TrashIcon className="w-5 h-5" />
            </div>
          )}
          <div>
            <h2 className="modal-card__title" id="modal-title">
              {title}
            </h2>
            <p className="modal-card__desc">{message}</p>
          </div>
        </div>

        <div className="modal-card__actions">
          <button
            type="button"
            className="btn-modal-cancel"
            onClick={onCancel}
            disabled={isBusy}
          >
            Cancel
          </button>
          <button
            type="button"
            className={isDangerous ? "btn-modal-danger" : "btn-send"}
            onClick={onConfirm}
            disabled={isBusy}
          >
            {isBusy ? "Processing…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}