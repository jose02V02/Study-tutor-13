import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Send, ArrowLeft, Loader2, Sparkles, Map as MapIcon, StickyNote,
  BookOpenCheck, Brain, ChevronRight, Check, X, RotateCcw, PlayCircle,
  Target,
} from "lucide-react";
import {
  getSession, generateQuiz, feynmanReview, getStudyPlan,
  updateProgress, addNote, streamSSE, lessonIntroUrl, chatUrl,
} from "@/lib/api";
import { renderMarkdown } from "@/lib/markdown";
import MindMap from "@/components/MindMap";
import QuizPanel from "@/components/QuizPanel";
import FeynmanPanel from "@/components/FeynmanPanel";
import StudyPlanPanel from "@/components/StudyPlanPanel";
import HaiCapitoBar from "@/components/HaiCapitoBar";

const RIGHT_TABS = [
  { key: "mappa", label: "Mappa", icon: MapIcon },
  { key: "quiz", label: "Quiz", icon: BookOpenCheck },
  { key: "feynman", label: "Feynman", icon: Brain },
  { key: "piano", label: "Piano", icon: Target },
  { key: "note", label: "Note", icon: StickyNote },
];

export default function Classroom() {
  const { sid } = useParams();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [streaming, setStreaming] = useState(false);
  const [streamBuf, setStreamBuf] = useState("");
  const [input, setInput] = useState("");
  const [rightTab, setRightTab] = useState("mappa");
  const [activeChapter, setActiveChapter] = useState(0);
  const [quiz, setQuiz] = useState(null);
  const [plan, setPlan] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [notes, setNotes] = useState([]);
  const [streamingPanel, setStreamingPanel] = useState({ quiz: 0, plan: 0, feynman: 0 });
  const scrollRef = useRef(null);
  const startTimeRef = useRef(Date.now());
  const introStartedRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const s = await getSession(sid);
        setSession(s);
        setMessages(s.messages || []);
        setQuiz(s.quiz);
        setNotes(s.notes || []);
        if ((!s.messages || s.messages.length === 0) && !introStartedRef.current) {
          introStartedRef.current = true;
          startLessonIntro();
        }
      } catch (e) {
        toast.error("Sessione non trovata");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line
  }, [sid]);

  // Track study time
  useEffect(() => {
    return () => {
      const mins = Math.floor((Date.now() - startTimeRef.current) / 60000);
      if (mins > 0) updateProgress({ session_id: sid, minutes_studied: mins });
    };
  }, [sid]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamBuf]);

  const startLessonIntro = async () => {
    setStreaming(true);
    setStreamBuf("");
    let acc = "";
    try {
      await streamSSE(
        lessonIntroUrl(sid),
        { method: "GET" },
        (delta) => {
          acc += delta;
          setStreamBuf(acc);
        },
        () => {
          setMessages((m) => [...m, { role: "assistant", content: acc }]);
          setStreamBuf("");
          setStreaming(false);
        },
        (err) => { toast.error(err); setStreaming(false); }
      );
    } catch (e) {
      toast.error("Errore streaming");
      setStreaming(false);
    }
  };

  const sendMessage = async (text) => {
    const val = (text ?? input).trim();
    if (!val || streaming) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: val }]);
    setStreaming(true);
    setStreamBuf("");
    let acc = "";
    try {
      await streamSSE(
        chatUrl(),
        { method: "POST", body: { session_id: sid, message: val, level: session.level } },
        (delta) => {
          acc += delta;
          setStreamBuf(acc);
        },
        () => {
          setMessages((m) => [...m, { role: "assistant", content: acc }]);
          setStreamBuf("");
          setStreaming(false);
        },
        (err) => { toast.error(err); setStreaming(false); }
      );
    } catch (e) {
      toast.error("Errore");
      setStreaming(false);
    }
  };

  const onHaiCapito = async (understood) => {
    const chap = session.analysis.chapters?.[activeChapter];
    const topic = chap?.title || session.analysis.topic;
    await updateProgress({
      session_id: sid,
      understood,
      misunderstood_topic: topic,
      comprehension: understood ? 85 : Math.max(30, (session.progress?.comprehension || 50) - 10),
    });
    if (understood) {
      toast.success("Ottimo! Andiamo avanti.");
      sendMessage(`Ho capito il capitolo "${topic}". Passiamo al prossimo argomento con una spiegazione completa.`);
      setActiveChapter((c) => Math.min((session.analysis.chapters?.length || 1) - 1, c + 1));
    } else {
      toast("Cambio approccio.", { icon: "🔄" });
      sendMessage(`Non ho capito "${topic}". Spiegamelo di nuovo ma con un metodo COMPLETAMENTE diverso: usa un'analogia nuova e un esempio molto più semplice.`);
    }
  };

  const onGenerateQuiz = async () => {
    setRightTab("quiz");
    if (quiz) return;
    setStreamingPanel((s) => ({ ...s, quiz: 0 }));
    try {
      const q = await generateQuiz(sid, (delta) => {
        setStreamingPanel((s) => ({ ...s, quiz: s.quiz + delta.length }));
      });
      setQuiz(q);
    } catch (e) { toast.error(e.message || "Errore quiz"); }
    finally { setStreamingPanel((s) => ({ ...s, quiz: 0 })); }
  };

  const onQuizComplete = async (score) => {
    await updateProgress({ session_id: sid, comprehension: score });
    toast.success(`Quiz: ${score}% comprensione`);
  };

  const onFeynmanSubmit = async (explanation, onDelta) => {
    const result = await feynmanReview(
      { session_id: sid, explanation, level: session.level },
      onDelta,
    );
    await updateProgress({ session_id: sid, comprehension: result.score, weak_topic: (result.missing || [])[0] });
    return result;
  };

  const onGeneratePlan = async () => {
    setRightTab("piano");
    if (plan) return;
    setStreamingPanel((s) => ({ ...s, plan: 0 }));
    try {
      const p = await getStudyPlan(sid, (delta) => {
        setStreamingPanel((s) => ({ ...s, plan: s.plan + delta.length }));
      });
      setPlan(p);
    } catch (e) { toast.error(e.message || "Errore piano"); }
    finally { setStreamingPanel((s) => ({ ...s, plan: 0 })); }
  };

  const onAddNote = async () => {
    if (!noteText.trim()) return;
    const n = await addNote(sid, noteText.trim());
    setNotes((ns) => [...ns, n]);
    setNoteText("");
    toast.success("Nota salvata");
  };

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="animate-spin text-emerald-900" size={32} />
      </div>
    );
  }
  if (!session) return null;

  const analysis = session.analysis;

  return (
    <div className="h-screen flex flex-col bg-[#FDFBF7]">
      {/* Top bar */}
      <div className="border-b border-slate-900/10 bg-white/70 backdrop-blur-md px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <Link to="/" data-testid="back-home" className="text-slate-600 hover:text-emerald-900 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div className="min-w-0">
            <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-emerald-800/70">
              {analysis.difficulty || "lezione"} · {session.level}
            </div>
            <div className="font-heading text-xl text-slate-900 truncate" data-testid="lesson-title">
              {analysis.topic}
            </div>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-6 text-xs font-mono uppercase tracking-widest text-slate-600">
          <span>Cap. <span className="text-emerald-900 font-semibold">{activeChapter + 1}</span>/{analysis.chapters?.length || 0}</span>
          <span>Compr. <span className="text-emerald-900 font-semibold">{session.progress?.comprehension || 0}%</span></span>
        </div>
      </div>

      {/* Body: 3 panes */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: chapters */}
        <aside className="w-64 border-r border-slate-900/10 overflow-y-auto pretty-scroll shrink-0 hidden lg:block">
          <div className="p-5">
            <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-emerald-800 mb-3">Capitoli</div>
            <div className="space-y-1">
              {(analysis.chapters || []).map((c, i) => (
                <button
                  key={i}
                  onClick={() => setActiveChapter(i)}
                  data-testid={`chapter-${i}`}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-all group ${
                    activeChapter === i
                      ? "bg-emerald-900 text-[#FDFBF7]"
                      : "hover:bg-emerald-900/5 text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest opacity-70">
                    <span>{String(i + 1).padStart(2, "0")}</span>
                    {(session.progress?.chapters_completed || []).includes(i) && <Check size={12} />}
                  </div>
                  <div className="text-sm font-medium leading-tight mt-1">{c.title}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="border-t border-slate-900/10 p-5">
            <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-emerald-800 mb-3">Concetti chiave</div>
            <div className="flex flex-wrap gap-1.5">
              {(analysis.concepts || []).slice(0, 12).map((c, i) => (
                <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-900/5 border border-emerald-900/10 text-emerald-900">
                  {c.name}
                </span>
              ))}
            </div>
          </div>
          {(analysis.prerequisites || []).length > 0 && (
            <div className="border-t border-slate-900/10 p-5">
              <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-emerald-800 mb-3">Prerequisiti</div>
              <ul className="text-xs text-slate-600 space-y-1">
                {analysis.prerequisites.map((p, i) => (
                  <li key={i} className="flex items-start gap-1.5"><ChevronRight size={12} className="mt-0.5 shrink-0" /> {p}</li>
                ))}
              </ul>
            </div>
          )}
        </aside>

        {/* CENTER: chat */}
        <main className="flex-1 flex flex-col min-w-0">
          <div ref={scrollRef} className="flex-1 overflow-y-auto pretty-scroll px-6 lg:px-10 py-6">
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.length === 0 && !streaming && (
                <div className="text-center py-16">
                  <button
                    onClick={startLessonIntro}
                    data-testid="start-lesson-btn"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-emerald-900 text-[#FDFBF7] hover:bg-emerald-800 transition-colors"
                  >
                    <PlayCircle size={18} /> Inizia la lezione
                  </button>
                </div>
              )}
              {messages.map((m, i) => (
                <ChatBubble key={i} role={m.role} content={m.content} />
              ))}
              {streaming && streamBuf && (
                <ChatBubble role="assistant" content={streamBuf} streaming />
              )}
              {streaming && !streamBuf && (
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <Loader2 size={14} className="animate-spin" /> Il Maestro sta preparando la lezione…
                </div>
              )}
            </div>
          </div>

          {/* Hai capito? bar */}
          {messages.length > 0 && !streaming && (
            <HaiCapitoBar onAnswer={onHaiCapito} />
          )}

          {/* Composer */}
          <div className="border-t border-slate-900/10 bg-white/60 backdrop-blur-md px-6 lg:px-10 py-4">
            <div className="max-w-3xl mx-auto flex items-end gap-2">
              <textarea
                data-testid="chat-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Fai una domanda, chiedi un esempio, o dì 'non ho capito'…"
                rows={2}
                className="flex-1 bg-white border border-slate-900/10 rounded-2xl px-4 py-3 resize-none outline-none focus:border-emerald-800 text-sm"
              />
              <button
                onClick={() => sendMessage()}
                disabled={streaming || !input.trim()}
                data-testid="send-btn"
                className="p-3 rounded-2xl bg-emerald-900 text-[#FDFBF7] hover:bg-emerald-800 disabled:opacity-40 transition-colors"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </main>

        {/* RIGHT: panels */}
        <aside className="w-96 border-l border-slate-900/10 overflow-hidden shrink-0 hidden xl:flex flex-col bg-white/40">
          <div className="border-b border-slate-900/10 flex">
            {RIGHT_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => {
                  if (t.key === "quiz") onGenerateQuiz();
                  else if (t.key === "piano") onGeneratePlan();
                  else setRightTab(t.key);
                }}
                data-testid={`tab-${t.key}`}
                className={`flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-mono uppercase tracking-widest transition-colors ${
                  rightTab === t.key ? "text-emerald-900 bg-emerald-900/5" : "text-slate-500 hover:text-emerald-900"
                }`}
              >
                <t.icon size={14} />
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto pretty-scroll p-5">
            <AnimatePresence mode="wait">
              <motion.div
                key={rightTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                {rightTab === "mappa" && <MindMap data={analysis.mind_map} />}
                {rightTab === "quiz" && <QuizPanel quiz={quiz} progress={streamingPanel.quiz} onComplete={onQuizComplete} onRegenerate={() => { setQuiz(null); onGenerateQuiz(); }} />}
                {rightTab === "feynman" && <FeynmanPanel onSubmit={onFeynmanSubmit} topic={analysis.topic} />}
                {rightTab === "piano" && <StudyPlanPanel plan={plan} progress={streamingPanel.plan} />}
                {rightTab === "note" && (
                  <div className="space-y-3">
                    <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-emerald-800">Le mie note</div>
                    <textarea
                      data-testid="note-input"
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Scrivi una nota…"
                      className="w-full bg-white border border-slate-900/10 rounded-xl p-3 text-sm outline-none focus:border-emerald-800 resize-none"
                      rows={4}
                    />
                    <button
                      onClick={onAddNote}
                      data-testid="save-note-btn"
                      className="w-full py-2 rounded-lg bg-emerald-900 text-[#FDFBF7] text-sm font-medium hover:bg-emerald-800 transition-colors"
                    >
                      Salva nota
                    </button>
                    <div className="space-y-2 mt-4">
                      {notes.map((n) => (
                        <div key={n.id} className="p-3 rounded-lg bg-amber-50 border border-amber-900/10 text-sm text-slate-800">
                          {n.text}
                        </div>
                      ))}
                      {notes.length === 0 && (
                        <div className="text-xs text-slate-500 italic">Nessuna nota ancora.</div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ChatBubble({ role, content, streaming }) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] bg-emerald-900 text-[#FDFBF7] rounded-2xl rounded-tr-md px-4 py-3 text-sm leading-relaxed shadow-sm">
          {content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-emerald-900 text-[#FDFBF7] grid place-items-center shrink-0 mt-1">
        <Sparkles size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-800 mb-1">Maestro</div>
        <div
          className={`prose-tutor ${streaming ? "stream-cursor" : ""}`}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
        />
      </div>
    </div>
  );
}
