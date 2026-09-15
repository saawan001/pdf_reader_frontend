import { FormEvent, Fragment, useCallback, useEffect, useRef, useState } from "react";
import { askQuestionStream, fetchChatHistory, saveChatHistory, clearChatHistory, searchChatHistory, Exchange } from "../api";
import ConfirmModal from "./ConfirmModal";
import EmojiPicker from "./EmojiPicker";
import PassageModal from "./PassageModal";
import AISettingsModal from "./AISettingsModal";
import AnalyticsModal from "./AnalyticsModal";
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
  SmileIcon,
  DownloadIcon,
  Volume2Icon,
  VolumeXIcon,
  SearchIcon,
  Maximize2Icon,
  XIcon,
  SlidersIcon,
  LayersIcon,
  LogOutIcon,
} from "./Icons";

interface ChatPanelProps {
  hasDocuments: boolean;
  selectedFilename: string | null;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  onOpenMobileSidebar?: () => void;
  currentUser?: string | null;
  onLogout?: () => void;
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
  currentUser,
  onLogout,
}: ChatPanelProps) {
  const { showToast } = useToast();
  const scopeKey = selectedFilename || "__ALL__";
  const [question, setQuestion] = useState("");
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [searchResults, setSearchResults] = useState<Exchange[] | null>(null);
  const [isAsking, setIsAsking] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [openSources, setOpenSources] = useState<number | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [activePicker, setActivePicker] = useState<{ index: number; target: "user" | "ai" } | null>(null);

  // New feature states
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [isSearchingBackend, setIsSearchingBackend] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const [previewPassage, setPreviewPassage] = useState<{ text: string; index: number } | null>(null);

  // Modals state
  const [showAISettingsModal, setShowAISettingsModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const userStorageKey = currentUser
    ? `documind-chat-${currentUser.toLowerCase()}-${scopeKey}`
    : `documind-chat-${scopeKey}`;

  // Load chat history for current scope on mount / scope change
  useEffect(() => {
    let isCancelled = false;
    const localSaved = localStorage.getItem(userStorageKey);
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
      if (!isCancelled) {
        setExchanges(history);
        localStorage.setItem(userStorageKey, JSON.stringify(history));
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [scopeKey, userStorageKey]);

  // Query backend search API whenever searchQuery changes
  useEffect(() => {
    let isCurrent = true;
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults(null);
      setSearchError("");
      setIsSearchingBackend(false);
      return;
    }

    setSearchError("");
    setIsSearchingBackend(true);

    const timer = setTimeout(() => {
      searchChatHistory(trimmed, scopeKey)
        .then((results) => {
          if (isCurrent) {
            setSearchResults(results);
            setSearchError("");
          }
        })
        .catch((err) => {
          if (isCurrent) {
            const msg = err instanceof Error ? err.message : "Search request failed.";
            setSearchError(msg);
            setSearchResults([]);
          }
        })
        .finally(() => {
          if (isCurrent) setIsSearchingBackend(false);
        });
    }, 200);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [searchQuery, scopeKey]);

  // Persist chat history to localStorage & backend whenever exchanges update
  const saveHistoryLocallyAndBackend = useCallback(
    (newExchanges: Exchange[]) => {
      localStorage.setItem(userStorageKey, JSON.stringify(newExchanges));
      saveChatHistory(scopeKey, newExchanges);
    },
    [scopeKey, userStorageKey]
  );

  const handleToggleReaction = (index: number, target: "user" | "ai", emoji: string) => {
    setExchanges((prev) => {
      const updated = [...prev];
      const item = { ...updated[index] };
      const field = target === "user" ? "userReactions" : "aiReactions";
      const reactions = { ...(item[field] || {}) };

      if (reactions[emoji]) {
        delete reactions[emoji];
      } else {
        reactions[emoji] = 1;
      }

      item[field] = reactions;
      updated[index] = item;
      saveHistoryLocallyAndBackend(updated);
      return updated;
    });
  };

  const handleExportMarkdown = () => {
    if (exchanges.length === 0) return;
    let content = `# Chat History Export - ${selectedFilename || "Entire Vault"}\n`;
    content += `Generated: ${new Date().toLocaleString()}\n\n---\n\n`;

    exchanges.forEach((ex, idx) => {
      content += `### Q${idx + 1}: ${ex.question}\n\n`;
      content += `**AI Response:**\n${ex.answer || "(No response)"}\n\n`;
      if (ex.sources && ex.sources.length > 0) {
        content += `**Source Passages (${ex.sources.length}):**\n`;
        ex.sources.forEach((src, sIdx) => {
          content += `${sIdx + 1}. ${src}\n`;
        });
        content += `\n`;
      }
      content += `---\n\n`;
    });

    const blob = new Blob([content], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const safeScopeName = (selectedFilename || "vault").replace(/[^a-z0-9]/gi, "_");
    link.setAttribute("download", `chat_history_${safeScopeName}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Chat history exported as Markdown!", "success");
  };

  const handleRegenerate = async (index: number) => {
    if (isAsking) return;
    const targetExchange = exchanges[index];
    if (!targetExchange) return;

    setIsAsking(true);
    setErrorMessage("");

    setExchanges((prev) => {
      const updated = [...prev];
      updated[index] = { ...targetExchange, answer: "", sources: [] };
      return updated;
    });

    let currentExchanges: Exchange[] = [];
    try {
      await askQuestionStream(
        targetExchange.question,
        (token) => {
          setExchanges((prev) => {
            const updated = [...prev];
            const item = updated[index];
            updated[index] = { ...item, answer: item.answer + token };
            currentExchanges = updated;
            return updated;
          });
        },
        (sources) => {
          setExchanges((prev) => {
            const updated = [...prev];
            const item = updated[index];
            updated[index] = { ...item, sources };
            currentExchanges = updated;
            return updated;
          });
        },
        selectedFilename ?? undefined
      );
      saveHistoryLocallyAndBackend(currentExchanges);
      showToast("Response re-generated successfully!", "info");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to regenerate answer.";
      setErrorMessage(msg);
      showToast(msg, "error");
    } finally {
      setIsAsking(false);
    }
  };

  const handleToggleSpeech = (index: number, text: string) => {
    if (!("speechSynthesis" in window)) {
      showToast("Text-to-speech is not supported in your browser.", "error");
      return;
    }

    if (speakingIndex === index) {
      window.speechSynthesis.cancel();
      setSpeakingIndex(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => setSpeakingIndex(null);
    utterance.onerror = () => setSpeakingIndex(null);
    setSpeakingIndex(index);
    window.speechSynthesis.speak(utterance);
  };

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
      localStorage.removeItem(userStorageKey);
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
            <>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setShowSearch(!showSearch)}
                title="Search conversation history"
              >
                <SearchIcon className="w-5 h-5" />
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleExportMarkdown}
                title="Export Chat History as Markdown"
              >
                <DownloadIcon className="w-4 h-4" />
                <span>Export</span>
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowClearConfirm(true)}
                title="Clear Conversation History"
              >
                <TrashIcon className="w-4 h-4" />
                <span>Clear History</span>
              </button>
            </>
          )}

          <button
            type="button"
            className="btn-icon"
            onClick={() => setShowAnalyticsModal(true)}
            title="Knowledge Vault Analytics"
          >
            <LayersIcon className="w-5 h-5" />
          </button>

          <button
            type="button"
            className="btn-icon"
            onClick={() => setShowAISettingsModal(true)}
            title="AI Control Panel & Persona"
          >
            <SlidersIcon className="w-5 h-5" />
          </button>

          {currentUser && (
            <div className="user-profile-wrapper" ref={userMenuRef}>
              <button
                type="button"
                className="user-profile-pill"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                title="User Session & Account Settings"
              >
                <div className="user-avatar-badge">
                  {currentUser.charAt(0).toUpperCase()}
                </div>
                <span className="user-profile-handle">@{currentUser}</span>
                <ChevronDownIcon className={`w-3.5 h-3.5 user-menu-chevron ${isUserMenuOpen ? "open" : ""}`} />
              </button>

              {isUserMenuOpen && (
                <div className="user-profile-dropdown animate-fade-in">
                  <div className="user-dropdown-header">
                    <div className="user-avatar-badge lg">
                      {currentUser.charAt(0).toUpperCase()}
                    </div>
                    <div className="user-dropdown-info">
                      <span className="user-dropdown-username">@{currentUser}</span>
                      <span className="user-dropdown-status">
                        <span className="status-dot"></span> Active Session
                      </span>
                    </div>
                  </div>
                  <div className="user-dropdown-divider" />
                  {onLogout && (
                    <button
                      type="button"
                      className="user-dropdown-logout-btn"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onLogout();
                      }}
                    >
                      <LogOutIcon className="w-4 h-4 text-rose-400" />
                      <span>Log Out Session</span>
                    </button>
                  )}
                </div>
              )}
            </div>
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

      {/* Optional Search Bar Filter */}
      {showSearch && exchanges.length > 0 && (
        <div className="chat-search-bar animate-fade-in">
          <div className="chat-search-input-wrapper">
            <SearchIcon className="w-4 h-4 search-icon" />
            <input
              type="text"
              className={`chat-search-input ${searchError ? "has-error" : ""}`}
              placeholder="Search chat history by keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                className="btn-clear-search"
                onClick={() => setSearchQuery("")}
                title="Clear Search"
              >
                <XIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {searchError && (
            <div className="search-status-bar search-status-bar--error">
              <AlertCircleIcon className="w-4 h-4 flex-shrink-0" />
              <span>{searchError}</span>
            </div>
          )}

          {!searchError && searchQuery.trim() && searchResults !== null && (
            <div className="search-status-bar">
              {isSearchingBackend ? (
                <span>Searching backend...</span>
              ) : (
                <span>
                  Found <strong>{searchResults.length}</strong> {searchResults.length === 1 ? "matching message" : "matching messages"} for "{searchQuery.trim()}"
                </span>
              )}
            </div>
          )}
        </div>
      )}

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
        ) : searchQuery.trim() && searchResults !== null && searchResults.length === 0 ? (
          <div className="empty-state animate-fade-in">
            <div className="empty-state__icon" style={{ background: "rgba(239, 68, 68, 0.15)", color: "#EF4444", boxShadow: "none" }}>
              <SearchIcon className="w-8 h-8" />
            </div>
            <h2 className="empty-state__title">No Search Results Found</h2>
            <p className="empty-state__description">
              We couldn't find any questions or answers matching <strong>"{searchQuery.trim()}"</strong> in the current chat history.
            </p>
            <button
              type="button"
              className="btn-secondary"
              style={{ marginTop: "0.5rem" }}
              onClick={() => setSearchQuery("")}
            >
              Clear Search & Show All
            </button>
          </div>
        ) : (
          <div className="chat-container">
            {(searchResults !== null ? searchResults : exchanges)
              .map((exchange, i) => ({ exchange, i }))
              .filter(({ exchange }) => {
                if (searchResults !== null) return true; // Already filtered by backend
                if (!searchQuery.trim()) return true;
                const q = searchQuery.toLowerCase();
                return (
                  exchange.question.toLowerCase().includes(q) ||
                  exchange.answer.toLowerCase().includes(q)
                );
              })
              .map(({ exchange, i }) => (
                <Fragment key={i}>
                  {/* User Message */}
                  <div className="chat-message chat-message--user">
                    <div className="avatar avatar--user">
                      <UserIcon className="w-5 h-5" />
                    </div>
                    <div className="message-bubble">
                      <p className="message-text">{exchange.question}</p>

                      <div className="reactions-container">
                        {exchange.userReactions && Object.keys(exchange.userReactions).length > 0 && (
                          <div className="reactions-list">
                            {Object.entries(exchange.userReactions).map(([emoji, count]) => (
                              <button
                                key={emoji}
                                type="button"
                                className="reaction-pill active"
                                onClick={() => handleToggleReaction(i, "user", emoji)}
                                title={`Toggle ${emoji}`}
                              >
                                <span>{emoji}</span>
                                <span className="reaction-pill__count">{count}</span>
                              </button>
                            ))}
                          </div>
                        )}

                        <div className="reaction-trigger-wrapper">
                          <button
                            type="button"
                            className="btn-reaction-trigger"
                            onClick={() =>
                              setActivePicker(
                                activePicker?.index === i && activePicker?.target === "user"
                                  ? null
                                  : { index: i, target: "user" }
                              )
                            }
                            title="Add reaction"
                          >
                            <SmileIcon className="w-3.5 h-3.5" />
                          </button>
                          {activePicker?.index === i && activePicker?.target === "user" && (
                            <EmojiPicker
                              onSelectEmoji={(emoji) => handleToggleReaction(i, "user", emoji)}
                              onClose={() => setActivePicker(null)}
                            />
                          )}
                        </div>
                      </div>
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

                      {/* Reactions and Message Actions */}
                      <div className="reactions-container">
                        {exchange.aiReactions && Object.keys(exchange.aiReactions).length > 0 && (
                          <div className="reactions-list">
                            {Object.entries(exchange.aiReactions).map(([emoji, count]) => (
                              <button
                                key={emoji}
                                type="button"
                                className="reaction-pill active"
                                onClick={() => handleToggleReaction(i, "ai", emoji)}
                                title={`Toggle ${emoji}`}
                              >
                                <span>{emoji}</span>
                                <span className="reaction-pill__count">{count}</span>
                              </button>
                            ))}
                          </div>
                        )}

                        {exchange.answer && (
                          <div className="message-actions">
                            <div className="reaction-trigger-wrapper">
                              <button
                                type="button"
                                className="btn-reaction-trigger"
                                onClick={() =>
                                  setActivePicker(
                                    activePicker?.index === i && activePicker?.target === "ai"
                                      ? null
                                      : { index: i, target: "ai" }
                                  )
                                }
                                title="Add reaction"
                              >
                                <SmileIcon className="w-3.5 h-3.5" />
                              </button>
                              {activePicker?.index === i && activePicker?.target === "ai" && (
                                <EmojiPicker
                                  onSelectEmoji={(emoji) => handleToggleReaction(i, "ai", emoji)}
                                  onClose={() => setActivePicker(null)}
                                />
                              )}
                            </div>

                            <button
                              type="button"
                              className="btn-copy"
                              onClick={() => handleToggleSpeech(i, exchange.answer)}
                              title={speakingIndex === i ? "Stop Audio" : "Read Answer Aloud"}
                            >
                              {speakingIndex === i ? (
                                <>
                                  <VolumeXIcon className="w-3.5 h-3.5 text-brand animate-pulse" />
                                  <span>Stop</span>
                                </>
                              ) : (
                                <>
                                  <Volume2Icon className="w-3.5 h-3.5" />
                                  <span>Listen</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              className="btn-copy"
                              onClick={() => handleRegenerate(i)}
                              title="Regenerate Response"
                              disabled={isAsking}
                            >
                              <RefreshCwIcon className="w-3.5 h-3.5" />
                              <span>Retry</span>
                            </button>

                            <button
                              type="button"
                              className="btn-copy"
                              onClick={() => handleCopyAnswer(exchange.answer, i)}
                            >
                              {copiedIndex === i ? (
                                <>
                                  <CheckIcon className="w-3.5 h-3.5 text-emerald" />
                                  <span>Copied</span>
                                </>
                              ) : (
                                <>
                                  <CopyIcon className="w-3.5 h-3.5" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>

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
                                <div
                                  className="citation-card clickable-citation"
                                  key={j}
                                  onClick={() => setPreviewPassage({ text: source, index: j })}
                                  title="Click to view full passage text"
                                >
                                  <p style={{ margin: 0 }}>{source}</p>
                                  <div className="citation-card__preview-badge">
                                    <Maximize2Icon className="w-3.5 h-3.5" />
                                    <span>Inspect</span>
                                  </div>
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

      {/* Passage Reader Modal */}
      {previewPassage && (
        <PassageModal
          passageText={previewPassage.text}
          passageIndex={previewPassage.index}
          scopeFilename={selectedFilename}
          onClose={() => setPreviewPassage(null)}
        />
      )}

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



      {/* AI Control Panel & Persona Modal */}
      {showAISettingsModal && (
        <AISettingsModal onClose={() => setShowAISettingsModal(false)} />
      )}

      {/* Vault Analytics Dashboard Modal */}
      {showAnalyticsModal && (
        <AnalyticsModal onClose={() => setShowAnalyticsModal(false)} />
      )}
    </section>
  );
}