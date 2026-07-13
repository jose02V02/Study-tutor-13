import { Loader2, Timer, TrendingUp, Sparkles, RotateCcw } from "lucide-react";

export default function StudyPlanPanel({ plan, progress = 0 }) {
  if (!plan) {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <Loader2 className="animate-spin text-emerald-900 mb-3" />
        <div className="text-xs text-slate-500 font-mono uppercase tracking-widest">Preparazione piano…</div>
        {progress > 0 && (
          <>
            <div className="mt-4 w-full bg-emerald-900/5 rounded-full h-1 overflow-hidden">
              <div
                className="h-full bg-emerald-800 transition-all duration-200"
                style={{ width: `${Math.min(100, (progress / 1000) * 100)}%` }}
              />
            </div>
            <div className="text-[10px] font-mono text-emerald-800/70 mt-2">
              {progress} caratteri
            </div>
          </>
        )}
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-emerald-800">Piano di studio</div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-white border border-slate-900/10">
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 flex items-center gap-1"><Timer size={11}/> Tempo</div>
          <div className="font-heading text-2xl text-slate-900">{plan.study_time_minutes}m</div>
        </div>
        <div className="p-3 rounded-xl bg-white border border-slate-900/10">
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 flex items-center gap-1"><TrendingUp size={11}/> Livello</div>
          <div className="font-heading text-lg text-slate-900 capitalize">{plan.current_level}</div>
        </div>
      </div>

      {plan.review_topics?.length > 0 && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-900/10">
          <div className="text-[10px] font-mono uppercase text-amber-800 mb-2 flex items-center gap-1"><RotateCcw size={11}/> Da ripassare</div>
          <ul className="text-xs text-slate-800 space-y-1">
            {plan.review_topics.map((t, i) => <li key={i}>• {t}</li>)}
          </ul>
        </div>
      )}

      {plan.next_topics?.length > 0 && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-900/10">
          <div className="text-[10px] font-mono uppercase text-emerald-800 mb-2 flex items-center gap-1"><Sparkles size={11}/> Prossimi argomenti</div>
          <ul className="text-xs text-slate-800 space-y-1">
            {plan.next_topics.map((t, i) => <li key={i}>• {t}</li>)}
          </ul>
        </div>
      )}

      {plan.spaced_repetition_schedule?.length > 0 && (
        <div className="p-3 rounded-xl bg-white border border-slate-900/10">
          <div className="text-[10px] font-mono uppercase text-slate-600 mb-2">Ripetizione dilazionata</div>
          <ul className="text-xs space-y-1.5">
            {plan.spaced_repetition_schedule.map((s, i) => (
              <li key={i} className="flex items-center justify-between text-slate-700">
                <span className="truncate mr-2">{s.topic}</span>
                <span className="font-mono text-emerald-900 shrink-0">+{s.review_after_days}g</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
