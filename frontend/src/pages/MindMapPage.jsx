import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2, ChevronRight, ChevronDown, GitBranch, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { getSession } from "@/lib/api";
import { toast } from "sonner";

// ─── Constants ──────────────────────────────────────────────────────────────
const NODE_W = 180;
const NODE_H = 48;
const H_GAP = 80;   // horizontal space between levels
const V_GAP = 14;   // vertical gap between sibling nodes

// ─── Layout Engine ──────────────────────────────────────────────────────────
function buildTree(mindMap) {
  if (!mindMap?.root) return null;

  const root = {
    id: "root",
    label: mindMap.root,
    depth: 0,
    children: (mindMap.branches || []).map((b, bi) => ({
      id: `branch-${bi}`,
      label: b.label,
      depth: 1,
      children: (b.children || []).map((c, ci) => ({
        id: `leaf-${bi}-${ci}`,
        label: typeof c === "string" ? c : c.label || String(c),
        depth: 2,
        children: [],
      })),
    })),
  };
  return root;
}

/** Recursively computes subtree height (in units of NODE_H + V_GAP) */
function subtreeSize(node, collapsed) {
  if (collapsed.has(node.id) || node.children.length === 0) return 1;
  return node.children.reduce((sum, c) => sum + subtreeSize(c, collapsed), 0);
}

/** Assigns x/y positions to every visible node */
function layout(node, x, yStart, collapsed, positions) {
  const size = subtreeSize(node, collapsed);
  const cy = yStart + (size * (NODE_H + V_GAP)) / 2 - (NODE_H + V_GAP) / 2;
  positions[node.id] = { x, y: cy };

  if (!collapsed.has(node.id) && node.children.length > 0) {
    let cursor = yStart;
    for (const child of node.children) {
      const cs = subtreeSize(child, collapsed);
      layout(child, x + NODE_W + H_GAP, cursor, collapsed, positions);
      cursor += cs * (NODE_H + V_GAP);
    }
  }
  return positions;
}

/** Walks tree to collect all visible nodes and edges */
function collectVisible(node, collapsed, positions, nodes, edges) {
  nodes.push(node);
  if (!collapsed.has(node.id) && node.children.length > 0) {
    for (const child of node.children) {
      edges.push({ from: node.id, to: child.id });
      collectVisible(child, collapsed, positions, nodes, edges);
    }
  }
}

// ─── SVG Edge (Bezier Curve) ─────────────────────────────────────────────────
function Edge({ from, to, positions }) {
  const p0 = positions[from];
  const p1 = positions[to];
  if (!p0 || !p1) return null;

  const x0 = p0.x + NODE_W;
  const y0 = p0.y + NODE_H / 2;
  const x1 = p1.x;
  const y1 = p1.y + NODE_H / 2;
  const mx = (x0 + x1) / 2;

  const d = `M ${x0} ${y0} C ${mx} ${y0}, ${mx} ${y1}, ${x1} ${y1}`;

  return (
    <motion.path
      d={d}
      stroke="rgba(6,95,70,0.35)"
      strokeWidth={1.5}
      fill="none"
      strokeLinecap="round"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    />
  );
}

// ─── Node colours by depth ────────────────────────────────────────────────────
const DEPTH_STYLES = [
  // root
  "bg-emerald-900 text-[#FDFBF7] border-emerald-900 shadow-lg shadow-emerald-900/25",
  // branch
  "bg-white text-slate-900 border-emerald-800 font-semibold",
  // leaf
  "bg-emerald-50 text-emerald-900 border-emerald-900/20 text-xs",
];

// ─── Single Node ─────────────────────────────────────────────────────────────
function TreeNode({ node, pos, collapsed, onToggle }) {
  const hasChildren = node.children.length > 0;
  const isCollapsed = collapsed.has(node.id);
  const style = DEPTH_STYLES[Math.min(node.depth, 2)];

  return (
    <motion.div
      layout
      key={node.id}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      style={{
        position: "absolute",
        left: pos.x,
        top: pos.y,
        width: NODE_W,
        height: NODE_H,
      }}
    >
      <div
        className={`
          w-full h-full flex items-center justify-between gap-1
          border rounded-xl px-3 cursor-default
          transition-shadow duration-200 hover:shadow-md
          ${style}
        `}
        title={node.label}
      >
        <span className="truncate leading-tight flex-1 select-none text-sm">
          {node.label}
        </span>
        {hasChildren && (
          <button
            onClick={() => onToggle(node.id)}
            data-testid={`toggle-${node.id}`}
            className={`
              shrink-0 w-5 h-5 rounded-full flex items-center justify-center
              transition-colors duration-200
              ${node.depth === 0
                ? "bg-[#FDFBF7]/20 hover:bg-[#FDFBF7]/40 text-[#FDFBF7]"
                : "bg-emerald-900/10 hover:bg-emerald-900/20 text-emerald-900"
              }
            `}
            aria-label={isCollapsed ? "Espandi" : "Collassa"}
          >
            {isCollapsed
              ? <ChevronRight size={11} />
              : <ChevronDown size={11} />
            }
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main Mind Map Canvas ────────────────────────────────────────────────────
function MindMapCanvas({ mindMap }) {
  const [collapsed, setCollapsed] = useState(new Set());
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef(null);

  const tree = buildTree(mindMap);

  const toggle = useCallback((id) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const resetZoom = () => setZoom(1);

  if (!tree) {
    return (
      <div className="flex-1 grid place-items-center text-slate-500 text-sm italic">
        Mappa non disponibile per questa sessione.
      </div>
    );
  }

  // Compute layout
  const positions = {};
  layout(tree, 40, 40, collapsed, positions);

  // Collect visible nodes & edges
  const nodes = [];
  const edges = [];
  collectVisible(tree, collapsed, positions, nodes, edges);

  // Canvas bounding box
  const maxX = Math.max(...nodes.map((n) => (positions[n.id]?.x || 0) + NODE_W)) + 60;
  const maxY = Math.max(...nodes.map((n) => (positions[n.id]?.y || 0) + NODE_H)) + 60;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Zoom controls */}
      <div className="flex items-center gap-2 px-6 py-3 border-b border-slate-900/10 bg-white/50 backdrop-blur-sm shrink-0">
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-emerald-800 mr-2">
          Zoom {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
          data-testid="zoom-in"
          className="w-7 h-7 rounded-lg border border-slate-900/10 bg-white flex items-center justify-center text-slate-600 hover:text-emerald-900 hover:border-emerald-800 transition-colors"
        >
          <ZoomIn size={13} />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(0.3, z - 0.1))}
          data-testid="zoom-out"
          className="w-7 h-7 rounded-lg border border-slate-900/10 bg-white flex items-center justify-center text-slate-600 hover:text-emerald-900 hover:border-emerald-800 transition-colors"
        >
          <ZoomOut size={13} />
        </button>
        <button
          onClick={resetZoom}
          data-testid="zoom-reset"
          className="w-7 h-7 rounded-lg border border-slate-900/10 bg-white flex items-center justify-center text-slate-600 hover:text-emerald-900 hover:border-emerald-800 transition-colors"
        >
          <RotateCcw size={12} />
        </button>
        <span className="ml-auto text-xs text-slate-400">
          Clicca <ChevronDown size={11} className="inline" /> / <ChevronRight size={11} className="inline" /> per espandere o collassare i nodi
        </span>
      </div>

      {/* Scrollable canvas */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto pretty-scroll"
        style={{ background: "radial-gradient(circle at 30% 40%, rgba(16,185,129,0.04) 0%, transparent 60%), #FDFBF7" }}
      >
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "top left",
            width: maxX,
            height: maxY,
            position: "relative",
          }}
        >
          {/* SVG edges layer */}
          <svg
            style={{ position: "absolute", inset: 0, width: maxX, height: maxY, overflow: "visible", pointerEvents: "none" }}
          >
            <AnimatePresence>
              {edges.map((e) => (
                <Edge key={`${e.from}-${e.to}`} from={e.from} to={e.to} positions={positions} />
              ))}
            </AnimatePresence>
          </svg>

          {/* Nodes layer */}
          <AnimatePresence>
            {nodes.map((n) => {
              const pos = positions[n.id];
              if (!pos) return null;
              return (
                <TreeNode
                  key={n.id}
                  node={n}
                  pos={pos}
                  collapsed={collapsed}
                  onToggle={toggle}
                />
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────
export default function MindMapPage() {
  const { sid } = useParams();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const s = await getSession(sid);
        setSession(s);
      } catch {
        toast.error("Sessione non trovata");
      } finally {
        setLoading(false);
      }
    })();
  }, [sid]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#FDFBF7]">
        <Loader2 className="animate-spin text-emerald-900" size={32} />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#FDFBF7]">
        <p className="text-slate-500">Sessione non trovata.</p>
      </div>
    );
  }

  const mindMap = session.analysis?.mind_map;

  return (
    <motion.div
      className="h-screen flex flex-col bg-[#FDFBF7]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* ── Top Bar ── */}
      <header className="shrink-0 border-b border-slate-900/10 bg-white/70 backdrop-blur-md px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          {/* Back to classroom */}
          <Link
            to={`/aula/${sid}`}
            data-testid="back-to-classroom"
            className="flex items-center gap-2 px-3 py-2 rounded-full bg-emerald-900 text-[#FDFBF7] text-sm font-medium hover:bg-emerald-800 transition-all hover:-translate-y-0.5 shadow-sm shadow-emerald-900/20"
          >
            <ArrowLeft size={15} />
            Torna all'Aula
          </Link>

          <div className="h-5 w-px bg-slate-900/10" />

          <div className="min-w-0">
            <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-emerald-800/70">
              Mappa mentale interattiva
            </div>
            <div className="font-heading text-xl text-slate-900 truncate">
              {session.analysis?.topic || "Mappa"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 shrink-0">
          <GitBranch size={13} className="text-emerald-800" />
          <span className="hidden sm:inline">
            {(session.analysis?.mind_map?.branches || []).length} rami principali
          </span>
        </div>
      </header>

      {/* ── Legend ── */}
      <div className="shrink-0 flex items-center gap-5 px-6 py-2 bg-white/30 border-b border-slate-900/5 text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-emerald-900" />
          <span>Concetto radice</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded border-2 border-emerald-800 bg-white" />
          <span>Ramo</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-emerald-50 border border-emerald-900/20" />
          <span>Sottonodo</span>
        </div>
      </div>

      {/* ── Canvas ── */}
      <MindMapCanvas mindMap={mindMap} />
    </motion.div>
  );
}
