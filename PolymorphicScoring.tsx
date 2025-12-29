
import React from 'react';
import { SportType } from '../types';

interface ScoreProps {
  sport: SportType;
  score: any;
  teamNames: string[];
}

const PolymorphicScoring: React.FC<ScoreProps> = ({ sport, score, teamNames }) => {
  const renderScoring = () => {
    switch (sport) {
      case SportType.FOOTBALL:
        return (
          <div className="flex justify-between items-center bg-slate-800 p-6 rounded-xl border border-blue-500/30">
            <div className="text-center">
              <p className="text-slate-400 text-sm uppercase">{teamNames[0]}</p>
              <h3 className="text-4xl font-bold text-white">{score.team1_goals || 0}</h3>
            </div>
            <div className="text-xl font-bold text-blue-400">VS</div>
            <div className="text-center">
              <p className="text-slate-400 text-sm uppercase">{teamNames[1]}</p>
              <h3 className="text-4xl font-bold text-white">{score.team2_goals || 0}</h3>
            </div>
          </div>
        );
      case SportType.CRICKET:
        return (
          <div className="bg-slate-800 p-6 rounded-xl border border-amber-500/30">
            <div className="grid grid-cols-2 gap-4">
              {teamNames.map((name, idx) => (
                <div key={name} className="p-3 bg-slate-700/50 rounded-lg">
                  <p className="text-slate-400 text-xs mb-1 uppercase font-semibold">{name}</p>
                  <p className="text-2xl font-bold text-amber-400">
                    {score[`team${idx+1}_runs`] || 0}/{score[`team${idx+1}_wickets`] || 0}
                  </p>
                  <p className="text-xs text-slate-500">Overs: {score[`team${idx+1}_overs`] || '0.0'}</p>
                </div>
              ))}
            </div>
          </div>
        );
      case SportType.BADMINTON:
        return (
          <div className="bg-slate-800 p-6 rounded-xl border border-green-500/30">
             <div className="flex flex-col gap-2">
               {teamNames.map((name, idx) => (
                 <div key={name} className="flex justify-between items-center p-2 border-b border-slate-700 last:border-0">
                    <span className="font-medium text-slate-200">{name}</span>
                    <div className="flex gap-2">
                       {(score[`team${idx+1}_sets`] || [0,0,0]).map((s: number, i: number) => (
                         <span key={i} className={`w-8 h-8 flex items-center justify-center rounded ${i === score.current_set ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
                           {s}
                         </span>
                       ))}
                    </div>
                 </div>
               ))}
             </div>
          </div>
        );
      default:
        return <div className="text-white">Invalid Sport</div>;
    }
  };

  return <div className="w-full">{renderScoring()}</div>;
};

export default PolymorphicScoring;
