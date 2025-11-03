import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScoreCard } from './ScoreCard';

describe('ScoreCard', () => {
  it('renders the title correctly', () => {
    render(
      <ScoreCard
        title="Safety Score"
        score={85}
        icon="safety"
      />
    );

    expect(screen.getByText('Safety Score')).toBeInTheDocument();
  });

  it('displays the score value', () => {
    render(
      <ScoreCard
        title="Legitimacy Score"
        score={92}
        icon="legitimacy"
      />
    );

    expect(screen.getByText('92')).toBeInTheDocument();
    expect(screen.getByText('out of 100')).toBeInTheDocument();
  });

  it('applies correct color classes for high scores', () => {
    render(
      <ScoreCard
        title="Test Score"
        score={85}
        icon="overall"
      />
    );

    const scoreElement = screen.getByText('85');
    expect(scoreElement).toHaveClass('text-green-600');
  });

  it('applies correct color classes for medium scores', () => {
    render(
      <ScoreCard
        title="Test Score"
        score={55}
        icon="overall"
      />
    );

    const scoreElement = screen.getByText('55');
    expect(scoreElement).toHaveClass('text-yellow-600');
  });

  it('applies correct color classes for low scores', () => {
    render(
      <ScoreCard
        title="Test Score"
        score={35}
        icon="overall"
      />
    );

    const scoreElement = screen.getByText('35');
    expect(scoreElement).toHaveClass('text-red-600');
  });

  it('renders breakdown when provided', () => {
    const breakdown = {
      total: 85,
      dependency_risks: 80,
      code_security: 90,
      config_hygiene: 85,
      code_quality: 88,
      maintenance_posture: 82,
    };

    const labels = {
      dependency_risks: 'Dependency Risks',
      code_security: 'Code Security',
      config_hygiene: 'Config Hygiene',
      code_quality: 'Code Quality',
      maintenance_posture: 'Maintenance',
    };

    const weights = {
      dependency_risks: 30,
      code_security: 30,
      config_hygiene: 15,
      code_quality: 15,
      maintenance_posture: 10,
    };

    render(
      <ScoreCard
        title="Safety Score"
        score={85}
        icon="safety"
        breakdown={breakdown}
        labels={labels}
        weights={weights}
      />
    );

    expect(screen.getByText('Dependency Risks')).toBeInTheDocument();
    expect(screen.getByText('Code Security')).toBeInTheDocument();
    expect(screen.getByText('30%')).toBeInTheDocument();
  });

  it('does not render breakdown when not provided', () => {
    render(
      <ScoreCard
        title="Overall Score"
        score={87}
        icon="overall"
      />
    );

    expect(screen.queryByText('Dependency Risks')).not.toBeInTheDocument();
  });
});
