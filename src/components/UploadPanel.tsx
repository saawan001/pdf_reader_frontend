import { useRef, useState, useMemo } from "react";
import { uploadDocument, deleteDocument, DocumentInfo } from "../api";
import ConfirmModal from "./ConfirmModal";
import { useToast } from "./Toast";
import {
  SparklesIcon,
  UploadCloudIcon,
  SearchIcon,
  FileTextIcon,
  LayersIcon,
  TrashIcon,
  AlertCircleIcon,
  RefreshCwIcon,
} from "./Icons";

interface UploadPanelProps {
  documents: DocumentInfo[];
  isLoading: boolean;
  selectedFilename: string | null;
  onSelect: (filename: string | null) => void;
  onChanged: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export default function UploadPanel({
  documents,
  isLoading,
  selectedFilename,
  onSelect,
  onChanged,
  isOpenMobile = false,
  onCloseMobile,
}: UploadPanelProps) {
  const { showToast } = useToast();
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredDocuments = useMemo(() => {
    if (!searchQuery.trim()) return documents;
    return documents.filter((doc) =>
      doc.filename.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [documents, searchQuery]);

  async function handleFile(file: File) {
    if (file.type !== "application/pdf") {
      setStatus("error");
      const msg = "Only PDF documents are supported currently.";
      setErrorMessage(msg);
      showToast(msg, "error");
      return;
    }

    setStatus("uploading");
    setErrorMessage("");

    try {
      await uploadDocument(file);
      onChanged();
      setStatus("idle");
      showToast(`Document "${file.name}" uploaded and indexed!`, "success");
    } catch (err) {
      setStatus("error");
      const msg = err instanceof Error ? err.message : "Upload failed.";
      setErrorMessage(msg);
      showToast(msg, "error");
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const docToDelete = pendingDelete;
    setIsDeleting(true);

    try {
      await deleteDocument(docToDelete);
      if (selectedFilename === docToDelete) onSelect(null);
      onChanged();
      setPendingDelete(null);
      showToast(`Document "${docToDelete}" deleted successfully.`, "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Delete failed.";
      setErrorMessage(msg);
      showToast(msg, "error");
      setPendingDelete(null);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      {isOpenMobile && (
        <div className="sidebar-backdrop" onClick={onCloseMobile} />
      )}

      <aside className={`sidebar ${isOpenMobile ? "sidebar--open" : ""}`}>
        <div className="sidebar__header">
          <div className="brand">
            <div className="brand__logo">
              <SparklesIcon className="w-5 h-5" />
            </div>
            <div className="brand__text">
              <span className="brand__title">OpenSource Mind AI</span>
              <span className="brand__subtitle">Enterprise QA Workspace</span>
            </div>
          </div>
          <div className="status-badge" title="Backend Connection Status">
            <span className="status-dot" />
            <span>Ready</span>
          </div>
        </div>

        <div className="sidebar__content">
          {/* Upload Dropzone */}
          <div
            className={`dropzone ${isDragging ? "dropzone--active" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) handleFile(file);
            }}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
          >
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.target.value = "";
              }}
            />
            <div className="dropzone__icon">
              {status === "uploading" ? (
                <RefreshCwIcon className="w-6 h-6 animate-spin" />
              ) : (
                <UploadCloudIcon className="w-6 h-6" />
              )}
            </div>
            {status === "uploading" ? (
              <div>
                <p className="dropzone__title">Analyzing & Vectorizing…</p>
                <p className="dropzone__hint">Extracting passages and embeddings</p>
              </div>
            ) : (
              <div>
                <p className="dropzone__title">Upload Document</p>
                <p className="dropzone__hint">Drag PDF here or click to browse</p>
              </div>
            )}
          </div>

          {errorMessage && (
            <div className="dropzone__error">
              <AlertCircleIcon className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Document Section Header & Search */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div className="doc-section__header">
              <span className="doc-section__title">Document Vault</span>
              <span className="doc-section__count">{documents.length}</span>
            </div>

            {documents.length > 3 && (
              <div className="search-box">
                <SearchIcon className="search-box__icon w-4 h-4" />
                <input
                  type="text"
                  className="search-box__input"
                  placeholder="Filter documents…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Document List */}
          <div className="doc-list">
            {isLoading ? (
              <div
                style={{
                  padding: "1rem",
                  textAlign: "center",
                  color: "var(--text-faint)",
                  fontSize: "0.82rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                }}
              >
                <RefreshCwIcon className="w-4 h-4 animate-spin" />
                Loading document repository…
              </div>
            ) : documents.length === 0 ? (
              <div
                style={{
                  padding: "2rem 1rem",
                  textAlign: "center",
                  color: "var(--text-faint)",
                  fontSize: "0.82rem",
                }}
              >
                No documents uploaded yet. Add a PDF file to begin asking questions.
              </div>
            ) : (
              <>
                <div
                  className={`doc-item ${
                    selectedFilename === null ? "doc-item--active" : ""
                  }`}
                  onClick={() => {
                    onSelect(null);
                    if (onCloseMobile) onCloseMobile();
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="doc-item__main">
                    <LayersIcon className="doc-item__icon w-5 h-5" />
                    <div className="doc-item__info">
                      <span className="doc-item__name">All Vault Documents</span>
                      <span className="doc-item__meta">Search across entire knowledge base</span>
                    </div>
                  </div>
                </div>

                {filteredDocuments.map((doc) => (
                  <div
                    className={`doc-item ${
                      selectedFilename === doc.filename ? "doc-item--active" : ""
                    }`}
                    key={doc.filename}
                    onClick={() => {
                      onSelect(doc.filename);
                      if (onCloseMobile) onCloseMobile();
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="doc-item__main">
                      <FileTextIcon className="doc-item__icon w-5 h-5" />
                      <div className="doc-item__info">
                        <span className="doc-item__name" title={doc.filename}>
                          {doc.filename}
                        </span>
                        <span className="doc-item__meta">
                          {doc.num_chunks} vector {doc.num_chunks === 1 ? "passage" : "passages"}
                        </span>
                      </div>
                    </div>
                    <div className="doc-item__actions">
                      <button
                        type="button"
                        className="doc-item__btn-delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPendingDelete(doc.filename);
                        }}
                        aria-label={`Delete ${doc.filename}`}
                        title="Delete Document"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {pendingDelete && (
          <ConfirmModal
            title="Delete Document?"
            message={`Are you sure you want to delete "${pendingDelete}"? All indexed passages and vector embeddings will be permanently removed.`}
            confirmLabel="Delete Document"
            isDangerous
            isBusy={isDeleting}
            onConfirm={confirmDelete}
            onCancel={() => setPendingDelete(null)}
          />
        )}
      </aside>
    </>
  );
}