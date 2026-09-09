const API_BASE = import.meta.env.VITE_API_URL;

export interface UploadResponse {
  message: string;
  filename: string;
  num_chunks: number;
}

export interface AskResponse {
  question: string;
  answer: string;
  sources: string[];
}

export interface DocumentInfo {
  filename: string;
  num_chunks: number;
}

async function extractErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    return body?.detail ?? fallback;
  } catch {
    return fallback;
  }
}

export async function uploadDocument(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/documents/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error(await extractErrorMessage(res, `Upload failed (${res.status})`));
  }

  return res.json();
}

export async function listDocuments(): Promise<DocumentInfo[]> {
  const res = await fetch(`${API_BASE}/documents`);

  if (!res.ok) {
    throw new Error(await extractErrorMessage(res, `Could not load documents (${res.status})`));
  }

  const data = await res.json();
  return data.documents;
}

export async function deleteDocument(filename: string): Promise<void> {
  const res = await fetch(`${API_BASE}/documents/${encodeURIComponent(filename)}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    throw new Error(await extractErrorMessage(res, `Delete failed (${res.status})`));
  }
}

export async function askQuestion(question: string, filename?: string): Promise<AskResponse> {
  const res = await fetch(`${API_BASE}/documents/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
    body: JSON.stringify({ question, filename }),
  });

  if (!res.ok) {
    throw new Error(await extractErrorMessage(res, `Question failed (${res.status})`));
  }

  return res.json();
}

export async function askQuestionStream(
  question: string,
  onToken: (token: string) => void,
  onSources: (sources: string[]) => void,
  filename?: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/documents/ask/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json", 
      "ngrok-skip-browser-warning": "true"},
    body: JSON.stringify({ question, filename }),
  });

  if (!res.ok || !res.body) {
    throw new Error(await extractErrorMessage(res, `Question failed (${res.status})`));
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;
      const parsed = JSON.parse(line);
      if (parsed.type === "sources") {
        onSources(parsed.sources);
      } else if (parsed.type === "token") {
        onToken(parsed.content);
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
    }
  }
}

export async function fetchChatHistory(scopeKey: string): Promise<Exchange[]> {
  try {
    const res = await fetch(`${API_BASE}/documents/history/${encodeURIComponent(scopeKey)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.history || [];
  } catch {
    return [];
  }
}

export async function saveChatHistory(scopeKey: string, history: Exchange[]): Promise<void> {
  try {
    await fetch(`${API_BASE}/documents/history`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
      body: JSON.stringify({ scope_key: scopeKey, history }),
    });
  } catch {
    // Ignore backend save errors gracefully
  }
}

export async function clearChatHistory(scopeKey: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/documents/history/${encodeURIComponent(scopeKey)}`, {
      method: "DELETE",
    });
  } catch {
    // Ignore backend clear errors gracefully
  }
}

export interface Exchange {
  question: string;
  answer: string;
  sources: string[];
}