import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Player, Team, SportType, AuctionStatus, PlayerTier } from '../types';

interface AdminPanelProps {
  players: Player[];
  onImportPlayers: (players: Player[]) => void;
  onUpdatePlayer: (player: Player) => void;
  onDeletePlayer: (uid: string) => void;
  onDeleteTeam: (id: string) => void;
  onImportTeams: (teams: Team[]) => void;
  onSelectPlayer: (id: string) => void;
  onSold: (playerId: string, teamId: string, amount: number) => void;
  onUnsold: (playerId: string) => void;
  onPreviewPlayer: (uid: string) => void;
  onClearAll: () => void;
  teams: Team[];
}

const POSITIONS = ['Defender', 'Midfield', 'Forward', 'GK'];
const TIERS = [PlayerTier.TIER_1, PlayerTier.TIER_2, PlayerTier.TIER_3];

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  players, 
  onImportPlayers, 
  onUpdatePlayer,
  onDeletePlayer,
  onDeleteTeam,
  onImportTeams,
  onSelectPlayer, 
  onSold, 
  onUnsold, 
  onPreviewPlayer,
  onClearAll,
  teams 
}) => {
  const [activeTab, setActiveTab] = useState<'queue' | 'teams' | 'register' | 'history'>('queue');
  const [registerType, setRegisterType] = useState<'player' | 'team'>('player');
  const [pendingPlayers, setPendingPlayers] = useState<Player[]>([]);
  const [selectedProfilePlayer, setSelectedProfilePlayer] = useState<Player | null>(null);
  const [driveLink, setDriveLink] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Player Form State
  const [playerName, setPlayerName] = useState('');
  const [dept, setDept] = useState('');
  const [position, setPosition] = useState(POSITIONS[0]);
  const [tier, setTier] = useState<PlayerTier>(PlayerTier.TIER_3);
  const [sport, setSport] = useState<SportType>(SportType.FOOTBALL);
  const [basePrice, setBasePrice] = useState(1000);
  const [playerImage, setPlayerImage] = useState<string | undefined>(undefined);

  // Team Form State
  const [teamName, setTeamName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [budget, setBudget] = useState(15000);
  const [teamLogo, setTeamLogo] = useState<string | undefined>(undefined);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const profilePhotoRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'player' | 'team' | 'profile') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (type === 'player') setPlayerImage(result);
        else if (type === 'team') setTeamLogo(result);
        else if (type === 'profile' && selectedProfilePlayer) {
          const updated = { ...selectedProfilePlayer, imageUrl: result };
          setSelectedProfilePlayer(updated);
          onUpdatePlayer(updated);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);

      const parsedPlayers: Player[] = data.map((row: any) => {
        let imageUrl = undefined;
        const rawPhotoId = row['Photo ID'] || row['PhotoID'] || row['ID'] || row['Photo ID (Google Drive ID)'];
        
        if (rawPhotoId) {
          const cleanId = String(rawPhotoId).trim().replace(/^[iI][dD]\s*/, '').replace(/[^\w-]/g, '');
          imageUrl = `https://lh3.googleusercontent.com/d/${cleanId}`;
        }

        return {
          uid: `p-bulk-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          name: row['Full Name'] || row.Name || 'Unknown Athlete',
          dept: row['Dept Name (Office)'] || row.Dept || 'N/A',
          position: row['Primary Playing Position'] || row.Position || 'Athlete',
          tier: (Object.values(PlayerTier).includes(row.Tier as PlayerTier) ? row.Tier : PlayerTier.TIER_3) as PlayerTier,
          skill_stats: { speed: 50, power: 50, stamina: 50 },
          auction_status: AuctionStatus.UNSOLD,
          current_bid: 0,
          base_price: Number(row.BasePrice) || 1000,
          sports: [SportType.FOOTBALL],
          imageUrl: imageUrl,
        };
      });

      if (parsedPlayers.length > 0) {
        setPendingPlayers(parsedPlayers);
      }
    };
    reader.readAsBinaryString(file);
    if (excelInputRef.current) excelInputRef.current.value = '';
  };

  const commitPendingPlayers = () => {
    onImportPlayers(pendingPlayers);
    setPendingPlayers([]);
    alert(`Success! ${pendingPlayers.length} athletes added to the pool.`);
  };

  const handleRegisterPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName || !dept) {
      alert("Required fields missing.");
      return;
    }

    const newPlayer: Player = {
      uid: `p-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: playerName,
      dept: dept,
      position: position,
      tier: tier,
      skill_stats: { speed: 50, power: 50, stamina: 50 },
      auction_status: AuctionStatus.UNSOLD,
      current_bid: 0,
      base_price: basePrice,
      sports: [sport],
      imageUrl: playerImage,
    };

    onImportPlayers([newPlayer]);
    setPlayerName('');
    setDept('');
    setPosition(POSITIONS[0]);
    setTier(PlayerTier.TIER_3);
    setPlayerImage(undefined);
    setActiveTab('queue');
  };

  const handleRegisterTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName || !ownerName) {
      alert("Required fields missing.");
      return;
    }

    const newTeam: Team = {
      id: `t-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      team_name: teamName,
      owner_id: ownerName,
      total_budget: budget,
      spent_budget: 0,
      player_list: [],
      logoUrl: teamLogo,
    };

    onImportTeams([newTeam]);
    setTeamName('');
    setOwnerName('');
    setTeamLogo(undefined);
    setActiveTab('teams');
  };

  const soldPlayers = players.filter(p => p.auction_status === AuctionStatus.SOLD);

  return (
    <div className="space-y-6">
      <div className="flex bg-slate-200 p-1 rounded-2xl shadow-inner overflow-x-auto">
        <button onClick={() => setActiveTab('queue')} className={`flex-1 py-3 px-4 min-w-[120px] rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'queue' ? 'bg-white text-orange-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>Player Pool</button>
        <button onClick={() => setActiveTab('teams')} className={`flex-1 py-3 px-4 min-w-[120px] rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'teams' ? 'bg-white text-orange-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>Team Board</button>
        <button onClick={() => setActiveTab('register')} className={`flex-1 py-3 px-4 min-w-[120px] rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'register' ? 'bg-white text-orange-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>Registration</button>
        <button onClick={() => setActiveTab('history')} className={`flex-1 py-3 px-4 min-w-[120px] rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-white text-orange-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>Ledger</button>
      </div>

      {activeTab === 'queue' && (
        <section className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-xl animate-in fade-in duration-500">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
            <div>
              <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Official Player Pool</h3>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1 italic">Click athlete to manage profile</p>
            </div>
            
            <div className="flex flex-col gap-3 w-full md:w-auto">
               <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <input type="text" value={driveLink} onChange={(e) => setDriveLink(e.target.value)} placeholder="Drive ID Link (Optional)" className="w-full md:w-64 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-[10px] font-bold outline-none focus:border-orange-500 shadow-sm transition-all" />
                  </div>
                  <input type="file" ref={excelInputRef} hidden accept=".xlsx, .xls, .csv" onChange={handleExcelImport} />
                  <button onClick={() => excelInputRef.current?.click()} className="text-[10px] font-black uppercase bg-slate-900 text-white px-8 py-3 rounded-2xl shadow-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3 active:scale-95"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>Bulk Import</button>
               </div>
            </div>
          </div>

          {pendingPlayers.length > 0 && (
            <div className="mb-10 p-8 bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6 animate-in zoom-in-95 shadow-xl">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-white rounded-3xl flex items-center justify-center text-orange-600 shadow-md border border-orange-100"><svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg></div>
                <div><p className="text-[10px] font-black uppercase text-orange-600 mb-1 tracking-[0.2em]">Staging Review Area</p><p className="text-base font-black text-slate-900 tracking-tight">{pendingPlayers.length} Athletes Loaded</p></div>
              </div>
              <div className="flex gap-3 w-full md:w-auto">
                 <button onClick={() => setPendingPlayers([])} className="flex-1 md:px-8 py-4 border-2 border-slate-200 text-slate-400 font-black text-[10px] uppercase rounded-2xl hover:bg-white transition-all">Discard</button>
                 <button onClick={commitPendingPlayers} className="flex-1 md:px-10 py-4 bg-orange-600 text-white font-black text-[10px] uppercase rounded-2xl shadow-2xl hover:bg-orange-700 transition-all">Save to Player Pool</button>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar p-2">
            {players.filter(p => p.auction_status !== AuctionStatus.SOLD).map(player => (
              <div key={player.uid} onClick={() => setSelectedProfilePlayer(player)} className={`flex items-center justify-between p-6 rounded-[2.5rem] border bg-white border-slate-100 hover:border-orange-500 hover:shadow-xl transition-all cursor-pointer group shadow-sm relative`}>
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-[1.2rem] bg-slate-50 border border-slate-100 overflow-hidden shadow-sm flex items-center justify-center">
                    {player.imageUrl ? (
                      <img src={player.imageUrl} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                    ) : (
                      <div className="font-black text-slate-200 text-3xl">{player.name.charAt(0)}</div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-sm leading-tight uppercase group-hover:text-orange-600 transition-colors">{player.name}</h4>
                    <p className="text-[9px] text-slate-400 font-black uppercase mt-1 tracking-widest">{player.dept} • {player.tier}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button onClick={(e) => { e.stopPropagation(); onSelectPlayer(player.uid); }} className="bg-slate-50 group-hover:bg-orange-600 px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest text-slate-400 group-hover:text-white transition-all border border-slate-100 group-hover:border-orange-600">Draft</button>
                  <div className="relative">
                     <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === player.uid ? null : player.uid); }} className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-all">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
                     </button>
                     {openMenuId === player.uid && (
                        <div className="absolute right-0 top-10 w-32 bg-white border border-slate-200 rounded-xl shadow-xl z-[60] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                           <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); onDeletePlayer(player.uid); }} className="w-full text-left px-4 py-3 text-[10px] font-black uppercase text-red-500 hover:bg-red-50 transition-colors">Delete</button>
                        </div>
                     )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {selectedProfilePlayer && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white max-w-2xl w-full rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in slide-in-from-bottom-12 duration-500">
            <div className="md:w-1/2 h-80 md:h-auto bg-slate-100 relative group overflow-hidden">
               <div className="absolute inset-0 flex items-center justify-center">
                  {selectedProfilePlayer.imageUrl ? (
                    <img src={selectedProfilePlayer.imageUrl} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                  ) : (
                    <div className="text-9xl font-black text-slate-200 uppercase">{selectedProfilePlayer.name.charAt(0)}</div>
                  )}
               </div>
               
               <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-end pb-12 gap-4 px-8 text-center">
                  <button onClick={() => profilePhotoRef.current?.click()} className="bg-white px-8 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest text-slate-900 shadow-2xl hover:scale-105 transition-all flex items-center gap-3 active:scale-95">
                    <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Replace Photo
                  </button>
                  <input type="file" ref={profilePhotoRef} hidden accept="image/*" onChange={(e) => handleFileChange(e, 'profile')} />
               </div>
            </div>

            <div className="md:w-1/2 p-14 flex flex-col justify-between bg-white relative">
              <button onClick={() => setSelectedProfilePlayer(null)} className="absolute top-8 right-8 w-12 h-12 flex items-center justify-center bg-slate-50 text-slate-300 hover:text-red-500 rounded-full transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <div>
                <div className="mb-10">
                  <h3 className="text-5xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-2">{selectedProfilePlayer.name}</h3>
                  <p className="text-orange-600 font-black text-[10px] uppercase tracking-[0.3em] italic">{selectedProfilePlayer.position || 'ATHLETE'}</p>
                </div>
                <div className="space-y-4">
                    <div className="p-6 bg-slate-50 border border-slate-100 rounded-[2rem]">
                      <p className="text-[9px] text-slate-400 font-black uppercase mb-1">Division: {selectedProfilePlayer.dept}</p>
                      <p className="text-2xl font-black text-slate-900">৳{selectedProfilePlayer.base_price}</p>
                    </div>
                </div>
              </div>
              <div className="mt-14 flex flex-col sm:flex-row gap-4">
                 <button onClick={() => { onSelectPlayer(selectedProfilePlayer.uid); setSelectedProfilePlayer(null); }} className="flex-[2] py-5 bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest rounded-3xl shadow-2xl hover:bg-orange-600 transition-all active:scale-95">Deploy to Auction</button>
                 <button onClick={() => setSelectedProfilePlayer(null)} className="flex-1 py-5 border-2 border-slate-100 text-slate-300 font-black text-[10px] uppercase rounded-3xl hover:bg-slate-50 hover:text-slate-600 transition-all">Back</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'teams' && (
        <section className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-xl animate-in fade-in duration-500">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 underline decoration-orange-500 decoration-4 underline-offset-8">Official Team Board</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {teams.map(team => (
              <div key={team.id} className="bg-slate-50 border border-slate-200 rounded-[2rem] p-8 flex flex-col gap-8 relative overflow-hidden group hover:border-orange-500 transition-all">
                <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === team.id ? null : team.id); }} className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center text-slate-300 hover:text-slate-600 rounded-full hover:bg-white transition-all z-20">
                   <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
                </button>
                {openMenuId === team.id && (
                  <div className="absolute right-14 top-6 w-32 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                     <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); onDeleteTeam(team.id); }} className="w-full text-left px-4 py-3 text-[10px] font-black uppercase text-red-500 hover:bg-red-50 transition-colors">Delete</button>
                  </div>
                )}
                <div className="flex items-center gap-5 relative z-10">
                  <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center shadow-sm">{team.logoUrl ? <img src={team.logoUrl} className="w-full h-full object-contain p-2" /> : <div className="font-black text-slate-200 text-3xl">{team.team_name.charAt(0)}</div>}</div>
                  <div>
                    <h4 className="text-xl font-black text-slate-900 tracking-tight leading-tight uppercase group-hover:text-orange-600 transition-colors">{team.team_name}</h4>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Manager: {team.owner_id}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 relative z-10">
                   <div className="bg-white p-4 rounded-2xl border border-slate-200"><p className="text-[8px] text-slate-400 font-black uppercase mb-1 tracking-widest">Available Capital</p><p className="text-2xl font-black text-orange-600">৳{team.total_budget - team.spent_budget}</p></div>
                   <div className="bg-white p-4 rounded-2xl border border-slate-200"><p className="text-[8px] text-slate-400 font-black uppercase mb-1 tracking-widest">Squad Depth</p><p className="text-2xl font-black text-slate-900">{team.player_list.length}</p></div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'register' && (
        <section className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-xl">
           <div className="flex bg-slate-100 p-2">
            <button onClick={() => setRegisterType('player')} className={`flex-1 py-4 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${registerType === 'player' ? 'bg-white text-orange-600 shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}>Athlete Entry</button>
            <button onClick={() => setRegisterType('team')} className={`flex-1 py-4 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${registerType === 'team' ? 'bg-white text-orange-600 shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}>Team Entry</button>
          </div>
          <div className="p-10">
            {registerType === 'player' ? (
              <form onSubmit={handleRegisterPlayer} className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <div onClick={() => fileInputRef.current?.click()} className="w-full aspect-video bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center cursor-pointer hover:border-orange-500 transition-all overflow-hidden relative shadow-inner">
                    {playerImage ? <img src={playerImage} className="w-full h-full object-cover" /> : (
                      <div className="text-center">
                         <svg className="w-10 h-10 text-slate-200 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 00-2 2z"/></svg>
                         <p className="text-[10px] text-slate-400 font-black uppercase">Manual Photo Upload</p>
                      </div>
                    )}
                    <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={(e) => handleFileChange(e, 'player')} />
                  </div>
                  <div className="space-y-4">
                    <input type="text" value={playerName} onChange={(e) => setPlayerName(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-slate-900 font-bold outline-none focus:border-orange-500 shadow-sm" placeholder="Full Name" />
                    <input type="text" value={dept} onChange={(e) => setDept(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-slate-900 font-bold outline-none focus:border-orange-500 shadow-sm" placeholder="Department / Division" />
                  </div>
                </div>
                <div className="flex flex-col justify-between">
                  <button type="submit" className="w-full py-8 bg-orange-600 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-2xl shadow-orange-500/30 text-xl transform active:scale-95 transition-all">Establish Profile</button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleRegisterTeam} className="max-w-xl mx-auto space-y-8">
                 <div className="flex flex-col items-center">
                    <div onClick={() => logoInputRef.current?.click()} className="w-40 h-40 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center cursor-pointer hover:border-orange-500 transition-all overflow-hidden relative shadow-inner group">
                      {teamLogo ? <img src={teamLogo} className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform" /> : (
                         <div className="text-center">
                            <svg className="w-12 h-12 text-slate-200 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            <p className="text-[10px] text-slate-300 font-black uppercase">Upload Team Logo</p>
                         </div>
                      )}
                      <input type="file" ref={logoInputRef} hidden accept="image/*" onChange={(e) => handleFileChange(e, 'team')} />
                    </div>
                 </div>
                 <div className="grid grid-cols-1 gap-6">
                    <input type="text" value={teamName} onChange={(e) => setTeamName(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-slate-900 font-bold outline-none focus:border-orange-500 shadow-sm" placeholder="Official Team Name" />
                    <input type="text" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-slate-900 font-bold outline-none focus:border-orange-500 shadow-sm" placeholder="Team Manager Name" />
                    <input type="number" value={budget} onChange={(e) => setBudget(Number(e.target.value))} required className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-slate-900 font-bold outline-none focus:border-orange-500 shadow-sm" placeholder="Total Starting Budget" />
                 </div>
                 <button type="submit" className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-widest transform active:scale-95 transition-all shadow-xl">Charter Team</button>
              </form>
            )}
          </div>
        </section>
      )}

      {activeTab === 'history' && (
        <section className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-xl animate-in fade-in duration-500">
           <div className="flex justify-between items-center mb-10">
              <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 underline decoration-orange-500 decoration-4 underline-offset-8">Official Ledger</h3>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{soldPlayers.length} Transactions Logged</p>
           </div>
           <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                 <thead>
                    <tr className="border-b border-slate-100">
                       <th className="py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Athlete</th>
                       <th className="py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Acquired By</th>
                       <th className="py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Settlement</th>
                    </tr>
                 </thead>
                 <tbody>
                    {soldPlayers.map(p => {
                       const team = teams.find(t => t.id === p.team_id);
                       return (
                          <tr key={p.uid} onClick={() => onPreviewPlayer(p.uid)} className="border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer group">
                             <td className="py-5">
                                <div className="flex items-center gap-3">
                                   <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden">{p.imageUrl && <img src={p.imageUrl} className="w-full h-full object-cover" />}</div>
                                   <span className="font-black text-slate-900 uppercase text-sm tracking-tight group-hover:text-orange-600">{p.name}</span>
                                </div>
                             </td>
                             <td className="py-5 text-xs text-orange-600 font-black uppercase">{team?.team_name || 'REDACTED'}</td>
                             <td className="py-5 text-right font-black text-slate-900 text-lg">৳{p.current_bid}</td>
                          </tr>
                       );
                    })}
                    {soldPlayers.length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-20 text-center text-slate-300 font-bold uppercase text-xs italic">Registry Empty</td>
                      </tr>
                    )}
                 </tbody>
              </table>
           </div>
        </section>
      )}
    </div>
  );
};

// Fix for Error in file components/AdminPanel.tsx on line 443: Cannot find name 'App'.
// The component name is AdminPanel, so it should be exported as AdminPanel.
export default AdminPanel;