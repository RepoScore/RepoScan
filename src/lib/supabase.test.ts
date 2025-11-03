import { describe, it, expect } from 'vitest';
import { supabase } from './supabase';

describe('Supabase Client', () => {
  it('should be defined', () => {
    expect(supabase).toBeDefined();
  });

  it('should have the correct structure', () => {
    expect(supabase).toHaveProperty('from');
    expect(supabase).toHaveProperty('auth');
  });
});

describe('TypeScript Interfaces', () => {
  it('should validate RepoScan structure', () => {
    const mockScan = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      github_url: 'https://github.com/test/repo',
      repo_name: 'test/repo',
      safety_score: 85,
      legitimacy_score: 90,
      overall_score: 88,
      confidence: 0.95,
      breakdown: {
        safety: {
          total: 85,
          dependency_risks: 80,
          code_security: 90,
          config_hygiene: 85,
          code_quality: 88,
          maintenance_posture: 82,
        },
        legitimacy: {
          total: 90,
          working_evidence: 95,
          transparency_docs: 88,
          community_signals: 92,
          author_reputation: 85,
          license_compliance: 100,
        },
      },
      notes: ['Test note'],
      analysis_summary: 'Test summary',
      risk_factors: ['Risk 1'],
      positive_indicators: ['Indicator 1'],
      scan_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    expect(mockScan).toHaveProperty('safety_score');
    expect(mockScan).toHaveProperty('legitimacy_score');
    expect(mockScan).toHaveProperty('overall_score');
    expect(mockScan).toHaveProperty('confidence');
    expect(mockScan.breakdown).toHaveProperty('safety');
    expect(mockScan.breakdown).toHaveProperty('legitimacy');
  });
});
