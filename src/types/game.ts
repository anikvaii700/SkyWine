export type RoundStatus = 'WAITING' | 'FLYING' | 'CRASHED';

export interface BetState {
  id: string;
  amount: number;
  isPlaced: boolean; // Placed for next or current round
  cashedOut: boolean;
  cashedOutMultiplier: number | null;
  winAmount: number | null;
  isAutoCashOut: boolean;
  autoCashOutMultiplier: number;
  isAutoBet: boolean;
}

export interface RoundHistoryItem {
  id: string;
  crashMultiplier: number;
  timestamp: number;
  hash?: string;
}

export interface LivePlayerBet {
  id: string;
  playerName: string;
  avatarSeed: string;
  betAmount: number;
  cashedOut: boolean;
  cashedOutMultiplier?: number;
  winAmount?: number;
}

export interface WingoRound {
  issueNumber: string;
  countdown: number; // seconds remaining in 60s
  color?: 'green' | 'red' | 'violet';
  number?: number;
  size?: 'big' | 'small';
}

export type ActiveGameTab = 'AVIATOR' | 'WINGO';
