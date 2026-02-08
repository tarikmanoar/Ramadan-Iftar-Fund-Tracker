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
  notes?: string;
}

export interface Expense {
  id: string;
  userId: string;
  description: string;
  amount: number;
  category: string; // Changed from ExpenseCategory enum to string to allow custom categories
  date: string;
}

export interface DashboardSummary {
  totalPledged: number;
  totalCollected: number;
  totalExpenses: number;
  currentBalance: number;
}