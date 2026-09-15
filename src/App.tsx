import { useCallback, useEffect, useState } from "react";
import { listDocuments, DocumentInfo } from "./api";
import "./App.css";

import { ToastProvider, useToast } from "./components/Toast";
import UploadPanel from "./components/UploadPanel";
import ChatPanel from "./components/ChatPanel";
import { LoginScreen } from "./components/LoginScreen";
import { SignupScreen } from "./components/SignupScreen";

function AppContent() {
  const { showToast } = useToast();
  const [currentUser, setCurrentUser] = useState<string | null>(() => {
    return localStorage.getItem("documind_username");
  });
  const [authView, setAuthView] = useState<"login" | "signup">("login");

  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [selectedFilename, setSelectedFilename] = useState<string | null>(null);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const saved = localStorage.getItem("documind-theme");
    return saved === "light" ? "light" : "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("documind-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const refreshDocuments = useCallback(async () => {
    if (!currentUser) return;
    try {
      const docs = await listDocuments();
      setDocuments(docs);
    } catch {
      // Backend may not be reachable yet — leave the vault empty rather than crash.
    } finally {
      setIsLoadingDocuments(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      refreshDocuments();
    }
  }, [currentUser, refreshDocuments]);

  const handleLoginSuccess = (token: string, username: string) => {
    localStorage.setItem("documind_auth_token", token);
    localStorage.setItem("documind_username", username);
    setCurrentUser(username);
    setSelectedFilename(null);
    showToast(`Welcome back, @${username}!`, "success");
  };

  const handleSignupSuccess = (token: string, username: string) => {
    localStorage.setItem("documind_auth_token", token);
    localStorage.setItem("documind_username", username);
    setCurrentUser(username);
    setSelectedFilename(null);
    showToast(`Account created successfully! Welcome to OpenSource AI, @${username}.`, "success");
  };

  const handleLogout = () => {
    localStorage.removeItem("documind_auth_token");
    localStorage.removeItem("documind_username");
    setCurrentUser(null);
    setDocuments([]);
    setSelectedFilename(null);
    showToast("Signed out successfully.", "info");
  };

  if (!currentUser) {
    return (
      <div className="app-container" data-theme={theme}>
        {authView === "login" ? (
          <LoginScreen
            onLoginSuccess={handleLoginSuccess}
            onSwitchToSignup={() => setAuthView("signup")}
          />
        ) : (
          <SignupScreen
            onSignupSuccess={handleSignupSuccess}
            onSwitchToLogin={() => setAuthView("login")}
          />
        )}
      </div>
    );
  }

  return (
    <div className="app-container">
      <UploadPanel
        documents={documents}
        isLoading={isLoadingDocuments}
        selectedFilename={selectedFilename}
        onSelect={setSelectedFilename}
        onChanged={refreshDocuments}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />
      <ChatPanel
        hasDocuments={documents.length > 0}
        selectedFilename={selectedFilename}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
        currentUser={currentUser}
        onLogout={handleLogout}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}