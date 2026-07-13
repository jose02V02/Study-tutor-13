import { motion } from "framer-motion";

export default function MindMap({ data }) {
  if (!data || !data.root) {
    return <div className="text-xs text-slate-500 italic">Mappa non disponibile.</div>;
  }
  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-emerald-800 mb-4">
        Mappa concettuale
      </div>
      <div className="flex justify-center mb-6">
        <div className="px-4 py-2.5 rounded-xl bg-emerald-900 text-[#FDFBF7] font-heading text-lg text-center shadow-lg shadow-emerald-900/20">
          {data.root}
        </div>
      </div>
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
                    {c}
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
