export interface Env {
  DB: D1Database;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  SESSION_SECRET: string;
  FRONTEND_URL: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export interface Donation {
  id: string;
  user_id: string;
  donor_name: string;
  pledged_amount: number;
  paid_amount: number;
  date: string;
  year: number;
  notes?: string;
}

export interface Expense {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  year: number;
}

export interface Session {
  id: string;
  user_id: string;
  expires_at: string;
}
