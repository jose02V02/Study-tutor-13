import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Maximize2 } from "lucide-react";

export default function MindMap({ data, sid }) {
  if (!data || !data.root) {
    return <div className="text-xs text-slate-500 italic">Mappa non disponibile.</div>;
  }
  return (
    <div>
      {/* Header row with title + full-page link */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-emerald-800">
          Mappa concettuale
        </div>
        {sid && (
          <Link
            to={`/map/${sid}`}
            data-testid="open-fullmap"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-widest bg-emerald-900 text-[#FDFBF7] hover:bg-emerald-800 transition-all hover:-translate-y-0.5 shadow-sm shadow-emerald-900/20"
          >
            <Maximize2 size={10} />
            Schermo intero
          </Link>
        )}
      </div>

      {/* Root node */}
      <div className="flex justify-center mb-6">
        <div className="px-4 py-2.5 rounded-xl bg-emerald-900 text-[#FDFBF7] font-heading text-lg text-center shadow-lg shadow-emerald-900/20">
          {data.root}
        </div>
      </div>

      {/* Branches */}
      <div className="space-y-4">
        {(data.branches || []).map((b, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <div className="border-l-2 border-emerald-800 pl-3">
              <div className="border-2 border-emerald-800 rounded-lg px-3 py-2 bg-white text-sm font-semibold text-slate-900 inline-block">
                {b.label}
              </div>
              <div className="mt-2 pl-4 space-y-1">
                {(b.children || []).map((c, j) => (
                  <div
                    key={j}
                    className="text-xs px-3 py-1.5 rounded-md bg-emerald-900/5 border border-emerald-900/10 text-slate-700 inline-block mr-2 mb-1"
                  >
                    {typeof c === "string" ? c : c.label || String(c)}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
