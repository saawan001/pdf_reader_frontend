import { FormEvent, useState } from "react";
import { UserIcon, XIcon } from "./Icons";
import { useToast } from "./Toast";

interface AuthModalProps {
  onClose: () => void;
  onLoginSuccess: (username: string, token: string) => void;
}

export default function AuthModal({ onClose, onLoginSuccess }: AuthModalProps) {
  const { showToast } = useToast();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  const API_BASE = import.meta.env.VITE_API_URL;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      showToast("Please enter username and password.", "error");
      return;
    }

    setIsBusy(true);
    const endpoint = isRegister ? `${API_BASE}/auth/register` : `${API_BASE}/auth/login`;
    const payload = isRegister ? { username, email, password } : { username, password };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Authentication failed.");
      }

      localStorage.setItem("documind_auth_token", data.token);
      localStorage.setItem("documind_username", data.user.username);
      onLoginSuccess(data.user.username, data.token);
      showToast(`Welcome back, ${data.user.username}!`, "success");
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Authentication error.";
      showToast(msg, "error");
    } finally {
      setIsBusy(false);
    }
  };

  const activeUser = localStorage.getItem("documind_username");

  const handleLogout = () => {
    localStorage.removeItem("documind_auth_token");
    localStorage.removeItem("documind_username");
    onLoginSuccess("default_user", "");
    showToast("Logged out successfully.", "info");
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
        style={{ maxWidth: "420px" }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-card__header">
          <div className="modal-card__icon-wrap" style={{ background: "rgba(99, 102, 241, 0.15)", color: "var(--brand-primary)" }}>
            <UserIcon className="w-5 h-5" />
          </div>
          <div style={{ flex: 1 }}>
            <h3 className="modal-card__title">
              {activeUser && activeUser !== "default_user"
                ? `Account: @${activeUser}`
                : isRegister
                ? "Create Account"
                : "User Sign In"}
            </h3>
            <p className="modal-card__desc">
              {activeUser && activeUser !== "default_user"
                ? "Manage your session or switch account"
                : isRegister
                ? "Register for an isolated personal document vault"
                : "Sign in to access your user-specific chat history"}
            </p>
          </div>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Close">
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {activeUser && activeUser !== "default_user" ? (
          <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="suggestion-card" style={{ cursor: "default" }}>
              <span className="suggestion-card__title">
                <UserIcon className="w-4 h-4 text-brand" />
                Signed in as @{activeUser}
              </span>
              <span className="suggestion-card__desc">Your document chats and vector searches are isolated to your account.</span>
            </div>

            <div className="modal-card__actions">
              <button type="button" className="btn-modal-cancel" onClick={onClose}>
                Close
              </button>
              <button type="button" className="btn-modal-danger" onClick={handleLogout}>
                Sign Out
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <div>
              <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "0.3rem" }}>Username</label>
              <input
                type="text"
                className="chat-search-input"
                style={{ paddingLeft: "0.85rem" }}
                placeholder="e.g. saawan"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            {isRegister && (
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "0.3rem" }}>Email Address</label>
                <input
                  type="email"
                  className="chat-search-input"
                  style={{ paddingLeft: "0.85rem" }}
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            )}

            <div>
              <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "0.3rem" }}>Password</label>
              <input
                type="password"
                className="chat-search-input"
                style={{ paddingLeft: "0.85rem" }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="modal-card__actions" style={{ marginTop: "0.5rem" }}>
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setIsRegister(!isRegister)}
              >
                {isRegister ? "Need to Sign In?" : "Create Account?"}
              </button>
              <button type="submit" className="btn-modal-primary" disabled={isBusy}>
                {isBusy ? "Processing..." : isRegister ? "Create Account" : "Sign In"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
