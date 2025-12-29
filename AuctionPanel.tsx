
import React, { useState, useEffect } from 'react';
import { Player, Team, PlayerTier } from '../types';
import { getRecommendedBasePrice } from '../services/geminiService';

interface AuctionPanelProps {
  player: Player;
  teams: Team[];
  onBid: (amount: number, teamId: string) => void;
  onSold: (playerId: string, teamId: string, amount: number) => void;
  userTeamId?: string;
  isAdmin?: boolean;
  timer: number;
}

const AuctionPanel: React.FC<AuctionPanelProps> = ({ player, teams, onBid, onSold, userTeamId, isAdmin, timer }) => {
  const [bidIncrement, setBidIncrement] = useState(100);
  const [manualPrice, setManualPrice] = useState<number>(player.current_bid);
  const [recommendedPrice, setRecommendedPrice] = useState<number | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(false);

  useEffect(() => {
    const fetchPrice = async () => {
      setLoadingPrice(true);
      const price = await getRecommendedBasePrice(player.skill_stats);
      setRecommendedPrice(price);
      setLoadingPrice(false);
    };
    fetchPrice();
  }, [player.uid]);

  // Keep manual price in sync with current bid until admin overrides
  useEffect(() => {
    setManualPrice(player.current_bid);
  }, [player.current_bid]);

  const handleBid = (teamId: string) => {
    onBid(player.current_bid + bidIncrement, teamId);
  };

  const userTeam = teams.find(t => t.id === userTeamId);
  const highestBidder = teams.find(t => t.id === player.team_id);

  return (
    <div className="bg-white border border-slate-200 rounded-[3rem] p-12 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 blur-[100px] rounded-full pointer-events-none"></div>
      
      <div className="relative z-10">
        <div className="flex justify-between items-start gap-12 mb-12">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[10px] font-black bg-orange-600 text-white px-4 py-1.5 rounded-full uppercase tracking-[0.2em] shadow-lg shadow-orange-500/20">Active Sequence</span>
              <span className="text-[10px] font-black bg-amber-500 text-white px-4 py-1.5 rounded-full uppercase tracking-[0.2em] shadow-lg shadow-amber-500/20">{player.tier}</span>
              <div className="flex items-center gap-2 bg-slate-100 px-4 py-1.5 rounded-full border border-slate-200">
                 <div className={`w-2 h-2 rounded-full ${timer < 10 ? 'bg-red-500 animate-ping' : 'bg-orange-500'}`}></div>
                 <span className={`text-[10px] font-black uppercase tracking-widest ${timer < 10 ? 'text-red-500' : 'text-slate-600'}`}>{timer}s Remaining</span>
              </div>
            </div>
            <h2 className="text-6xl font-black text-slate-900 tracking-tighter mb-2 uppercase leading-none drop-shadow-sm">{player.name}</h2>
            <p className="text-orange-600 font-black text-xs uppercase tracking-widest italic">{player.position} • {player.dept}</p>
          </div>
          
          <div className="text-right">
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Current Highest Bid</p>
            <p className="text-7xl font-black text-slate-900 tracking-tighter tabular-nums mb-3">৳{player.current_bid}</p>
            <div className="flex items-center justify-end gap-2">
               <span className="text-[10px] text-slate-400 font-black uppercase">Holding Bid:</span>
               <span className="text-[11px] text-orange-600 font-black uppercase truncate max-w-[150px] bg-orange-50 px-2 py-1 rounded-lg border border-orange-100">
                 {highestBidder?.team_name || 'Awaiting Entry'}
               </span>
            </div>
          </div>
        </div>

        {/* AI Insight */}
        <div className="bg-slate-50 border border-slate-200 rounded-[2.5rem] p-8 mb-12 flex items-center justify-between shadow-inner">
           <div className="flex items-center gap-6">
              <div className="w-14 h-14 bg-white border border-slate-200 rounded-2xl flex items-center justify-center shadow-sm">
                 <svg className="w-8 h-8 text-orange-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <div>
                 <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">AI Market Recommendation (BDT)</p>
                 <p className="text-2xl font-black text-slate-900">{loadingPrice ? 'Scanning Talent...' : `৳${recommendedPrice}`}</p>
              </div>
           </div>
           {player.tier === PlayerTier.TIER_1 && (
             <div className="px-6 py-4 bg-amber-50 border border-amber-200 rounded-2xl">
               <p className="text-[9px] font-black text-amber-700 uppercase tracking-widest">Elite Restriction</p>
               <p className="text-[11px] text-amber-600 font-bold max-w-[200px] leading-tight mt-1">Teams are limited to 2 Tier 1 athletes.</p>
             </div>
           )}
           <div className="text-right hidden md:block">
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Reserve Floor</p>
              <p className="text-2xl font-black text-slate-400">৳{player.base_price}</p>
           </div>
        </div>

        {/* Controls */}
        {userTeamId && userTeam && (
          <div className="animate-in slide-in-from-bottom-8 duration-700 bg-white border border-orange-200 rounded-[3rem] p-12 shadow-2xl text-center space-y-10">
             <div className="flex items-center justify-center gap-10">
                <div className="text-left">
                   <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Available Capital</p>
                   <p className="text-4xl font-black text-slate-900">৳{userTeam.total_budget - userTeam.spent_budget}</p>
                </div>
                <div className="w-[1px] h-12 bg-slate-100"></div>
                <div className="text-left">
                   <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Team Account</p>
                   <p className="text-2xl font-black text-orange-600 uppercase truncate max-w-[200px]">{userTeam.team_name}</p>
                </div>
             </div>
             
             <div className="flex gap-4 justify-center">
                {[100, 250, 500, 1000].map(inc => (
                  <button 
                    key={inc}
                    onClick={() => setBidIncrement(inc)}
                    className={`px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${bidIncrement === inc ? 'bg-orange-600 text-white shadow-xl shadow-orange-500/40' : 'bg-slate-50 text-slate-400 border border-slate-200 hover:text-slate-900 hover:border-slate-300'}`}
                  >
                    +৳{inc}
                  </button>
                ))}
             </div>

             <button 
               onClick={() => handleBid(userTeamId)}
               className="w-full py-10 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 active:scale-95 transition-all text-white font-black text-4xl rounded-[2.5rem] shadow-2xl shadow-orange-500/40 uppercase tracking-tighter border-b-8 border-orange-800"
             >
               Commit Bid: ৳{player.current_bid + bidIncrement}
             </button>
          </div>
        )}

        {isAdmin && (
          <div className="space-y-10 mt-10 animate-in fade-in duration-1000">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {teams.map(team => (
                <button
                  key={team.id}
                  onClick={() => handleBid(team.id)}
                  className="p-6 bg-white border border-slate-200 hover:border-orange-500 rounded-[2.5rem] transition-all text-left group relative shadow-md"
                >
                  <p className="text-[10px] text-slate-400 font-black uppercase truncate mb-1">{team.team_name}</p>
                  <p className="text-xl font-black text-slate-900">৳{team.total_budget - team.spent_budget}</p>
                  <div className="absolute inset-0 bg-orange-600/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-[2.5rem] flex items-center justify-center">
                     <span className="text-[10px] font-black text-orange-600 uppercase">+৳{bidIncrement}</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-200">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-3 text-center">Override Settlement Amount (৳)</label>
              <input 
                type="number" 
                value={manualPrice} 
                onChange={(e) => setManualPrice(Number(e.target.value))}
                className="w-full bg-white border-2 border-slate-200 rounded-2xl p-6 text-3xl font-black text-center text-slate-900 focus:border-orange-500 transition-all outline-none"
              />
              <p className="text-[10px] text-slate-400 font-bold italic mt-3 text-center">Defaults to current high bid unless manually specified.</p>
            </div>

            <div className="flex gap-6">
              <button
                onClick={() => onSold(player.uid, player.team_id || '', manualPrice)}
                className="flex-1 py-8 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white font-black text-2xl rounded-[2.5rem] shadow-2xl uppercase transition-all active:scale-95"
              >
                Execute Contract
              </button>
              <button
                onClick={() => onSold(player.uid, '', 0)}
                className="px-12 py-8 bg-slate-50 hover:bg-slate-100 text-slate-400 font-black text-2xl rounded-[2.5rem] uppercase transition-all border border-slate-200"
              >
                Pass
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuctionPanel;
