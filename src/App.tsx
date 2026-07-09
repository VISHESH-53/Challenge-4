import React, { useState, useEffect, useRef } from "react";
import { Stadium, IncidentReport, TransitMetric, StadiumLiveTelemetry } from "./types";
import DashboardOverview from "./components/DashboardOverview";
import SecurityHub from "./components/SecurityHub";
import LogisticsDashboard from "./components/LogisticsDashboard";
import SustainabilityController from "./components/SustainabilityController";
import FanPortal from "./components/FanPortal";
import { Shield, LayoutDashboard, Navigation, Zap, Accessibility, RefreshCw, Radio, CheckCircle, Flame } from "lucide-react";
import { motion } from "motion/react";

export default function App() {
  const [activeTab, setActiveTab] = useState("overview");
  const [stadiums, setStadiums] = useState<Stadium[]>([]);
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [transitMetrics, setTransitMetrics] = useState<Record<string, TransitMetric>>({});
  const [telemetries, setTelemetries] = useState<Record<string, StadiumLiveTelemetry>>({});
  
  const [selectedStadiumId, setSelectedStadiumId] = useState("att-stadium");
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Operation loading state flags
  const [isAddingIncident, setIsAddingIncident] = useState(false);
  const [isTogglingSleep, setIsTogglingSleep] = useState(false);
  const [isStressTesting, setIsStressTesting] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const [timeStr, setTimeStr] = useState("14:28:05");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const parts = now.toUTCString().replace("GMT", "UTC").split(" ");
      if (parts && parts[4]) {
        setTimeStr(parts[4]);
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch initial REST data
  const fetchInitialData = async () => {
    try {
      const stadiumsRes = await fetch("/api/stadiums");
      const stadiumsData = await stadiumsRes.json();
      setStadiums(stadiumsData);

      const incidentsRes = await fetch("/api/incidents");
      const incidentsData = await incidentsRes.json();
      setIncidents(incidentsData);

      const transitRes = await fetch("/api/transit");
      const transitData = await transitRes.json();
      const metricsMap: Record<string, TransitMetric> = {};
      transitData.forEach((t: TransitMetric) => {
        metricsMap[t.stadium_id] = t;
      });
      setTransitMetrics(metricsMap);

      // Initialize base telemetries so graphs aren't empty on load
      const baseTelemetries: Record<string, StadiumLiveTelemetry> = {};
      stadiumsData.forEach((s: Stadium) => {
        baseTelemetries[s.id] = {
          stadium_id: s.id,
          timestamp: new Date().toISOString(),
          power_usage_kwh: Math.round((s.capacity / 100) * 0.9),
          hvac_load_pct: 75,
          lighting_load_pct: 80,
          carbon_travel_tons: Math.round((s.current_crowd * 0.012) * 10) / 10,
          carbon_ops_tons: Math.round(((s.capacity / 100) * 0.9 * 0.00045) * 10) / 10,
          crowd_surging_risk: "LOW",
          unattended_bags_count: 0,
          ai_sleep_mode_active: false,
        };
      });
      setTelemetries(baseTelemetries);

      setIsLoading(false);
    } catch (err) {
      console.error("Failed to load initial REST state:", err);
    }
  };

  // Configure robust dynamic WebSocket
  useEffect(() => {
    fetchInitialData();

    let reconnectTimeout: any;

    const connectWebSocket = () => {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      console.log(`Connecting to Command Center socket: ${wsUrl}`);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket stream connected successfully.");
        setIsWebSocketConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === "INITIAL_STATE") {
            // Apply current server parameters
            if (message.transitMetrics) {
              setTransitMetrics(message.transitMetrics);
            }
          }

          if (message.type === "LIVE_TELEMETRY") {
            const { stadium_id, telemetry, stadium_current_crowd, transit } = message;
            
            // 1. Update dynamic telemetry logs
            setTelemetries((prev) => ({
              ...prev,
              [stadium_id]: telemetry,
            }));

            // 2. Update real-time crowd level size
            setStadiums((prev) =>
              prev.map((s) =>
                s.id === stadium_id ? { ...s, current_crowd: stadium_current_crowd } : s
              )
            );

            // 3. Update active transit variables
            if (transit) {
              setTransitMetrics((prev) => ({
                ...prev,
                [stadium_id]: transit,
              }));
            }
          }

          if (message.type === "SLEEP_MODE_TOGGLED") {
            const { stadium_id, active } = message;
            setTelemetries((prev) => {
              const prevTel = prev[stadium_id];
              if (prevTel) {
                return {
                  ...prev,
                  [stadium_id]: { ...prevTel, ai_sleep_mode_active: active },
                };
              }
              return prev;
            });
          }

          if (message.type === "STRESS_TEST_TOGGLED") {
            const { stadium_id, metric } = message;
            setTransitMetrics((prev) => ({
              ...prev,
              [stadium_id]: metric,
            }));
          }

          if (message.type === "NEW_INCIDENT") {
            const { incident } = message;
            setIncidents((prev) => [incident, ...prev]);
          }
        } catch (err) {
          console.error("Error parsing socket frame:", err);
        }
      };

      ws.onclose = () => {
        console.log("WebSocket closed. Retrying link in 5s...");
        setIsWebSocketConnected(false);
        reconnectTimeout = setTimeout(connectWebSocket, 5000);
      };

      ws.onerror = (err) => {
        console.error("WebSocket socket error:", err);
        ws.close();
      };
    };

    connectWebSocket();

    return () => {
      clearTimeout(reconnectTimeout);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // API Call: Trigger incident alert reporting
  const handleAddIncident = async (newIncident: any) => {
    setIsAddingIncident(true);
    try {
      const response = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newIncident),
      });
      const data = await response.json();
      // WebSocket will broadcast this, but fallback add locally if needed
      if (!isWebSocketConnected) {
        setIncidents((prev) => [data, ...prev]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAddingIncident(false);
    }
  };

  // API Call: Toggle sleep mode
  const handleToggleSleepMode = async (id: string, active: boolean) => {
    setIsTogglingSleep(true);
    try {
      const response = await fetch(`/api/stadiums/${id}/sleep-mode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      const data = await response.json();
      
      // Update local telemetry fallback if ws is offline
      if (!isWebSocketConnected) {
        setTelemetries((prev) => {
          const prevTel = prev[id];
          if (prevTel) {
            return {
              ...prev,
              [id]: { ...prevTel, ai_sleep_mode_active: active },
            };
          }
          return prev;
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsTogglingSleep(false);
    }
  };

  // API Call: Trigger Extraction stress test
  const handleTriggerStressTest = async (id: string, active: boolean) => {
    setIsStressTesting(true);
    try {
      const response = await fetch(`/api/stadiums/${id}/stress-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      const data = await response.json();

      // Update local metrics fallback if ws is offline
      if (!isWebSocketConnected) {
        setTransitMetrics((prev) => ({
          ...prev,
          [id]: data.metric,
        }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsStressTesting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4 text-white">
        <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
        <div className="text-center space-y-1">
          <p className="text-base font-display font-bold">FIFA 2026 Smart Stadium Command Center</p>
          <p className="text-xs text-slate-500 font-mono">Initializing local data caches & neural sockets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0C10] text-[#E2E8F0] flex flex-col font-sans select-none antialiased">
      
      {/* Global Header */}
      <header className="h-14 border-b border-slate-800 flex items-center justify-between px-6 bg-[#0F172A] z-20 sticky top-0 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-blue-600 rounded-sm flex items-center justify-center font-bold text-white italic">
            26
          </div>
          <h1 className="text-xs font-semibold tracking-[0.2em] uppercase text-slate-200">
            FIFA 2026 Smart Stadium Command Center
          </h1>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-[10px] text-slate-500 uppercase tracking-tighter">Global System Status</span>
            <span className="text-xs font-mono text-emerald-400 font-bold flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${isWebSocketConnected ? "bg-emerald-400" : "bg-amber-400 animate-pulse"}`}></span>
              {isWebSocketConnected ? "OPTIMIZED / AI-ACTIVE" : "SOCKET_RECONNECTING..."}
            </span>
          </div>
          <div className="hidden sm:block h-8 w-[1px] bg-slate-800"></div>
          <div className="text-right leading-none">
            <div className="text-xs font-mono text-slate-300">{timeStr} UTC</div>
            <div className="text-[10px] text-slate-500 uppercase">
              {stadiums.find((s) => s.id === selectedStadiumId)?.city.split(",")[0] || "ARLINGTON"}
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Sub-Bar */}
      <div className="bg-[#111827]/80 border-b border-slate-800 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 z-10 backdrop-blur-md">
        <div className="text-[10px] font-mono text-slate-400 tracking-wider uppercase">
          Live feed node: <span className="text-blue-400 font-bold">{selectedStadiumId.toUpperCase()}</span>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center bg-[#0F172A] p-0.5 rounded border border-slate-800">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded font-mono text-[11px] uppercase tracking-wider transition-all duration-150 ${
              activeTab === "overview" 
                ? "bg-blue-600 text-white rounded-sm font-semibold" 
                : "text-slate-400 hover:text-white"
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded font-mono text-[11px] uppercase tracking-wider transition-all duration-150 ${
              activeTab === "security" 
                ? "bg-blue-600 text-white rounded-sm font-semibold" 
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            Surveillance
          </button>
          <button
            onClick={() => setActiveTab("logistics")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded font-mono text-[11px] uppercase tracking-wider transition-all duration-150 ${
              activeTab === "logistics" 
                ? "bg-blue-600 text-white rounded-sm font-semibold" 
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            Logistics
          </button>
          <button
            onClick={() => setActiveTab("sustainability")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded font-mono text-[11px] uppercase tracking-wider transition-all duration-150 ${
              activeTab === "sustainability" 
                ? "bg-blue-600 text-white rounded-sm font-semibold" 
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Sustainability
          </button>
          <button
            onClick={() => setActiveTab("fan")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded font-mono text-[11px] uppercase tracking-wider transition-all duration-150 ${
              activeTab === "fan" 
                ? "bg-blue-600 text-white rounded-sm font-semibold" 
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Accessibility className="w-3.5 h-3.5" />
            Fan Portal
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-4">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "overview" && (
            <DashboardOverview
              stadiums={stadiums}
              incidents={incidents}
              telemetries={telemetries}
              transitMetrics={transitMetrics}
              selectedStadiumId={selectedStadiumId}
              setSelectedStadiumId={setSelectedStadiumId}
              onNavigateToTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === "security" && (
            <SecurityHub
              stadiums={stadiums}
              incidents={incidents}
              selectedStadiumId={selectedStadiumId}
              onAddIncident={handleAddIncident}
              isAddingIncident={isAddingIncident}
            />
          )}

          {activeTab === "logistics" && (
            <LogisticsDashboard
              stadiums={stadiums}
              transitMetrics={transitMetrics}
              selectedStadiumId={selectedStadiumId}
              onTriggerStressTest={handleTriggerStressTest}
              isStressTesting={isStressTesting}
            />
          )}

          {activeTab === "sustainability" && (
            <SustainabilityController
              stadiums={stadiums}
              telemetries={telemetries}
              selectedStadiumId={selectedStadiumId}
              onToggleSleepMode={handleToggleSleepMode}
              isTogglingSleep={isTogglingSleep}
            />
          )}

          {activeTab === "fan" && (
            <FanPortal stadiums={stadiums} selectedStadiumId={selectedStadiumId} />
          )}
        </motion.div>

        {/* Real-time System Logs Bar */}
        <section className="bg-black/40 border border-slate-800 rounded-lg px-4 py-3 flex items-center gap-6 overflow-hidden">
          <span className="text-[10px] font-bold text-blue-500 uppercase flex-shrink-0 tracking-wider">
            System Feed
          </span>
          <div className="text-[10px] font-mono text-slate-500 flex gap-8 whitespace-nowrap overflow-hidden flex-1 select-text">
            {incidents.slice(0, 2).map((inc, i) => (
              <span key={inc.id || i} className="text-slate-400">
                [{new Date(inc.reported_at).toLocaleTimeString()}] {inc.title} ({inc.severity}) - <span className="text-slate-500">{inc.status}</span>
              </span>
            ))}
            {Object.values(telemetries).some(t => (t as StadiumLiveTelemetry).ai_sleep_mode_active) && (
              <span className="text-emerald-400">
                [AI-POWER] Energy mutation triggered: AI Sleep Mode is active in LA / Arlington nodes
              </span>
            )}
            {Object.values(transitMetrics).some(m => (m as TransitMetric).stress_test_active) && (
              <span className="text-amber-400 animate-pulse">
                [TRANSIT] Extraction stress test simulation running on high-load venue
              </span>
            )}
            <span className="text-slate-600">
              [{timeStr}] Node link established. Listening to live telemetry frames...
            </span>
          </div>
        </section>
      </main>

      {/* Bottom Status Footer */}
      <footer className="h-9 bg-slate-950 border-t border-slate-900 px-6 flex items-center justify-between text-[9px] text-slate-500 uppercase tracking-widest mt-auto">
        <div className="flex gap-4">
          <span>Version: 2.0.26-ALPHA</span>
          <span>Node: US-CENTRAL-1A</span>
          <span>Latency: 14ms</span>
        </div>
        <div className="flex gap-4 items-center">
          <span className="text-emerald-500 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
            AI CORE READY
          </span>
          <span>Vector DB: Pinecone-US-East</span>
          <span>© 2026 Tournament Operations Group</span>
        </div>
      </footer>
    </div>
  );
}

// Small loader helper for React
function Loader2({ className }: { className?: string }) {
  return <RefreshCw className={`${className} animate-spin`} />;
}
