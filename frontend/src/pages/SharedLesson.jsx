import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, ArrowLeft, Sparkles, Eye, GraduationCap, BookOpen } from "lucide-react";
import { getPublicLesson } from "@/lib/api";
import { renderMarkdown } from "@/lib/markdown";
import MindMap from "@/components/MindMap";

const LEVEL_LABELS = {
  bambino: "Bambino (10 anni)",
  superiori: "Scuole superiori",
  universitario: "Universitario",
  esperto: "Esperto",
  tecnico: "Tecnico",
  semplice: "Semplice",
};

export default function SharedLesson() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const d = await getPublicLesson(slug);
        setData(d);
      } catch (e) {
        setErr(e.message || "Lezione non trovata");
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="animate-spin text-emerald-900" size={32} />
      </div>
    );
  }
  if (err) {
    return (
      <div className="min-h-screen grid place-items-center px-6 text-center">
        <div>
          <div className="font-heading text-4xl text-slate-900 mb-3">Lezione non disponibile</div>
          <p className="text-slate-600 mb-6">{err}</p>
          <Link to="/" className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-emerald-900 text-[#FDFBF7] hover:bg-emerald-800 transition-colors">
            <ArrowLeft size={14} /> Home
          </Link>
        </div>
      </div>
    );
  }

  const a = data.analysis || {};
  const messages = data.messages || [];
  const quiz = data.quiz;

  return (
    <div className="min-h-screen bg-[#FDFBF7] pb-20">
      {/* Top banner */}
      <div className="border-b border-slate-900/10 bg-white/70 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-6 py-3">
          <Link to="/" data-testid="brand-shared" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-md bg-emerald-900 text-[#FDFBF7] grid place-items-center">
              <GraduationCap size={16} />
            </div>
            <div className="leading-none">
              <div className="font-heading text-base font-semibold text-slate-900">
                inteligent <em className="text-emerald-900">STUDY</em>
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-900/5 border border-emerald-900/15">
            <Eye size={12} className="text-emerald-800" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-900">
              Sola lettura
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 pt-10">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-xs font-mono uppercase tracking-[0.25em] text-emerald-800 mb-3">
            {LEVEL_LABELS[data.level] || data.level} · {a.difficulty || "-"} · {a.estimated_minutes || "-"} min
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl text-slate-900 mb-4 tracking-tight leading-tight">
            {a.topic || data.title}
          </h1>
          {a.summary && (
            <p className="text-slate-700 leading-relaxed text-lg mb-8">
              {a.summary}
            </p>
          )}
          {data.source_title && (
            <p className="text-xs text-slate-500 mb-8">
              Fonte: <span className="font-mono">{data.source_title}</span>
            </p>
          )}
        </motion.div>

        {/* Prerequisites */}
        {(a.prerequisites || []).length > 0 && (
          <section className="mb-10">
            <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-emerald-800 mb-3">
              Prerequisiti
            </h2>
            <ul className="space-y-1 text-sm text-slate-700">
              {a.prerequisites.map((p, i) => (
                <li key={i} className="flex gap-2"><span className="text-emerald-800">·</span>{p}</li>
              ))}
            </ul>
          </section>
        )}

        {/* Concepts */}
        {(a.concepts || []).length > 0 && (
          <section className="mb-10">
            <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-emerald-800 mb-4">
              Concetti chiave
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {a.concepts.map((c, i) => (
                <div key={i} className="p-4 rounded-xl bg-white border border-slate-900/10">
                  <div className="font-heading text-lg text-emerald-900 mb-1">{c.name}</div>
                  <div className="text-sm text-slate-600">{c.definition}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Chapters */}
        {(a.chapters || []).length > 0 && (
          <section className="mb-12">
            <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-emerald-800 mb-4">
              Capitoli
            </h2>
            <div className="space-y-4">
              {a.chapters.map((c, i) => (
                <div key={i} className="border-l-2 border-emerald-800 pl-4">
                  <div className="font-heading text-xl text-slate-900 mb-1">
                    {i + 1}. {c.title}
                  </div>
                  {c.objective && (
                    <div className="text-xs italic text-slate-500 mb-2">Obiettivo: {c.objective}</div>
                  )}
                  {(c.key_points || []).length > 0 && (
                    <ul className="space-y-1 text-sm text-slate-700">
                      {c.key_points.map((kp, j) => (
                        <li key={j} className="flex gap-2"><span className="text-emerald-800">·</span>{kp}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Mind Map */}
        {a.mind_map && (
          <section className="mb-12 p-6 rounded-2xl bg-white border border-slate-900/10">
            <MindMap data={a.mind_map} />
          </section>
        )}

        {/* Conversation */}
        {messages.length > 0 && (
          <section className="mb-12">
            <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-emerald-800 mb-4 flex items-center gap-2">
              <BookOpen size={12} /> Lezione del Maestro
            </h2>
            <div className="space-y-6">
              {messages.map((m, i) => (
                m.role === "user" ? (
                  <div key={i} className="flex justify-end">
                    <div className="max-w-[85%] bg-slate-900 text-[#FDFBF7] rounded-2xl rounded-tr-md px-4 py-3 text-sm leading-relaxed">
                      {m.content}
                    </div>
                  </div>
                ) : (
                  <div key={i} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-900 text-[#FDFBF7] grid place-items-center shrink-0 mt-1">
                      <Sparkles size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-800 mb-1">Maestro</div>
                      <div
                        className="prose-tutor"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }}
                      />
                    </div>
                  </div>
                )
              ))}
            </div>
          </section>
        )}

        {/* Quiz preview (read-only, shows correct answers) */}
        {quiz && (quiz.multiple_choice || []).length > 0 && (
          <section className="mb-12">
            <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-emerald-800 mb-4">
              Quiz
            </h2>
            <div className="space-y-4">
              {(quiz.multiple_choice || []).map((q, i) => (
                <div key={i} className="p-4 rounded-xl bg-white border border-slate-900/10">
                  <div className="font-medium text-slate-900 mb-2 text-sm">{i + 1}. {q.question}</div>
                  <div className="space-y-1">
                    {q.options.map((opt, j) => (
                      <div
                        key={j}
                        className={`text-xs px-3 py-1.5 rounded-lg border ${
                          j === q.correct_index
                            ? "border-emerald-800 bg-emerald-50 text-emerald-900 font-medium"
                            : "border-slate-900/10 text-slate-700"
                        }`}
                      >
                        {chr(j)}. {opt}{j === q.correct_index && " ✓"}
                      </div>
                    ))}
                  </div>
                  {q.explanation && (
                    <div className="mt-2 text-xs text-slate-500 italic">{q.explanation}</div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Footer CTA */}
        <div className="mt-16 py-10 border-t border-slate-900/10 text-center">
          <div className="font-heading text-2xl text-slate-900 mb-2">
            Vuoi imparare come questo? <em className="text-emerald-900">Crea la tua lezione.</em>
          </div>
          <p className="text-sm text-slate-600 mb-5">
            Incolla un link o carica un file, il Maestro AI ti insegna.
          </p>
          <Link
            to="/"
            data-testid="shared-cta"
            className="inline-flex items-center gap-1.5 px-6 py-3 rounded-full bg-emerald-900 hover:bg-emerald-800 text-[#FDFBF7] font-medium text-sm transition-colors"
          >
            <Sparkles size={14} /> Prova inteligent STUDY
          </Link>
        </div>
      </div>
    </div>
  );
}

function chr(i) {
  return String.fromCharCode(97 + i);
}
