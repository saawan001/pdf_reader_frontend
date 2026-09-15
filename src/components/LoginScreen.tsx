import React, { useState } from "react";
import { SparklesIcon, UserIcon, LogOutIcon } from "./Icons";

interface LoginScreenProps {
  onLoginSuccess: (token: string, username: string) => void;
  onSwitchToSignup: () => void;
}

const API_BASE = import.meta.env.VITE_API_URL;

function LockIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, onSwitchToSignup }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password: password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Invalid username or password.");
      }

      const token = data.access_token || data.token;
      const user = data.username || username.trim();
      onLoginSuccess(token, user);
    } catch (err: any) {
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <SparklesIcon className="w-8 h-8 text-white" />
          </div>
          <h1 className="auth-title">Welcome Back to OpenSource AI</h1>
          <p className="auth-subtitle">Sign in to access your private OpenSource AI workspace</p>
        </div>

        {error && (
          <div className="auth-error-alert">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="login-username">Username</label>
            <div className="input-with-icon">
              <UserIcon className="input-icon" />
              <input
                id="login-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                autoComplete="username"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <div className="input-with-icon">
              <LockIcon className="input-icon" />
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="spinner"></span> Signing In...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <LogOutIcon className="w-5 h-5 rotate-180" /> Sign In
              </span>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Don't have an account?{" "}
            <button type="button" onClick={onSwitchToSignup} className="auth-link-btn">
              Create an Account
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
