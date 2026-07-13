import { useEffect, useState } from "react";
import { Download, X, Smartphone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const DISMISSED_KEY = "istudy_install_dismissed_at";
const DISMISS_MS = 1000 * 60 * 60 * 24 * 7; // 7 giorni

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    // Skip if already installed (standalone)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    if (isStandalone) return;

    const dismissedAt = Number(localStorage.getItem(DISMISSED_KEY) || 0);
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_MS) return;

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isIOS) {
      // Show a manual hint after a delay (iOS doesn't support beforeinstallprompt)
      const t = setTimeout(() => {
        setIosHint(true);
        setVisible(true);
      }, 6000);
      return () => clearTimeout(t);
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setVisible(false);
    }
    setDeferredPrompt(null);
  };

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-sm z-50"
          data-testid="install-prompt"
        >
          <div className="bg-white/95 backdrop-blur-xl border border-slate-900/10 rounded-2xl shadow-2xl shadow-emerald-900/15 p-4 flex items-start gap-3">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-emerald-900 text-[#FDFBF7] grid place-items-center">
              <Smartphone size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-heading text-lg text-slate-900 leading-tight mb-0.5">
                Installa <em className="text-emerald-900">inteligent STUDY</em>
              </div>
              {iosHint ? (
                <div className="text-xs text-slate-600 leading-relaxed">
                  Tocca <strong>Condividi</strong> in Safari, poi <strong>Aggiungi alla schermata Home</strong>.
                </div>
              ) : (
                <div className="text-xs text-slate-600 leading-relaxed">
                  Aggiungila alla schermata Home per accedere al Maestro con un tocco.
                </div>
              )}
              <div className="flex items-center gap-2 mt-3">
                {!iosHint && (
                  <button
                    onClick={install}
                    data-testid="install-btn"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-900 hover:bg-emerald-800 text-[#FDFBF7] text-xs font-medium transition-colors"
                  >
                    <Download size={12} /> Installa
                  </button>
                )}
                <button
                  onClick={dismiss}
                  data-testid="install-dismiss"
                  className="text-xs text-slate-500 hover:text-slate-900 px-2 py-1.5 transition-colors"
                >
                  Non ora
                </button>
              </div>
            </div>
            <button
              onClick={dismiss}
              className="text-slate-400 hover:text-slate-700 p-1 -mr-1 -mt-1"
              aria-label="Chiudi"
            >
              <X size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
