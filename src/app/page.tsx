"use client";

import { useState, useEffect } from "react";
import { Search, Activity, DollarSign, Award, ArrowUpRight, ArrowDownRight, Loader2, Bell, Trash, Info } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, ComposedChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AnalysisResult {
  ticker: string;
  ratios_salud: {
    roe: number | null;
    deuda_ebitda: number | null;
    margen_bruto: number | null;
    margen_neto: number | null;
    salud_score?: number;
  };
  salud_score?: number;
  valor_intrinseco: {
    dcf: number | null;
    precio_actual: number | null;
    fecha: string;
    margen_seguridad_porcentaje: number | null;
    infravalorada: boolean;
    datos_crudos?: {
      flujo_caja: number;
      deuda_neta: number;
      acciones_circulacion: number;
    };
  };
  analisis_tecnico: {
    rsi: number | null;
    rsi_mensaje: string;
    soportes: number[];
    soporte_cercano: number | null;
    distancia_soporte_porcentaje: number | null;
    precio_actual: number;
    historico?: { date: string, open: number, high: number, low: number, close: number }[];
  };
  veredicto_final: string;
  wacc_default?: number;
  growth_default?: number;
  analistas_targets?: {
    alto: number | null;
    moderado: number | null;
    bajo: number | null;
  };
}

interface IAResult {
  riesgos_estructurales: string[];
  moat: string;
  sentimiento_score: number;
  resumen_analista: string;
  error?: string;
}

function TermTooltip({ term, definition }: { term: string, definition: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div 
      className="relative inline-flex items-center gap-1.5 cursor-pointer group" 
      onClick={() => setOpen(!open)} 
      onMouseEnter={() => setOpen(true)} 
      onMouseLeave={() => setOpen(false)}
    >
      <span className="border-b border-dotted border-gray-500 group-hover:border-white transition-colors text-xs font-bold tracking-wider">{term}</span>
      <Info className="w-3.5 h-3.5 text-gray-500 group-hover:text-purple-400 transition-colors" />
      
      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-64 p-3.5 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl text-[11px] text-gray-300 leading-normal z-50 animate-in fade-in zoom-in-95 duration-200 pointer-events-none normal-case font-normal">
          <div className="font-bold text-purple-400 mb-1.5 uppercase text-xs">{term}</div>
          {definition}
          <div className="absolute top-full left-4 -mt-px border-4 border-transparent border-t-[#1a1a1a]" />
        </div>
      )}
    </div>
  );
}

function WatchlistCard({ item, removeFromWatchlist, formatCurrency }: { item: any, removeFromWatchlist: (ticker: string) => void, formatCurrency: (val: number | null) => string }) {
  const [alertaActiva, setAlertaActiva] = useState(item.seguimiento_activo ?? true);

  const handleToggle = async () => {
    const nuevoEstado = !alertaActiva;
    setAlertaActiva(nuevoEstado); // Optimistic UI update

    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/watchlist/${item.ticker}/toggle`, {
        method: "PATCH",
      });
    } catch (err) {
      console.error("Error toggling alert:", err);
      setAlertaActiva(!nuevoEstado); // Revert on failure
    }
  };

  return (
    <div className="glass-card p-4 group relative overflow-hidden flex flex-col justify-between min-h-[160px]">
      <div>
        <div className="flex justify-between items-start mb-3 pr-16">
          <div>
            <div className="text-xl font-black">{item.ticker}</div>
            <div className="text-[10px] text-gray-500 font-mono">{item.fecha_analisis}</div>
          </div>
        </div>

        {/* Acciones Superiores: Eliminar y Alerta */}
        <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
          <button 
            onClick={() => removeFromWatchlist(item.ticker)}
            className="opacity-0 group-hover:opacity-100 transition-all p-1.5 hover:bg-red-500/10 text-gray-500 hover:text-red-400 rounded-lg"
            title="Eliminar de seguimiento"
          >
            <Trash className="w-4 h-4" />
          </button>
          <div 
            onClick={handleToggle}
            className="cursor-pointer transition-all p-1.5 hover:scale-110"
            title={alertaActiva ? "Alerta Activa (Clic para desactivar)" : "Alerta Desactivada (Clic para activar)"}
          >
            <Bell className={cn("w-4 h-4 transition-colors duration-300", alertaActiva ? "text-green-500" : "text-gray-500 opacity-40")} />
          </div>
        </div>
        
        <div className="space-y-1.5 text-xs mt-2">
          <div className="flex justify-between">
            <span className="text-gray-400">Fair Price (DCF)</span>
            <span className="font-bold text-green-400">{formatCurrency(item.precio_objetivo)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Precio Actual</span>
            <span className="font-bold text-white">{formatCurrency(item.precio_actual || null)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Soporte Técnico</span>
            <span className="font-bold text-blue-400">{formatCurrency(item.soporte_tecnico)}</span>
          </div>
          <div className="flex justify-between border-t border-white/5 pt-1 mt-1">
            <span className="text-gray-400">RSI 14</span>
            <span className={cn("font-bold", item.rsi < 30 ? "text-green-400" : item.rsi > 70 ? "text-red-400" : "text-gray-300")}>
              {item.rsi ? item.rsi.toFixed(2) : "N/A"}
            </span>
          </div>
        </div>
      </div>

      <div className={cn("absolute bottom-0 left-0 w-full h-1 transition-all duration-300", alertaActiva ? "bg-linear-to-r from-green-500/20 to-transparent" : "bg-gray-500/10")} />
    </div>
  );
}

const CustomCandlestick = (props: any) => {
  const { x, y, width, height, payload, baseVal } = props;
  if (x === undefined || y === undefined || width === undefined || height === undefined || !payload) return null;

  const { open, high, low, close } = payload;
  const isUp = close >= open;
  const color = isUp ? '#10B981' : '#EF4444';

  const y_base = y + height;
  const diff = close - baseVal;
  const ratio = diff !== 0 ? height / diff : 0;

  const y_open = y_base - (open - baseVal) * ratio;
  const y_close = y_base - (close - baseVal) * ratio;
  const y_high = y_base - (high - baseVal) * ratio;
  const y_low = y_base - (low - baseVal) * ratio;

  const rectY = Math.min(y_open, y_close);
  const rectHeight = Math.max(Math.abs(y_open - y_close), 2);
  const centerX = x + width / 2;

  return (
    <g>
      <line x1={centerX} y1={y_high} x2={centerX} y2={y_low} stroke={color} strokeWidth={1.5} />
      <rect x={x} y={rectY} width={width} height={rectHeight} fill={color} rx={1} />
    </g>
  );
};

// Componente aislado para el Input del Chat (Evita re-renderizar todo el dashboard en móviles al escribir)
function ChatInputForm({ onSubmit, chatEscribiendo, ticker }: { onSubmit: (mensaje: string) => void, chatEscribiendo: boolean, ticker: string }) {
  const [mensaje, setMensaje] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mensaje.trim() || chatEscribiendo) return;
    onSubmit(mensaje.trim());
    setMensaje("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 pt-2 border-t border-white/10">
      <input
        type="text"
        value={mensaje}
        onChange={(e) => setMensaje(e.target.value)}
        placeholder={`Pregúntale a la IA sobre los márgenes o deuda de ${ticker}...`}
        className="flex-1 bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-hidden focus:border-purple-500/50 transition-colors"
      />
      <button
        type="submit"
        disabled={chatEscribiendo || !mensaje.trim()}
        className="bg-purple-600 hover:bg-purple-50 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-purple-500/20"
      >
        Enviar
      </button>
    </form>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<'analisis' | 'watchlist'>('analisis');
  const [ticker, setTicker] = useState("");
  const [data, setData] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [iaData, setIaData] = useState<IAResult | null>(null);
  const [loadingIa, setLoadingIa] = useState(false);
  const [showFullSummary, setShowFullSummary] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showRecent, setShowRecent] = useState(false);
  const [expandRecent, setExpandRecent] = useState(false);
  const [periodo, setPeriodo] = useState('1y');
  const [tipoGrafico, setTipoGrafico] = useState('area'); // 'area' o 'velas'

  // Estados para DCF Sliders
  const [crecimientoEst, setCrecimientoEst] = useState<number>(10); // 1% a 25%
  const [tasaDescuento, setTasaDescuento] = useState<number>(9); // 5% a 15%
  const [crecimientoTerminal, setCrecimientoTerminal] = useState<number>(2.5); // 1% a 5%

  // Estados para el Mini-Chatbot
  const [chatHistorial, setChatHistorial] = useState<{ role: string; content: string }[]>([]);
  const [chatEscribiendo, setChatEscribiendo] = useState(false);

  // Fetch watchlist on load
  const fetchWatchlist = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/watchlist`);
      if (response.ok) {
        const data = await response.json();
        setWatchlist(data);
      }
    } catch (err) {
      console.error("Error fetching watchlist:", err);
    }
  };

  useEffect(() => {
    fetchWatchlist();
    const saved = localStorage.getItem("finanza_recent_searches");
    if (saved) {
      try { setRecentSearches(JSON.parse(saved)); } catch (e) {}
    }
  }, []);

  const executeSearch = async (targetTicker: string, targetPeriodo: string = periodo) => {
    if (!targetTicker) return;
    setTicker(targetTicker);

    setLoading(true);
    setError("");
    setSuccess("");
    if (!data || data.ticker !== targetTicker.toUpperCase()) {
      setData(null);
      setChatHistorial([]);
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/analizar/${targetTicker.toUpperCase()}?periodo=${targetPeriodo}`);
      if (!response.ok) {
        throw new Error("No se pudo obtener el análisis. Verifica el Ticker.");
      }
      const result = await response.json();
      setData(result);

      // Guardar en búsquedas recientes
      const newSearch = targetTicker.toUpperCase();
      setRecentSearches(prev => {
        const filtered = prev.filter(t => t !== newSearch);
        const updated = [newSearch, ...filtered].slice(0, 10);
        localStorage.setItem("finanza_recent_searches", JSON.stringify(updated));
        return updated;
      });
      setShowRecent(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (data && data.ticker) {
      executeSearch(data.ticker, periodo);
    }
  }, [periodo]);

  // Actualizar sliders del DCF automáticamente al recibir datos reales del backend
  useEffect(() => {
    if (data) {
      setCrecimientoEst(data.growth_default || 10);
      setTasaDescuento(data.wacc_default || 9);
    }
  }, [data]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(ticker, periodo);
  };

  const calcularFairPriceSimulado = () => {
    if (!data || !data.valor_intrinseco.datos_crudos) return data?.valor_intrinseco.dcf || 0;
    const { flujo_caja, deuda_neta, acciones_circulacion } = data.valor_intrinseco.datos_crudos;
    if (!acciones_circulacion || acciones_circulacion <= 0) return data.valor_intrinseco.dcf || 0;

    const g = crecimientoEst / 100;
    const r = tasaDescuento / 100;
    const g_t = crecimientoTerminal / 100;

    let fcf = flujo_caja > 0 ? flujo_caja : 1000;
    let suma_pv = 0;

    for (let t = 1; t <= 5; t++) {
      fcf = fcf * (1 + g);
      suma_pv += fcf / Math.pow(1 + r, t);
    }

    const denom = Math.max(r - g_t, 0.005);
    const tv = (fcf * (1 + g_t)) / denom;
    const pv_tv = tv / Math.pow(1 + r, 5);

    const ev = suma_pv + pv_tv;
    const eq_val = Math.max(ev - deuda_neta, 0);
    return eq_val / acciones_circulacion;
  };

  const fairPriceSimulado = calcularFairPriceSimulado();

  const calcularProyeccion5Anios = () => {
    if (!data) return [];
    const baseAlto = data.analistas_targets?.alto || data.valor_intrinseco.precio_actual || 100;
    const baseModerado = data.analistas_targets?.moderado || data.valor_intrinseco.precio_actual || 90;
    const baseBajo = data.analistas_targets?.bajo || data.valor_intrinseco.precio_actual || 80;

    const g = crecimientoEst / 100;
    const proyeccion = [];

    for (let año = 1; año <= 5; año++) {
      proyeccion.push({
        año: `Año ${año}`,
        Optimista: Math.round(baseAlto * Math.pow(1 + g, año) * 100) / 100,
        Moderado: Math.round(baseModerado * Math.pow(1 + g, año) * 100) / 100,
        Pesimista: Math.round(baseBajo * Math.pow(1 + g, año) * 100) / 100,
      });
    }

    return proyeccion;
  };

  const datosProyeccion = calcularProyeccion5Anios();

  const handleChatSubmit = async (userMsg: string) => {
    if (!userMsg.trim() || !data?.ticker) return;

    const newHistorial = [...chatHistorial, { role: "Usuario", content: userMsg }];
    setChatHistorial(newHistorial);
    setChatEscribiendo(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/analizar/${data.ticker}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mensaje: userMsg,
          historial: chatHistorial
        })
      });

      if (response.ok) {
        const resJson = await response.json();
        setChatHistorial(prev => [...prev, { role: "IA", content: resJson.respuesta }]);
      } else {
        setChatHistorial(prev => [...prev, { role: "IA", content: "Lo siento, ha ocurrido un error al procesar tu pregunta." }]);
      }
    } catch (err) {
      setChatHistorial(prev => [...prev, { role: "IA", content: "Error de conexión con el servidor de IA." }]);
    } finally {
      setChatEscribiendo(false);
    }
  };

  const handleIaAnalysis = async () => {
    if (!data) return;
    setLoadingIa(true);
    setIaData(null);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/analizar-ia/${data.ticker}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || "Error en el análisis IA");
      setIaData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingIa(false);
    }
  };

  const addToWatchlist = async () => {
    if (!data) return;
    setSaving(true);
    setSuccess("");
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/watchlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: data.ticker,
          precio_objetivo: data.valor_intrinseco.dcf || 0,
          soporte_tecnico: data.analisis_tecnico.soporte_cercano || 0,
          fecha_analisis: new Date().toISOString().split('T')[0]
        }),
      });
      if (response.ok) {
        setSuccess("Ticker añadido a tu lista de seguimiento");
        fetchWatchlist(); // Refresh list
      }
    } catch (err) {
      setError("Error al guardar en seguimiento");
    } finally {
      setSaving(false);
    }
  };

  const removeFromWatchlist = async (ticker: string) => {
    setWatchlist(prev => prev.filter(item => item.ticker !== ticker));
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/watchlist/${ticker}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        fetchWatchlist();
      }
    } catch (err) {
      console.error("Error removing from watchlist:", err);
      fetchWatchlist();
    }
  };

  const formatPercent = (val: number | null) => {
    if (val === null) return "N/A";
    return (val * 100).toFixed(2) + "%";
  };

  const formatCurrency = (val: number | null) => {
    if (val === null) return "N/A";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6 md:p-12 font-sans selection:bg-green-500/30">
      {/* Header */}
      <header className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
        <div className="flex items-center gap-4">
          <img src="/logo.png" alt="Quantix Logo" className="w-11 h-11 rounded-2xl shadow-green-500/20 shadow-2xl border border-white/10" />
          <div>
            <h1 className="text-3xl font-black tracking-tight bg-linear-to-r from-white via-green-100 to-green-500 bg-clip-text text-transparent">
              QUANTIX
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-gray-500 text-xs font-medium">Terminal de Análisis Fundamental y Cuantitativo</p>
              <div className="h-1 w-1 rounded-full bg-gray-700" />
              <span className="text-[10px] text-green-500 font-bold uppercase tracking-widest flex items-center gap-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                🔔 Notificaciones Activas
              </span>
            </div>
          </div>
        </div>

        <div className="relative w-full md:w-96 group">
          <form onSubmit={handleSearch} className="relative w-full">
            <input
              type="text"
              placeholder="Buscar Ticker (ej: AAPL, TSLA, NVDA)..."
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              onFocus={() => setShowRecent(true)}
              onBlur={() => setTimeout(() => setShowRecent(false), 200)}
              className="w-full bg-[#111] border border-white/10 rounded-full px-6 py-3 pl-12 outline-none focus:border-green-500/50 transition-all group-hover:border-white/20"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
            <button
              type="submit"
              disabled={loading}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-green-600 hover:bg-green-500 text-white px-4 py-1.5 rounded-full text-sm font-medium transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Analizar"}
            </button>
          </form>

          {/* Menú Flotante de Búsquedas Recientes */}
          {showRecent && recentSearches.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-[#151515] border border-white/10 rounded-2xl p-4 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Búsquedas Recientes</span>
                {recentSearches.length > 5 && (
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); setExpandRecent(!expandRecent); }}
                    className="text-[10px] text-green-400 hover:underline font-bold"
                  >
                    {expandRecent ? "VER MENOS" : "VER MÁS"}
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {(expandRecent ? recentSearches : recentSearches.slice(0, 5)).map((t, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); executeSearch(t); }}
                    className="bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 group/btn"
                  >
                    <Search className="w-3 h-3 text-gray-500 group-hover/btn:text-green-400 transition-colors" />
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto">
        {/* Pestañas de Navegación */}
        <div className="flex justify-center mb-12 border-b border-white/10">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('analisis')}
              className={cn(
                "pb-4 text-sm font-bold tracking-wide uppercase transition-all relative",
                activeTab === 'analisis' ? "text-green-400" : "text-gray-500 hover:text-gray-300"
              )}
            >
              Análisis de Acción
              {activeTab === 'analisis' && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-green-500 animate-in fade-in duration-300" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('watchlist')}
              className={cn(
                "pb-4 text-sm font-bold tracking-wide uppercase transition-all relative flex items-center gap-2",
                activeTab === 'watchlist' ? "text-green-400" : "text-gray-500 hover:text-gray-300"
              )}
            >
              Lista de Seguimiento
              <span className="bg-white/10 text-gray-300 text-[10px] px-2 py-0.5 rounded-full font-mono">
                {watchlist.length}
              </span>
              {activeTab === 'watchlist' && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-green-500 animate-in fade-in duration-300" />
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-8 text-center">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-xl mb-8 text-center">
            {success}
          </div>
        )}

        {/* PESTAÑA 1: ANÁLISIS DE ACCIÓN */}
        {activeTab === 'analisis' && (
          <div>
            {!data && !loading && !error && (
              <div className="flex flex-col items-center justify-center py-24 opacity-20">
                <Activity className="w-16 h-16 mb-4" />
                <p className="text-xl">Ingresa un ticker para comenzar el análisis</p>
              </div>
            )}

            {data && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Ticker Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                  <div className="flex items-center gap-4">
                    <div className="text-5xl font-black">{data.ticker}</div>
                    <div className="h-10 w-px bg-white/10" />
                    <div>
                      <div className="text-gray-500 text-xs uppercase tracking-widest">Estado del Mercado</div>
                      <div className="text-green-400 text-sm font-mono flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        SISTEMA ACTIVO
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={addToWatchlist}
                    disabled={saving}
                    className="bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
                    Añadir a Seguimiento
                  </button>
                </div>

                {/* Grid de Tarjetas */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Tarjeta de Salud Financiera */}
                  <div className="glass-card p-6 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-6">
                      <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                        <Activity className="w-6 h-6" />
                      </div>
                      <span className="text-xs text-gray-500 font-mono">SALUD</span>
                    </div>
                    <div>
                      {/* Gráfico Semicircular de Puntaje de Salud (100% Vector SVG) */}
                      {(() => {
                        const score = data.ratios_salud?.salud_score ?? data.salud_score ?? 85;
                        let meterColor = '#EF4444';
                        if (score > 70) meterColor = '#10B981';
                        else if (score >= 40) meterColor = '#FBBF24';

                        const radius = 70;
                        const arcLength = Math.PI * radius;
                        const dashOffset = arcLength * (1 - score / 100);

                        return (
                          <div className="w-full h-[140px] flex flex-col items-center justify-center mb-4">
                            <svg viewBox="0 0 200 120" className="w-full h-full max-w-[240px] overflow-visible drop-shadow-lg">
                              {/* Pista de fondo */}
                              <path 
                                d="M 30 105 A 70 70 0 0 1 170 105" 
                                fill="none" 
                                stroke="#262626" 
                                strokeWidth="18" 
                                strokeLinecap="round" 
                              />
                              {/* Pista de puntaje */}
                              <path 
                                d="M 30 105 A 70 70 0 0 1 170 105" 
                                fill="none" 
                                stroke={meterColor} 
                                strokeWidth="18" 
                                strokeLinecap="round" 
                                strokeDasharray={arcLength}
                                strokeDashoffset={dashOffset}
                                style={{ transition: 'stroke-dashoffset 1.5s ease-in-out, stroke 1s ease' }}
                              />
                              {/* Textos vectoriales nítidos */}
                              <text x="100" y="92" fill="#ffffff" fontSize="32" fontWeight="900" textAnchor="middle" className="font-sans tracking-tighter">
                                {score}<tspan fontSize="16" fill="#6b7280" fontWeight="600">/100</tspan>
                              </text>
                              <text x="100" y="114" fill="#9ca3af" fontSize="11" fontWeight="bold" textAnchor="middle" className="font-mono uppercase tracking-widest">
                                Puntaje Global
                              </text>
                            </svg>
                          </div>
                        );
                      })()}

                      <h3 className="text-gray-400 text-sm mb-4 border-t border-white/5 pt-4">Ratios de Calidad</h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <TermTooltip term="ROE" definition="Mide la rentabilidad sobre el capital de los accionistas. Un ROE > 15% indica que la empresa genera grandes beneficios con el dinero invertido." />
                          <span className={cn("text-lg font-bold", (data.ratios_salud.roe || 0) > 0.15 ? "text-green-400" : "text-yellow-400")}>
                            {formatPercent(data.ratios_salud.roe)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <TermTooltip term="Deuda / EBITDA" definition="Evalúa cuántos años le tomaría a la empresa pagar toda su deuda con sus ganancias operativas actuales. Un ratio < 3 es ideal y seguro." />
                          <span className={cn("text-lg font-bold", (data.ratios_salud.deuda_ebitda || 0) < 3 ? "text-green-400" : "text-red-400")}>
                            {data.ratios_salud.deuda_ebitda?.toFixed(2) || "N/A"}
                          </span>
                        </div>
                        <div className="pt-2 border-t border-white/5 space-y-2">
                          <div className="flex justify-between items-center text-xs text-gray-500">
                            <TermTooltip term="Margen Bruto" definition="Porcentaje de beneficio directo tras descontar los costes de producción. > 40% sugiere una gran ventaja competitiva (Moat)." />
                            <span className="font-bold text-gray-300">{formatPercent(data.ratios_salud.margen_bruto)}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs text-gray-500">
                            <TermTooltip term="Margen Neto" definition="Porcentaje final de beneficio neto por cada dólar ingresado tras pagar todos los gastos e impuestos. > 10% es excelente." />
                            <span className="font-bold text-gray-300">{formatPercent(data.ratios_salud.margen_neto)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tarjeta de Valoración con Simulación DCF */}
                  <div className="glass-card p-6 flex flex-col justify-between md:col-span-1">
                    <div className="flex justify-between items-start mb-6">
                      <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                        <DollarSign className="w-6 h-6" />
                      </div>
                      <span className="text-xs text-gray-500 font-mono">DCF SIMULATOR</span>
                    </div>
                    <div>
                      <h3 className="text-gray-400 text-sm mb-4">Valor Intrínseco & Simulación</h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <TermTooltip term="Valor Estimado (DCF)" definition="Valor intrínseco original calculado por el sistema basado en los fundamentos actuales." />
                          <span className="text-lg font-bold text-white">
                            {formatCurrency(data.valor_intrinseco.dcf)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                          <span className="text-sm font-medium text-purple-400">Fair Price Simulado</span>
                          <span className="text-lg font-black text-purple-400">
                            {formatCurrency(fairPriceSimulado)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Precio Actual</span>
                          <span className="text-lg font-bold text-gray-300">
                            {formatCurrency(data.valor_intrinseco.precio_actual)}
                          </span>
                        </div>
                        <div className={cn(
                          "mt-4 p-3 rounded-lg flex justify-between items-center overflow-visible",
                          data.valor_intrinseco.infravalorada ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                        )}>
                          <TermTooltip term="MARGEN DE SEGURIDAD" definition="Diferencia entre el Precio Actual y el Valor Intrínseco (Fair Price). Comprar con un margen > 20% minimiza el riesgo de pérdida si el mercado cae." />
                          <span className="text-sm font-mono flex items-center gap-1 font-bold">
                            {data.valor_intrinseco.infravalorada ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                            {data.valor_intrinseco.margen_seguridad_porcentaje}%
                          </span>
                        </div>

                        {/* Controles del Simulador DCF */}
                        <div className="pt-4 border-t border-white/10 space-y-3">
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-gray-400">Crecimiento Estimado (5A)</span>
                              <span className="font-mono text-purple-400 font-bold">{crecimientoEst.toFixed(1)}%</span>
                            </div>
                            <input
                              type="range"
                              min={1}
                              max={25}
                              step="0.1"
                              value={crecimientoEst}
                              onChange={(e) => setCrecimientoEst(parseFloat(e.target.value))}
                              className="w-full accent-purple-500 bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer"
                            />
                          </div>

                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-gray-400">Tasa de Descuento (WACC)</span>
                              <span className="font-mono text-purple-400 font-bold">{tasaDescuento.toFixed(1)}%</span>
                            </div>
                            <input
                              type="range"
                              min={5}
                              max={15}
                              step="0.1"
                              value={tasaDescuento}
                              onChange={(e) => setTasaDescuento(parseFloat(e.target.value))}
                              className="w-full accent-purple-500 bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer"
                            />
                          </div>

                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-gray-400">Crecimiento Terminal</span>
                              <span className="font-mono text-purple-400 font-bold">{crecimientoTerminal.toFixed(1)}%</span>
                            </div>
                            <input
                              type="range"
                              min={1}
                              max={5}
                              step="0.1"
                              value={crecimientoTerminal}
                              onChange={(e) => setCrecimientoTerminal(parseFloat(e.target.value))}
                              className="w-full accent-purple-500 bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tarjeta de Veredicto */}
                  <div className={cn(
                    "glass-card p-6 flex flex-col justify-between border-l-4",
                    data.veredicto_final.includes("Comprar") ? "border-l-green-500 glow-green" : "border-l-yellow-500 glow-red"
                  )}>
                    <div className="flex justify-between items-start mb-6">
                      <div className={cn(
                        "p-2 rounded-lg",
                        data.veredicto_final.includes("Comprar") ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400"
                      )}>
                        <Award className="w-6 h-6" />
                      </div>
                      <span className="text-xs text-gray-500 font-mono">VEREDICTO</span>
                    </div>
                    <div>
                      {/* Medidor Visual de Veredicto (Gauge Vectorial de Alta Resolución) */}
                      {(() => {
                        const veredicto = data.veredicto_final.toUpperCase();
                        let needleAngle = 90;
                        if (veredicto.includes("COMPRAR")) needleAngle = 165;
                        else if (veredicto.includes("VENDER")) needleAngle = 15;

                        return (
                          <div className="w-full h-[140px] flex flex-col items-center justify-center mb-4">
                            <svg viewBox="0 0 200 120" className="w-full h-full max-w-[240px] overflow-visible drop-shadow-lg">
                              <defs>
                                <filter id="needleShadow" x="-20%" y="-20%" width="140%" height="140%">
                                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.5"/>
                                </filter>
                              </defs>

                              {/* Arcos segmentados limpios (sin superposiciones) */}
                              {/* Zona 1: VENDER (Rojo) */}
                              <path d="M 30 105 A 70 70 0 0 1 63.95 45" fill="none" stroke="#EF4444" strokeWidth="18" strokeLinecap="butt" className="opacity-85" />
                              {/* Zona 2: ESPERAR (Amarillo) */}
                              <path d="M 66.05 43.78 A 70 70 0 0 1 133.95 43.78" fill="none" stroke="#FBBF24" strokeWidth="18" strokeLinecap="butt" className="opacity-85" />
                              {/* Zona 3: COMPRAR (Verde) */}
                              <path d="M 136.05 45 A 70 70 0 0 1 170 105" fill="none" stroke="#10B981" strokeWidth="18" strokeLinecap="butt" className="opacity-85" />

                              {/* Marcas/Textos vectoriales externos (cero colisión con arcos o aguja) */}
                              <text x="24" y="61" fill="#EF4444" fontSize="11" fontWeight="800" textAnchor="middle" className="font-mono tracking-tighter">VENDER</text>
                              <text x="100" y="17" fill="#FBBF24" fontSize="11" fontWeight="800" textAnchor="middle" className="font-mono tracking-tighter">ESPERAR</text>
                              <text x="176" y="61" fill="#10B981" fontSize="11" fontWeight="800" textAnchor="middle" className="font-mono tracking-tighter">COMPRAR</text>

                              {/* Aguja del Medidor (proporcionada para no tocar los arcos) */}
                              <g transform={`rotate(${needleAngle}, 100, 105)`} style={{ transition: 'transform 1s cubic-bezier(0.4, 0, 0.2, 1)' }} filter="url(#needleShadow)">
                                <polygon points="100,101.5 45,105 100,108.5" fill="#ffffff" />
                                <circle cx="100" cy="105" r="9" fill="#ffffff" />
                                <circle cx="100" cy="105" r="3.5" fill="#121212" />
                              </g>
                            </svg>
                          </div>
                        );
                      })()}

                      <h3 className="text-gray-400 text-sm mb-2 border-t border-white/5 pt-4">Análisis Final</h3>
                      <div className={cn(
                        "text-3xl font-black mb-4 tracking-tighter",
                        data.veredicto_final.includes("Comprar") ? "text-green-400" : "text-yellow-400"
                      )}>
                        {data.veredicto_final.toUpperCase()}
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        Este veredicto se basa en el modelo de Flujo de Caja Descontado (DCF) y ratios de salud financiera históricos. 
                        <br/><span className="text-white/40 mt-2 block italic">Actualizado al: {data.valor_intrinseco.fecha}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Proyección a 5 Años (Consenso Profesional) */}
                <div className="mt-8 glass-card p-6 border border-white/10 bg-[#121212]/80 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                      <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                        <Activity className="w-5 h-5 text-purple-400" />
                        Proyección de Precio a 5 Años (Consenso Profesional)
                      </h2>
                      <p className="text-xs text-gray-400 mt-1">
                        Trayectoria estimada basada en el crecimiento actual ({crecimientoEst.toFixed(1)}%) sobre los objetivos de analistas en Wall Street.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#10B981] shadow-lg shadow-[#10B981]/50" />
                        <span className="text-gray-300">Optimista: {formatCurrency(data.analistas_targets?.alto || null)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#60A5FA] shadow-lg shadow-[#60A5FA]/50" />
                        <span className="text-gray-300">Moderado: {formatCurrency(data.analistas_targets?.moderado || null)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#EF4444] shadow-lg shadow-[#EF4444]/50" />
                        <span className="text-gray-300">Pesimista: {formatCurrency(data.analistas_targets?.bajo || null)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="h-[320px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={datosProyeccion} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                        <XAxis dataKey="año" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={{ stroke: '#262626' }} />
                        <YAxis stroke="#6b7280" fontSize={11} tickLine={false} axisLine={{ stroke: '#262626' }} tickFormatter={(val) => `$${val}`} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1a1a1a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px', color: '#fff' }}
                          formatter={(value: any) => [`$${value}`, '']}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                        <Line type="monotone" dataKey="Optimista" stroke="#10B981" strokeWidth={3} dot={{ r: 4, fill: '#10B981', strokeWidth: 2, stroke: '#121212' }} activeDot={{ r: 6, stroke: '#121212', strokeWidth: 2 }} />
                        <Line type="monotone" dataKey="Moderado" stroke="#60A5FA" strokeWidth={3} dot={{ r: 4, fill: '#60A5FA', strokeWidth: 2, stroke: '#121212' }} activeDot={{ r: 6, stroke: '#121212', strokeWidth: 2 }} />
                        <Line type="monotone" dataKey="Pesimista" stroke="#EF4444" strokeWidth={3} dot={{ r: 4, fill: '#EF4444', strokeWidth: 2, stroke: '#121212' }} activeDot={{ r: 6, stroke: '#121212', strokeWidth: 2 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-[11px] text-gray-500">
                    <span>Datos basados en el consenso consolidado de analistas institucionales en internet.</span>
                    <span className="font-mono">Fuente: Finnhub Price Targets</span>
                  </div>
                </div>

                {/* Nueva Sección: Estrategia de Entrada */}
                <div className="mt-8">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-green-400" />
                    Estrategia de Entrada (Timing)
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="glass-card p-6">
                      <div className="flex justify-between items-center mb-6">
                        <span className="text-sm text-gray-400">Análisis RSI (14 días)</span>
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                          !data.analisis_tecnico.rsi_mensaje ? "bg-white/5 text-gray-400" :
                          data.analisis_tecnico.rsi_mensaje === "Neutral" ? "bg-white/5 text-gray-400" :
                          data.analisis_tecnico.rsi_mensaje.includes("Sobreventa") ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                        )}>
                          {data.analisis_tecnico.rsi_mensaje || "N/A"}
                        </span>
                      </div>
                      <div className="flex items-end gap-2">
                        <span className="text-4xl font-black">{data.analisis_tecnico.rsi?.toFixed(2)}</span>
                        <span className="text-gray-500 mb-1">RSI</span>
                      </div>
                      <div className="w-full bg-white/5 h-2 rounded-full mt-4 overflow-hidden">
                        <div 
                          className={cn(
                            "h-full transition-all duration-1000",
                            (data.analisis_tecnico.rsi || 0) < 30 ? "bg-green-500" : 
                            (data.analisis_tecnico.rsi || 0) > 70 ? "bg-red-500" : "bg-blue-500"
                          )}
                          style={{ width: `${data.analisis_tecnico.rsi}%` }}
                        />
                      </div>
                    </div>

                    <div className="glass-card p-6">
                      <div className="flex justify-between items-center mb-6">
                        <span className="text-sm text-gray-400">Soporte más cercano</span>
                        <span className="text-xs text-gray-500 font-mono">TECHNICAL</span>
                      </div>
                      <div className="flex justify-between items-end">
                        <div>
                          <div className="text-3xl font-black">{formatCurrency(data.analisis_tecnico.soporte_cercano)}</div>
                          <div className="text-xs text-gray-500 mt-1 uppercase tracking-widest">Nivel de Rebote</div>
                        </div>
                        <div className="text-right">
                          <div className={cn(
                            "text-lg font-bold",
                            (data.analisis_tecnico.distancia_soporte_porcentaje || 0) < 5 ? "text-green-400" : "text-gray-400"
                          )}>
                            {data.analisis_tecnico.distancia_soporte_porcentaje !== undefined ? `${data.analisis_tecnico.distancia_soporte_porcentaje}%` : "N/A"}
                          </div>
                          <div className="text-[10px] text-gray-500 uppercase">Distancia</div>
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-600 mt-6 leading-tight">
                        Niveles detectados: {data.analisis_tecnico.soportes?.join(", ") || "Ninguno"}
                      </p>
                    </div>
                  </div>

                  {/* Gráfico Histórico */}
                  {data.analisis_tecnico.historico && data.analisis_tecnico.historico.length > 0 && (
                    <div className="mt-6 glass-card p-6">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                        <div>
                          <span className="text-sm text-gray-400 font-bold">Evolución del Precio</span>
                          <span className="text-xs text-gray-500 font-mono ml-2 uppercase">({periodo})</span>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-4">
                          {/* Botones de Periodo */}
                          <div className="flex bg-[#111] border border-white/10 rounded-xl p-1 gap-1">
                            {[
                              { label: '1A', value: '1y' },
                              { label: '2A', value: '2y' },
                              { label: '3A', value: '3y' },
                              { label: '5A', value: '5y' },
                              { label: '10A', value: '10y' },
                            ].map((p) => (
                              <button
                                key={p.value}
                                onClick={() => setPeriodo(p.value)}
                                className={cn(
                                  "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                                  periodo === p.value ? "bg-green-600 text-white shadow-lg shadow-green-500/20" : "text-gray-400 hover:text-white hover:bg-white/5"
                                )}
                              >
                                {p.label}
                              </button>
                            ))}
                          </div>

                          {/* Botones de Tipo de Gráfico */}
                          <div className="flex bg-[#111] border border-white/10 rounded-xl p-1 gap-1">
                            {[
                              { label: 'Área', value: 'area' },
                              { label: 'Velas', value: 'velas' },
                            ].map((t) => (
                              <button
                                key={t.value}
                                onClick={() => setTipoGrafico(t.value as any)}
                                className={cn(
                                  "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                                  tipoGrafico === t.value ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20" : "text-gray-400 hover:text-white hover:bg-white/5"
                                )}
                              >
                                {t.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          {tipoGrafico === 'velas' ? (
                            <ComposedChart data={data.analisis_tecnico.historico}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                              <XAxis 
                                dataKey="date" 
                                stroke="rgba(255,255,255,0.2)" 
                                tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 10}} 
                                tickFormatter={(val) => {
                                  const date = new Date(val);
                                  return `${date.toLocaleString('default', { month: 'short' })} '${date.getFullYear().toString().slice(-2)}`;
                                }}
                                minTickGap={30}
                              />
                              <YAxis 
                                domain={['dataMin - 10', 'auto']} 
                                hide 
                              />
                              <Tooltip 
                                content={({ active, payload, label }) => {
                                  if (active && payload && payload.length) {
                                    const dataPoint = payload[0].payload;
                                    return (
                                      <div className="glass-card px-4 py-3 border border-white/10 shadow-2xl bg-[#1a1a1a] min-w-[160px]">
                                        <p className="text-[10px] text-gray-400 mb-2 font-mono border-b border-white/10 pb-1">{label}</p>
                                        <div className="space-y-1 text-xs">
                                          <div className="flex justify-between gap-4">
                                            <span className="text-gray-400">Open:</span>
                                            <span className="font-bold text-white">${dataPoint.open?.toFixed(2)}</span>
                                          </div>
                                          <div className="flex justify-between gap-4">
                                            <span className="text-gray-400">High:</span>
                                            <span className="font-bold text-green-400">${dataPoint.high?.toFixed(2)}</span>
                                          </div>
                                          <div className="flex justify-between gap-4">
                                            <span className="text-gray-400">Low:</span>
                                            <span className="font-bold text-red-400">${dataPoint.low?.toFixed(2)}</span>
                                          </div>
                                          <div className="flex justify-between gap-4 border-t border-white/5 pt-1 mt-1">
                                            <span className="text-gray-400">Close:</span>
                                            <span className={cn("font-bold", dataPoint.close >= dataPoint.open ? "text-green-400" : "text-red-400")}>
                                              ${dataPoint.close?.toFixed(2)}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                              <Bar 
                                dataKey="close" 
                                shape={(props: any) => {
                                  const minClose = Math.min(...(data.analisis_tecnico.historico || []).map(d => d.close));
                                  return <CustomCandlestick {...props} baseVal={minClose - 10} />;
                                }}
                              />
                            </ComposedChart>
                          ) : (
                            <AreaChart data={data.analisis_tecnico.historico}>
                              <defs>
                                <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                              <XAxis 
                                dataKey="date" 
                                stroke="rgba(255,255,255,0.2)" 
                                tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 10}} 
                                tickFormatter={(val) => {
                                  const date = new Date(val);
                                  return `${date.toLocaleString('default', { month: 'short' })} '${date.getFullYear().toString().slice(-2)}`;
                                }}
                                minTickGap={30}
                              />
                              <YAxis 
                                domain={['dataMin - 10', 'auto']} 
                                hide 
                              />
                              <Tooltip 
                                content={({ active, payload, label }) => {
                                  if (active && payload && payload.length) {
                                    return (
                                      <div className="glass-card px-3 py-2 border border-white/10 shadow-2xl bg-[#1a1a1a]">
                                        <p className="text-[10px] text-gray-400 mb-1 font-mono">{label}</p>
                                        <p className="text-sm font-bold text-green-400">${(payload[0].value as number).toFixed(2)}</p>
                                      </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                              <Area 
                                type="monotone" 
                                dataKey="close" 
                                stroke="#22c55e" 
                                strokeWidth={2}
                                fillOpacity={1} 
                                fill="url(#colorClose)" 
                              />
                            </AreaChart>
                          )}
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>
              {/* Nueva Sección: Notas del Analista IA */}
              <div className="mt-8 pt-8 border-t border-white/5">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Activity className="w-5 h-5 text-purple-400" />
                    Notas del Analista IA (Deep Analysis)
                  </h2>
                  {!iaData && !loadingIa && (
                    <button 
                      onClick={handleIaAnalysis}
                      className="bg-purple-600 hover:bg-purple-50 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2"
                    >
                      <Activity className="w-4 h-4" />
                      Ejecutar Análisis Profundo
                    </button>
                  )}
                </div>

                {loadingIa && (
                  <div className="glass-card p-12 flex flex-col items-center justify-center gap-4 animate-pulse">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                    <p className="text-gray-400 text-sm font-mono">Procesando noticias y comunicados con Gemini...</p>
                  </div>
                )}

                {iaData && (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-in zoom-in-95 duration-500">
                    {/* Riesgos */}
                    <div className="md:col-span-5 glass-card p-6 border-l-4 border-l-red-500">
                      <h3 className="text-red-400 text-xs font-bold uppercase tracking-widest mb-4">3 Riesgos Estructurales (5 Años)</h3>
                      <ul className="space-y-4">
                        {iaData.riesgos_estructurales.map((riesgo, i) => (
                          <li key={i} className="flex gap-3 items-start">
                            <span className="text-red-500/50 font-black text-lg">0{i+1}</span>
                            <p className="text-sm text-gray-300 leading-snug">{riesgo}</p>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Moat y Sentimiento */}
                    <div className="md:col-span-7 flex flex-col gap-6">
                      <div className="glass-card p-6 flex-1">
                        <h3 className="text-purple-400 text-xs font-bold uppercase tracking-widest mb-3">Ventaja Competitiva (Moat)</h3>
                        <p className="text-gray-300 text-sm leading-relaxed italic">
                          &ldquo;{iaData.moat}&rdquo;
                        </p>
                      </div>
                      
                      <div className="flex gap-6">
                        <div className="glass-card p-6 flex-1 flex flex-col justify-center items-center">
                          <div className="text-xs text-gray-500 uppercase mb-2">Confianza Directiva</div>
                          <div className="text-4xl font-black text-white">{iaData.sentimiento_score}<span className="text-gray-600 text-lg">/10</span></div>
                        </div>
                        <div className="glass-card p-6 flex-2 flex flex-col justify-between">
                          <div>
                            <h3 className="text-gray-500 text-[10px] uppercase mb-2">Resumen del Analista</h3>
                            <p className={cn("text-xs text-gray-400 leading-relaxed transition-all duration-300", !showFullSummary && "line-clamp-3")}>
                              {iaData.resumen_analista}
                            </p>
                          </div>
                          <button 
                            onClick={() => setShowFullSummary(!showFullSummary)}
                            className="text-[10px] text-purple-400 hover:text-purple-300 mt-3 self-start font-bold underline tracking-wider transition-colors"
                          >
                            {showFullSummary ? "VER MENOS" : "VER MÁS"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Mini-Chatbot Conversacional */}
                <div className="mt-8 glass-card p-6 border border-purple-500/20 bg-[#121212]">
                  <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-3">
                    <Activity className="w-5 h-5 text-purple-400" />
                    <div>
                      <h3 className="text-sm font-bold text-white">Asistente IA Quantix</h3>
                      <p className="text-[10px] text-gray-400 font-mono">Preguntas libres sobre {data.ticker}</p>
                    </div>
                  </div>

                  {/* Historial de Chat */}
                  <div className="space-y-3 mb-4 max-h-[250px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10">
                    {chatHistorial.length === 0 ? (
                      <p className="text-xs text-gray-500 italic text-center py-6 font-mono">
                        Haz una pregunta sobre los márgenes, deuda o proyecciones de {data.ticker}...
                      </p>
                    ) : (
                      chatHistorial.map((msg, index) => (
                        <div
                          key={index}
                          className={cn(
                            "flex flex-col max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed animate-in fade-in duration-300",
                            msg.role === "Usuario" 
                              ? "bg-purple-600/30 text-purple-100 border border-purple-500/30 self-end ml-auto rounded-br-none" 
                              : "bg-[#1e1e1e] text-gray-200 border border-white/5 self-start mr-auto rounded-bl-none"
                          )}
                        >
                          <span className="text-[9px] font-mono text-purple-400 font-bold mb-1 uppercase tracking-wider">
                            {msg.role}
                          </span>
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      ))
                    )}

                    {chatEscribiendo && (
                      <div className="bg-[#1e1e1e] text-gray-400 border border-white/5 rounded-2xl rounded-bl-none p-3 text-xs self-start w-fit flex items-center gap-2 animate-pulse">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                        <span className="font-mono text-[10px]">Analizando con Gemini...</span>
                      </div>
                    )}
                  </div>

                  {/* Input de Chat Optimizado para Móviles (Estado Aislado) */}
                  <ChatInputForm 
                    onSubmit={handleChatSubmit} 
                    chatEscribiendo={chatEscribiendo} 
                    ticker={data.ticker} 
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

        {/* PESTAÑA 2: CARTERA DE SEGUIMIENTO */}
        {activeTab === 'watchlist' && (
          <div className="animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Award className="w-6 h-6 text-yellow-500" />
                Mi Cartera de Seguimiento
              </h2>
              <span className="text-gray-500 text-xs font-mono uppercase">{watchlist.length} ACTIVOS</span>
            </div>

            {watchlist.length === 0 ? (
              <div className="bg-[#111] border border-dashed border-white/10 rounded-2xl py-12 text-center text-gray-500">
                No tienes acciones en seguimiento actualmente
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {watchlist.map((item) => (
                  <WatchlistCard 
                    key={item.ticker} 
                    item={item} 
                    removeFromWatchlist={removeFromWatchlist} 
                    formatCurrency={formatCurrency} 
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer Profesional Quantix */}
      <footer className="max-w-6xl mx-auto mt-24 pt-12 pb-16 border-t border-white/10 text-gray-400 font-sans">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12">
          {/* Marca y Descripción */}
          <div className="space-y-4 max-w-2xl">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Quantix Logo" className="w-8 h-8 rounded-xl shadow-green-500/10 shadow-lg border border-white/10" />
              <span className="text-xl font-black tracking-tight text-white">QUANTIX</span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Terminal avanzada de análisis fundamental y cuantitativo. Diseñada con modelos de Flujo de Caja Descontado (DCF), vigilancia algorítmica de soportes y resúmenes de inteligencia artificial.
            </p>
          </div>

          {/* Aviso Legal */}
          <div className="text-[10px] text-gray-600 bg-[#111] p-4 rounded-2xl border border-white/5 leading-normal max-w-md">
            <span className="font-bold text-gray-400">Aviso Legal:</span> La información y veredictos generados por Quantix tienen un propósito estrictamente educativo e informativo. No representan asesoramiento financiero ni recomendaciones formales de inversión.
          </div>
        </div>

        {/* Barra Inferior del Copyright */}
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-[11px] text-gray-600">
          <div>
            © {new Date().getFullYear()} Quantix Inc. Todos los derechos reservados.
          </div>
          <div className="flex gap-6 text-gray-500 font-medium">
            <a href="#" className="hover:text-gray-400 transition-colors">Términos de Uso</a>
            <a href="#" className="hover:text-gray-400 transition-colors">Privacidad</a>
            <a href="#" className="hover:text-gray-400 transition-colors">API Docs</a>
            <a href="#" className="hover:text-gray-400 transition-colors">Soporte</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
