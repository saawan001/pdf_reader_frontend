import { useCallback, useEffect, useState } from "react";
import { listDocuments, DocumentInfo } from "./api";

// @ts-expect-error App.css is handled by Vite bundler at runtime.
import "./App.css";



import { ToastProvider } from "./components/Toast";
import UploadPanel from "./components/Uploadpanel";
import ChatPanel from "./components/Chatpanel";

export default function App() {
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
    try {
      const docs = await listDocuments();
      setDocuments(docs);
    } catch {
      // Backend may not be reachable yet — leave the vault empty rather than crash.
    } finally {
      setIsLoadingDocuments(false);
    }
  }, []);

  useEffect(() => {
    refreshDocuments();
  }, [refreshDocuments]);

  return (
    <ToastProvider>
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
        />
      </div>
    </ToastProvider>
  );
}