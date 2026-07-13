import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BookOpen, Clock, Trophy, TrendingUp, AlertTriangle, CheckCircle2,
  ArrowRight, Trash2, Plus,
} from "lucide-react";
import { getDashboard, deleteSession, listSessions } from "@/lib/api";
import { toast } from "sonner";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const d = await getDashboard();
      setData(d);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const onDelete = async (id) => {
    if (!confirm("Eliminare questa lezione?")) return;
    await deleteSession(id);
    toast.success("Eliminata");
    load();
  };

  if (loading) return <div className="min-h-screen grid place-items-center text-emerald-900">Caricamento…</div>;
  if (!data) return null;

  const stats = [
    { icon: Clock, label: "Ore studiate", value: `${data.hours_studied}h`, tint: "bg-emerald-900/5 text-emerald-900" },
    { icon: BookOpen, label: "Lezioni totali", value: data.total_sessions, tint: "bg-amber-900/5 text-amber-800" },
    { icon: CheckCircle2, label: "Capitoli completati", value: data.chapters_completed, tint: "bg-emerald-900/5 text-emerald-900" },
    { icon: TrendingUp, label: "Comprensione media", value: `${data.avg_comprehension}%`, tint: "bg-slate-900/5 text-slate-900" },
  ];

  return (
    <div className="pt-28 pb-24 px-6 lg:px-10 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-12 gap-4">
          <div>
            <div className="text-xs font-mono uppercase tracking-[0.25em] text-emerald-800 mb-3">
              Il tuo percorso
            </div>
            <h1 className="font-heading text-5xl sm:text-6xl text-slate-900 tracking-tight">
              Dashboard <span className="italic text-emerald-900">Maestro</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-5 py-3 rounded-2xl bg-emerald-900 text-[#FDFBF7]">
              <div className="text-[10px] font-mono uppercase tracking-[0.2em] opacity-80">Livello</div>
              <div className="font-heading text-2xl leading-tight">{data.level_name}</div>
            </div>
            <Link
              to="/"
              data-testid="new-lesson-btn"
              className="px-5 py-3 rounded-2xl bg-white border border-slate-900/10 hover:border-emerald-900 text-sm font-medium flex items-center gap-2 hover:-translate-y-0.5 transition-all"
            >
              <Plus size={16} /> Nuova lezione
            </Link>
          </div>
        </div>

        {/* Stats bento */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-6 rounded-2xl bg-white border border-slate-900/10"
              data-testid={`stat-${i}`}
            >
              <div className={`w-10 h-10 rounded-xl grid place-items-center mb-4 ${s.tint}`}>
                <s.icon size={18} />
              </div>
              <div className="font-heading text-3xl text-slate-900">{s.value}</div>
              <div className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-mono">
                {s.label}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent sessions */}
          <div className="lg:col-span-2 bg-white border border-slate-900/10 rounded-2xl p-6">
            <h2 className="font-heading text-2xl text-slate-900 mb-5">Lezioni recenti</h2>
            <div className="space-y-2">
              {data.recent_sessions.length === 0 && (
                <div className="text-sm text-slate-500 py-8 text-center">
                  Nessuna lezione ancora. <Link to="/" className="text-emerald-900 underline">Iniziane una</Link>.
                </div>
              )}
              {data.recent_sessions.map((s) => (
                <div
                  key={s.id}
                  className="group flex items-center justify-between p-3 rounded-xl hover:bg-emerald-900/5 transition-colors"
                  data-testid={`recent-${s.id}`}
                >
                  <Link to={`/aula/${s.id}`} className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 truncate">{s.title}</div>
                    <div className="text-xs text-slate-500 font-mono uppercase tracking-widest mt-1">
                      {s.level} · Cap. {s.chapters_completed}/{s.chapters_total} · {s.comprehension}%
                    </div>
                  </Link>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onDelete(s.id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      data-testid={`delete-${s.id}`}
                    >
                      <Trash2 size={14} />
                    </button>
                    <Link
                      to={`/aula/${s.id}`}
                      className="p-2 rounded-lg text-emerald-900 hover:bg-emerald-900 hover:text-[#FDFBF7] transition-colors"
                    >
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Weak / Understood */}
          <div className="space-y-4">
            <div className="bg-white border border-slate-900/10 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle size={16} className="text-amber-700" />
                <h3 className="font-heading text-xl text-slate-900">Punti deboli</h3>
              </div>
              {data.weak_topics.length === 0 ? (
                <div className="text-xs text-slate-500 italic">Nessuno per ora.</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {data.weak_topics.map((t, i) => (
                    <span key={i} className="text-xs px-2 py-1 rounded-full bg-amber-900/5 border border-amber-900/10 text-amber-900">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-white border border-slate-900/10 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Trophy size={16} className="text-emerald-800" />
                <h3 className="font-heading text-xl text-slate-900">Argomenti padroneggiati</h3>
              </div>
              {data.understood_topics.length === 0 ? (
                <div className="text-xs text-slate-500 italic">Continua a studiare!</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {data.understood_topics.map((t, i) => (
                    <span key={i} className="text-xs px-2 py-1 rounded-full bg-emerald-900/5 border border-emerald-900/10 text-emerald-900">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
