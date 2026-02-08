export interface User {
  id: string;
  name: string;
  email: string;
  picture?: string;
}

export interface Donation {
  id: string;
  userId: string;
  donorName: string;
  pledgedAmount: number;
  paidAmount: number;
  date: string;
  year: number;
  notes?: string;
}

export interface Expense {
  id: string;
  userId: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  year: number;
}

export interface DashboardSummary {
  totalPledged: number;
  totalCollected: number;
  totalExpenses: number;
  currentBalance: number;
}