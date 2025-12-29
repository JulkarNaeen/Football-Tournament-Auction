
import React from 'react';
import { Player, PlayerTier } from '../types';

interface PlayerCardProps {
  player: Player;
  isMini?: boolean;
  soldTo?: string;
}

const PlayerCard: React.FC<PlayerCardProps> = ({ player, isMini = false, soldTo }) => {
  const getTierColor = (tier: PlayerTier) => {
    switch (tier) {
      case PlayerTier.TIER_1: return 'bg-amber-500 shadow-amber-500/40 text-white';
      case PlayerTier.TIER_2: return 'bg-slate-500 shadow-slate-500/40 text-white';
      case PlayerTier.TIER_3: return 'bg-orange-400 shadow-orange-400/40 text-white';
      default: return 'bg-slate-400 text-white';
    }
  };

  return (
    <div className={`${isMini ? 'scale-75 origin-top-left' : ''} relative w-80 h-[480px] bg-gradient-to-br from-slate-200 to-white rounded-[2.5rem] p-1 shadow-2xl border border-slate-200 overflow-hidden transition-all hover:translate-y-[-4px]`}>
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-2/3 bg-slate-50"></div>
      
      <div className="bg-white w-full h-full rounded-[2.3rem] relative overflow-hidden flex flex-col">
        
        {/* Tier Badge */}
        <div className={`absolute top-6 right-6 z-20 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg ${getTierColor(player.tier)}`}>
           {player.tier}
        </div>

        {/* Header Section: Valuation Highlight */}
        <div className="absolute top-6 left-6 z-20 flex flex-col items-center">
          <div className="text-[9px] font-black text-orange-600 uppercase tracking-tighter mb-0.5">EST. VALUE (BDT)</div>
          <div className="text-3xl font-black text-slate-900 italic leading-none">
            ৳{player.base_price >= 1000 ? (player.base_price / 1000).toFixed(1) + 'K' : player.base_price}
          </div>
          <div className="h-[2px] w-8 bg-orange-600 my-1.5 rounded-full"></div>
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
             REF: {player.uid.split('-')[1]}
          </div>
        </div>

        {/* Player Image Area */}
        <div className="relative w-full h-2/3 group bg-slate-50 overflow-hidden">
           {player.imageUrl ? (
             <img 
               src={player.imageUrl} 
               alt={player.name} 
               className="w-full h-full object-cover object-top transition-all duration-700 brightness-105 group-hover:scale-105"
             />
           ) : (
             <div className="w-full h-full flex items-center justify-center">
                <svg className="w-32 h-32 text-slate-200" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
             </div>
           )}
           <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent"></div>
        </div>

        {/* Info Section */}
        <div className="px-8 pb-8 flex-1 flex flex-col justify-center -mt-6 relative z-10 text-center">
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-tight mb-2 drop-shadow-sm">{player.name}</h2>
          <div className="flex flex-col items-center justify-center gap-2 mb-4">
             <div className="px-4 py-1.5 bg-orange-600 text-white rounded-full text-[10px] font-black uppercase tracking-[0.1em] shadow-lg shadow-orange-500/30">
               {player.position || 'ATHLETE'}
             </div>
             {soldTo && (
               <div className="text-[10px] font-black text-orange-600 uppercase mt-1">
                 Acquired by {soldTo}
               </div>
             )}
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-6">
             <div className="flex gap-2">
                {player.sports.map(s => (
                  <div key={s} className="w-4 h-4 rounded-full bg-orange-500/10 border border-orange-500/20" title={s}></div>
                ))}
             </div>
             <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                {player.dept}
             </div>
          </div>
        </div>

        {/* Auction Status Ribbon */}
        {player.auction_status === 'SOLD' && (
           <div className="absolute top-12 -right-14 bg-green-500 text-white font-black px-14 py-2 rotate-45 text-xs uppercase tracking-[0.2em] shadow-xl">
              RECRUITED
           </div>
        )}
      </div>
    </div>
  );
};

export default PlayerCard;
