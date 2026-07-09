import React, { useState } from "react";
import { Stadium, IncidentReport } from "../types";
import { Shield, Eye, Send, AlertTriangle, Play, HelpCircle, FileText, PlusCircle, Check, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface SecurityHubProps {
  stadiums: Stadium[];
  incidents: IncidentReport[];
  selectedStadiumId: string;
  onAddIncident: (incident: any) => Promise<void>;
  isAddingIncident: boolean;
}

interface Detection {
  camera_id: string;
  timestamp: string;
  event_name: string;
  confidence: number;
  action_taken: string;
}

export default function SecurityHub({
  stadiums,
  incidents,
  selectedStadiumId,
  onAddIncident,
  isAddingIncident,
}: SecurityHubProps) {
  const currentStadium = stadiums.find((s) => s.id === selectedStadiumId) || stadiums[0];

  // Active surveillance camera selection
  const cameraFeeds = [
    { id: "Gate-C-Entrance", label: "Gate C Entrance scanner" },
    { id: "Cam-04-North", label: "Gate 4 Concourse B Cam" },
    { id: "Cam-12-East", label: "East Access Ramp Cam" },
    { id: "Cam-Main-Field", label: "Arena Bowl Central Cam" },
  ];
  const [activeCamId, setActiveCamId] = useState("Cam-04-North");

  // AI Chat Interface state
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<any[]>([
    {
      role: "assistant",
      text: "AVS Automated Surveillance Assistant online. Ask me to cross-reference video feeds, identify anomalies, or locate safety issues.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [isQueryingAI, setIsQueryingAI] = useState(false);
  const [lastDetections, setLastDetections] = useState<Detection[]>([]);

  // Manual incident form state
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [formStadiumId, setFormStadiumId] = useState(selectedStadiumId);
  const [formSeverity, setFormSeverity] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("MEDIUM");
  const [formCamera, setFormCamera] = useState("Cam-04-North");
  const [formDescription, setFormDescription] = useState("");
  const [formSubmitted, setFormSubmitted] = useState(false);

  // Submit security chat search query
  const handleChatSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isQueryingAI) return;

    const userMessage = chatInput.trim();
    setChatInput("");
    setChatHistory((prev) => [
      ...prev,
      {
        role: "user",
        text: userMessage,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);

    setIsQueryingAI(true);

    try {
      const response = await fetch("/api/security/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userMessage, selectedStadiumId }),
      });
      const data = await response.json();

      setChatHistory((prev) => [
        ...prev,
        {
          role: "assistant",
          text: data.analysis_summary,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          detections: data.detections,
        },
      ]);

      if (data.detections && data.detections.length > 0) {
        setLastDetections(data.detections);
        // Automatically switch the video camera if matched
        const matchedCam = cameraFeeds.find(
          (c) => c.id.toLowerCase() === data.detections[0].camera_id.toLowerCase()
        );
        if (matchedCam) {
          setActiveCamId(matchedCam.id);
        }
      }
    } catch (err) {
      console.error(err);
      setChatHistory((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "System connection failure. Please confirm GEMINI_API_KEY is configured in Settings.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsQueryingAI(false);
    }
  };

  // Submit manual incident report
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDescription.trim()) return;

    await onAddIncident({
      stadium_id: formStadiumId,
      severity: formSeverity,
      camera_feed: formCamera,
      description: formDescription,
    });

    setFormDescription("");
    setFormSubmitted(true);
    setTimeout(() => {
      setFormSubmitted(false);
      setShowIncidentForm(false);
    }, 2000);
  };

  // Pre-fill query helper
  const handlePrefillQuery = (query: string) => {
    setChatInput(query);
  };

  return (
    <div className="space-y-6">
      {/* Module Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111827] p-5 rounded-lg border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-500/10 text-red-400 rounded-lg border border-red-500/20">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-white tracking-tight">
              Algorithmic Video Surveillance (AVS) Hub
            </h2>
            <p className="text-slate-400 text-xs">
              AI-driven crowd flow tracking, thermal surge warnings, and unattended baggage detection.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowIncidentForm(!showIncidentForm)}
          className="flex items-center gap-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-white font-mono text-xs uppercase px-4 py-2.5 rounded-lg transition-colors"
        >
          <PlusCircle className="w-4 h-4 text-emerald-400" />
          Log Live Incident Alert
        </button>
      </div>

      {/* Add Incident Form Modal Panel */}
      <AnimatePresence>
        {showIncidentForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-slate-950 p-6 rounded-xl border border-red-500/30 shadow-2xl space-y-4 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-amber-500 to-red-500 animate-pulse"></div>

            <h3 className="text-base font-display font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500 animate-bounce" />
              File Urgent Security Incident Report
            </h3>

            <form onSubmit={handleFormSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-mono text-slate-400 block mb-1">Target Arena:</label>
                <select
                  value={formStadiumId}
                  onChange={(e) => setFormStadiumId(e.target.value)}
                  className="w-full bg-slate-900 text-white text-xs border border-slate-800 rounded px-3 py-2 focus:ring-1 focus:ring-red-500 focus:outline-none"
                >
                  {stadiums.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-mono text-slate-400 block mb-1">Threat Level:</label>
                <select
                  value={formSeverity}
                  onChange={(e) => setFormSeverity(e.target.value as any)}
                  className="w-full bg-slate-900 text-white text-xs border border-slate-800 rounded px-3 py-2 focus:ring-1 focus:ring-red-500 focus:outline-none"
                >
                  <option value="LOW">LOW - Local congestion</option>
                  <option value="MEDIUM">MEDIUM - Flow crowd pack</option>
                  <option value="HIGH">HIGH - Unattended luggage</option>
                  <option value="CRITICAL">CRITICAL - Sector breach</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-mono text-slate-400 block mb-1">Source Video Cam:</label>
                <select
                  value={formCamera}
                  onChange={(e) => setFormCamera(e.target.value)}
                  className="w-full bg-slate-900 text-white text-xs border border-slate-800 rounded px-3 py-2 focus:ring-1 focus:ring-red-500 focus:outline-none"
                >
                  {cameraFeeds.map((cam) => (
                    <option key={cam.id} value={cam.id}>
                      {cam.label} ({cam.id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3">
                <label className="text-xs font-mono text-slate-400 block mb-1">Incident Event Description:</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                  placeholder="Describe the anomaly. (e.g. Unattended red bag on concourse bench B...)"
                  className="w-full bg-slate-900 text-white text-xs border border-slate-800 rounded p-3 focus:ring-1 focus:ring-red-500 focus:outline-none font-sans"
                ></textarea>
              </div>

              <div className="md:col-span-3 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowIncidentForm(false)}
                  className="px-4 py-2 text-xs font-mono text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingIncident || !formDescription.trim()}
                  className="bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 px-5 py-2 rounded text-xs font-mono uppercase tracking-wider transition-all flex items-center gap-1.5"
                >
                  {isAddingIncident ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing Report...
                    </>
                  ) : formSubmitted ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" /> Broadcast Completed!
                    </>
                  ) : (
                    "Publish & Run GenAI Diagnosis"
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Security Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Live camera simulator feed (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#111827] p-4 rounded-lg border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-emerald-400 animate-pulse" />
                Live Camera feeds: {currentStadium.name}
              </span>
              <div className="flex gap-2">
                {cameraFeeds.map((feed) => (
                  <button
                    key={feed.id}
                    onClick={() => setActiveCamId(feed.id)}
                    className={`px-2.5 py-1 text-[10px] font-mono border rounded transition-all ${
                      activeCamId === feed.id
                        ? "bg-red-500/10 text-red-400 border-red-500/40"
                        : "bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300"
                    }`}
                  >
                    {feed.id}
                  </button>
                ))}
              </div>
            </div>

            {/* Video Feed Window */}
            <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-950 border border-slate-800 flex flex-col justify-between p-4 font-mono text-[10px]">
              {/* Scanline Overlay */}
              <div className="absolute inset-0 scanline pointer-events-none opacity-40"></div>

              {/* Top metadata strip */}
              <div className="flex justify-between items-start z-10 select-none">
                <div className="flex flex-col bg-slate-950/80 p-2 rounded border border-slate-800/60 text-[9px] leading-tight space-y-0.5">
                  <span className="text-red-400 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping"></span>
                    REC • AVS PROFILING ON
                  </span>
                  <span className="text-slate-300">STREAM: {activeCamId} // LIVE</span>
                  <span className="text-slate-500">FPS: 30.0 / CODEC: H.265 / CH: {activeCamId === "Gate-C-Entrance" ? "01" : activeCamId === "Cam-04-North" ? "02" : "03"}</span>
                </div>

                <div className="bg-slate-950/80 px-2 py-1 rounded border border-slate-800/60 text-slate-300 text-[9px]">
                  UTC {new Date().toISOString().replace("T", " ").substring(0, 19)}
                </div>
              </div>

              {/* Middle boundary box overlays simulating CV/AI Surgeries */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {activeCamId === "Cam-04-North" && (
                  <div className="absolute top-1/3 left-1/4 w-32 h-32 border-2 border-dashed border-red-500 animate-pulse bg-red-500/5">
                    <span className="absolute top-0 left-0 bg-red-500 text-white px-1 py-0.5 font-mono text-[7px] uppercase font-bold leading-none transform -translate-y-full">
                      ANOMALY: UNATTENDED_BAG (CONF: 98%)
                    </span>
                  </div>
                )}

                {activeCamId === "Cam-12-East" && (
                  <div className="absolute bottom-1/4 right-1/3 w-40 h-24 border-2 border-dashed border-amber-500 bg-amber-500/5">
                    <span className="absolute top-0 left-0 bg-amber-500 text-black px-1 py-0.5 font-mono text-[7px] uppercase font-bold leading-none transform -translate-y-full">
                      CROWD_DENSITY_STRESS: 3.2 pax/sqm
                    </span>
                  </div>
                )}

                {activeCamId === "Gate-C-Entrance" && (
                  <div className="absolute top-1/4 right-1/4 w-44 h-44 border border-dashed border-cyan-500 bg-cyan-500/5">
                    <span className="absolute top-0 left-0 bg-cyan-500 text-white px-1 py-0.5 font-mono text-[7px] uppercase font-bold leading-none transform -translate-y-full">
                      FLOW_SLUSH: BOTTLE_NECK
                    </span>
                  </div>
                )}
              </div>

              {/* Bottom status strip */}
              <div className="flex justify-between items-end z-10">
                <div className="bg-slate-950/80 p-1 px-2 rounded border border-slate-800/60 text-slate-400">
                  STADIUM: {currentStadium.name}
                </div>
                <div className="bg-slate-950/80 p-1 px-2 rounded border border-slate-800/60 text-emerald-400 font-bold">
                  SIGNAL STRONG (LATENCY: 12ms)
                </div>
              </div>
            </div>

            {/* Simulated Live Alert overlays below video */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/60 text-center space-y-0.5">
                <span className="text-[10px] text-slate-500 font-mono block">ANALYTIC ALARMS</span>
                <span className="text-xs font-semibold text-white font-mono block">
                  {activeCamId === "Cam-04-North" ? "1 Active Alert" : "0 Anomalies"}
                </span>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/60 text-center space-y-0.5">
                <span className="text-[10px] text-slate-500 font-mono block">CV PACK DENSITY</span>
                <span className="text-xs font-semibold text-white font-mono block">
                  {activeCamId === "Cam-12-East" ? "3.2 pax / sqm" : "1.4 pax / sqm"}
                </span>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/60 text-center space-y-0.5">
                <span className="text-[10px] text-slate-500 font-mono block">GATE PASS RATE</span>
                <span className="text-xs font-semibold text-white font-mono block">
                  {activeCamId === "Gate-C-Entrance" ? "12 pax / min" : "85 pax / min"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: GenAI Chat Assistant & Search (5 cols) */}
        <div className="lg:col-span-5 flex flex-col h-full space-y-4">
          <div className="bg-[#111827] p-4 rounded-lg border border-slate-800 flex flex-col justify-between flex-1 min-h-[400px]">
            <div className="space-y-4">
              <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
                Surveillance AI Assistant
                <span className="text-[10px] text-slate-500 font-sans normal-case">Powered by Gemini 3.5</span>
              </h3>

              {/* Chat Feed */}
              <div className="space-y-3 h-[280px] overflow-y-auto pr-1 scrollbar-thin">
                {chatHistory.map((chat, idx) => {
                  const isUser = chat.role === "user";
                  return (
                    <div key={idx} className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                      <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-mono mb-0.5">
                        <span>{isUser ? "OPERATOR" : "SURVEILLANCE_AI"}</span>
                        <span>•</span>
                        <span>{chat.timestamp}</span>
                      </div>
                      <div
                        className={`p-3 rounded-xl text-xs max-w-[90%] border ${
                          isUser
                            ? "bg-slate-950 text-slate-200 border-slate-800"
                            : "bg-slate-900/80 text-slate-300 border-slate-800/40"
                        }`}
                      >
                        <p className="font-sans whitespace-pre-line leading-relaxed">{chat.text}</p>

                        {/* Match Detections Block inside message */}
                        {!isUser && chat.detections && chat.detections.length > 0 && (
                          <div className="mt-3 pt-2.5 border-t border-slate-800 space-y-2">
                            <div className="text-[10px] font-mono text-red-400 font-semibold uppercase tracking-wider">
                              Flagged Video Timestamps:
                            </div>
                            {chat.detections.map((det: any, dIdx: number) => (
                              <button
                                key={dIdx}
                                onClick={() => setActiveCamId(det.camera_id)}
                                className="w-full text-left p-2 bg-slate-950/80 hover:bg-slate-950 rounded border border-slate-800/60 hover:border-red-500/50 transition-colors flex flex-col gap-1 text-[10px] font-mono"
                              >
                                <div className="flex justify-between text-slate-200">
                                  <span className="font-bold text-red-400">{det.camera_id}</span>
                                  <span>Conf: {(det.confidence * 100).toFixed(0)}%</span>
                                </div>
                                <div className="text-slate-400 text-[9px]">Event: {det.event_name} ({det.timestamp})</div>
                                <div className="text-emerald-400 text-[9px]">Action: {det.action_taken}</div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {isQueryingAI && (
                  <div className="flex flex-col items-start">
                    <span className="text-[9px] text-slate-500 font-mono mb-1">SCANNING FEEDS VIA GEMINI...</span>
                    <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-800/40 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 text-red-400 animate-spin" />
                      <span className="text-xs text-slate-400 font-mono">Running crowd surge model...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Prompt Box */}
            <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-3">
              {/* Quick Prompt Helpers */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handlePrefillQuery("Show me crowd surging in the East Access Ramp over the last 15 minutes")}
                  className="text-[9px] font-mono text-slate-400 bg-slate-950 hover:bg-slate-900 border border-slate-800 px-2 py-1 rounded"
                >
                  "Crowd surging ramp"
                </button>
                <button
                  onClick={() => handlePrefillQuery("Identify unattended bags near Gate 4 Section 114 Concourse")}
                  className="text-[9px] font-mono text-slate-400 bg-slate-950 hover:bg-slate-900 border border-slate-800 px-2 py-1 rounded"
                >
                  "Unattended bag near Gate 4"
                </button>
              </div>

              <form onSubmit={handleChatSearch} className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Enter video surveillance query..."
                  className="flex-1 bg-slate-950 text-white text-xs border border-slate-800 rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-red-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || isQueryingAI}
                  className="p-2.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 rounded-lg transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
