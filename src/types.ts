export interface Stadium {
  id: string;
  name: string;
  city: string;
  capacity: number;
  transit_index: number; // 1-100 scale
  current_crowd: number;
  elevation_ft: number;
  temp_f: number;
  humidity_pct: number;
}

export interface IncidentReport {
  id: string;
  stadium_id: string;
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  timestamp: string;
  ai_analysis: string;
  camera_feed: string;
  status: "OPEN" | "INVESTIGATING" | "RESOLVED";
}

export interface EnergyLog {
  id: string;
  stadium_id: string;
  power_usage_kwh: number;
  timestamp: string;
  ai_sleep_mode_active: boolean;
}

export interface TransitMetric {
  stadium_id: string;
  bus_utilization_pct: number;
  rail_utilization_pct: number;
  egress_rate_pax_min: number;
  estimated_extraction_time_mins: number;
  stress_test_active: boolean;
  stress_test_elapsed_mins?: number;
}

export interface StadiumLiveTelemetry {
  stadium_id: string;
  timestamp: string;
  power_usage_kwh: number;
  hvac_load_pct: number;
  lighting_load_pct: number;
  carbon_travel_tons: number;
  carbon_ops_tons: number;
  crowd_surging_risk: "LOW" | "MODERATE" | "HIGH";
  unattended_bags_count: number;
  ai_sleep_mode_active: boolean;
}
