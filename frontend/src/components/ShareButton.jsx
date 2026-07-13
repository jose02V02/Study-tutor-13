import { useEffect, useState } from "react";
import { Share2, Link as LinkIcon, Copy, Check, X, Loader2, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { enableShare, disableShare } from "@/lib/api";

export default function ShareButton({ sid, initialSlug }) {
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState(initialSlug || null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => setSlug(initialSlug || null), [initialSlug]);

  const shareUrl = slug ? `${window.location.origin}/l/${slug}` : "";

  const enable = async () => {
    setBusy(true);
    try {
      const r = await enableShare(sid);
      setSlug(r.slug);
      toast.success("Link pubblico creato!");
    } catch (e) {
      toast.error(e.message || "Errore");
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    if (!confirm("Revocare il link pubblico? Chi ha il link non potrà più aprire la lezione.")) return;
    setBusy(true);
    try {
      await disableShare(sid);
      setSlug(null);
      toast.success("Link revocato");
    } catch (e) {
      toast.error(e.message || "Errore");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Link copiato!");
    } catch {
      // Fallback for older browsers
      const el = document.createElement("textarea");
      el.value = shareUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Lezione su inteligent STUDY",
          text: "Guarda questa lezione che ho preparato con il Maestro AI",
          url: shareUrl,
        });
      } catch (e) {
        // User cancelled
      }
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        data-testid="share-btn"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-900/10 hover:border-emerald-800 hover:text-emerald-900 text-xs font-medium text-slate-700 transition-colors"
        aria-label="Condividi lezione"
      >
        <Share2 size={13} />
        <span className="hidden sm:inline">Condividi</span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-white rounded-3xl border border-slate-900/10 shadow-2xl shadow-emerald-900/20 z-50 overflow-hidden"
              data-testid="share-modal"
            >
              <div className="px-6 pt-6 pb-4 flex items-start justify-between">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-emerald-800 mb-1">
                    Condividi lezione
                  </div>
                  <h3 className="font-heading text-2xl text-slate-900 leading-tight">
                    Link pubblico<br />
                    <em className="text-emerald-900">read-only</em>
                  </h3>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="text-slate-400 hover:text-slate-900 p-1"
                  aria-label="Chiudi"
                  data-testid="share-close"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="px-6 pb-6">
                {!slug ? (
                  <>
                    <p className="text-sm text-slate-600 leading-relaxed mb-5">
                      Genera un link che permette a chiunque di leggere la lezione
                      (capitoli, spiegazioni del Maestro, mappa, quiz) senza modificarla e
                      senza vedere le tue note personali.
                    </p>
                    <button
                      onClick={enable}
                      disabled={busy}
                      data-testid="share-enable"
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-900 hover:bg-emerald-800 disabled:opacity-50 text-[#FDFBF7] font-medium text-sm shadow-lg shadow-emerald-900/20 transition-all hover:-translate-y-0.5"
                    >
                      {busy ? <Loader2 size={16} className="animate-spin" /> : <LinkIcon size={16} />}
                      Genera link pubblico
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-slate-600 leading-relaxed mb-4">
                      Chiunque riceva questo link potrà aprire la lezione in modalità lettura:
                    </p>
                    <div className="bg-emerald-900/5 border border-emerald-900/15 rounded-xl p-3 mb-4 break-all font-mono text-xs text-emerald-900">
                      {shareUrl}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={copy}
                        data-testid="share-copy"
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-900 hover:bg-emerald-800 text-[#FDFBF7] text-sm font-medium transition-colors"
                      >
                        {copied ? <><Check size={15} /> Copiato!</> : <><Copy size={15} /> Copia link</>}
                      </button>
                      {typeof navigator !== "undefined" && navigator.share && (
                        <button
                          onClick={shareNative}
                          data-testid="share-native"
                          className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white border border-slate-900/10 hover:border-emerald-800 text-sm font-medium text-slate-700 transition-colors"
                        >
                          <Share2 size={14} /> Condividi
                        </button>
                      )}
                    </div>
                    <button
                      onClick={disable}
                      disabled={busy}
                      data-testid="share-disable"
                      className="w-full mt-3 flex items-center justify-center gap-1.5 py-2 text-xs text-slate-500 hover:text-red-700 transition-colors"
                    >
                      <Trash2 size={12} /> Revoca link
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
