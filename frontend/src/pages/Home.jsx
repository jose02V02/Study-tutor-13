import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Upload, Link2, Youtube, FileText, Sparkles, ArrowRight, Loader2,
  BookOpen, Brain, Target, Timer, Layers, Compass,
} from "lucide-react";
import { ingestUrl, ingestFile } from "@/lib/api";

const LEVELS = [
  { key: "bambino", label: "Bambino (10 anni)" },
  { key: "superiori", label: "Scuole superiori" },
  { key: "universitario", label: "Universitario" },
  { key: "esperto", label: "Esperto" },
  { key: "tecnico", label: "Linguaggio tecnico" },
  { key: "semplice", label: "Linguaggio semplice" },
];

const FORMATS = [
  "YouTube", "Vimeo", "URL", "PDF", "Word", "PowerPoint",
  "EPUB", "Testo", "Audio", "Podcast", "Immagini OCR",
];

const FEATURES = [
  { icon: Brain, title: "Modalità Maestro", desc: "L'AI monitora la tua comprensione in tempo reale e attiva la ripetizione dilazionata." },
  { icon: Target, title: "Comprensione attiva", desc: "'Hai capito?' periodici. Se dici di no, il tutor cambia metodo — non ripete." },
  { icon: Layers, title: "Mappe concettuali", desc: "Struttura visiva dell'argomento con nodi, rami e collegamenti automatici." },
  { icon: BookOpen, title: "Quiz intelligenti", desc: "Multiple choice, V/F, aperte, flashcard e domande orali con correzione." },
  { icon: Compass, title: "Metodo Feynman", desc: "'Adesso prova a spiegarmelo tu.' Il tutor valuta e indica le lacune." },
  { icon: Timer, title: "Piano di studio", desc: "Argomenti da ripassare, tempo stimato, difficoltà e prossimi passi." },
];

export default function Home() {
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [level, setLevel] = useState("universitario");
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  const isUrl = /^https?:\/\/\S+$/i.test(input.trim());

  const handleIngest = async () => {
    const val = input.trim();
    if (!val) {
      toast.error("Incolla un link o del testo per iniziare");
      return;
    }
    setLoading(true);
    setLoadingStage("Analisi contenuto in corso…");
    try {
      const res = isUrl
        ? await ingestUrl({ url: val, level })
        : await ingestUrl({ text: val, level });
      toast.success("Lezione creata!");
      navigate(`/aula/${res.session_id}`);
    } catch (e) {
      toast.error(e.message || "Errore");
    } finally {
      setLoading(false);
      setLoadingStage("");
    }
  };

  const handleFile = async (file) => {
    if (!file) return;
    setLoading(true);
    setLoadingStage(`Elaborazione ${file.name}…`);
    try {
      const res = await ingestFile(file, level);
      toast.success("Lezione creata!");
      navigate(`/aula/${res.session_id}`);
    } catch (e) {
      toast.error(e.message || "Errore upload");
    } finally {
      setLoading(false);
      setLoadingStage("");
    }
  };

  return (
    <>
      {/* HERO */}
      <section className="relative pt-32 pb-24 px-6 lg:px-10 overflow-hidden">
        <div
          className="absolute inset-0 -z-10 opacity-[0.08]"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1579097380689-4351e0a200ed?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1NzZ8MHwxfHNlYXJjaHwxfHxsaWJyYXJ5JTIwYXJjaGl0ZWN0dXJlJTIwd2FybSUyMGxpZ2h0fGVufDB8fHx8MTc4MzkyMTIyMnww&ixlib=rb-4.1.0&q=85')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/70 backdrop-blur-md border border-slate-900/10 shadow-sm mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-700 animate-pulse" />
              <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-emerald-900">
                Modalità Maestro · powered by Claude
              </span>
            </div>
            <h1 className="font-heading text-5xl sm:text-6xl lg:text-7xl leading-[0.95] tracking-tight text-slate-900">
              Non un riassuntore.<br />
              <span className="italic text-emerald-900">Un vero maestro</span> che ti insegna
              <br />
              <span className="text-slate-900/70">fino a quando capisci.</span>
            </h1>
            <p className="mt-8 text-base sm:text-lg text-slate-700 max-w-2xl mx-auto leading-relaxed">
              Incolla un link, un PDF, un video YouTube o un audio. L'AI costruisce una lezione
              personalizzata con spiegazioni, mappe concettuali, quiz e metodo Feynman.
            </p>
          </motion.div>

          {/* ONE BIG BAR */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="mt-12"
          >
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
              }}
              className={`relative bg-white rounded-3xl border transition-all shadow-2xl shadow-emerald-900/10 ${
                dragOver ? "border-emerald-700 ring-4 ring-emerald-700/10" : "border-slate-900/10"
              }`}
            >
              <div className="flex flex-col md:flex-row items-stretch p-3 gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-0 px-4">
                  {isUrl ? (
                    <Link2 size={20} className="text-emerald-800 shrink-0" />
                  ) : (
                    <FileText size={20} className="text-emerald-800 shrink-0" />
                  )}
                  <input
                    data-testid="main-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !loading && handleIngest()}
                    placeholder="Incolla un link (YouTube, articolo…) oppure del testo"
                    className="flex-1 bg-transparent outline-none text-base sm:text-lg py-4 placeholder:text-slate-400"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    data-testid="level-select"
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className="bg-emerald-50 border border-emerald-900/10 text-emerald-900 text-sm font-medium rounded-2xl px-4 py-3 outline-none cursor-pointer hover:bg-emerald-100 transition-colors"
                  >
                    {LEVELS.map((l) => (
                      <option key={l.key} value={l.key}>{l.label}</option>
                    ))}
                  </select>
                  <button
                    data-testid="upload-btn"
                    onClick={() => fileRef.current?.click()}
                    className="hidden sm:flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-white border border-slate-900/10 hover:border-emerald-800 hover:text-emerald-900 text-sm font-medium text-slate-700 transition-colors"
                  >
                    <Upload size={16} /> File
                  </button>
                  <button
                    data-testid="ingest-btn"
                    onClick={handleIngest}
                    disabled={loading || !input.trim()}
                    className="flex items-center gap-2 px-5 sm:px-6 py-3 rounded-2xl bg-emerald-900 hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-[#FDFBF7] font-medium text-sm shadow-lg shadow-emerald-900/20 transition-all hover:-translate-y-0.5"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    Insegnamelo
                  </button>
                </div>
              </div>

              <input
                ref={fileRef}
                type="file"
                data-testid="file-input"
                onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
                className="hidden"
                accept=".pdf,.docx,.pptx,.epub,.txt,.md,.png,.jpg,.jpeg,.webp,.mp3,.wav,.m4a,.ogg,.flac,.mp4,.webm"
              />
            </div>

            {loading && (
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-emerald-900">
                <Loader2 size={14} className="animate-spin" />
                <span className="font-mono uppercase tracking-widest text-xs">{loadingStage}</span>
              </div>
            )}

            <p className="mt-3 text-xs text-slate-500 sm:hidden">Tocca <span className="font-semibold">File</span> per caricare un documento</p>
          </motion.div>

          {/* Marquee formats */}
          <div className="mt-16 overflow-hidden relative">
            <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#FDFBF7] to-transparent z-10" />
            <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#FDFBF7] to-transparent z-10" />
            <div className="marquee-track flex gap-8 whitespace-nowrap">
              {[...FORMATS, ...FORMATS, ...FORMATS].map((f, i) => (
                <span key={i} className="text-xs font-mono uppercase tracking-[0.25em] text-slate-500">
                  {f} <span className="mx-4 text-emerald-800/50">✦</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES / COME FUNZIONA */}
      <section id="come-funziona" className="px-6 lg:px-10 py-24 bg-white border-y border-slate-900/10">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-14">
            <div className="max-w-2xl">
              <div className="text-xs font-mono uppercase tracking-[0.25em] text-emerald-800 mb-3">
                Il metodo
              </div>
              <h2 className="font-heading text-4xl sm:text-5xl text-slate-900 tracking-tight">
                Sei fasi per imparare<br />
                <span className="italic text-emerald-900">davvero</span>, non memorizzare.
              </h2>
            </div>
            <p className="text-slate-600 max-w-md leading-relaxed">
              Ispirato al metodo Feynman, alla ripetizione dilazionata di Ebbinghaus e alla
              pedagogia socratica.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="group border border-slate-900/10 rounded-2xl p-8 bg-[#FDFBF7] hover:border-emerald-900 hover:-translate-y-1 transition-all"
                data-testid={`feature-${i}`}
              >
                <div className="w-11 h-11 rounded-xl bg-emerald-900/10 grid place-items-center text-emerald-900 mb-5 group-hover:bg-emerald-900 group-hover:text-[#FDFBF7] transition-colors">
                  <f.icon size={20} />
                </div>
                <h3 className="font-heading text-2xl text-slate-900 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SUPPORTED SOURCES */}
      <section className="px-6 lg:px-10 py-24">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="text-xs font-mono uppercase tracking-[0.25em] text-emerald-800 mb-3">
              Fonti supportate
            </div>
            <h2 className="font-heading text-4xl sm:text-5xl text-slate-900 mb-6 tracking-tight">
              Qualsiasi contenuto,<br />
              <span className="italic text-emerald-900">in una lezione.</span>
            </h2>
            <p className="text-slate-700 leading-relaxed mb-6">
              YouTube, Vimeo, siti web, PDF, Word, PowerPoint, EPUB, testo copiato, podcast,
              audio, immagini con testo, appunti, cartelle: tutto diventa materiale didattico.
            </p>
            <div className="flex flex-wrap gap-2">
              {FORMATS.map((f) => (
                <span
                  key={f}
                  className="px-3 py-1.5 rounded-full text-xs font-medium bg-white border border-slate-900/10 text-slate-700"
                >
                  {f}
                </span>
              ))}
            </div>
          </div>
          <div className="relative">
            <div
              className="aspect-[4/5] rounded-3xl bg-cover bg-center border border-slate-900/10 shadow-2xl shadow-emerald-900/10"
              style={{
                backgroundImage:
                  "url('https://images.unsplash.com/photo-1763098844932-7240ee8ff180?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Njd8MHwxfHNlYXJjaHw0fHxzdHVkZW50JTIwc3R1ZHlpbmclMjB3YXJtJTIwYWVzdGhldGljfGVufDB8fHx8MTc4MzkyMTIyMnww&ixlib=rb-4.1.0&q=85')",
              }}
            />
            <div className="absolute -bottom-6 -left-6 bg-emerald-900 text-[#FDFBF7] rounded-2xl p-6 max-w-xs shadow-xl">
              <Youtube size={24} className="mb-3" />
              <div className="font-heading text-2xl">Trascrivo, capisco,<br /><em>ti insegno.</em></div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 lg:px-10 py-24 bg-slate-900 relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-xs font-mono uppercase tracking-[0.25em] text-emerald-400 mb-4">
            Inizia ora — gratis
          </div>
          <h2 className="font-heading text-5xl sm:text-6xl text-[#FDFBF7] mb-4 tracking-tight">
            Cosa vuoi imparare<br /><span className="italic text-emerald-400">oggi?</span>
          </h2>
          <p className="text-slate-400 mb-10 max-w-xl mx-auto">
            Un solo campo. Un solo obiettivo: comprensione profonda e verificata.
          </p>
          <button
            data-testid="cta-scroll-top"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#FDFBF7] text-slate-900 font-medium shadow-2xl hover:-translate-y-1 transition-transform"
          >
            Torna alla barra <ArrowRight size={18} />
          </button>
        </div>
      </section>

      <footer className="px-6 py-10 text-center text-xs text-slate-500 font-mono uppercase tracking-[0.2em]">
        inteligent STUDY · Modalità Maestro · v1.0
      </footer>
    </>
  );
}
