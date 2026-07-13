import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import "@/index.css";
import "@/App.css";
import { Toaster } from "sonner";
import Home from "@/pages/Home";
import Classroom from "@/pages/Classroom";
import Dashboard from "@/pages/Dashboard";
import InstallPrompt from "@/components/InstallPrompt";
import ErrorBoundary from "@/components/ErrorBoundary";
import { GraduationCap, LayoutDashboard, Sparkles } from "lucide-react";

function TopBar() {
  const loc = useLocation();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (loc.pathname.startsWith("/aula/")) return null;

  return (
    <header
      className={`fixed top-0 inset-x-0 z-40 transition-all duration-300 ${
        scrolled ? "bg-[#FDFBF7]/85 backdrop-blur-xl border-b border-slate-900/10" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 lg:px-10 py-4">
        <Link to="/" data-testid="brand-link" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-md bg-emerald-900 text-[#FDFBF7] grid place-items-center shadow-sm">
            <GraduationCap size={20} />
          </div>
          <div className="leading-none">
            <div className="font-heading text-xl font-semibold text-slate-900 tracking-tight">
              inteligent <span className="italic text-emerald-900">STUDY</span>
            </div>
            <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-emerald-800/70 mt-0.5">
              maestro AI
            </div>
          </div>
        </Link>
        <nav className="flex items-center gap-2">
          <Link
            to="/"
            data-testid="nav-home"
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-emerald-900 transition-colors"
          >
            Home
          </Link>
          <Link
            to="/dashboard"
            data-testid="nav-dashboard"
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-emerald-900 transition-colors flex items-center gap-1.5"
          >
            <LayoutDashboard size={15} /> Dashboard
          </Link>
          <a
            href="#come-funziona"
            className="ml-2 px-4 py-2 rounded-full bg-emerald-900 hover:bg-emerald-800 text-[#FDFBF7] text-sm font-medium transition-all hover:-translate-y-0.5 shadow-sm shadow-emerald-900/20 flex items-center gap-1.5"
            data-testid="nav-cta"
          >
            <Sparkles size={14} /> Come funziona
          </a>
        </nav>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <div className="App min-h-screen bg-[#FDFBF7] grain">
      <ErrorBoundary>
        <BrowserRouter>
          <TopBar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/aula/:sid" element={<Classroom />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
          <Toaster
            position="top-center"
            toastOptions={{
              style: { background: "#FDFBF7", color: "#0F172A", border: "1px solid rgba(15,23,42,0.12)" },
            }}
          />
          <InstallPrompt />
        </BrowserRouter>
      </ErrorBoundary>
    </div>
  );
}
