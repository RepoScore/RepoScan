import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface SafetyBreakdown {
  total: number;
  dependency_risks: number;
  code_security: number;
  config_hygiene: number;
  code_quality: number;
  maintenance_posture: number;
}

export interface LegitimacyBreakdown {
  total: number;
  working_evidence: number;
  transparency_docs: number;
  community_signals: number;
  author_reputation: number;
  license_compliance: number;
}

export interface RepoScan {
  id: string;
  github_url: string;
  repo_name: string;
  safety_score: number;
  legitimacy_score: number;
  overall_score: number;
  confidence: number;
  breakdown: {
    safety: SafetyBreakdown;
    legitimacy: LegitimacyBreakdown;
  };
  notes: string[];
  analysis_summary: string;
  risk_factors: string[];
  positive_indicators: string[];
  scan_date: string;
  created_at: string;
}
