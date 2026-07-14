import { useState } from "react";
import { Check, X, RotateCcw, Loader2, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─── 3D Flip Flashcard ────────────────────────────────────────────────────────
function Flashcard({ card, index }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      className="w-full mb-4"
      style={{ perspective: "1000px" }}
    >
      {/* Outer container that maintains height */}
      <div
        onClick={() => setFlipped((f) => !f)}
        data-testid={`flashcard-${index}`}
        className="relative cursor-pointer select-none"
        style={{ height: 100 }}
      >
        {/* Front face */}
        <motion.div
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          style={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
          }}
          className="rounded-xl border-2 border-emerald-900/20 bg-white hover:border-emerald-800 hover:shadow-md transition-shadow p-4 flex flex-col justify-between"
        >
          <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-800">
            Fronte · clicca per girare
          </div>
          <div className="text-sm text-slate-900 font-medium leading-snug">{card.front}</div>
        </motion.div>

        {/* Back face */}
        <motion.div
          animate={{ rotateY: flipped ? 0 : -180 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          style={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            rotateY: -180,
          }}
          className="rounded-xl border-2 border-emerald-800 bg-emerald-900 p-4 flex flex-col justify-between"
        >
          <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-300/80">
            Retro
          </div>
          <div className="text-sm text-[#FDFBF7] leading-snug">{card.back}</div>
        </motion.div>
      </div>
    </div>
  );
}

// ─── Main Quiz Panel ──────────────────────────────────────────────────────────
export default function QuizPanel({ quiz, onComplete, onRegenerate, progress = 0 }) {
  const [tab, setTab] = useState("mc");
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  if (!quiz) {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <Loader2 className="animate-spin text-emerald-900 mb-3" />
        <div className="text-xs text-slate-500 font-mono uppercase tracking-widest">
          Generazione quiz…
        </div>
        {progress > 0 && (
          <>
            <div className="mt-4 w-full bg-emerald-900/5 rounded-full h-1 overflow-hidden">
              <div
                className="h-full bg-emerald-800 transition-all duration-200"
                style={{ width: `${Math.min(100, (progress / 2000) * 100)}%` }}
              />
            </div>
            <div className="text-[10px] font-mono text-emerald-800/70 mt-2">
              {progress} caratteri ricevuti
            </div>
          </>
        )}
      </div>
    );
  }

  const mc = quiz.multiple_choice || [];
  const tf = quiz.true_false || [];
  const open = quiz.open_questions || [];
  const flash = quiz.flashcards || [];

  const submit = () => {
    let correct = 0;
    let total = 0;
    mc.forEach((q, i) => {
      total++;
      if (answers[`mc-${i}`] === q.correct_index) correct++;
    });
    tf.forEach((q, i) => {
      total++;
      if (answers[`tf-${i}`] === q.answer) correct++;
    });
    const score = total > 0 ? Math.round((correct / total) * 100) : 0;
    setSubmitted(true);
    onComplete(score);
  };

  const tabs = [
    { k: "mc", l: "Multipla" },
    { k: "tf", l: "V/F" },
    { k: "open", l: "Aperte" },
    { k: "flash", l: "Flash" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-emerald-800">
          Quiz
        </div>
        <button
          onClick={onRegenerate}
          data-testid="quiz-regenerate"
          className="text-slate-400 hover:text-emerald-900 p-1"
        >
          <RotateCcw size={14} />
        </button>
      </div>
      <div className="flex gap-1 mb-4 border-b border-slate-900/10">
        {tabs.map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            data-testid={`quiz-tab-${t.k}`}
            className={`px-2 py-1.5 text-[11px] font-medium transition-colors border-b-2 ${
              tab === t.k
                ? "border-emerald-900 text-emerald-900"
                : "border-transparent text-slate-500 hover:text-emerald-900"
            }`}
          >
            {t.l}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
        >
          {/* ── Multiple Choice ── */}
          {tab === "mc" &&
            mc.map((q, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="mb-4 p-3 rounded-xl bg-white border border-slate-900/10"
              >
                <div className="text-sm font-medium text-slate-900 mb-2">
                  {i + 1}. {q.question}
                </div>
                <div className="space-y-1.5">
                  {q.options.map((opt, j) => {
                    const chosen = answers[`mc-${i}`] === j;
                    const correct = submitted && j === q.correct_index;
                    const wrong = submitted && chosen && j !== q.correct_index;
                    return (
                      <button
                        key={j}
                        onClick={() =>
                          !submitted && setAnswers((a) => ({ ...a, [`mc-${i}`]: j }))
                        }
                        className={`w-full text-left text-xs px-3 py-2 rounded-lg border transition-colors ${
                          correct
                            ? "border-emerald-800 bg-emerald-50 text-emerald-900"
                            : wrong
                            ? "border-red-600 bg-red-50 text-red-800"
                            : chosen
                            ? "border-emerald-800 bg-emerald-900/5 text-slate-900"
                            : "border-slate-900/10 hover:border-emerald-800 text-slate-700"
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {submitted && q.explanation && (
                  <div className="mt-2 text-xs text-slate-600 italic">
                    {q.explanation}
                  </div>
                )}
              </motion.div>
            ))}

          {/* ── True / False ── */}
          {tab === "tf" &&
            tf.map((q, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="mb-3 p-3 rounded-xl bg-white border border-slate-900/10"
              >
                <div className="text-sm text-slate-900 mb-2">{q.statement}</div>
                <div className="flex gap-2">
                  {[true, false].map((val) => {
                    const chosen = answers[`tf-${i}`] === val;
                    const correct = submitted && val === q.answer;
                    return (
                      <button
                        key={String(val)}
                        onClick={() =>
                          !submitted && setAnswers((a) => ({ ...a, [`tf-${i}`]: val }))
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          correct
                            ? "border-emerald-800 bg-emerald-50 text-emerald-900"
                            : chosen
                            ? "border-emerald-800 bg-emerald-900/5"
                            : "border-slate-900/10 hover:border-emerald-800 text-slate-700"
                        }`}
                      >
                        {val ? "Vero" : "Falso"}
                      </button>
                    );
                  })}
                </div>
                {submitted && q.explanation && (
                  <div className="mt-2 text-xs text-slate-600 italic">
                    {q.explanation}
                  </div>
                )}
              </motion.div>
            ))}

          {/* ── Open Questions ── */}
          {tab === "open" &&
            open.map((q, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="mb-3 p-3 rounded-xl bg-white border border-slate-900/10"
              >
                <div className="text-sm text-slate-900 mb-2">{q.question}</div>
                <div className="text-xs text-slate-500 italic mb-2">
                  Risposta modello:
                </div>
                <div className="text-xs text-emerald-900 bg-emerald-900/5 border border-emerald-900/10 p-2 rounded">
                  {q.sample_answer}
                </div>
                {q.key_points?.length > 0 && (
                  <div className="mt-2">
                    <div className="text-[10px] font-mono uppercase text-slate-500 mb-1">
                      Punti chiave
                    </div>
                    <ul className="text-xs text-slate-700 space-y-0.5">
                      {q.key_points.map((k, j) => (
                        <li key={j} className="flex gap-1">
                          <ChevronRight size={11} className="mt-0.5" />
                          {k}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            ))}

          {/* ── Flashcards (3D Flip) ── */}
          {tab === "flash" &&
            flash.map((c, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <Flashcard card={c} index={i} />
              </motion.div>
            ))}
        </motion.div>
      </AnimatePresence>

      {(tab === "mc" || tab === "tf") &&
        !submitted &&
        (mc.length > 0 || tf.length > 0) && (
          <button
            onClick={submit}
            data-testid="quiz-submit"
            className="w-full py-2.5 rounded-lg bg-emerald-900 text-[#FDFBF7] text-sm font-medium hover:bg-emerald-800 transition-colors mt-3"
          >
            Correggi quiz
          </button>
        )}
    </div>
  );
}
