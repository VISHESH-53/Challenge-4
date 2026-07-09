import React, { useState } from "react";
import { Stadium } from "../types";
import { Accessibility, Languages, ShieldAlert, Heart, Sun, Activity, Loader2, Sparkles, Send, Music } from "lucide-react";
import { motion } from "motion/react";

interface FanPortalProps {
  stadiums: Stadium[];
  selectedStadiumId: string;
}

export default function FanPortal({ stadiums, selectedStadiumId }: FanPortalProps) {
  const currentStadium = stadiums.find((s) => s.id === selectedStadiumId) || stadiums[0];

  // ESI Risk details for host cities
  const getEsiMetric = (stadium: Stadium) => {
    if (stadium.id === "hard-rock-stadium") {
      return {
        value: "88.5 / 100",
        rating: "CRITICAL THERMAL LEVEL",
        color: "text-red-400 border-red-500/20 bg-red-500/10",
        advice: "Hydration warnings triggered. Smart misting fans active in sections 100-300. Cool water reserves dispatched to concourse kiosks.",
      };
    }
    if (stadium.id === "estadio-azteca") {
      return {
        value: "79.2 / 100",
        rating: "ALTITUDE FATIGUE RISK",
        color: "text-amber-400 border-amber-500/20 bg-amber-500/10",
        advice: "Elevation stands at 7,380 ft above sea level. Public announcement reminders for fans with respiratory limits active. Oxygen depots pre-staged.",
      };
    }
    return {
      value: "42.0 / 100",
      rating: "NOMINAL ENVIRONMENTAL RISK",
      color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/10",
      advice: "Weather parameters within comfortable threshold. Roof structures adjusted for optimal ventilation flow.",
    };
  };

  const esi = getEsiMetric(currentStadium);

  // Announcement translator state
  const [announcementText, setAnnouncementText] = useState(
    "Public Announcement: Ticket scanning terminals at Gate 4 North are experiencing bottlenecks. Please detour to the West Ramp for faster entry."
  );
  const [targetLang, setTargetLang] = useState("Spanish");
  const [translatedText, setTranslatedText] = useState("");
  const [hapticResponse, setHapticResponse] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);

  // Handle translate action
  const handleTranslate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementText.trim() || isTranslating) return;

    setIsTranslating(true);
    try {
      const response = await fetch("/api/fan/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: announcementText, targetLanguage: targetLang }),
      });
      const data = await response.json();
      setTranslatedText(data.translated_text);
      setHapticResponse(data.haptic_tablet_instructions);
    } catch (err) {
      console.error(err);
      setTranslatedText("Failed to query Gemini translator service.");
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Module Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111827] p-5 rounded-lg border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-lg border border-cyan-500/20">
            <Accessibility className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-white tracking-tight">
              Fan Experience & Accessibility Portal
            </h2>
            <p className="text-slate-400 text-xs">
              Environmental strain monitoring, real-time multilingual translations, and Touch2See haptic tablet triggers.
            </p>
          </div>
        </div>
      </div>

      {/* Main Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Environmental Stress Index (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#111827] p-5 rounded-lg border border-slate-800 space-y-4 flex flex-col justify-between h-full">
            <div className="space-y-4">
              <h3 className="text-sm font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
                Environmental Stress Index (ESI)
                <span className="text-xs text-slate-500 font-sans normal-case">Host Venue Alert Matrix</span>
              </h3>

              <div className="bg-slate-950/60 p-4 rounded-lg border border-slate-800/80 space-y-3 relative overflow-hidden text-center">
                <span className="text-xs font-mono text-slate-500 block">CURRENT ENVIRONMENT LEVEL</span>
                <span className="text-4xl font-bold font-mono text-white tracking-tight">{esi.value}</span>
                
                <span className={`inline-block text-[10px] font-mono font-bold px-3 py-1 rounded-full border uppercase ${esi.color}`}>
                  {esi.rating}
                </span>

                <div className="pt-3 border-t border-slate-800/60 text-left space-y-1">
                  <div className="text-[10px] font-mono text-slate-400 font-semibold flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                    VENUE MITIGATION DIRECTIVES:
                  </div>
                  <p className="text-xs text-slate-300 font-sans leading-relaxed">{esi.advice}</p>
                </div>
              </div>

              {/* Stress Metrics comparing stadiums */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Relative Arena Comparison:</span>
                {stadiums.slice(2, 5).map((s) => {
                  const sEsi = getEsiMetric(s);
                  return (
                    <div key={s.id} className="bg-slate-950/30 p-2.5 rounded border border-slate-800/40 flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-mono text-[11px]">{s.name} ({s.city.split(",")[0]})</span>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${sEsi.color}`}>
                        {sEsi.value.split(" ")[0]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-800/40 text-[11px] text-slate-400 leading-relaxed flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-400 shrink-0" />
              <p>
                ESI gauges humidity, temperature, wind shear, and atmospheric elevation parameters to protect World Cup stadium attendees from extreme climates.
              </p>
            </div>
          </div>
        </div>

        {/* Right: Accessibility PA Translator & Haptic touch controller (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#111827] p-5 rounded-lg border border-slate-800 space-y-4">
            <h3 className="text-sm font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
              Accessibility Multilingual PA translation
              <span className="text-xs text-slate-500 font-sans normal-case">Touch2See haptic haptics</span>
            </h3>

            <form onSubmit={handleTranslate} className="space-y-3">
              <div>
                <label className="text-xs font-mono text-slate-500 block mb-1">Staged Stadium Public Announcement (PA):</label>
                <textarea
                  value={announcementText}
                  onChange={(e) => setAnnouncementText(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 text-white text-xs border border-slate-800 rounded-lg p-3 focus:ring-1 focus:ring-cyan-500 focus:outline-none font-sans"
                ></textarea>
              </div>

              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Languages className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-mono text-slate-400">Target Language:</span>
                  <select
                    value={targetLang}
                    onChange={(e) => setTargetLang(e.target.value)}
                    className="bg-slate-950 text-white font-mono text-xs border border-slate-850 rounded px-3 py-1.5 focus:outline-none cursor-pointer"
                  >
                    <option value="Spanish">Español (Spanish)</option>
                    <option value="French">Français (French)</option>
                    <option value="Portuguese">Português (Portuguese)</option>
                    <option value="German">Deutsch (German)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isTranslating || !announcementText.trim()}
                  className="bg-cyan-500/15 hover:bg-cyan-500 text-cyan-400 hover:text-white border border-cyan-500/30 px-5 py-2 rounded-lg text-xs font-mono uppercase tracking-wider transition-colors flex items-center gap-1.5"
                >
                  {isTranslating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Translating via Gemini...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Translate Announcement
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Translated & Haptic outputs */}
            {(translatedText || hapticResponse) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-850">
                
                {/* Visual Translation Column */}
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-850 space-y-2">
                  <div className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Languages className="w-3.5 h-3.5" /> Translated PA text ({targetLang})
                  </div>
                  <p className="text-xs text-slate-300 font-sans leading-relaxed italic">
                    "{translatedText}"
                  </p>
                </div>

                {/* Touch2See Haptic Controller Column */}
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-850 space-y-2 relative overflow-hidden">
                  <div className="text-[10px] font-mono text-purple-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 animate-pulse" /> Touch2See Tablet haptic instructions
                  </div>
                  <p className="text-xs text-slate-300 font-mono leading-relaxed bg-slate-900/50 p-2 rounded border border-slate-800">
                    {hapticResponse}
                  </p>
                  
                  {/* Visual vibration trigger button */}
                  <button
                    onClick={() => {
                      if (navigator.vibrate) {
                        navigator.vibrate([200, 100, 200, 100, 400]);
                      }
                    }}
                    className="w-full mt-2 py-1.5 bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500 hover:text-white rounded text-[10px] font-mono uppercase tracking-widest text-purple-400 transition-colors"
                  >
                    Simulate Tablet Haptic Rhythms
                  </button>
                </div>

              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
