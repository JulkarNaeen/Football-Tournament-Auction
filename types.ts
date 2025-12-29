
export enum SportType {
  FOOTBALL = 'FOOTBALL',
  CRICKET = 'CRICKET',
  BADMINTON = 'BADMINTON'
}

export enum AuctionStatus {
  UNSOLD = 'UNSOLD',
  SOLD = 'SOLD',
  UP_NEXT = 'UP_NEXT',
  IN_PROGRESS = 'IN_PROGRESS'
}

export enum PlayerTier {
  TIER_1 = 'Tier 1',
  TIER_2 = 'Tier 2',
  TIER_3 = 'Tier 3'
}

export type Role = 'ADMIN' | 'OWNER';

export interface FootballRecord {
  goals: number;
  assists: number;
  cleanSheets: number;
  matchesPlayed: number;
}

export interface SkillStats {
  speed: number;
  power: number;
  stamina: number;
}

export interface Player {
  uid: string;
  name: string;
  dept: string;
  position?: string;
  tier: PlayerTier;
  skill_stats: SkillStats;
  football_record?: FootballRecord;
  auction_status: AuctionStatus;
  current_bid: number;
  base_price: number;
  sports: SportType[];
  team_id?: string;
  imageUrl?: string;
}

export interface Team {
  id: string;
  team_name: string;
  owner_id: string;
  total_budget: number;
  spent_budget: number;
  player_list: string[];
  logoUrl?: string; 
}

export interface Match {
  id: string;
  sport: SportType;
  team1_id: string;
  team2_id: string;
  startTime: string;
  venue: string;
}

export interface AuctionState {
  activePlayerId: string | null;
  status: 'IDLE' | 'BIDDING' | 'SOLD' | 'UNSOLD';
  highestBidderId: string | null;
  currentBid: number;
  timer: number;
}
