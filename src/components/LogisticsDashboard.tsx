import React from "react";
import { Stadium, TransitMetric } from "../types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from "recharts";
import { Navigation, Compass, AlertTriangle, Play, RefreshCw, Layers, CheckCircle2, Train, Bus } from "lucide-react";
import { motion } from "motion/react";

interface LogisticsDashboardProps {
  stadiums: Stadium[];
  transitMetrics: Record<string, TransitMetric>;
  selectedStadiumId: string;
  onTriggerStressTest: (id: string, active: boolean) => Promise<void>;
  isStressTesting: boolean;
}

export default function LogisticsDashboard({
  stadiums,
  transitMetrics,
  selectedStadiumId,
  onTriggerStressTest,
  isStressTesting,
}: LogisticsDashboardProps) {
  const currentStadium = stadiums.find((s) => s.id === selectedStadiumId) || stadiums[0];
  const transit = transitMetrics[selectedStadiumId];

  // Prep data for comparison Chart (Transit Infrastructure Index vs Stadium Capacity)
  const chartData = stadiums.map((s) => {
    const t = transitMetrics[s.id];
    return {
      name: s.name.replace(" Stadium", "").replace("Estadio ", ""),
      "Transit Index": s.transit_index,
      "Bus Utilization %": t ? t.bus_utilization_pct : 0,
      "Rail Utilization %": t ? t.rail_utilization_pct : 0,
    };
  });

  // Calculate stress status
  const isStressActive = transit?.stress_test_active;

  return (
    <div className="space-y-6">
      {/* Module Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111827] p-5 rounded-lg border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-500/10 text-purple-400 rounded-lg border border-purple-500/20">
            <Navigation className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-white tracking-tight">
              Logistics & Transit Command Deck
            </h2>
            <p className="text-slate-400 text-xs">
              Transit infrastructure analysis, comparative egress indexes, and crowd evacuation simulations.
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Stress Test Simulator & Transit Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Extraction Stress Test Simulator (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#111827] p-5 rounded-lg border border-slate-800 space-y-4 flex flex-col justify-between h-full">
            <div className="space-y-4">
              <h3 className="text-sm font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
                90-Min Stadium Extraction Stress Test
                <span className="text-xs text-slate-500 font-sans normal-case">Operational simulator</span>
              </h3>

              <div className="bg-slate-950/60 p-4 rounded-lg border border-slate-800/80 space-y-3 relative overflow-hidden">
                {isStressActive && (
                  <div className="absolute top-0 left-0 w-full h-0.5 bg-red-500 animate-pulse"></div>
                )}

                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-mono text-slate-500 block">EST. EXTRACTION COUNTDOWN</span>
                    <span className={`text-3xl font-bold font-mono ${isStressActive ? "text-red-400 animate-pulse" : "text-white"}`}>
                      {transit?.estimated_extraction_time_mins || 0} <span className="text-xs font-normal">mins</span>
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                      isStressActive
                        ? "bg-red-500/10 text-red-400 border border-red-500/20"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {isStressActive ? "STRESS ACTIVE" : "STANDBY"}
                  </span>
                </div>

                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-[11px] font-mono text-slate-400">
                      <span className="flex items-center gap-1">
                        <Bus className="w-3 h-3 text-cyan-400" /> Bus Utilization
                      </span>
                      <span>{transit?.bus_utilization_pct || 0}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-1000 ${isStressActive ? "bg-red-500" : "bg-cyan-500"}`}
                        style={{ width: `${transit?.bus_utilization_pct || 0}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-mono text-slate-400">
                      <span className="flex items-center gap-1">
                        <Train className="w-3 h-3 text-purple-400" /> Light Rail Utilization
                      </span>
                      <span>{transit?.rail_utilization_pct || 0}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-1000 ${isStressActive ? "bg-red-500" : "bg-purple-500"}`}
                        style={{ width: `${transit?.rail_utilization_pct || 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-800/60">
                  <span>EGRESS SPEED: {transit?.egress_rate_pax_min || 0} pax/min</span>
                  <span>TIME ELAPSED: {transit?.stress_test_active ? `${transit?.stress_test_elapsed_mins || 0}m` : "0m"}</span>
                </div>
              </div>

              <div className="p-4 bg-slate-950/40 rounded-lg border border-slate-800/40 text-xs text-slate-400 leading-relaxed font-sans space-y-1.5">
                <div className="text-slate-300 font-mono text-[10px] font-semibold flex items-center gap-1.5 uppercase">
                  <Compass className="w-4 h-4 text-purple-400" />
                  What is a 90-minute Extraction?
                </div>
                <p>
                  World Cup security directives mandate complete stadium bowl clearing and heavy egress routing to mass transportation channels within 90 minutes. 
                  Toggling the stress test puts regional rail/buses into extreme hyper-capacity protocols, simulating the high-density load on the current venue.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800">
              <button
                onClick={() => onTriggerStressTest(currentStadium.id, !isStressActive)}
                disabled={isStressTesting}
                className={`w-full py-3 rounded-lg text-xs font-mono uppercase tracking-wider font-bold border transition-all flex items-center justify-center gap-2 ${
                  isStressActive
                    ? "bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500 hover:text-white"
                    : "bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500 hover:text-white"
                }`}
              >
                {isStressTesting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Synchronizing Simulation...
                  </>
                ) : isStressActive ? (
                  <>
                    <AlertTriangle className="w-4 h-4" /> Stop Egress Simulation
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 text-purple-400" /> Activate Egress Stress Test
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Comparative Transit Infrastructure Index (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#111827] p-5 rounded-lg border border-slate-800 space-y-4">
            <h3 className="text-sm font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
              Host Venue Transit Capacity comparisons
              <span className="text-xs text-slate-500 font-sans normal-case">Recharts Comparison</span>
            </h3>

            {/* Recharts Bar Chart */}
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0A0C10", border: "1px solid #1e293b", borderRadius: "8px" }}
                    labelStyle={{ color: "#ffffff", fontWeight: "bold", fontFamily: "monospace" }}
                  />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: "11px", fontFamily: "monospace" }} />
                  <Bar dataKey="Transit Index" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Transit Infrastructure Index" />
                  <Bar dataKey="Bus Utilization %" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Bus Capacity Load" />
                  <Bar dataKey="Rail Utilization %" fill="#a855f7" radius={[4, 4, 0, 0]} name="Light Rail Capacity Load" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Host Cities Grid detail list */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-2">
              {stadiums.map((s) => {
                const metric = transitMetrics[s.id];
                return (
                  <div key={s.id} className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/60 space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 block truncate font-bold">{s.name}</span>
                    <span className="text-xs text-slate-500 block truncate">{s.city.split(",")[0]}</span>
                    <div className="flex items-center justify-between text-[11px] font-mono pt-1">
                      <span className="text-slate-400">Idx: {s.transit_index}</span>
                      <span className={`font-semibold ${metric?.stress_test_active ? "text-red-400 animate-pulse" : "text-emerald-400"}`}>
                        {metric?.stress_test_active ? "Simulating" : "Nominal"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
