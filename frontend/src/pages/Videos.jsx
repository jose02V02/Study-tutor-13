import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Search, Youtube, PlayCircle, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { searchVideos } from "@/lib/api";
import { VideoModal } from "@/components/VideosPanel";

const SUGGESTIONS = [
  "Fotosintesi clorofilliana",
  "Teorema di Pitagora",
  "Rivoluzione francese",
  "Divina Commedia Dante",
  "Struttura del DNA",
  "Guerra fredda",
  "Legge di Ohm",
  "Diritto romano",
  "Sistema solare",
  "Filosofia di Kant",
];

export default function Videos() {
  const [query, setQuery] = useState("");
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openVideo, setOpenVideo] = useState(null);
  const [lastQuery, setLastQuery] = useState("");
  const inputRef = useRef(null);

  const doSearch = async (q) => {
    const val = (q ?? query).trim();
    if (val.length < 2) {
      toast.error("Scrivi almeno 2 caratteri");
      return;
    }
    setLoading(true);
    setQuery(val);
    setLastQuery(val);
    try {
      const r = await searchVideos(val, 18);
      setVideos(r.videos || []);
    } catch (e) {
      toast.error(e.message || "Errore");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="pt-28 pb-24 px-6 lg:px-10 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="text-xs font-mono uppercase tracking-[0.25em] text-emerald-800 mb-3">
            Biblioteca video
          </div>
          <h1 className="font-heading text-5xl sm:text-6xl text-slate-900 tracking-tight mb-4">
            Videolezioni <em className="text-emerald-900">su misura</em>
          </h1>
          <p className="text-slate-600 max-w-xl mx-auto leading-relaxed">
            Trova le migliori spiegazioni video su YouTube per qualsiasi materia.
            Guarda direttamente qui senza distrazioni.
          </p>
        </div>

        {/* Search */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="flex items-center bg-white border border-slate-900/10 rounded-full shadow-xl shadow-emerald-900/10 pl-5 pr-2 py-2">
            <Search size={18} className="text-emerald-800 shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doSearch()}
              placeholder="Cerca una materia, un argomento…"
              data-testid="videos-main-input"
              className="flex-1 bg-transparent outline-none px-3 py-2 text-base placeholder:text-slate-400"
            />
            <button
              onClick={() => doSearch()}
              disabled={loading || !query.trim()}
              data-testid="videos-search-btn"
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-emerald-900 hover:bg-emerald-800 disabled:opacity-50 text-[#FDFBF7] text-sm font-medium transition-all hover:-translate-y-0.5"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              Cerca
            </button>
          </div>

          {/* Suggestions */}
          {videos.length === 0 && !loading && (
            <div className="mt-5">
              <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-2 text-center">
                Prova con:
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => doSearch(s)}
                    data-testid={`suggestion-${s.replace(/\s+/g, "-")}`}
                    className="px-3 py-1.5 rounded-full text-xs font-medium bg-white border border-slate-900/10 text-slate-700 hover:border-emerald-800 hover:text-emerald-900 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        {loading && (
          <div className="flex flex-col items-center py-16">
            <Loader2 className="animate-spin text-emerald-900 mb-3" size={28} />
            <div className="text-xs font-mono uppercase tracking-widest text-emerald-800">
              Cerco i migliori video…
            </div>
          </div>
        )}

        {!loading && videos.length > 0 && (
          <>
            <div className="text-xs text-slate-500 mb-6 font-mono uppercase tracking-widest">
              {videos.length} risultati per «{lastQuery}»
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {videos.map((v, i) => (
                <motion.button
                  key={v.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => setOpenVideo(v)}
                  data-testid={`videos-card-${v.id}`}
                  className="group text-left bg-white rounded-2xl overflow-hidden border border-slate-900/10 hover:border-emerald-900 hover:-translate-y-1 transition-all"
                >
                  <div className="relative aspect-video bg-slate-200">
                    <img src={v.thumbnail} alt="" className="w-full h-full object-cover" loading="lazy" />
                    <div className="absolute inset-0 grid place-items-center bg-slate-900/20 group-hover:bg-slate-900/40 transition-colors">
                      <PlayCircle className="text-white opacity-90 drop-shadow-lg" size={52} />
                    </div>
                    {v.duration && (
                      <div className="absolute bottom-2 right-2 bg-slate-900/85 text-white text-xs px-2 py-0.5 rounded font-mono">
                        {v.duration}
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-800 mb-1 truncate">
                      {v.channel}
                    </div>
                    <div className="text-sm font-medium text-slate-900 line-clamp-2 leading-snug min-h-[2.5rem]">
                      {v.title}
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-[10px] font-mono text-slate-500">
                      {v.views && <span>{v.views}</span>}
                      {v.publish_time && <><span>·</span><span>{v.publish_time}</span></>}
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </>
        )}

        {!loading && videos.length === 0 && lastQuery && (
          <div className="text-center py-16">
            <div className="font-heading text-2xl text-slate-900 mb-2">Nessun risultato</div>
            <p className="text-sm text-slate-600">Prova con parole chiave diverse.</p>
          </div>
        )}
      </div>

      <VideoModal video={openVideo} onClose={() => setOpenVideo(null)} />
    </div>
  );
}
