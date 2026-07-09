import express from "express";
import http from "http";
import path from "path";
import { WebSocket, WebSocketServer } from "ws";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { Stadium, IncidentReport, EnergyLog, TransitMetric, StadiumLiveTelemetry } from "./src/types";

dotenv.config();

const PORT = 3000;
const app = express();
app.use(express.json());

// Initialize Gemini Client safely
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey && apiKey !== "MY_GEMINI_API_KEY" && apiKey.trim() !== "") {
  try {
    ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
    console.log("Gemini API Client initialized successfully.");
  } catch (err) {
    console.error("Failed to initialize Gemini Client:", err);
  }
} else {
  console.log("No GEMINI_API_KEY found or it is default. Running in Mock fallback mode for AI.");
}

// In-Memory Database Store
const stadiums: Stadium[] = [
  {
    id: "att-stadium",
    name: "AT&T Stadium",
    city: "Arlington, TX",
    capacity: 80000,
    transit_index: 72,
    current_crowd: 68500,
    elevation_ft: 515,
    temp_f: 92,
    humidity_pct: 65,
  },
  {
    id: "metlife-stadium",
    name: "MetLife Stadium",
    city: "East Rutherford, NJ",
    capacity: 82500,
    transit_index: 85,
    current_crowd: 74200,
    elevation_ft: 20,
    temp_f: 82,
    humidity_pct: 50,
  },
  {
    id: "sofi-stadium",
    name: "SoFi Stadium",
    city: "Los Angeles, CA",
    capacity: 70240,
    transit_index: 78,
    current_crowd: 62100,
    elevation_ft: 100,
    temp_f: 74,
    humidity_pct: 60,
  },
  {
    id: "hard-rock-stadium",
    name: "Hard Rock Stadium",
    city: "Miami, FL",
    capacity: 64767,
    transit_index: 68,
    current_crowd: 58900,
    elevation_ft: 10,
    temp_f: 95,
    humidity_pct: 85,
  },
  {
    id: "estadio-azteca",
    name: "Estadio Azteca",
    city: "Mexico City, MX",
    capacity: 87523,
    transit_index: 91,
    current_crowd: 81400,
    elevation_ft: 7380,
    temp_f: 70,
    humidity_pct: 45,
  },
];

let incidentReports: IncidentReport[] = [
  {
    id: "inc-1",
    stadium_id: "att-stadium",
    description: "Minor ticket gate bottleneck near Gate C. Crowd packing dense at scanners.",
    severity: "LOW",
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    ai_analysis: "Visual stream shows Ticket Gate C scanner malfunction on terminal 4. Recommend rerouting Gate C lines to Gate D, which is currently operating under 40% capacity.",
    camera_feed: "Gate-C-Entrance",
    status: "INVESTIGATING",
  },
  {
    id: "inc-2",
    stadium_id: "metlife-stadium",
    description: "Unattended blue backpack left beneath bench near Concourse Section 114, Gate 4.",
    severity: "HIGH",
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    ai_analysis: "Surveillance log confirms backpack was deposited 18 minutes ago by a male subject in a white jersey who walked south. Thermal signatures are stable. Deploying local zone security supervisor and establishing a 15-meter safety perimeter.",
    camera_feed: "Cam-04-North",
    status: "OPEN",
  },
  {
    id: "inc-3",
    stadium_id: "sofi-stadium",
    description: "Crowd surge build-up reported near the main food plaza access ramp.",
    severity: "MEDIUM",
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    ai_analysis: "Density analysis indicates a flow restriction on Section 2 East Access Ramp. Crowd packing density stands at 3.2 pax/sqm. Recommend automated variable message signs (VMS) display detour prompts to the West Promenade.",
    camera_feed: "Cam-12-East",
    status: "OPEN",
  },
];

// In-Memory energy logs (past 12 hours)
const initEnergyLogs = (): EnergyLog[] => {
  const logs: EnergyLog[] = [];
  const hours = 12;
  stadiums.forEach((stadium) => {
    for (let i = hours; i >= 0; i--) {
      const baseUsage = (stadium.capacity / 100) * (0.8 + Math.random() * 0.4);
      logs.push({
        id: `eng-${stadium.id}-${i}`,
        stadium_id: stadium.id,
        power_usage_kwh: Math.round(baseUsage),
        timestamp: new Date(Date.now() - i * 60 * 60 * 1000).toISOString(),
        ai_sleep_mode_active: false,
      });
    }
  });
  return logs;
};

let energyLogs: EnergyLog[] = initEnergyLogs();

// In-Memory Transit Metrics
const transitMetrics: Record<string, TransitMetric> = {
  "att-stadium": {
    stadium_id: "att-stadium",
    bus_utilization_pct: 68,
    rail_utilization_pct: 0, // Arlington lacks light rail
    egress_rate_pax_min: 850,
    estimated_extraction_time_mins: 94,
    stress_test_active: false,
  },
  "metlife-stadium": {
    stadium_id: "metlife-stadium",
    bus_utilization_pct: 45,
    rail_utilization_pct: 82,
    egress_rate_pax_min: 1200,
    estimated_extraction_time_mins: 68,
    stress_test_active: false,
  },
  "sofi-stadium": {
    stadium_id: "sofi-stadium",
    bus_utilization_pct: 70,
    rail_utilization_pct: 55,
    egress_rate_pax_min: 950,
    estimated_extraction_time_mins: 82,
    stress_test_active: false,
  },
  "hard-rock-stadium": {
    stadium_id: "hard-rock-stadium",
    bus_utilization_pct: 60,
    rail_utilization_pct: 40,
    egress_rate_pax_min: 750,
    estimated_extraction_time_mins: 99,
    stress_test_active: false,
  },
  "estadio-azteca": {
    stadium_id: "estadio-azteca",
    bus_utilization_pct: 50,
    rail_utilization_pct: 88,
    egress_rate_pax_min: 1450,
    estimated_extraction_time_mins: 60,
    stress_test_active: false,
  },
};

// Track AI Sleep Mode active per stadium
const aiSleepModeActive: Record<string, boolean> = {
  "att-stadium": false,
  "metlife-stadium": false,
  "sofi-stadium": false,
  "hard-rock-stadium": false,
  "estadio-azteca": false,
};

// --- HTTP ENDPOINTS ---

// Get all Stadiums
app.get("/api/stadiums", (req, res) => {
  res.json(stadiums);
});

// Get Live Transit & Stress Test metrics
app.get("/api/transit", (req, res) => {
  res.json(Object.values(transitMetrics));
});

// Toggle Stadium AI Sleep Mode
app.post("/api/stadiums/:id/sleep-mode", (req, res) => {
  const { id } = req.params;
  const { active } = req.body;

  if (aiSleepModeActive[id] === undefined) {
    res.status(404).json({ error: "Stadium not found" });
    return;
  }

  aiSleepModeActive[id] = active;

  // Append new log indicating sleep mode change
  const stadium = stadiums.find((s) => s.id === id);
  if (stadium) {
    const currentUsage = Math.round(
      ((stadium.capacity / 100) * (0.8 + Math.random() * 0.4)) * (active ? 0.7 : 1.0)
    );
    const newLog: EnergyLog = {
      id: `eng-toggle-${id}-${Date.now()}`,
      stadium_id: id,
      power_usage_kwh: currentUsage,
      timestamp: new Date().toISOString(),
      ai_sleep_mode_active: active,
    };
    energyLogs.push(newLog);
  }

  // Broadcast change
  broadcast({
    type: "SLEEP_MODE_TOGGLED",
    stadium_id: id,
    active,
  });

  res.json({ success: true, stadium_id: id, ai_sleep_mode_active: active });
});

// Trigger Transit "90-minute stadium extraction" Stress Test
app.post("/api/stadiums/:id/stress-test", (req, res) => {
  const { id } = req.params;
  const { active } = req.body;

  const metric = transitMetrics[id];
  if (!metric) {
    res.status(404).json({ error: "Stadium transit parameters not found" });
    return;
  }

  metric.stress_test_active = active;
  metric.stress_test_elapsed_mins = active ? 0 : undefined;

  if (active) {
    metric.estimated_extraction_time_mins = 90;
    // Boost egress rate during stress test as evacuation centers activate
    metric.egress_rate_pax_min = Math.round(metric.egress_rate_pax_min * 1.5);
  } else {
    // Reset back to typical values
    const originalRates: Record<string, number> = {
      "att-stadium": 850,
      "metlife-stadium": 1200,
      "sofi-stadium": 950,
      "hard-rock-stadium": 750,
      "estadio-azteca": 1450,
    };
    metric.egress_rate_pax_min = originalRates[id] || 900;
    const baseExtractionTimes: Record<string, number> = {
      "att-stadium": 94,
      "metlife-stadium": 68,
      "sofi-stadium": 82,
      "hard-rock-stadium": 99,
      "estadio-azteca": 60,
    };
    metric.estimated_extraction_time_mins = baseExtractionTimes[id] || 80;
  }

  broadcast({
    type: "STRESS_TEST_TOGGLED",
    stadium_id: id,
    metric,
  });

  res.json({ success: true, stadium_id: id, metric });
});

// Get Incident Reports
app.get("/api/incidents", (req, res) => {
  res.json(incidentReports);
});

// Create Incident Report with AI analysis
app.post("/api/incidents", async (req, res) => {
  const { stadium_id, description, severity, camera_feed } = req.body;

  if (!stadium_id || !description || !severity) {
    res.status(400).json({ error: "Missing required parameters" });
    return;
  }

  const stadium = stadiums.find((s) => s.id === stadium_id);
  const stadiumName = stadium ? stadium.name : "FIFA Stadium";

  let aiAnalysis = "Awaiting AI analysis...";

  if (ai) {
    try {
      const prompt = `Analyze the following stadium security incident report. Provide a professional, tactical response protocol, and surveillance prediction. Keep your answer under 120 words.
      Stadium: ${stadiumName}
      Incident: ${description}
      Severity Level: ${severity}
      Camera Feed Source: ${camera_feed || "Unknown"}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });
      if (response.text) {
        aiAnalysis = response.text.trim();
      }
    } catch (err: any) {
      console.error("Gemini Incident Analysis Error:", err);
      aiAnalysis = `[Local Guard Protocol AI Output] Elevated severity event detected in ${stadiumName}. Dispatched local sector guards immediately. (Live Gemini AI request failed: ${err.message || err})`;
    }
  } else {
    // Elegant simulated fallback
    aiAnalysis = `[Simulation AI Agent Output]: Incident localized at ${stadiumName}. Initiating Protocol S-26. Security cameras around ${camera_feed || "Zone"} are locking telemetry. Dispatched local security units to investigate. Severity mapped as ${severity}.`;
  }

  const newReport: IncidentReport = {
    id: `inc-${Date.now()}`,
    stadium_id,
    description,
    severity,
    timestamp: new Date().toISOString(),
    ai_analysis: aiAnalysis,
    camera_feed: camera_feed || "Area-General-Cam",
    status: "OPEN",
  };

  incidentReports.unshift(newReport);

  // Limit in-memory database to last 50 reports
  if (incidentReports.length > 50) {
    incidentReports = incidentReports.slice(0, 50);
  }

  // Trigger real-time crowd update
  broadcast({
    type: "NEW_INCIDENT",
    incident: newReport,
  });

  res.json(newReport);
});

// Get Energy Logs
app.get("/api/energy-logs", (req, res) => {
  // Aggregate recent logs
  res.json(energyLogs);
});

// --- GENAI INTEGRATED ENDPOINTS ---

// A. GenAI Security Search Hub
app.post("/api/security/query", async (req, res) => {
  const { query, selectedStadiumId } = req.body;

  if (!query) {
    res.status(400).json({ error: "Query is required" });
    return;
  }

  const activeStadium = stadiums.find((s) => s.id === selectedStadiumId) || stadiums[0];

  let aiResponseText = "";
  let matchedDetections: any[] = [];

  if (ai) {
    try {
      const systemInstruction = `You are the AI Video Surveillance (AVS) Analyst for the FIFA 2026 Smart Stadium Command Center.
      You have access to simulated live video camera feeds.
      Given a search query from security staff, write an analyst report of what the cameras "detected" matching their description in the stadium ${activeStadium.name}.
      You must respond in a JSON format. The response should contain two fields:
      1. 'analysis_summary': A structured, professional security assessment text describing what was found.
      2. 'detections': An array of up to 3 camera detection objects, each containing:
         - 'camera_id': e.g., 'Cam-04-North', 'Gate-C-Entrance', 'Cam-12-East'
         - 'timestamp': A relative timestamp text, e.g., '3 mins ago', '12 mins ago'
         - 'event_name': Short name like 'Crowd Surging', 'Unattended Baggage', 'Minor Bottleneck'
         - 'confidence': Number between 0.85 and 0.99
         - 'action_taken': Brief mitigation note like 'Dispatched supervisor' or 'Variable signage modified'
      
      Ensure the analysis aligns strictly with the user's query. Be realistic and tactical.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: query,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              analysis_summary: {
                type: Type.STRING,
                description: "The summary report compiled by the surveillance AI.",
              },
              detections: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    camera_id: { type: Type.STRING },
                    timestamp: { type: Type.STRING },
                    event_name: { type: Type.STRING },
                    confidence: { type: Type.NUMBER },
                    action_taken: { type: Type.STRING },
                  },
                  required: ["camera_id", "timestamp", "event_name", "confidence", "action_taken"],
                },
              },
            },
            required: ["analysis_summary", "detections"],
          },
        },
      });

      if (response.text) {
        const parsed = JSON.parse(response.text.trim());
        aiResponseText = parsed.analysis_summary;
        matchedDetections = parsed.detections;
      }
    } catch (err: any) {
      console.error("Gemini Security Query Error:", err);
      aiResponseText = `Error calling Gemini AI: ${err.message}. Showing local simulator telemetry fallback.`;
    }
  }

  // Fallback simulator if AI is not configured or failed
  if (!aiResponseText) {
    const queryLower = query.toLowerCase();
    if (queryLower.includes("surge") || queryLower.includes("crowd") || queryLower.includes("concourse")) {
      aiResponseText = `AVS Search triggered for 'Crowd Surge / Flow Density'. System scanned feeds across ${activeStadium.name}. Found high-density surge indicators on main access pathways. Flow speed has decelerated to 0.4 m/s in specific bottlenecks.`;
      matchedDetections = [
        {
          camera_id: "Cam-12-East",
          timestamp: "5 mins ago",
          event_name: "Local Crowd Surge Build-up",
          confidence: 0.94,
          action_taken: "Signs flipped to redirect flow. Main ramp status escalated.",
        },
        {
          camera_id: "Gate-C-Entrance",
          timestamp: "24 mins ago",
          event_name: "Entrance Bottleneck Packing",
          confidence: 0.89,
          action_taken: "Re-allocated 4 security marshals to coordinate secondary turnstiles.",
        },
      ];
    } else if (queryLower.includes("bag") || queryLower.includes("backpack") || queryLower.includes("unattended") || queryLower.includes("gate 4")) {
      aiResponseText = `AVS Search triggered for 'Unattended Baggage'. Scanned high-definition surveillance cams at ${activeStadium.name}. Confirmed a stationary thermal object matches high-threat profiling under Gate 4 Section 114 area.`;
      matchedDetections = [
        {
          camera_id: "Cam-04-North",
          timestamp: "15 mins ago",
          event_name: "Unattended Blue Backpack",
          confidence: 0.98,
          action_taken: "Area supervisor dispatched. Localized safety perimeter initialized.",
        },
      ];
    } else {
      aiResponseText = `AVS General Sweep completed for query: "${query}" in ${activeStadium.name}. Feeds are operating within standard parameters. No major thermal anomalies or flow stress indicators detected beyond typical stadium congestion levels.`;
      matchedDetections = [
        {
          camera_id: "Cam-Main-Field",
          timestamp: "Just now",
          event_name: "Fan High Density",
          confidence: 0.92,
          action_taken: "No action required. General matches monitored.",
        },
      ];
    }
  }

  res.json({
    analysis_summary: aiResponseText,
    detections: matchedDetections,
    stadium_id: activeStadium.id,
    timestamp: new Date().toISOString(),
  });
});

// C. Sustainability AI Recommendations Agent
app.post("/api/sustainability/recommendations", async (req, res) => {
  const { stadiumId } = req.body;

  const stadium = stadiums.find((s) => s.id === stadiumId) || stadiums[0];
  const isSleepActive = aiSleepModeActive[stadium.id];

  let recommendations = "";

  if (ai) {
    try {
      const prompt = `You are the Lead Sustainability & Energy AI Assistant for the FIFA 2026 Smart Stadium Command Center.
      Provide a professional sustainability report with customized, actionable recommendation protocols for ${stadium.name} located in ${stadium.city}.
      Consider these operational parameters:
      - Total Capacity: ${stadium.capacity}
      - Current Crowd Size: ${stadium.current_crowd} pax
      - Climate/Weather: ${stadium.temp_f}°F, ${stadium.humidity_pct}% humidity
      - Elevation: ${stadium.elevation_ft} ft
      - AI sleep mode is currently: ${isSleepActive ? "ACTIVE" : "INACTIVE"}

      Provide exactly 3 concise, bulleted protocols (HVAC, Lighting, Grid load reduction) that can be sent to stadium operations. Keep the total response under 150 words.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });
      if (response.text) {
        recommendations = response.text.trim();
      }
    } catch (err: any) {
      console.error("Gemini Sustainability Error:", err);
    }
  }

  if (!recommendations) {
    // Elegant mock feedback if AI is down or missing
    recommendations = `### Dynamic Sustainability Assessment for ${stadium.name}
*   **HVAC Grid Shaving:** Ambient temperature is ${stadium.temp_f}°F with ${stadium.humidity_pct}% humidity. Recommend raising internal HVAC setpoints by 1.5°F immediately, which will reduce power consumption by roughly 12.5%.
*   **Smart High-Mast Lighting:** Current crowd is ${stadium.current_crowd} pax. Implement 20% luminosity reduction in non-safety concourse pathways and administrative sections.
*   **Load Balancing:** Schedule water-cooler compressor cycle intervals during high play-time blocks when concourse foot traffic drops.`;
  }

  res.json({
    stadium_id: stadium.id,
    ai_sleep_mode_active: isSleepActive,
    recommendations,
  });
});

// D. Multilingual Translation API
app.post("/api/fan/translate", async (req, res) => {
  const { text, targetLanguage } = req.body;

  if (!text) {
    res.status(400).json({ error: "Announcement text is required" });
    return;
  }

  let translatedText = "";
  let hapticDescription = "";

  if (ai) {
    try {
      const prompt = `You are a translator and accessibility specialist at the FIFA 2026 World Cup venues.
      Translate the following official stadium announcement into ${targetLanguage || "Spanish"}:
      "${text}"
      
      Also, create a Touch2See descriptive haptic instruction format of this announcement. The haptic format must convey the core physical context of the announcement (e.g., location, direction, action) in a highly simplified, spatial, rhythmic format suitable for haptic vibration motor grids on accessibility tablets.
      
      Respond in JSON format with exactly two properties:
      - 'translation': The exact text translation.
      - 'haptic': Rhythmic haptic instructions (e.g., 'Pulse: High (3), Pattern: Sweep Left-to-Right, Duration: 2000ms').`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              translation: { type: Type.STRING },
              haptic: { type: Type.STRING },
            },
            required: ["translation", "haptic"],
          },
        },
      });

      if (response.text) {
        const parsed = JSON.parse(response.text.trim());
        translatedText = parsed.translation;
        hapticDescription = parsed.haptic;
      }
    } catch (err: any) {
      console.error("Gemini Translation Error:", err);
    }
  }

  if (!translatedText) {
    // Simulated translation fallback
    const mockTranslations: Record<string, string> = {
      Spanish: `Atención aficionados: Puerta 4 norte está temporalmente congestionada. Por favor, utilicen los desvíos hacia la rampa oeste para un ingreso rápido.`,
      French: `Attention supporters: La porte 4 nord est temporairement congestionnée. Veuillez utiliser les déviations vers la rampe ouest pour une entrée plus rapide.`,
      Portuguese: `Atenção torcedores: O Portão 4 Norte está temporariamente congestionado. Por favor, utilizem os desvios para a rampa oeste para entrada rápida.`,
      German: `Achtung Fans: Tor 4 Nord ist vorübergehend überlastet. Bitte nutzen Sie die Umleitungen zur Westrampe für einen schnelleren Einlass.`,
    };

    translatedText = mockTranslations[targetLanguage] || `[${targetLanguage} Translation Simulation]: ${text}`;
    hapticDescription = `Pulse: HighIntensity [Gate 4 Directional Sweep] • Frequency: 45Hz • Directional flow: Left to West Promenade ramp • Duration: 1500ms`;
  }

  res.json({
    original_text: text,
    target_language: targetLanguage || "Spanish",
    translated_text: translatedText,
    haptic_tablet_instructions: hapticDescription,
  });
});

// --- HTTP SERVER & WEBSOCKET SETUP ---

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

// Broadcast helper
const broadcast = (data: any) => {
  const payload = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
};

wss.on("connection", (ws) => {
  console.log("WebSocket client connected to Command Center.");
  
  // Send immediate welcome packet with current state
  ws.send(
    JSON.stringify({
      type: "INITIAL_STATE",
      sleepModes: aiSleepModeActive,
      transitMetrics,
    })
  );

  ws.on("close", () => {
    console.log("WebSocket client disconnected.");
  });
});

// Real-Time Stadium Telemetry Broadcast Loop (every 3 seconds)
setInterval(() => {
  stadiums.forEach((stadium) => {
    const isSleep = aiSleepModeActive[stadium.id];
    
    // Simulate slight natural crowd and power fluctuations
    const crowdChange = Math.round((Math.random() - 0.5) * 50);
    stadium.current_crowd = Math.max(
      Math.min(stadium.current_crowd + crowdChange, stadium.capacity),
      1000
    );

    // Calc live HVAC/lighting metrics based on sleep mode
    const baseHvac = isSleep ? 45 : 75;
    const baseLighting = isSleep ? 40 : 80;
    const hvac = Math.round(baseHvac + (Math.random() - 0.5) * 5);
    const lighting = Math.round(baseLighting + (Math.random() - 0.5) * 3);

    const hourlyPower = Math.round(
      ((stadium.capacity / 100) * (0.8 + Math.random() * 0.2)) * (isSleep ? 0.7 : 1.0)
    );

    // Save logs occasionally
    if (Math.random() > 0.8) {
      energyLogs.push({
        id: `eng-live-${stadium.id}-${Date.now()}`,
        stadium_id: stadium.id,
        power_usage_kwh: hourlyPower,
        timestamp: new Date().toISOString(),
        ai_sleep_mode_active: isSleep,
      });
      // Cap log array
      if (energyLogs.length > 200) {
        energyLogs = energyLogs.slice(energyLogs.length - 150);
      }
    }

    // Process transit metric countdown if stress test is active
    const transit = transitMetrics[stadium.id];
    if (transit && transit.stress_test_active && transit.stress_test_elapsed_mins !== undefined) {
      transit.stress_test_elapsed_mins += 1;
      // Decrease extraction time simulation
      const timeReduction = Math.round(1.5 + Math.random() * 2);
      transit.estimated_extraction_time_mins = Math.max(
        transit.estimated_extraction_time_mins - timeReduction,
        0
      );

      // Randomly fluctuation transit parameters during stress tests
      transit.bus_utilization_pct = Math.min(Math.round(85 + Math.random() * 15), 100);
      transit.rail_utilization_pct = Math.min(Math.round(90 + Math.random() * 10), 100);

      if (transit.estimated_extraction_time_mins === 0) {
        // Complete stress test
        transit.stress_test_active = false;
        transit.stress_test_elapsed_mins = undefined;
        transit.bus_utilization_pct = 40;
        transit.rail_utilization_pct = 45;
        transit.egress_rate_pax_min = Math.round(transit.egress_rate_pax_min / 1.5);
      }
    }

    const liveTelemetry: StadiumLiveTelemetry = {
      stadium_id: stadium.id,
      timestamp: new Date().toISOString(),
      power_usage_kwh: hourlyPower,
      hvac_load_pct: hvac,
      lighting_load_pct: lighting,
      carbon_travel_tons: Math.round((stadium.current_crowd * 0.012) * 10) / 10,
      carbon_ops_tons: Math.round((hourlyPower * 0.00045) * 10) / 10,
      crowd_surging_risk: stadium.current_crowd > stadium.capacity * 0.9 ? "HIGH" : stadium.current_crowd > stadium.capacity * 0.75 ? "MODERATE" : "LOW",
      unattended_bags_count: incidentReports.filter(r => r.stadium_id === stadium.id && r.severity === "HIGH" && r.status !== "RESOLVED").length,
      ai_sleep_mode_active: isSleep,
    };

    broadcast({
      type: "LIVE_TELEMETRY",
      stadium_id: stadium.id,
      telemetry: liveTelemetry,
      stadium_current_crowd: stadium.current_crowd,
      transit: transit,
    });
  });
}, 3000);


// --- VITE DEV OR PROD ROUTING ---

const startServer = async () => {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Command Center full-stack server running on http://0.0.0.0:${PORT}`);
  });
};

startServer().catch((err) => {
  console.error("Critical server startup error:", err);
});
