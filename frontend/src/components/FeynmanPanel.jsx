import { useState } from "react";
import { Loader2, Award } from "lucide-react";

export default function FeynmanPanel({ onSubmit, topic }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handle = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setProgress(0);
    try {
      const r = await onSubmit(text, (delta) => setProgress((p) => p + delta.length));
      setResult(r);
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-emerald-800 mb-3">Metodo Feynman</div>
      <p className="text-sm text-slate-700 mb-3">
        Adesso prova a spiegarmi <em className="text-emerald-900 font-medium">"{topic}"</em> con parole tue,
        come se lo dicessi a un amico.
      </p>
      <textarea
        data-testid="feynman-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        placeholder="Spiega qui la tua comprensione…"
        className="w-full bg-white border border-slate-900/10 rounded-xl p-3 text-sm outline-none focus:border-emerald-800 resize-none"
      />
      <button
        onClick={handle}
        disabled={loading || !text.trim()}
        data-testid="feynman-submit"
        className="w-full mt-3 py-2.5 rounded-lg bg-emerald-900 text-[#FDFBF7] text-sm font-medium hover:bg-emerald-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Award size={14} />}
        Valuta la mia spiegazione
      </button>
      {loading && progress > 0 && (
        <div className="mt-3">
          <div className="w-full bg-emerald-900/5 rounded-full h-1 overflow-hidden">
            <div
              className="h-full bg-emerald-800 transition-all duration-200"
              style={{ width: `${Math.min(100, (progress / 500) * 100)}%` }}
            />
          </div>
          <div className="text-[10px] font-mono text-emerald-800/70 mt-1 text-center">
            Il Maestro sta valutando… ({progress} caratteri)
          </div>
        </div>
      )}

      {result && (
        <div className="mt-5 space-y-3">
          <div className="p-4 rounded-xl bg-emerald-900 text-[#FDFBF7]">
            <div className="text-[10px] font-mono uppercase tracking-widest opacity-70">Punteggio</div>
            <div className="font-heading text-4xl">{result.score}<span className="text-lg opacity-70">/100</span></div>
          </div>
          {result.feedback && (
            <div className="text-sm text-slate-800 p-3 rounded-xl bg-white border border-slate-900/10">
              {result.feedback}
            </div>
          )}
          {result.strengths?.length > 0 && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-900/10">
              <div className="text-[10px] font-mono uppercase text-emerald-800 mb-1">Punti forti</div>
              <ul className="text-xs text-slate-700 space-y-0.5">
                {result.strengths.map((s, i) => <li key={i}>• {s}</li>)}
              </ul>
            </div>
          )}
          {result.missing?.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-900/10">
              <div className="text-[10px] font-mono uppercase text-amber-800 mb-1">Concetti mancanti</div>
              <ul className="text-xs text-slate-700 space-y-0.5">
                {result.missing.map((s, i) => <li key={i}>• {s}</li>)}
              </ul>
            </div>
          )}
          {result.confused?.length > 0 && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-900/10">
              <div className="text-[10px] font-mono uppercase text-red-800 mb-1">Punti confusi</div>
              <ul className="text-xs text-slate-700 space-y-0.5">
                {result.confused.map((s, i) => <li key={i}>• {s}</li>)}
              </ul>
            </div>
          )}
          {result.review?.length > 0 && (
            <div className="p-3 rounded-xl bg-slate-100 border border-slate-900/10">
              <div className="text-[10px] font-mono uppercase text-slate-700 mb-1">Da ripassare</div>
              <ul className="text-xs text-slate-700 space-y-0.5">
                {result.review.map((s, i) => <li key={i}>• {s}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
