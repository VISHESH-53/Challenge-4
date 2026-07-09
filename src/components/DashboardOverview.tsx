import React from "react";
import { Stadium, IncidentReport, TransitMetric, StadiumLiveTelemetry } from "../types";
import { Users, Zap, ShieldAlert, Navigation, Sun, CloudRain, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { motion } from "motion/react";

interface DashboardOverviewProps {
  stadiums: Stadium[];
  incidents: IncidentReport[];
  telemetries: Record<string, StadiumLiveTelemetry>;
  transitMetrics: Record<string, TransitMetric>;
  selectedStadiumId: string;
  setSelectedStadiumId: (id: string) => void;
  onNavigateToTab: (tab: string) => void;
}

export default function DashboardOverview({
  stadiums,
  incidents,
  telemetries,
  transitMetrics,
  selectedStadiumId,
  setSelectedStadiumId,
  onNavigateToTab,
}: DashboardOverviewProps) {
  const currentStadium = stadiums.find((s) => s.id === selectedStadiumId) || stadiums[0];
  const liveTelemetry = telemetries[selectedStadiumId];
  const transit = transitMetrics[selectedStadiumId];

  // Calculated overview stats
  const activeAlertsCount = incidents.filter((i) => i.status !== "RESOLVED").length;
  const criticalAlertsCount = incidents.filter(
    (i) => i.severity === "CRITICAL" || i.severity === "HIGH"
  ).length;

  const totalCapacityAll = stadiums.reduce((sum, s) => sum + s.capacity, 0);
  const totalCrowdAll = stadiums.reduce((sum, s) => sum + s.current_crowd, 0);

  // Quick weather description based on humidity/temp
  const getWeatherDesc = (temp: number, hum: number) => {
    if (temp > 90) return { label: "Severe Heat Alert", color: "text-amber-500", icon: Sun };
    if (hum > 80) return { label: "High Humidity", color: "text-blue-400", icon: CloudRain };
    return { label: "Optimal Climate", color: "text-emerald-400", icon: Sun };
  };

  const weather = getWeatherDesc(currentStadium.temp_f, currentStadium.humidity_pct);
  const WeatherIcon = weather.icon;

  return (
    <div className="space-y-6">
      {/* Top Header Selector & Time */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111827] p-5 rounded-lg border border-slate-800">
        <div>
          <h2 className="text-xl md:text-2xl font-display font-bold tracking-tight text-white flex items-center gap-2">
            Command Center Overview
            <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Live Node Online
            </span>
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Real-time operations, logistics, sustainability, and fan accessibility telemetry.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs font-mono uppercase text-slate-400 font-medium">Active Arena Selector:</label>
          <select
            value={selectedStadiumId}
            onChange={(e) => setSelectedStadiumId(e.target.value)}
            className="bg-slate-950 text-white font-sans text-sm border border-slate-800 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
          >
            {stadiums.map((stadium) => (
              <option key={stadium.id} value={stadium.id}>
                {stadium.name} ({stadium.city})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Global Stat Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-[#111827] p-5 rounded-lg border border-slate-800 flex items-center gap-4 hover:border-slate-700 transition-colors"
        >
          <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400 border border-blue-500/20">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block">Total Active Crowd</span>
            <span className="text-xl font-semibold text-white tracking-tight">
              {totalCrowdAll.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500 block">Across 5 Host Arenas</span>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          className="bg-[#111827] p-5 rounded-lg border border-slate-800 flex items-center gap-4 hover:border-slate-700 transition-colors"
        >
          <div className="p-3 bg-amber-500/10 rounded-lg text-amber-400 border border-amber-500/20">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block">Active Surgeries</span>
            <span className="text-xl font-semibold text-white tracking-tight">
              {activeAlertsCount} Reports
            </span>
            <span className="text-xs text-amber-500 font-medium block">
              {criticalAlertsCount} High/Critical Severity
            </span>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          className="bg-[#111827] p-5 rounded-lg border border-slate-800 flex items-center gap-4 hover:border-slate-700 transition-colors"
        >
          <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block">Grid Energy Draw</span>
            <span className="text-xl font-semibold text-white tracking-tight">
              {stadiums.reduce((sum, s) => sum + (telemetries[s.id]?.power_usage_kwh || 0), 0).toLocaleString()} kWh
            </span>
            <span className="text-xs text-slate-500 block">
              {stadiums.filter((s) => telemetries[s.id]?.ai_sleep_mode_active).length} AI Sleep Modes Active
            </span>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          className="bg-[#111827] p-5 rounded-lg border border-slate-800 flex items-center gap-4 hover:border-slate-700 transition-colors"
        >
          <div className="p-3 bg-purple-500/10 rounded-lg text-purple-400 border border-purple-500/20">
            <Navigation className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block">Egress Status</span>
            <span className="text-xl font-semibold text-white tracking-tight">
              {stadiums.filter((s) => transitMetrics[s.id]?.stress_test_active).length > 0
                ? "Stress Test Active"
                : "Standard Egress"}
            </span>
            <span className="text-xs text-slate-500 block">Avg Index: 78.8 / 100</span>
          </div>
        </motion.div>
      </div>

      {/* Bento Grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Stadium Crowd Level Bento */}
        <div className="bg-[#111827] border border-slate-800 rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
            Crowd Density Analysis
            <span className="text-xs text-slate-500 font-sans normal-case">Venue Capacity</span>
          </h3>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                <span>{currentStadium.name} ({currentStadium.city})</span>
                <span>
                  {currentStadium.current_crowd.toLocaleString()} / {currentStadium.capacity.toLocaleString()}
                </span>
              </div>
              <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${
                    currentStadium.current_crowd / currentStadium.capacity > 0.9
                      ? "bg-red-500"
                      : currentStadium.current_crowd / currentStadium.capacity > 0.75
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}
                  style={{ width: `${(currentStadium.current_crowd / currentStadium.capacity) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/50">
                <span className="text-xs text-slate-400 block mb-0.5">Crowd Surge Risk</span>
                <span
                  className={`text-sm font-bold font-mono ${
                    liveTelemetry?.crowd_surging_risk === "HIGH"
                      ? "text-red-400"
                      : liveTelemetry?.crowd_surging_risk === "MODERATE"
                      ? "text-amber-400"
                      : "text-emerald-400"
                  }`}
                >
                  {liveTelemetry?.crowd_surging_risk || "LOW"}
                </span>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/50">
                <span className="text-xs text-slate-400 block mb-0.5">Unattended Bags</span>
                <span
                  className={`text-sm font-bold font-mono ${
                    (liveTelemetry?.unattended_bags_count || 0) > 0 ? "text-amber-400" : "text-emerald-400"
                  }`}
                >
                  {liveTelemetry?.unattended_bags_count || 0} Detected
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800/60 pt-4">
            <button
              onClick={() => onNavigateToTab("security")}
              className="w-full py-2.5 text-center text-xs font-mono uppercase tracking-wider text-white bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              Open Camera Surgeries Hub &rarr;
            </button>
          </div>
        </div>

        {/* Center: Sustainability Twin Bento */}
        <div className="bg-[#111827] border border-slate-800 rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
            Sustainability & Digital Twin
            <span className="text-xs text-slate-500 font-sans normal-case">Energy load</span>
          </h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-2xl font-bold font-mono text-white">
                  {liveTelemetry?.power_usage_kwh?.toLocaleString() || "0"} <span className="text-xs font-normal">kWh</span>
                </span>
                <span className="text-xs text-slate-500 block">Current Operating Usage</span>
              </div>
              <div className="text-right">
                <span
                  className={`text-xs font-mono font-medium px-2 py-0.5 rounded-full ${
                    liveTelemetry?.ai_sleep_mode_active
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {liveTelemetry?.ai_sleep_mode_active ? "AI Sleep Mode Active" : "Standard Mode"}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-0.5">
                  <span>Simulated HVAC Load</span>
                  <span>{liveTelemetry?.hvac_load_pct || 0}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-500 transition-all duration-1000"
                    style={{ width: `${liveTelemetry?.hvac_load_pct || 0}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-0.5">
                  <span>Surrounding Lighting Load</span>
                  <span>{liveTelemetry?.lighting_load_pct || 0}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-500 transition-all duration-1000"
                    style={{ width: `${liveTelemetry?.lighting_load_pct || 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800/60 pt-4">
            <button
              onClick={() => onNavigateToTab("sustainability")}
              className="w-full py-2.5 text-center text-xs font-mono uppercase tracking-wider text-white bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              Control Energy sleep parameters &rarr;
            </button>
          </div>
        </div>

        {/* Right: Logistics Transit Bento */}
        <div className="bg-[#111827] border border-slate-800 rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
            Logistics & Fan Egress
            <span className="text-xs text-slate-500 font-sans normal-case">Transit Metric</span>
          </h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-2xl font-bold font-mono text-white">
                  {transit?.estimated_extraction_time_mins || 0} <span className="text-xs font-normal">mins</span>
                </span>
                <span className="text-xs text-slate-500 block">Est. Stadium Extraction</span>
              </div>
              <div>
                {transit?.stress_test_active ? (
                  <span className="text-xs font-mono font-medium px-2.5 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse">
                    Extraction Test Active
                  </span>
                ) : (
                  <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                    Normal Flow
                  </span>
                )}
              </div>
            </div>

            <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/50 grid grid-cols-2 gap-2 text-xs font-mono">
              <div>
                <span className="text-slate-500 block mb-0.5">Egress rate</span>
                <span className="text-slate-200 block font-semibold">
                  {transit?.egress_rate_pax_min || 0} pax / min
                </span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">Transit Index</span>
                <span className="text-slate-200 block font-semibold">{currentStadium.transit_index} / 100</span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800/60 pt-4">
            <button
              onClick={() => onNavigateToTab("logistics")}
              className="w-full py-2.5 text-center text-xs font-mono uppercase tracking-wider text-white bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              Configure stress simulations &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Arena Profile & Live Security alerts Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Arena Profile Panel (Left 1 col) */}
        <div className="bg-[#111827] border border-slate-800 rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-mono uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <WeatherIcon className={`w-4 h-4 ${weather.color}`} />
            Stadium Climate & ESI Profile
          </h3>

          <div className="space-y-3 font-mono text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-800/50">
              <span className="text-slate-500">Host Venue Location</span>
              <span className="text-slate-200">{currentStadium.city}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800/50">
              <span className="text-slate-500">Altitude / Elevation</span>
              <span className="text-slate-200">{currentStadium.elevation_ft.toLocaleString()} ft</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800/50">
              <span className="text-slate-500">Local Ambient Temperature</span>
              <span className="text-slate-200">{currentStadium.temp_f}°F</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800/50">
              <span className="text-slate-500">Relative Humidity</span>
              <span className="text-slate-200">{currentStadium.humidity_pct}%</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">Environmental Stress State</span>
              <span className={`font-bold uppercase ${weather.color}`}>{weather.label}</span>
            </div>
          </div>

          <div className="border-t border-slate-800/60 pt-4">
            <button
              onClick={() => onNavigateToTab("fan")}
              className="w-full py-2.5 text-center text-xs font-mono uppercase tracking-wider text-white bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              Accessibility & translation Portal &rarr;
            </button>
          </div>
        </div>

        {/* Live Alerts Desk Feed (Right 2 cols) */}
        <div className="lg:col-span-2 bg-[#111827] border border-slate-800 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-mono uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
              Live Incident Alerts & AI Diagnoses
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              Showing last {incidents.slice(0, 3).length} incidents
            </span>
          </div>

          <div className="space-y-3">
            {incidents.length === 0 ? (
              <div className="p-8 text-center bg-slate-950/40 rounded-xl border border-slate-800/40 flex flex-col items-center justify-center space-y-2">
                <CheckCircle className="w-8 h-8 text-emerald-500/80" />
                <span className="text-sm font-medium text-slate-300">All Stadium Sectors Secure</span>
                <span className="text-xs text-slate-500">No active incidents reported.</span>
              </div>
            ) : (
              incidents.slice(0, 3).map((report) => {
                const isResolved = report.status === "RESOLVED";
                const isCritical = report.severity === "CRITICAL" || report.severity === "HIGH";

                return (
                  <div
                    key={report.id}
                    className="p-4 bg-slate-950/70 rounded-xl border border-slate-800/60 hover:border-slate-700/80 transition-colors space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                            isCritical
                              ? "bg-red-500/10 text-red-400 border border-red-500/20"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}
                        >
                          {report.severity}
                        </span>
                        <span className="text-xs font-mono text-slate-400">
                          {stadiums.find((s) => s.id === report.stadium_id)?.name || "Venue"} •{" "}
                          {new Date(report.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                          isResolved
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {report.status}
                      </span>
                    </div>

                    <p className="text-sm text-slate-100 font-sans">{report.description}</p>

                    <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800/50 text-xs text-slate-300 space-y-1">
                      <div className="flex items-center gap-1.5 font-mono text-emerald-400 font-bold">
                        <Zap className="w-3.5 h-3.5" />
                        AI Analysis & Mitigation Protocol:
                      </div>
                      <p className="font-sans leading-relaxed text-slate-400">{report.ai_analysis}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
