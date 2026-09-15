import { useEffect, useState } from "react";
import { LayersIcon, XIcon } from "./Icons";

interface AnalyticsData {
  total_documents: number;
  total_chunks: number;
  total_bytes: number;
  file_formats: Record<string, number>;
}

interface AnalyticsModalProps {
  onClose: () => void;
}

export default function AnalyticsModal({ onClose }: AnalyticsModalProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const API_BASE = import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetch(`${API_BASE}/documents/analytics`)
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [API_BASE]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="modal-overlay animate-fade-in" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: "520px" }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-card__header">
          <div className="modal-card__icon-wrap" style={{ background: "rgba(99, 102, 241, 0.15)", color: "var(--brand-primary)" }}>
            <LayersIcon className="w-5 h-5" />
          </div>
          <div style={{ flex: 1 }}>
            <h3 className="modal-card__title">Knowledge Vault Analytics</h3>
            <p className="modal-card__desc">Real-time statistics & vector chunk distribution metrics</p>
          </div>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Close">
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
            Loading vault analytics...
          </div>
        ) : (
          <div style={{ margin: "1.25rem 0", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.65rem" }}>
              <div className="suggestion-card" style={{ cursor: "default" }}>
                <span className="suggestion-card__desc">Total Documents</span>
                <span style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--text-main)" }}>
                  {data?.total_documents || 0}
                </span>
              </div>
              <div className="suggestion-card" style={{ cursor: "default" }}>
                <span className="suggestion-card__desc">Vector Chunks</span>
                <span style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--brand-primary)" }}>
                  {data?.total_chunks || 0}
                </span>
              </div>
              <div className="suggestion-card" style={{ cursor: "default" }}>
                <span className="suggestion-card__desc">Storage Used</span>
                <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-main)" }}>
                  {formatBytes(data?.total_bytes || 0)}
                </span>
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-main)", marginBottom: "0.5rem" }}>
                File Formats Breakdown
              </h4>
              {data?.file_formats && Object.keys(data.file_formats).length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  {Object.entries(data.file_formats).map(([fmt, count]) => (
                    <div key={fmt} style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <span style={{ width: "50px", fontSize: "0.78rem", fontWeight: 600, color: "var(--brand-primary)" }}>
                        {fmt}
                      </span>
                      <div style={{ flex: 1, height: "8px", background: "var(--bg-card)", borderRadius: "4px", overflow: "hidden" }}>
                        <div
                          style={{
                            height: "100%",
                            width: `${Math.min(100, (count / (data.total_documents || 1)) * 100)}%`,
                            background: "var(--brand-primary)",
                            borderRadius: "4px",
                          }}
                        />
                      </div>
                      <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{count} file(s)</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>No files uploaded yet.</p>
              )}
            </div>
          </div>
        )}

        <div className="modal-card__actions">
          <button type="button" className="btn-modal-cancel" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
