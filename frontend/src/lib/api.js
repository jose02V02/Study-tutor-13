export const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

export async function ingestUrl({ url, text, level }) {
  const r = await fetch(`${API_BASE}/ingest/url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, text, level }),
  });
  if (!r.ok) throw new Error((await r.json()).detail || "Errore ingestione");
  return r.json();
}

export async function ingestFile(file, level) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("level", level);
  const r = await fetch(`${API_BASE}/ingest/file`, { method: "POST", body: fd });
  if (!r.ok) throw new Error((await r.json()).detail || "Errore upload");
  return r.json();
}

export async function getSession(sid) {
  const r = await fetch(`${API_BASE}/session/${sid}`);
  if (!r.ok) throw new Error("Sessione non trovata");
  return r.json();
}

export async function listSessions() {
  const r = await fetch(`${API_BASE}/sessions`);
  return r.json();
}

export async function deleteSession(sid) {
  await fetch(`${API_BASE}/session/${sid}`, { method: "DELETE" });
}

export async function generateQuiz(sid) {
  const r = await fetch(`${API_BASE}/quiz/${sid}`, { method: "POST" });
  if (!r.ok) throw new Error("Errore quiz");
  return r.json();
}

export async function feynmanReview({ session_id, explanation, level }) {
  const r = await fetch(`${API_BASE}/feynman`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id, explanation, level }),
  });
  if (!r.ok) throw new Error("Errore Feynman");
  return r.json();
}

export async function getStudyPlan(sid) {
  const r = await fetch(`${API_BASE}/plan/${sid}`);
  if (!r.ok) throw new Error("Errore piano");
  return r.json();
}

export async function updateProgress(payload) {
  const r = await fetch(`${API_BASE}/progress`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return r.json();
}

export async function addNote(session_id, text) {
  const r = await fetch(`${API_BASE}/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id, text }),
  });
  return r.json();
}

export async function getDashboard() {
  const r = await fetch(`${API_BASE}/dashboard`);
  return r.json();
}

// Stream SSE from GET (lesson intro)
export async function streamSSE(url, { method = "GET", body = null } = {}, onDelta, onDone, onError) {
  const resp = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const reader = resp.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n\n")) !== -1) {
      const raw = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      if (!raw.startsWith("data:")) continue;
      try {
        const evt = JSON.parse(raw.slice(5).trim());
        if (evt.delta) onDelta && onDelta(evt.delta);
        if (evt.done) onDone && onDone();
        if (evt.error) onError && onError(evt.error);
      } catch { /* ignore malformed */ }
    }
  }
  onDone && onDone();
}

export function lessonIntroUrl(sid) {
  return `${API_BASE}/lesson/intro/${sid}`;
}
export function chatUrl() {
  return `${API_BASE}/chat`;
}
