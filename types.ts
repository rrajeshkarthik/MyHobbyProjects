
export interface ExchangeRateData {
  rate: number;
  timestamp: number;
  base: string;
  target: string;
}

export interface RateHistoryItem {
  time: string;
  rate: number;
  unix: number;
}

export interface AlertLog {
  id: string;
  timestamp: string;
  message: string;
  rate: number;
  type: 'appreciation' | 'system';
}

export interface AppState {
  currentRate: number;
  history: RateHistoryItem[];
  email: string;
  isMonitoring: boolean;
  lastCheckTime: string | null;
  logs: AlertLog[];
}
