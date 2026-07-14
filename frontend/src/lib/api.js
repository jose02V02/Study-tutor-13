export const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

async function safeJson(r, defaultMsg = "Errore server") {
  const ct = r.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    throw new Error(r.status >= 500 ? "Server temporaneamente non disponibile. Riprova." : defaultMsg);
  }
  const data = await r.json();
  if (!r.ok) throw new Error(data.detail || defaultMsg);
  return data;
}

export async function ingestUrl({ url, text, level }) {
  const r = await fetch(`${API_BASE}/ingest/url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, text, level }),
  });
  return safeJson(r, "Errore ingestione");
}

export async function ingestFile(file, level) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("level", level);
  const r = await fetch(`${API_BASE}/ingest/file`, { method: "POST", body: fd });
  return safeJson(r, "Errore upload");
}

export async function getSession(sid) {
  const r = await fetch(`${API_BASE}/session/${sid}`);
  return safeJson(r, "Sessione non trovata");
}

export async function listSessions() {
  try {
    const r = await fetch(`${API_BASE}/sessions`);
    return await safeJson(r);
  } catch {
    return { sessions: [] };
  }
}

export async function deleteSession(sid) {
  try { await fetch(`${API_BASE}/session/${sid}`, { method: "DELETE" }); } catch {}
}

export async function generateQuiz(sid, onDelta) {
  return await consumeSSEForData(`${API_BASE}/quiz/${sid}`, { method: "POST" }, onDelta);
}

export async function feynmanReview({ session_id, explanation, level }, onDelta) {
  return await consumeSSEForData(
    `${API_BASE}/feynman`,
    { method: "POST", body: { session_id, explanation, level } },
    onDelta,
  );
}

export async function getStudyPlan(sid, onDelta) {
  return await consumeSSEForData(`${API_BASE}/plan/${sid}`, { method: "GET" }, onDelta);
}

async function consumeSSEForData(url, opts, onDelta) {
  return await new Promise((resolve, reject) => {
    let finalData = null;
    let errored = false;
    streamSSE(
      url,
      opts,
      (delta) => onDelta && onDelta(delta),
      () => { if (!errored) resolve(finalData); },
      (err) => { errored = true; reject(new Error(err)); },
      (data) => { finalData = data; },
    ).catch((e) => { errored = true; reject(e); });
  });
}

export async function updateProgress(payload) {
  try {
    const r = await fetch(`${API_BASE}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await safeJson(r);
  } catch (e) {
    console.warn("updateProgress failed:", e.message);
    return null;
  }
}

export async function addNote(session_id, text) {
  try {
    const r = await fetch(`${API_BASE}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id, text }),
    });
    return await safeJson(r);
  } catch (e) {
    console.warn("addNote failed:", e.message);
    return null;
  }
}

export function exportUrl(sid, fmt) {
  return `${API_BASE}/export/${sid}/${fmt}`;
}

export async function getDashboard() {
  try {
    const r = await fetch(`${API_BASE}/dashboard`);
    return await safeJson(r);
  } catch {
    return {
      total_sessions: 0, total_minutes: 0, hours_studied: 0, chapters_completed: 0,
      avg_comprehension: 0, level_name: "Novizio", weak_topics: [], understood_topics: [], recent_sessions: [],
    };
  }
}

export async function searchVideos(q, limit = 12) {
  const r = await fetch(`${API_BASE}/videos/search?q=${encodeURIComponent(q)}&limit=${limit}`);
  return safeJson(r, "Ricerca video fallita");
}

export async function videosForLesson(sid) {
  const r = await fetch(`${API_BASE}/videos/for-lesson/${sid}`);
  return safeJson(r, "Errore video lezione");
}

export async function enableShare(sid) {
  const r = await fetch(`${API_BASE}/share/${sid}`, { method: "POST" });
  return safeJson(r, "Errore condivisione");
}

export async function disableShare(sid) {
  const r = await fetch(`${API_BASE}/share/${sid}`, { method: "DELETE" });
  return safeJson(r, "Errore");
}

export async function getPublicLesson(slug) {
  const r = await fetch(`${API_BASE}/public/lesson/${slug}`);
  return safeJson(r, "Lezione non trovata");
}

export async function downloadExport(sid, fmt) {
  const r = await fetch(exportUrl(sid, fmt));
  if (!r.ok) {
    let msg = "Export fallito";
    try {
      const j = await r.json();
      msg = j.detail || msg;
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  const blob = await r.blob();
  // Extract filename from Content-Disposition
  const cd = r.headers.get("content-disposition") || "";
  let filename = `lezione.${fmt}`;
  const m = cd.match(/filename\*=UTF-8''([^;]+)/) || cd.match(/filename="([^"]+)"/);
  if (m) filename = decodeURIComponent(m[1]);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Stream SSE. Emits {delta}, {done:true, data?}, {error} events.
// Callbacks: onDelta(text), onDone(), onError(msg), onData(finalData)
export async function streamSSE(url, { method = "GET", body = null } = {}, onDelta, onDone, onError, onData) {
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
        if (evt.data !== undefined) onData && onData(evt.data);
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
