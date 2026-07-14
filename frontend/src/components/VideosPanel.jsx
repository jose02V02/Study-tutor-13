import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PlayCircle, X, Youtube, Loader2, Sparkles, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { searchVideos, videosForLesson, ingestUrl } from "@/lib/api";

export default function VideosPanel({ sid, initialQuery = "", level = "universitario" }) {
  const [query, setQuery] = useState(initialQuery);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openVideo, setOpenVideo] = useState(null);

  const loadForLesson = async () => {
    setLoading(true);
    try {
      const r = await videosForLesson(sid);
      setVideos(r.videos || []);
      setQuery(r.query || "");
    } catch (e) {
      toast.error(e.message || "Errore");
    } finally {
      setLoading(false);
    }
  };

  const doSearch = async (q) => {
    const val = (q ?? query).trim();
    if (val.length < 2) return;
    setLoading(true);
    try {
      const r = await searchVideos(val);
      setVideos(r.videos || []);
    } catch (e) {
      toast.error(e.message || "Errore");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sid && !initialQuery) loadForLesson();
    else if (initialQuery) doSearch(initialQuery);
    // eslint-disable-next-line
  }, [sid]);

  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-emerald-800 mb-3 flex items-center gap-1.5">
        <Youtube size={12} /> Video correlati
      </div>

      <div className="flex gap-1.5 mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && doSearch()}
          placeholder="Cerca argomento…"
          data-testid="video-search-input"
          className="flex-1 bg-white border border-slate-900/10 rounded-lg px-3 py-2 text-xs outline-none focus:border-emerald-800"
        />
        <button
          onClick={() => doSearch()}
          disabled={loading}
          data-testid="video-search-btn"
          className="px-3 py-2 rounded-lg bg-emerald-900 hover:bg-emerald-800 text-[#FDFBF7] text-xs font-medium disabled:opacity-50"
        >
          Cerca
        </button>
      </div>

      {loading && (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin text-emerald-900" size={20} />
        </div>
      )}

      {!loading && videos.length === 0 && (
        <div className="text-xs text-slate-500 italic py-8 text-center">
          Nessun video trovato.
        </div>
      )}

      <div className="space-y-3">
        {videos.map((v) => (
          <button
            key={v.id}
            onClick={() => setOpenVideo(v)}
            data-testid={`video-${v.id}`}
            className="w-full flex gap-2.5 p-2 rounded-xl hover:bg-emerald-900/5 border border-transparent hover:border-emerald-900/10 transition-all text-left group"
          >
            <div className="relative w-24 h-16 shrink-0 rounded-lg overflow-hidden bg-slate-200">
              <img src={v.thumbnail} alt="" className="w-full h-full object-cover" loading="lazy" />
              <div className="absolute inset-0 grid place-items-center bg-slate-900/30 group-hover:bg-slate-900/50 transition-colors">
                <PlayCircle className="text-white opacity-90" size={24} />
              </div>
              {v.duration && (
                <div className="absolute bottom-1 right-1 bg-slate-900/85 text-white text-[9px] px-1 py-0.5 rounded font-mono">
                  {v.duration}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-slate-900 line-clamp-2 leading-snug">
                {v.title}
              </div>
              <div className="text-[10px] text-slate-500 mt-1 truncate">{v.channel}</div>
              {v.views && (
                <div className="text-[10px] font-mono text-slate-400 mt-0.5">{v.views}</div>
              )}
            </div>
          </button>
        ))}
      </div>

      <VideoModal video={openVideo} onClose={() => setOpenVideo(null)} level={level} />
    </div>
  );
}

export function VideoModal({ video, onClose, level = "universitario" }) {
  const [transforming, setTransforming] = useState(false);
  const navigate = useNavigate();

  if (!video) return null;

  const transform = async () => {
    setTransforming(true);
    const tid = toast.loading("Il Maestro sta trascrivendo il video…", { duration: 60000 });
    try {
      const res = await ingestUrl({ url: video.url, level });
      toast.success("Lezione creata!", { id: tid });
      onClose();
      navigate(`/aula/${res.session_id}`);
    } catch (e) {
      toast.error(e.message || "Impossibile trasformare il video", { id: tid });
    } finally {
      setTransforming(false);
    }
  };

  return (
    <AnimatePresence>
      {video && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-3xl z-50"
            data-testid="video-modal"
          >
            <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 shadow-2xl">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0 pr-4">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 mb-0.5">
                    {video.channel}
                  </div>
                  <div className="text-sm text-white font-medium truncate">{video.title}</div>
                </div>
                <button
                  onClick={onClose}
                  className="text-slate-400 hover:text-white p-1 shrink-0"
                  aria-label="Chiudi"
                  data-testid="video-modal-close"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="aspect-video bg-black">
                <iframe
                  src={`${video.embed_url}?autoplay=1&rel=0`}
                  title={video.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
              <div className="px-4 py-3 flex flex-wrap items-center gap-3 justify-between">
                <a
                  href={video.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300"
                >
                  <Youtube size={13} /> Apri su YouTube
                </a>
                <button
                  onClick={transform}
                  disabled={transforming}
                  data-testid="video-transform-btn"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-700 hover:bg-emerald-600 disabled:opacity-60 text-white text-xs font-medium transition-all hover:-translate-y-0.5 shadow-lg shadow-emerald-900/40"
                >
                  {transforming ? (
                    <><Loader2 size={13} className="animate-spin" /> Trasformo…</>
                  ) : (
                    <><GraduationCap size={13} /> Trasforma in lezione</>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
