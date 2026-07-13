import { Check, X } from "lucide-react";

export default function HaiCapitoBar({ onAnswer }) {
  return (
    <div className="border-t border-slate-900/10 bg-emerald-900/5 px-6 lg:px-10 py-3 flex items-center justify-center gap-3">
      <div className="text-xs font-mono uppercase tracking-[0.2em] text-emerald-900">
        Hai capito?
      </div>
      <button
        onClick={() => onAnswer(true)}
        data-testid="hai-capito-si"
        className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-900 text-[#FDFBF7] text-xs font-medium hover:bg-emerald-800 transition-colors"
      >
        <Check size={13} /> Sì, continua
      </button>
      <button
        onClick={() => onAnswer(false)}
        data-testid="hai-capito-no"
        className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white border border-slate-900/10 text-slate-700 text-xs font-medium hover:border-red-600 hover:text-red-700 transition-colors"
      >
        <X size={13} /> No, ripeti diversamente
      </button>
    </div>
  );
}
