// YAPSScore represents the tokenized attention score from the Kaito API
export interface YAPSScore {
  user_id: string;
  username: string;
  yaps_all: number;
  yaps_l24h: number;
  yaps_l7d: number;
  yaps_l30d: number;
  percentile?: number;
  qualitative_label?: string;
}

// ScoreComparison represents the comparison between two users' YAPS scores
export interface ScoreComparison {
  user_a: {
    user_id: string;
    username: string;
    yaps_all: number;
    yaps_l24h: number;
    yaps_l30d: number;
  };
  user_b: {
    user_id: string;
    username: string;
    yaps_all: number;
    yaps_l24h: number;
    yaps_l30d: number;
  };
  deltas: {
    yaps_all: number;
    yaps_l24h: number;
    yaps_l30d: number;
  };
  summary: string;
}

// LeaderboardEntry represents an entry in the top-10 leaderboard
export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  yaps_l24h: number;
  yaps_all: number;
}

// RateLimiter interface for tracking API calls
export interface RateLimiter {
  checkLimit(): Promise<boolean>;
  incrementCounter(): Promise<void>;
} 