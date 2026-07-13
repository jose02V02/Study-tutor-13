import { useEffect, useRef, useState } from "react";
import { Download, FileText, FileJson, FileType, FileCode, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { downloadExport } from "@/lib/api";

const FORMATS = [
  { key: "pdf", label: "PDF", desc: "Impaginato, pronto da stampare", icon: FileType },
  { key: "docx", label: "Word (.docx)", desc: "Modificabile con Word / Pages", icon: FileText },
  { key: "md", label: "Markdown", desc: "Per Obsidian, Notion, ecc.", icon: FileCode },
  { key: "txt", label: "Testo (.txt)", desc: "Solo testo, universale", icon: FileText },
  { key: "json", label: "JSON", desc: "Dati grezzi della lezione", icon: FileJson },
];

export default function ExportMenu({ sid }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const handle = async (fmt) => {
    setBusy(fmt);
    try {
      await downloadExport(sid, fmt);
      toast.success(`Lezione scaricata in ${fmt.toUpperCase()}`);
      setOpen(false);
    } catch (e) {
      toast.error(e.message || "Download fallito");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        data-testid="export-btn"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-900/10 hover:border-emerald-800 hover:text-emerald-900 text-xs font-medium text-slate-700 transition-colors"
        aria-label="Esporta lezione"
      >
        <Download size={13} />
        <span className="hidden sm:inline">Scarica</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl border border-slate-900/10 shadow-2xl shadow-emerald-900/10 overflow-hidden z-30"
            data-testid="export-menu"
          >
            <div className="px-4 py-3 border-b border-slate-900/10">
              <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-emerald-800">
                Esporta lezione
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Include capitoli, chat, quiz e note
              </div>
            </div>
            <div className="py-1">
              {FORMATS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => handle(f.key)}
                  disabled={busy === f.key}
                  data-testid={`export-${f.key}`}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-emerald-900/5 transition-colors text-left disabled:opacity-50"
                >
                  <div className="w-9 h-9 rounded-lg bg-emerald-900/10 text-emerald-900 grid place-items-center shrink-0">
                    {busy === f.key ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <f.icon size={16} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900">{f.label}</div>
                    <div className="text-[11px] text-slate-500 truncate">{f.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
