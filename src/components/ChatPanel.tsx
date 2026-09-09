import { FormEvent, Fragment, useCallback, useEffect, useRef, useState } from "react";
import { askQuestionStream, fetchChatHistory, saveChatHistory, clearChatHistory, Exchange } from "../api";
import ConfirmModal from "./ConfirmModal";
import { useToast } from "./Toast";
import {
  SparklesIcon,
  UserIcon,
  SendIcon,
  SunIcon,
  MoonIcon,
  TrashIcon,
  BookOpenIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CopyIcon,
  CheckIcon,
  MenuIcon,
  AlertCircleIcon,
  RefreshCwIcon,
} from "./Icons";

interface ChatPanelProps {
  hasDocuments: boolean;
  selectedFilename: string | null;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  onOpenMobileSidebar?: () => void;
}

const STARTER_PROMPTS = [
  {
    title: "Executive Summary",
    desc: "Provide a comprehensive high-level summary of the document.",
  },
  {
    title: "Key Action Items & Takeaways",
    desc: "Extract essential decisions, requirements, or next steps.",
  },
  {
    title: "Critical Risk & Insights Analysis",
    desc: "Highlight key risks, caveats, or unique observations.",
  },
];

export default function ChatPanel({
  hasDocuments,
  selectedFilename,
  theme,
  onToggleTheme,
  onOpenMobileSidebar,
}: ChatPanelProps) {
  const { showToast } = useToast();
  const scopeKey = selectedFilename || "__ALL__";
  const [question, setQuestion] = useState("");
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [isAsking, setIsAsking] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [openSources, setOpenSources] = useState<number | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load chat history for current scope on mount / scope change
  useEffect(() => {
    let isCancelled = false;
    const localSaved = localStorage.getItem(`documind-chat-${scopeKey}`);
    if (localSaved) {
      try {
        setExchanges(JSON.parse(localSaved));
      } catch {
        setExchanges([]);
      }
    } else {
      setExchanges([]);
    }

    // Also sync from backend
    fetchChatHistory(scopeKey).then((history) => {
      if (!isCancelled && history.length > 0) {
        setExchanges(history);
        localStorage.setItem(`documind-chat-${scopeKey}`, JSON.stringify(history));
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [scopeKey]);

  // Persist chat history to localStorage & backend whenever exchanges update
  const saveHistoryLocallyAndBackend = useCallback(
    (newExchanges: Exchange[]) => {
      localStorage.setItem(`documind-chat-${scopeKey}`, JSON.stringify(newExchanges));
      saveChatHistory(scopeKey, newExchanges);
    },
    [scopeKey]
  );

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [exchanges, isAsking]);

  const handleAsk = async (queryText: string) => {
    const trimmed = queryText.trim();
    if (!trimmed || isAsking) return;

    setIsAsking(true);
    setErrorMessage("");
    setQuestion("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    let currentExchanges: Exchange[] = [];
    setExchanges((prev) => {
      currentExchanges = [...prev, { question: trimmed, answer: "", sources: [] }];
      return currentExchanges;
    });

    try {
      await askQuestionStream(
        trimmed,
        (token) => {
          setExchanges((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            updated[updated.length - 1] = { ...last, answer: last.answer + token };
            currentExchanges = updated;
            return updated;
          });
        },
        (sources) => {
          setExchanges((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            updated[updated.length - 1] = { ...last, sources };
            currentExchanges = updated;
            return updated;
          });
        },
        selectedFilename ?? undefined
      );
      saveHistoryLocallyAndBackend(currentExchanges);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "The backend service could not respond to your query.";
      setErrorMessage(msg);
      showToast(msg, "error");
    } finally {
      setIsAsking(false);
    }
  };

  const handleConfirmClear = async () => {
    setIsClearing(true);
    try {
      localStorage.removeItem(`documind-chat-${scopeKey}`);
      await clearChatHistory(scopeKey);
      setExchanges([]);
      setShowClearConfirm(false);
      showToast("Conversation history cleared.", "info");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to clear history.";
      setErrorMessage(msg);
      showToast(msg, "error");
    } finally {
      setIsClearing(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleAsk(question);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleCopyAnswer = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    showToast("Response copied to clipboard!", "success");
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <section className="workspace">
      {/* Workspace Header */}
      <header className="workspace__header">
        <div className="header__left">
          {onOpenMobileSidebar && (
            <button
              type="button"
              className="btn-mobile-menu"
              onClick={onOpenMobileSidebar}
              aria-label="Open Sidebar"
            >
              <MenuIcon className="w-5 h-5" />
            </button>
          )}
          <div className="scope-badge">
            <span className="scope-badge__dot" />
            <span>
              {selectedFilename
                ? `Scope: ${selectedFilename}`
                : "Scope: Entire Knowledge Base"}
            </span>
          </div>
        </div>

        <div className="header__actions">
          {exchanges.length > 0 && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowClearConfirm(true)}
              title="Clear Conversation History"
            >
              <TrashIcon className="w-4 h-4" />
              <span>Clear History</span>
            </button>
          )}
          <button
            type="button"
            className="btn-icon"
            onClick={onToggleTheme}
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label="Toggle Theme"
          >
            {theme === "dark" ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Chat Canvas */}
      <div className="chat-canvas">
        {exchanges.length === 0 ? (
          <div className="empty-state animate-fade-in">
            <div className="empty-state__icon">
              <SparklesIcon className="w-8 h-8" />
            </div>
            <h2 className="empty-state__title">What would you like to discover?</h2>
            <p className="empty-state__description">
              {hasDocuments
                ? selectedFilename
                  ? `Ask specific questions or request summaries about "${selectedFilename}".`
                  : "Ask questions across all vector-indexed documents in your knowledge vault."
                : "Upload a PDF document using the vault sidebar to enable AI passage retrieval."}
            </p>

            {hasDocuments && (
              <div className="suggestions-grid">
                {STARTER_PROMPTS.map((prompt, idx) => (
                  <div
                    key={idx}
                    className="suggestion-card"
                    onClick={() => handleAsk(prompt.desc)}
                    role="button"
                    tabIndex={0}
                  >
                    <span className="suggestion-card__title">
                      <SparklesIcon className="w-4 h-4 text-brand" />
                      {prompt.title}
                    </span>
                    <span className="suggestion-card__desc">{prompt.desc}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="chat-container">
            {exchanges.map((exchange, i) => (
              <Fragment key={i}>
                {/* User Message */}
                <div className="chat-message chat-message--user">
                  <div className="avatar avatar--user">
                    <UserIcon className="w-5 h-5" />
                  </div>
                  <div className="message-bubble">
                    <p className="message-text">{exchange.question}</p>
                  </div>
                </div>

                {/* AI Assistant Response */}
                <div className="chat-message chat-message--ai">
                  <div className="avatar avatar--ai">
                    <SparklesIcon className="w-5 h-5" />
                  </div>
                  <div className="message-bubble">
                    {exchange.answer ? (
                      <p className="message-text">{exchange.answer}</p>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          color: "var(--text-muted)",
                          fontSize: "0.9rem",
                        }}
                      >
                        <RefreshCwIcon className="w-4 h-4 animate-spin text-brand" />
                        <span>Searching passages & synthesizing response…</span>
                      </div>
                    )}

                    {exchange.answer && (
                      <div className="message-actions">
                        <button
                          type="button"
                          className="btn-copy"
                          onClick={() => handleCopyAnswer(exchange.answer, i)}
                        >
                          {copiedIndex === i ? (
                            <>
                              <CheckIcon className="w-3.5 h-3.5 text-emerald" />
                              <span>Copied to clipboard</span>
                            </>
                          ) : (
                            <>
                              <CopyIcon className="w-3.5 h-3.5" />
                              <span>Copy response</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* Sources / Passages Accordion */}
                    {exchange.sources && exchange.sources.length > 0 && (
                      <div className="citations">
                        <button
                          type="button"
                          className="citations__toggle"
                          onClick={() => setOpenSources(openSources === i ? null : i)}
                        >
                          <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            <BookOpenIcon className="w-4 h-4" />
                            <span>
                              {exchange.sources.length}{" "}
                              {exchange.sources.length === 1 ? "Source Passage" : "Source Passages"} Retracted
                            </span>
                          </span>
                          {openSources === i ? (
                            <ChevronDownIcon className="w-4 h-4" />
                          ) : (
                            <ChevronRightIcon className="w-4 h-4" />
                          )}
                        </button>

                        {openSources === i && (
                          <div className="citations__list animate-fade-in">
                            {exchange.sources.map((source, j) => (
                              <div className="citation-card" key={j}>
                                <p style={{ margin: 0 }}>{source}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Fragment>
            ))}
            <div ref={transcriptEndRef} />
          </div>
        )}
      </div>

      {errorMessage && (
        <div style={{ maxWidth: "800px", margin: "0 auto 0.75rem", width: "100%", padding: "0 1.5rem" }}>
          <div className="dropzone__error">
            <AlertCircleIcon className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      {/* Input Dock Bar */}
      <div className="input-dock">
        <form className="input-box" onSubmit={handleSubmit}>
          <textarea
            ref={textareaRef}
            className="input-box__textarea"
            rows={1}
            placeholder={
              hasDocuments
                ? selectedFilename
                  ? `Ask anything about ${selectedFilename}…`
                  : "Ask anything across your entire document vault…"
                : "Please upload a document to enable AI retrieval…"
            }
            value={question}
            onChange={(e) => {
              setQuestion(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
            }}
            onKeyDown={handleKeyDown}
            disabled={!hasDocuments || isAsking}
          />

          <div className="input-box__footer">
            <div className="input-box__hints">
              <span>Press</span>
              <kbd className="kbd">Enter ↵</kbd>
              <span>to send,</span>
              <kbd className="kbd">Shift + Enter</kbd>
              <span>for new line</span>
            </div>

            <button
              className="btn-send"
              type="submit"
              disabled={!hasDocuments || isAsking || !question.trim()}
            >
              {isAsking ? (
                <>
                  <RefreshCwIcon className="w-4 h-4 animate-spin" />
                  <span>Asking…</span>
                </>
              ) : (
                <>
                  <span>Ask</span>
                  <SendIcon className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Confirmation Modal for Clearing History */}
      {showClearConfirm && (
        <ConfirmModal
          title="Clear Conversation History?"
          message={
            selectedFilename
              ? `Are you sure you want to clear all chat messages for "${selectedFilename}"? This action cannot be undone.`
              : "Are you sure you want to clear all chat messages for the entire knowledge vault? This action cannot be undone."
          }
          confirmLabel="Clear History"
          isDangerous
          isBusy={isClearing}
          onConfirm={handleConfirmClear}
          onCancel={() => setShowClearConfirm(false)}
        />
      )}
    </section>
  );
}