"use client";

import { useState, useEffect } from "react";
import { Search, Activity, DollarSign, Award, ArrowUpRight, ArrowDownRight, Loader2 } from "lucide-react";
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
  };
  valor_intrinseco: {
    dcf: number | null;
    precio_actual: number | null;
    fecha: string;
    margen_seguridad_porcentaje: number | null;
    infravalorada: boolean;
  };
  analisis_tecnico: {
    rsi: number | null;
    rsi_mensaje: string;
    soportes: number[];
    soporte_cercano: number | null;
    distancia_soporte_porcentaje: number | null;
    precio_actual: number;
  };
  veredicto_final: string;
}

interface IAResult {
  riesgos_estructurales: string[];
  moat: string;
  sentimiento_score: number;
  resumen_analista: string;
  error?: string;
}

export default function Home() {
  const [ticker, setTicker] = useState("");
  const [data, setData] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
   const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [iaData, setIaData] = useState<IAResult | null>(null);
  const [loadingIa, setLoadingIa] = useState(false);

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
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker) return;

    setLoading(true);
    setError("");
    setSuccess("");
    setData(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/analizar/${ticker.toUpperCase()}`);
      if (!response.ok) {
        throw new Error("No se pudo obtener el análisis. Verifica el Ticker.");
      }
      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
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
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/watchlist/${ticker}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchWatchlist();
      }
    } catch (err) {
      console.error("Error removing from watchlist:", err);
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
        <div>
          <h1 className="text-3xl font-bold tracking-tighter bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">
            FINANZA
          </h1>
          <div className="flex items-center gap-2">
            <p className="text-gray-500 text-sm">Terminal de Análisis Fundamental</p>
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

        <form onSubmit={handleSearch} className="relative w-full md:w-96 group">
          <input
            type="text"
            placeholder="Buscar Ticker (ej: AAPL, TSLA, NVDA)..."
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
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
      </header>

      <main className="max-w-6xl mx-auto">
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
                  <h3 className="text-gray-400 text-sm mb-4">Ratios de Calidad</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">ROE</span>
                      <span className={cn("text-lg font-bold", (data.ratios_salud.roe || 0) > 0.15 ? "text-green-400" : "text-yellow-400")}>
                        {formatPercent(data.ratios_salud.roe)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Deuda / EBITDA</span>
                      <span className={cn("text-lg font-bold", (data.ratios_salud.deuda_ebitda || 0) < 3 ? "text-green-400" : "text-red-400")}>
                        {data.ratios_salud.deuda_ebitda?.toFixed(2) || "N/A"}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-white/5 space-y-1">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Margen Bruto</span>
                        <span>{formatPercent(data.ratios_salud.margen_bruto)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Margen Neto</span>
                        <span>{formatPercent(data.ratios_salud.margen_neto)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tarjeta de Valoración */}
              <div className="glass-card p-6 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-6">
                  <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <span className="text-xs text-gray-500 font-mono">DCF MODEL</span>
                </div>
                <div>
                  <h3 className="text-gray-400 text-sm mb-4">Valor Intrínseco</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Valor Estimado</span>
                      <span className="text-lg font-bold text-white">
                        {formatCurrency(data.valor_intrinseco.dcf)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Precio Actual</span>
                      <span className="text-lg font-bold text-gray-300">
                        {formatCurrency(data.valor_intrinseco.precio_actual)}
                      </span>
                    </div>
                    <div className={cn(
                      "mt-4 p-3 rounded-lg flex justify-between items-center",
                      data.valor_intrinseco.infravalorada ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                    )}>
                      <span className="text-xs font-bold uppercase tracking-wider">Margen de Seguridad</span>
                      <span className="text-sm font-mono flex items-center gap-1">
                        {data.valor_intrinseco.infravalorada ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                        {data.valor_intrinseco.margen_seguridad_porcentaje}%
                      </span>
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
                  <h3 className="text-gray-400 text-sm mb-2">Análisis Final</h3>
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
                      data.analisis_tecnico.rsi_mensaje === "Neutral" ? "bg-white/5 text-gray-400" :
                      data.analisis_tecnico.rsi_mensaje.includes("Sobreventa") ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                    )}>
                      {data.analisis_tecnico.rsi_mensaje}
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
                        {data.analisis_tecnico.distancia_soporte_porcentaje}%
                      </div>
                      <div className="text-[10px] text-gray-500 uppercase">Distancia</div>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-600 mt-6 leading-tight">
                    Niveles detectados en los últimos 12 meses: {data.analisis_tecnico.soportes.join(", ")}
                  </p>
                </div>
            </div>
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
                  className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2"
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
                      "{iaData.moat}"
                    </p>
                  </div>
                  
                  <div className="flex gap-6">
                    <div className="glass-card p-6 flex-1 flex flex-col justify-center items-center">
                      <div className="text-xs text-gray-500 uppercase mb-2">Confianza Directiva</div>
                      <div className="text-4xl font-black text-white">{iaData.sentimiento_score}<span className="text-gray-600 text-lg">/10</span></div>
                    </div>
                    <div className="glass-card p-6 flex-[2]">
                      <h3 className="text-gray-500 text-[10px] uppercase mb-2">Resumen del Analista</h3>
                      <p className="text-xs text-gray-400 line-clamp-3">{iaData.resumen_analista}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

        {/* Sección: Cartera de Seguimiento */}
        <div className="mt-16 pt-16 border-t border-white/5">
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
                <div key={item.ticker} className="glass-card p-4 group relative overflow-hidden">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="text-xl font-black">{item.ticker}</div>
                      <div className="text-[10px] text-gray-500 font-mono">{item.fecha_analisis}</div>
                    </div>
                    <button 
                      onClick={() => removeFromWatchlist(item.ticker)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-red-500/10 text-gray-500 hover:text-red-400 rounded-lg"
                    >
                      <ArrowDownRight className="w-4 h-4 rotate-45" />
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Fair Price</span>
                      <span className="font-bold text-green-400">{formatCurrency(item.precio_objetivo)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Soporte</span>
                      <span className="font-bold text-blue-400">{formatCurrency(item.soporte_tecnico)}</span>
                    </div>
                  </div>

                  <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-green-500/20 to-transparent" />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="max-w-6xl mx-auto mt-24 pt-8 border-t border-white/5 text-gray-600 text-[10px] uppercase tracking-[0.2em] text-center">
        Finanza AI — Análisis Algorítmico de Activos Financieros
      </footer>
    </div>
  );
}
