import { useState } from "react";
import { BookOpenIcon, CheckIcon, CopyIcon, XIcon } from "./Icons";
import { useToast } from "./Toast";

interface PassageModalProps {
  passageText: string;
  passageIndex: number;
  scopeFilename?: string | null;
  onClose: () => void;
}

export default function PassageModal({
  passageText,
  passageIndex,
  scopeFilename,
  onClose,
}: PassageModalProps) {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(passageText);
    setCopied(true);
    showToast("Passage text copied to clipboard!", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay animate-fade-in" onClick={onClose}>
      <div
        className="modal-card passage-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-card__header">
          <div className="modal-card__icon-wrap" style={{ background: "rgba(99, 102, 241, 0.15)", color: "var(--brand-primary)" }}>
            <BookOpenIcon className="w-5 h-5" />
          </div>
          <div style={{ flex: 1 }}>
            <h3 className="modal-card__title">Source Passage #{passageIndex + 1}</h3>
            <p className="modal-card__desc">
              {scopeFilename ? `From: ${scopeFilename}` : "Retrieved from Document Vault"}
            </p>
          </div>
          <button
            type="button"
            className="btn-icon"
            onClick={onClose}
            aria-label="Close"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="passage-modal__content">
          <pre className="passage-text-block">{passageText}</pre>
        </div>

        <div className="modal-card__actions">
          <button type="button" className="btn-modal-cancel" onClick={onClose}>
            Close
          </button>
          <button type="button" className="btn-modal-primary" onClick={handleCopy}>
            {copied ? (
              <>
                <CheckIcon className="w-4 h-4 text-emerald" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <CopyIcon className="w-4 h-4" />
                <span>Copy Passage</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
