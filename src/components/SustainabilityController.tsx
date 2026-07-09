import React, { useState } from "react";
import { Stadium, StadiumLiveTelemetry } from "../types";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Zap, Sun, ShieldAlert, Sparkles, RefreshCw, Layers, Check, Thermometer, Wind, Eye } from "lucide-react";
import { motion } from "motion/react";

interface SustainabilityControllerProps {
  stadiums: Stadium[];
  telemetries: Record<string, StadiumLiveTelemetry>;
  selectedStadiumId: string;
  onToggleSleepMode: (id: string, active: boolean) => Promise<void>;
  isTogglingSleep: boolean;
}

export default function SustainabilityController({
  stadiums,
  telemetries,
  selectedStadiumId,
  onToggleSleepMode,
  isTogglingSleep,
}: SustainabilityControllerProps) {
  const currentStadium = stadiums.find((s) => s.id === selectedStadiumId) || stadiums[0];
  const liveTelemetry = telemetries[selectedStadiumId];

  // State for AI recommendations agent
  const [recommendations, setRecommendations] = useState("");
  const [isQueryingAI, setIsQueryingAI] = useState(false);

  // Load recommendations from Gemini
  const fetchAIRecommendations = async () => {
    setIsQueryingAI(true);
    try {
      const response = await fetch("/api/sustainability/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stadiumId: selectedStadiumId }),
      });
      const data = await response.json();
      setRecommendations(data.recommendations);
    } catch (err) {
      console.error(err);
      setRecommendations("Failed to retrieve recommendation logs. Verify server connection.");
    } finally {
      setIsQueryingAI(false);
    }
  };

  // Generate historical travel vs ops carbon data based on stadium capacity
  const generateCarbonData = () => {
    const baseTravel = currentStadium.current_crowd * 0.012; // average travel carbon per fan
    const baseOps = (liveTelemetry?.power_usage_kwh || (currentStadium.capacity * 0.008)) * 0.00045; // average kwh carbon conversion

    const data = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const hourStr = new Date(now.getTime() - i * 60 * 60 * 1000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const varianceTravel = (Math.random() - 0.5) * (baseTravel * 0.1);
      const varianceOps = (Math.random() - 0.5) * (baseOps * 0.08);

      data.push({
        time: hourStr,
        "Travel Carbon (Tons CO2e)": Math.round((baseTravel + varianceTravel) * 10) / 10,
        "Operations Carbon (Tons CO2e)": Math.round((baseOps + varianceOps) * 10) / 10,
      });
    }
    return data;
  };

  const carbonData = generateCarbonData();
  const isSleepActive = liveTelemetry?.ai_sleep_mode_active;

  return (
    <div className="space-y-6">
      {/* Module Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111827] p-5 rounded-lg border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-white tracking-tight">
              Sustainability & Digital Twin Controller
            </h2>
            <p className="text-slate-400 text-xs">
              Live power grid balancing, automated carbon offsets, and automated AI sleep protocols.
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Digital Twin & Carbon Footprint Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Digital Twin layout (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#111827] p-5 rounded-lg border border-slate-800 flex flex-col justify-between h-full space-y-4">
            <div className="space-y-4">
              <h3 className="text-sm font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
                Digital Twin Smart meter Grid
                <span className="text-[10px] text-slate-500 font-sans normal-case">Operational parameters</span>
              </h3>

              {/* Status display showing real-time feedback */}
              <div className="bg-slate-950/60 p-4 rounded-lg border border-slate-800/80 space-y-4 relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-mono text-slate-500 block">REAL-TIME GRID CONSUMPTION</span>
                    <span className="text-3xl font-bold font-mono text-white tracking-tight">
                      {liveTelemetry?.power_usage_kwh?.toLocaleString() || "0"}{" "}
                      <span className="text-xs font-normal text-slate-400">kWh</span>
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-2.5 py-1 rounded font-bold border ${
                      isSleepActive
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-slate-800 text-slate-400 border-slate-700/50"
                    }`}
                  >
                    {isSleepActive ? "AI SLEEP ENFORCED" : "STANDARD OPERATING"}
                  </span>
                </div>

                {/* Simulated twin specs */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="bg-slate-900/40 p-3 rounded border border-slate-800/60 flex items-center gap-2">
                    <Thermometer className="w-4 h-4 text-orange-400" />
                    <div>
                      <span className="text-[9px] text-slate-500 font-mono uppercase block">Zone Temperature</span>
                      <span className="text-xs font-semibold text-slate-200 block font-mono">
                        {currentStadium.temp_f}°F
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-900/40 p-3 rounded border border-slate-800/60 flex items-center gap-2">
                    <Wind className="w-4 h-4 text-cyan-400" />
                    <div>
                      <span className="text-[9px] text-slate-500 font-mono uppercase block">Humidity Matrix</span>
                      <span className="text-xs font-semibold text-slate-200 block font-mono">
                        {currentStadium.humidity_pct}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* HVAC and Lighting bars */}
                <div className="space-y-3 pt-1 border-t border-slate-800/60">
                  <div>
                    <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-0.5">
                      <span>HVAC Load Enclosures</span>
                      <span>{liveTelemetry?.hvac_load_pct || 0}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyan-500 transition-all duration-1000"
                        style={{ width: `${liveTelemetry?.hvac_load_pct || 0}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-0.5">
                      <span>Floodlights & High-Mast Grids</span>
                      <span>{liveTelemetry?.lighting_load_pct || 0}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-500 transition-all duration-1000"
                        style={{ width: `${liveTelemetry?.lighting_load_pct || 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Explain carbon offsets */}
              <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-800/40 text-[11px] text-slate-400 leading-relaxed space-y-1">
                <div className="text-slate-300 font-mono font-semibold uppercase tracking-wider text-[10px]">
                  Power Reduction Impact:
                </div>
                <p>
                  Enforcing the <strong>AI Sleep Mode</strong> automatically downcycles the stadium HVAC systems, activates variable speed chiller fans, and drops floodlight intensity in non-occupied pathways by 30%. This saves thousands of kilograms in carbon outputs hourly.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800">
              <button
                onClick={() => onToggleSleepMode(currentStadium.id, !isSleepActive)}
                disabled={isTogglingSleep}
                className={`w-full py-3 rounded-lg text-xs font-mono uppercase tracking-wider font-bold border transition-all flex items-center justify-center gap-2 ${
                  isSleepActive
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500 hover:text-white"
                    : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                }`}
              >
                {isTogglingSleep ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Updating Grid Telemetry...
                  </>
                ) : isSleepActive ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" /> AI Sleep Mode Active (Power Saved: 30%)
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-yellow-500" /> Activate AI Sleep Mode (-30% Grid Load)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Center-Right: Comparative Carbon Footprint Tracking (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#111827] p-5 rounded-lg border border-slate-800 space-y-4">
            <h3 className="text-sm font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
              Simulated Carbon Emissions comparative report
              <span className="text-xs text-slate-500 font-sans normal-case">Travel vs Operations</span>
            </h3>

            {/* Recharts Area Chart */}
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={carbonData} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorTravel" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorOps" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0A0C10", border: "1px solid #1e293b", borderRadius: "8px" }}
                    labelStyle={{ color: "#ffffff", fontWeight: "bold", fontFamily: "monospace" }}
                  />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: "11px", fontFamily: "monospace" }} />
                  <Area
                    type="monotone"
                    dataKey="Travel Carbon (Tons CO2e)"
                    stroke="#3b82f6"
                    fillOpacity={1}
                    fill="url(#colorTravel)"
                  />
                  <Area
                    type="monotone"
                    dataKey="Operations Carbon (Tons CO2e)"
                    stroke="#10b981"
                    fillOpacity={1}
                    fill="url(#colorOps)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* AI Sustainability Agent Recommendations Row */}
            <div className="border-t border-slate-800/80 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
                  Gemini Sustainability recommendation report
                </span>
                <button
                  onClick={fetchAIRecommendations}
                  disabled={isQueryingAI}
                  className="bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/30 px-3 py-1.5 rounded-lg text-[10px] font-mono transition-colors flex items-center gap-1"
                >
                  {isQueryingAI ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Computing report...
                    </>
                  ) : recommendations ? (
                    "Re-Run Gemini Agent"
                  ) : (
                    "Consult Gemini AI"
                  )}
                </button>
              </div>

              {isQueryingAI ? (
                <div className="bg-slate-950 p-6 rounded-lg border border-slate-800 flex flex-col items-center justify-center space-y-3 text-center">
                  <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin" />
                  <div className="space-y-0.5 text-xs">
                    <span className="text-slate-300 font-mono block">Scrutinizing environmental stress levels...</span>
                    <span className="text-slate-500 block font-sans">
                      Sustainability Tip: Pre-chilling stadium bowl before occupancy saves up to 15% operations load.
                    </span>
                  </div>
                </div>
              ) : recommendations ? (
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-850 text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-line border-l-4 border-l-emerald-500">
                  {recommendations}
                </div>
              ) : (
                <div className="bg-slate-950/40 p-6 rounded-lg border border-slate-800/60 text-center text-xs text-slate-500 flex flex-col items-center justify-center space-y-2">
                  <Sparkles className="w-8 h-8 text-slate-700" />
                  <p>
                    Request custom energy saving protocols from our Gemini agent based on occupancy and climatic moisture matrices.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
