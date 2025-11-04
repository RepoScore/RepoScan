import { Shield, CheckCircle, TrendingUp } from 'lucide-react';

interface ScoreCardProps {
  title: string;
  score: number;
  icon: 'safety' | 'legitimacy' | 'overall';
  breakdown?: Record<string, number>;
  labels?: Record<string, string>;
  weights?: Record<string, number>;
}

export function ScoreCard({ title, score, icon, breakdown, labels, weights }: ScoreCardProps) {
  const getScoreColor = (s: number) => {
    if (s >= 70) return 'text-green-400';
    if (s >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBgColor = (s: number) => {
    if (s >= 70) return 'bg-green-900/20 border-green-500/40';
    if (s >= 50) return 'bg-yellow-900/20 border-yellow-500/40';
    return 'bg-red-900/20 border-red-500/40';
  };

  const getBorderColor = () => {
    if (icon === 'safety') return 'border-blue-500/40';
    if (icon === 'legitimacy') return 'border-teal-500/40';
    return 'border-slate-500/40';
  };

  const IconComponent = icon === 'safety' ? Shield : icon === 'legitimacy' ? CheckCircle : TrendingUp;

  return (
    <div className={`${getScoreBgColor(score)} rounded-xl p-6 border-2 ${getBorderColor()} transition-all hover:shadow-lg`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
        <IconComponent className="w-6 h-6 text-slate-300" />
      </div>

      <div className={`text-5xl font-bold ${getScoreColor(score)} mb-1`}>
        {score}
      </div>
      <div className="text-sm text-slate-400 mb-4">out of 100</div>

      {breakdown && labels && weights && (
        <div className="pt-4 border-t border-slate-700/50">
          <div className="text-xs text-slate-300 space-y-2">
            {Object.entries(breakdown).map(([key, value]) => {
              if (key === 'total') return null;
              return (
                <div key={key} className="flex justify-between items-center">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{labels[key]}</span>
                      <span className="text-xs text-slate-400">{weights[key]}%</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${
                          value >= 70 ? 'bg-green-500' : value >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${value}%` }}
                      />
                    </div>
                  </div>
                  <span className="ml-3 font-semibold text-slate-300 min-w-[2rem] text-right">{Math.round(value)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
