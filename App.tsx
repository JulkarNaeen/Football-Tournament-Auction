import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, onSnapshot, setDoc, updateDoc, Firestore } from 'firebase/firestore';
import { Player, Team, SportType, AuctionStatus, Role, AuctionState, PlayerTier } from './types';
import PlayerCard from './components/PlayerCard';
import AdminPanel from './components/AdminPanel';
import AuctionPanel from './components/AuctionPanel';

const firebaseConfig = {
  apiKey: "AIzaSy-PLACEHOLDER",
  authDomain: "therap-kickoff.firebaseapp.com",
  projectId: "therap-kickoff",
  storageBucket: "therap-kickoff.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

let db: Firestore | null = null;
try {
  const isPlaceholder = firebaseConfig.apiKey.includes("PLACEHOLDER");
  if (!isPlaceholder) {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
  }
} catch (error) {
  console.error("Firebase initialization failed:", error);
}

const GLOBAL_STATE_DOC_PATH = ['auctions', 'live_session'] as const;
const STORAGE_KEYS = {
  ROLE: 'therap_kickoff_role',
  TEAM_ID: 'therap_kickoff_team_id',
  LOCAL_PLAYERS: 'therap_kickoff_local_players',
  LOCAL_TEAMS: 'therap_kickoff_local_teams',
};

// Modified to empty array to satisfy user request for a blank starting state
const INITIAL_TEAMS: Team[] = [];

const App: React.FC = () => {
  const [role, setRole] = useState<Role | null>(() => (localStorage.getItem(STORAGE_KEYS.ROLE) as Role) || null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(() => localStorage.getItem(STORAGE_KEYS.TEAM_ID) || null);
  
  // Local state as the primary source of truth for immediate interaction
  const [players, setPlayers] = useState<Player[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.LOCAL_PLAYERS);
    return saved ? JSON.parse(saved) : [];
  });
  const [teams, setTeams] = useState<Team[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.LOCAL_TEAMS);
    return saved ? JSON.parse(saved) : INITIAL_TEAMS;
  });
  const [auction, setAuction] = useState<AuctionState>({
    activePlayerId: null,
    status: 'IDLE',
    highestBidderId: null,
    currentBid: 0,
    timer: 0
  });

  const [previewPlayerId, setPreviewPlayerId] = useState<string | null>(null);
  const [isSynced, setIsSynced] = useState(false);
  const [isBackendAvailable] = useState(!!db);

  // Persistence to local storage for "Offline" reliability
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LOCAL_PLAYERS, JSON.stringify(players));
    localStorage.setItem(STORAGE_KEYS.LOCAL_TEAMS, JSON.stringify(teams));
  }, [players, teams]);

  // Sync state with Firestore in real-time
  useEffect(() => {
    if (!db) return;

    const docRef = doc(db, ...GLOBAL_STATE_DOC_PATH);
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.players) setPlayers(data.players);
        if (data.teams) setTeams(data.teams);
        if (data.auction) setAuction(data.auction as AuctionState);
        setIsSynced(true);
      } else {
        setDoc(docRef, {
          players: [],
          teams: INITIAL_TEAMS,
          auction: { activePlayerId: null, status: 'IDLE', highestBidderId: null, currentBid: 0, timer: 0 }
        }).catch(err => console.warn("Failed to init remote state:", err));
      }
    }, (error) => {
      console.error("Firestore sync error:", error);
      setIsSynced(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (role) localStorage.setItem(STORAGE_KEYS.ROLE, role);
    else localStorage.removeItem(STORAGE_KEYS.ROLE);
  }, [role]);

  useEffect(() => {
    if (selectedTeamId) localStorage.setItem(STORAGE_KEYS.TEAM_ID, selectedTeamId);
    else localStorage.removeItem(STORAGE_KEYS.TEAM_ID);
  }, [selectedTeamId]);

  const activePlayer = useMemo(() => players.find(p => p.uid === auction.activePlayerId), [players, auction.activePlayerId]);
  const mySquad = useMemo(() => players.filter(p => p.team_id === selectedTeamId), [players, selectedTeamId]);
  const soldPlayers = useMemo(() => players.filter(p => p.auction_status === AuctionStatus.SOLD), [players]);
  const previewPlayer = useMemo(() => players.find(p => p.uid === previewPlayerId), [players, previewPlayerId]);
  const userTeam = useMemo(() => teams.find(t => t.id === selectedTeamId), [teams, selectedTeamId]);

  // Command Center Timer
  useEffect(() => {
    let interval: any;
    if (role === 'ADMIN' && auction.status === 'BIDDING' && auction.timer > 0) {
      interval = setInterval(() => {
        setAuction(prev => ({ ...prev, timer: prev.timer - 1 }));
        if (db) {
          const docRef = doc(db, ...GLOBAL_STATE_DOC_PATH);
          updateDoc(docRef, { 'auction.timer': auction.timer - 1 }).catch(() => {});
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [role, auction.status, auction.timer]);

  // Optimistic Update Helper
  const pushUpdate = useCallback(async (update: any, localUpdate?: () => void) => {
    if (localUpdate) localUpdate();
    if (!db) return;
    try {
      const docRef = doc(db, ...GLOBAL_STATE_DOC_PATH);
      await updateDoc(docRef, update);
    } catch (e) {
      console.error("Cloud Sync Error:", e);
    }
  }, []);

  const handleStartAuction = (playerId: string) => {
    const player = players.find(p => p.uid === playerId);
    if (!player) return;

    const newState = {
      activePlayerId: playerId,
      status: 'BIDDING' as const,
      highestBidderId: null,
      currentBid: player.base_price,
      timer: 45
    };

    pushUpdate(
      { auction: newState },
      () => setAuction(newState)
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePlaceBid = (amount: number, teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return;

    if (team.total_budget - team.spent_budget < amount) {
      alert("Insufficient Budget!");
      return;
    }

    if (activePlayer?.tier === PlayerTier.TIER_1) {
      const tier1InSquad = players.filter(p => p.team_id === teamId && p.tier === PlayerTier.TIER_1).length;
      if (tier1InSquad >= 2) {
        alert("Elite Limit Reached! Max 2 Tier 1 athletes per squad.");
        return;
      }
    }

    pushUpdate(
      { 'auction.currentBid': amount, 'auction.highestBidderId': teamId, 'auction.timer': 30 },
      () => setAuction(prev => ({ ...prev, currentBid: amount, highestBidderId: teamId, timer: 30 }))
    );
  };

  const handleFinalizeSale = (sold: boolean, overrideTeamId?: string, overridePrice?: number) => {
    const pid = auction.activePlayerId;
    if (!pid) return;

    if (sold) {
      const targetTeamId = overrideTeamId || auction.highestBidderId;
      const finalAmount = overridePrice ?? auction.currentBid;
      if (!targetTeamId) {
        alert("Select a winning team.");
        return;
      }
      const team = teams.find(t => t.id === targetTeamId);
      if (team && (team.total_budget - team.spent_budget < finalAmount)) {
        alert("Insufficient capital.");
        return;
      }

      const updatedTeams = teams.map(t => t.id === targetTeamId ? {
        ...t,
        spent_budget: t.spent_budget + finalAmount,
        player_list: [...t.player_list, pid]
      } : t);

      const updatedPlayers = players.map(p => p.uid === pid ? {
        ...p,
        auction_status: AuctionStatus.SOLD,
        team_id: targetTeamId,
        current_bid: finalAmount
      } : p);

      const resetAuction: AuctionState = { activePlayerId: null, status: 'IDLE', highestBidderId: null, currentBid: 0, timer: 0 };

      pushUpdate(
        { teams: updatedTeams, players: updatedPlayers, auction: resetAuction },
        () => {
          setTeams(updatedTeams);
          setPlayers(updatedPlayers);
          setAuction(resetAuction);
        }
      );
    } else {
      const updatedPlayers = players.map(p => p.uid === pid ? { ...p, auction_status: AuctionStatus.UNSOLD } : p);
      const resetAuction: AuctionState = { activePlayerId: null, status: 'IDLE', highestBidderId: null, currentBid: 0, timer: 0 };
      
      pushUpdate(
        { players: updatedPlayers, auction: resetAuction },
        () => {
          setPlayers(updatedPlayers);
          setAuction(resetAuction);
        }
      );
    }
  };

  const handleAddPlayers = (newPlayers: Player[]) => {
    const updated = [...players, ...newPlayers];
    pushUpdate({ players: updated }, () => setPlayers(updated));
  };

  const handleUpdatePlayer = (updatedPlayer: Player) => {
    const updated = players.map(p => p.uid === updatedPlayer.uid ? updatedPlayer : p);
    pushUpdate({ players: updated }, () => setPlayers(updated));
  };

  const handleDeletePlayer = (uid: string) => {
    if (confirm("Delete this athlete?")) {
      const updated = players.filter(p => p.uid !== uid);
      pushUpdate({ players: updated }, () => setPlayers(updated));
    }
  };

  const handleDeleteTeam = (id: string) => {
    if (confirm("Delete this team?")) {
      const updatedTeams = teams.filter(t => t.id !== id);
      const updatedPlayers = players.map(p => p.team_id === id ? { ...p, team_id: undefined, auction_status: AuctionStatus.UNSOLD, current_bid: 0 } : p);
      pushUpdate({ teams: updatedTeams, players: updatedPlayers }, () => {
        setTeams(updatedTeams);
        setPlayers(updatedPlayers);
      });
    }
  };

  const handleAddTeams = (newTeams: Team[]) => {
    const updated = [...teams, ...newTeams];
    pushUpdate({ teams: updated }, () => setTeams(updated));
  };

  const handleClearAllData = async () => {
    if (confirm("Factory Reset? This clears all local and cloud data.")) {
      const resetState = { players: [], teams: INITIAL_TEAMS, auction: { activePlayerId: null, status: 'IDLE', highestBidderId: null, currentBid: 0, timer: 0 } };
      
      if (db) {
        const docRef = doc(db, ...GLOBAL_STATE_DOC_PATH);
        await setDoc(docRef, resetState);
      }
      
      setPlayers([]);
      setTeams(INITIAL_TEAMS);
      setAuction(resetState.auction as AuctionState);
      localStorage.clear();
      window.location.reload();
    }
  };

  if (!role) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-800">
        <div className="max-w-md w-full text-center space-y-12">
          <div className="w-24 h-24 bg-gradient-to-br from-orange-400 to-amber-600 rounded-3xl mx-auto flex items-center justify-center text-5xl font-black italic shadow-2xl shadow-orange-500/20 transform rotate-6 text-white">T</div>
          <div className="space-y-4">
            <h1 className="text-5xl font-black tracking-tighter text-slate-900">THERAP <span className="text-orange-600">KICK-OFF</span></h1>
            <p className="text-orange-500 font-bold uppercase tracking-[0.2em] text-sm italic">Drafting House</p>
          </div>
          <div className="grid grid-cols-1 gap-6">
            <button onClick={() => setRole('ADMIN')} className="p-8 bg-white border border-slate-200 rounded-[2rem] hover:border-orange-500 hover:shadow-2xl transition-all text-left group shadow-lg active:scale-95">
               <h3 className="font-black text-2xl group-hover:text-orange-600 tracking-tight text-slate-800 transition-colors uppercase">Admin Portal</h3>
               <p className="text-slate-500 text-sm mt-2 font-medium">Control the auction from your command device.</p>
            </button>
            <button onClick={() => setRole('OWNER')} className="p-8 bg-white border border-slate-200 rounded-[2rem] hover:border-amber-500 hover:shadow-2xl transition-all text-left group shadow-lg active:scale-95">
               <h3 className="font-black text-2xl group-hover:text-amber-600 tracking-tight text-slate-800 transition-colors uppercase">Team Hub</h3>
               <p className="text-slate-500 text-sm mt-2 font-medium">Participate and bid from your browser.</p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (role === 'OWNER' && !selectedTeamId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-800">
        <div className="max-w-2xl w-full space-y-8">
           <div className="text-center space-y-2">
              <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Enter the Arena</h2>
              <p className="text-orange-600 font-bold uppercase tracking-widest text-xs">Identify your team</p>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {teams.length === 0 ? (
                <div className="col-span-full p-12 text-center bg-white border border-slate-200 rounded-[2.5rem]">
                   <p className="text-slate-400 font-black uppercase text-xs">No teams registered in the current session.</p>
                </div>
              ) : teams.map(team => (
                <button 
                  key={team.id}
                  onClick={() => setSelectedTeamId(team.id)}
                  className="p-8 bg-white border border-slate-200 rounded-[2.5rem] hover:border-orange-500 hover:shadow-xl transition-all text-left group relative overflow-hidden shadow-md active:scale-95"
                >
                  <div className="relative z-10">
                    <h4 className="font-black text-slate-900 text-xl group-hover:text-orange-600 transition-colors">{team.team_name}</h4>
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-1">Managed by: {team.owner_id}</p>
                    <div className="mt-6 flex justify-between items-center text-xs font-black uppercase tracking-widest text-orange-600 bg-orange-50 px-3 py-2 rounded-xl">
                       <span>Purse</span>
                       <span>৳{team.total_budget - team.spent_budget}</span>
                    </div>
                  </div>
                </button>
              ))}
              <button 
                onClick={() => setSelectedTeamId('spectator')}
                className="col-span-full p-5 bg-slate-200 border border-slate-300 border-dashed rounded-[2rem] text-center text-slate-600 hover:text-slate-900 hover:bg-slate-300 font-black uppercase text-[10px] tracking-widest transition-all active:scale-95"
              >
                Join as Spectator
              </button>
           </div>
           <div className="text-center">
             <button onClick={() => setRole(null)} className="text-slate-400 hover:text-orange-600 font-black text-[10px] uppercase tracking-widest transition-colors underline underline-offset-4">Switch Access Level</button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans">
      <nav className="border-b border-slate-200 p-5 bg-white/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            <span className="font-black italic text-orange-600 text-2xl tracking-tighter cursor-pointer" onClick={() => { setRole(null); setSelectedTeamId(null); }}>THERAP<span className="text-amber-500">KICK-OFF</span></span>
            <div className="flex gap-2">
              <span className="bg-slate-100 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-600 border border-slate-200">
                {role === 'ADMIN' ? 'Command Center' : 'Team Hub'}
              </span>
              {userTeam && (
                <span className="bg-orange-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-white border border-orange-700">
                  {userTeam.team_name}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
               <span className={`w-2 h-2 rounded-full ${isSynced ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`}></span>
               <span className="text-[10px] font-black uppercase text-slate-400">
                 {isSynced ? 'Live Sync' : !isBackendAvailable ? 'Local Session' : 'Connecting...'}
               </span>
            </div>
            {role === 'ADMIN' && <button onClick={handleClearAllData} className="text-[10px] font-black uppercase text-slate-400 hover:text-red-500 transition-all">Factory Reset</button>}
            <button onClick={() => { setRole(null); setSelectedTeamId(null); }} className="text-[10px] font-black uppercase text-slate-400 hover:text-slate-900 transition-all">Sign Out</button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          {auction.status === 'BIDDING' && activePlayer ? (
            <div className="animate-in slide-in-from-top-4 duration-500">
              <AuctionPanel 
                player={{...activePlayer, current_bid: auction.currentBid, team_id: auction.highestBidderId || undefined}} 
                teams={teams}
                onBid={handlePlaceBid}
                onSold={(pid, tid, amt) => handleFinalizeSale(tid !== '', tid, amt)}
                userTeamId={selectedTeamId === 'spectator' ? undefined : selectedTeamId || undefined}
                isAdmin={role === 'ADMIN'}
                timer={auction.timer}
              />
            </div>
          ) : (
            <div className="bg-white border-2 border-slate-200 border-dashed rounded-[3rem] p-24 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-3xl mx-auto mb-6 flex items-center justify-center border border-slate-200">
                <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Awaiting Auction Signal from Command</p>
            </div>
          )}

          {role === 'ADMIN' ? (
            <AdminPanel 
              players={players}
              teams={teams}
              onImportPlayers={handleAddPlayers}
              onUpdatePlayer={handleUpdatePlayer}
              onDeletePlayer={handleDeletePlayer}
              onDeleteTeam={handleDeleteTeam}
              onImportTeams={handleAddTeams}
              onSelectPlayer={handleStartAuction}
              onSold={(pid, tid, amt) => handleFinalizeSale(true, tid, amt)}
              onUnsold={(pid) => handleFinalizeSale(false)}
              onPreviewPlayer={setPreviewPlayerId}
              onClearAll={handleClearAllData}
            />
          ) : (
             <div className="space-y-8">
                <section className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-xl space-y-10">
                   <div className="flex justify-between items-end">
                      <div>
                         <h3 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Team Assets</h3>
                         <p className="text-orange-600 font-bold uppercase tracking-widest text-[10px] mt-1">Acquired Talent</p>
                      </div>
                      {userTeam && (
                         <div className="text-right">
                            <p className="text-[10px] text-slate-400 font-black uppercase">Capital Remaining</p>
                            <p className="text-4xl font-black text-orange-600">৳{userTeam.total_budget - userTeam.spent_budget}</p>
                         </div>
                      )}
                   </div>

                   <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <h4 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                          <span className="w-4 h-[2px] bg-orange-600"></span>
                          My Squad ({mySquad.length})
                        </h4>
                        <div className="flex gap-2">
                          <span className="text-[10px] font-black uppercase bg-slate-100 text-slate-500 px-3 py-1 rounded-full border border-slate-200">
                            Tier 1: {mySquad.filter(p => p.tier === PlayerTier.TIER_1).length}/2
                          </span>
                        </div>
                      </div>
                      
                      {mySquad.length === 0 ? (
                         <div className="p-12 bg-slate-50 border border-slate-200 border-dashed rounded-[2rem] text-center">
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs italic">No acquisitions in current ledger</p>
                         </div>
                      ) : (
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {mySquad.map(player => (
                               <div key={player.uid} onClick={() => setPreviewPlayerId(player.uid)} className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl group hover:border-orange-500 transition-all cursor-pointer active:scale-95 shadow-sm">
                                  <div className="w-16 h-16 bg-white rounded-xl overflow-hidden border border-slate-200">
                                     {player.imageUrl ? (
                                       <img src={player.imageUrl} className="w-full h-full object-cover" />
                                     ) : (
                                       <div className="w-full h-full flex items-center justify-center font-black text-slate-300 text-xl">{player.name.charAt(0)}</div>
                                     )}
                                  </div>
                                  <div className="flex-1">
                                     <h5 className="font-black text-slate-900 uppercase tracking-tight">{player.name}</h5>
                                     <p className="text-[10px] text-orange-600 font-black uppercase">{player.position} • {player.tier}</p>
                                  </div>
                                  <div className="text-right">
                                     <p className="text-[9px] text-slate-400 font-black uppercase">Settlement</p>
                                     <p className="text-lg font-black text-slate-900">৳{player.current_bid}</p>
                                  </div>
                               </div>
                            ))}
                         </div>
                      )}
                   </div>
                </section>

                <section className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-xl">
                   <div className="flex justify-between items-center mb-10">
                      <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 underline decoration-orange-500 decoration-4 underline-offset-8">Market Ledger</h3>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Global Transactions</p>
                   </div>
                   <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                         <thead>
                            <tr className="border-b border-slate-100">
                               <th className="py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Athlete</th>
                               <th className="py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Team</th>
                               <th className="py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Price</th>
                            </tr>
                         </thead>
                         <tbody>
                            {soldPlayers.map(p => {
                               const team = teams.find(t => t.id === p.team_id);
                               return (
                                  <tr key={p.uid} onClick={() => setPreviewPlayerId(p.uid)} className="border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer group">
                                     <td className="py-4">
                                        <span className="font-black text-slate-900 uppercase text-xs tracking-tight group-hover:text-orange-600">{p.name}</span>
                                     </td>
                                     <td className="py-4 text-[10px] text-orange-600 font-black uppercase">{team?.team_name || 'REDACTED'}</td>
                                     <td className="py-4 text-right font-black text-slate-900 text-sm">৳{p.current_bid}</td>
                                  </tr>
                               );
                            })}
                            {soldPlayers.length === 0 && (
                               <tr>
                                  <td colSpan={3} className="py-12 text-center text-slate-300 italic uppercase font-bold text-[10px]">Registry is currently vacant</td>
                               </tr>
                            )}
                         </tbody>
                      </table>
                   </div>
                </section>
             </div>
          )}
        </div>

        <div className="lg:col-span-4 space-y-6">
           <div className="bg-white border border-slate-200 rounded-[3rem] p-8 shadow-xl">
              <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-3 text-slate-900 mb-8">
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                In the Ring
              </h3>
              {activePlayer ? (
                <div className="flex justify-center">
                   <PlayerCard player={activePlayer} />
                </div>
              ) : (
                <div className="aspect-[3/4] bg-slate-100 rounded-[2.5rem] border-2 border-slate-200 border-dashed flex flex-col items-center justify-center text-slate-300 p-8 text-center">
                   <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                   </svg>
                   <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">No player currently under scrutiny</p>
                </div>
              )}
           </div>

           <div className="bg-orange-600 rounded-[3rem] p-8 text-white shadow-2xl shadow-orange-500/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl pointer-events-none"></div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-4">Arena Snapshot</p>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <p className="text-[9px] font-black uppercase text-orange-200">Contracted</p>
                    <p className="text-3xl font-black">{players.filter(p => p.auction_status === AuctionStatus.SOLD).length}</p>
                 </div>
                 <div>
                    <p className="text-[9px] font-black uppercase text-orange-200">Standby</p>
                    <p className="text-3xl font-black">{players.filter(p => p.auction_status === AuctionStatus.UNSOLD).length}</p>
                 </div>
              </div>
           </div>
        </div>
      </main>

      {/* Global Preview Modal */}
      {previewPlayer && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300" onClick={() => setPreviewPlayerId(null)}>
           <div className="relative animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
              <button onClick={() => setPreviewPlayerId(null)} className="absolute -top-12 right-0 w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 shadow-xl z-30">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <PlayerCard player={previewPlayer} soldTo={teams.find(t => t.id === previewPlayer.team_id)?.team_name} />
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
