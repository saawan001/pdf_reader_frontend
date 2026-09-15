import { useState } from "react";
import { SparklesIcon, XIcon } from "./Icons";
import { useToast } from "./Toast";

interface AISettingsModalProps {
  onClose: () => void;
}

export default function AISettingsModal({ onClose }: AISettingsModalProps) {
  const { showToast } = useToast();
  const [temperature, setTemperature] = useState<number>(
    parseFloat(localStorage.getItem("ai_temperature") || "0.2")
  );
  const [topK, setTopK] = useState<number>(
    parseInt(localStorage.getItem("ai_top_k") || "4", 10)
  );
  const [persona, setPersona] = useState<string>(
    localStorage.getItem("ai_persona") || "balanced"
  );

  const handleSave = () => {
    localStorage.setItem("ai_temperature", temperature.toString());
    localStorage.setItem("ai_top_k", topK.toString());
    localStorage.setItem("ai_persona", persona);
    showToast("AI Controls & Persona settings saved!", "success");
    onClose();
  };

  return (
    <div
      className="modal-overlay animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-card"
        style={{ maxWidth: "460px" }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-card__header">
          <div className="modal-card__icon-wrap" style={{ background: "rgba(99, 102, 241, 0.15)", color: "var(--brand-primary)" }}>
            <SparklesIcon className="w-5 h-5" />
          </div>
          <div style={{ flex: 1 }}>
            <h3 className="modal-card__title">AI Control Panel & Persona</h3>
            <p className="modal-card__desc">Fine-tune generation temperature, persona style & chunk retrieval</p>
          </div>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Close">
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        <div style={{ margin: "1.25rem 0", display: "flex", flexDirection: "column", gap: "1.2rem" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-main)" }}>Response Style Persona</label>
              <span style={{ fontSize: "0.78rem", color: "var(--brand-primary)", textTransform: "capitalize" }}>{persona}</span>
            </div>
            <select
              className="chat-search-input"
              style={{ paddingLeft: "0.85rem" }}
              value={persona}
              onChange={(e) => setPersona(e.target.value)}
            >
              <option value="balanced">Balanced & Fact-based (Recommended)</option>
              <option value="concise">Concise Executive Summary Mode</option>
              <option value="detailed">Comprehensive Deep-Dive Mode</option>
              <option value="technical">Technical Code & Specification Mode</option>
            </select>
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-main)" }}>Temperature (Creativity)</label>
              <span style={{ fontSize: "0.78rem", color: "var(--brand-primary)" }}>{temperature}</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              style={{ width: "100%", accentColor: "var(--brand-primary)" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
              <span>0.0 (Strict/Precise)</span>
              <span>1.0 (Creative)</span>
            </div>
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-main)" }}>Retrieved Passages (Top-K)</label>
              <span style={{ fontSize: "0.78rem", color: "var(--brand-primary)" }}>{topK} Chunks</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={topK}
              onChange={(e) => setTopK(parseInt(e.target.value, 10))}
              style={{ width: "100%", accentColor: "var(--brand-primary)" }}
            />
          </div>
        </div>

        <div className="modal-card__actions">
          <button type="button" className="btn-modal-cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-modal-primary" onClick={handleSave}>
            Save AI Controls
          </button>
        </div>
      </div>
    </div>
  );
}
