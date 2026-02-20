import { Donation, Expense, RamadanYear } from '../types';
import { offlineQueue } from './offlineQueue';

/** Thrown when a mutating operation (update/delete) is attempted while offline. */
export class OfflineError extends Error {
  constructor() {
    super('You are offline. Edits and deletions are not available without an internet connection.');
    this.name = 'OfflineError';
  }
}

/** True when the browser reports an active network connection. */
const isOnline = () => navigator.onLine;
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

// Helper function to get session token
const getSessionToken = (): string | null => {
  return localStorage.getItem('iftar_session_token');
};

// Helper function to make authenticated API calls
async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getSessionToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Session expired, clear local storage
      localStorage.removeItem('iftar_session_token');
      localStorage.removeItem('iftar_user_session');
      window.location.reload();
    }
    throw new Error(`API call failed: ${response.statusText}`);
  }

  return response.json();
}

export const dbService = {
  // Donations
  getDonations: async (userId: string, year: number): Promise<Donation[]> => {
    const data = await apiCall<Donation[]>(`/api/donations?year=${year}`);
    // Convert snake_case from DB to camelCase for frontend
    return data.map(d => ({
      id: d.id,
      userId: (d as any).user_id ?? d.userId,
      donorName: (d as any).donor_name ?? d.donorName,
      pledgedAmount: (d as any).pledged_amount ?? d.pledgedAmount ?? 0,
      paidAmount: (d as any).paid_amount ?? d.paidAmount ?? 0,
      date: d.date,
      year: d.year,
      notes: d.notes,
    }));
  },

  addDonation: async (donation: Donation): Promise<Donation & { _queued?: true }> => {
    // ── Offline path: queue for later sync ────────────────────────────────────
    if (!isOnline()) {
      await offlineQueue.enqueue('ADD_DONATION', donation);
      return { ...donation, _queued: true };
    }

    // ── Online path: normal API call ──────────────────────────────────────────
    // Convert camelCase to snake_case for API
    const apiData = {
      donorName: donation.donorName,
      pledgedAmount: donation.pledgedAmount,
      paidAmount: donation.paidAmount,
      date: donation.date,
      year: donation.year,
      notes: donation.notes,
    };
    
    const result = await apiCall<any>('/api/donations', {
      method: 'POST',
      body: JSON.stringify(apiData),
    });

    return {
      id: result.id,
      userId: result.userId || donation.userId,
      donorName: result.donorName,
      pledgedAmount: result.pledgedAmount,
      paidAmount: result.paidAmount,
      date: result.date,
      year: result.year,
      notes: result.notes,
    };
  },

  updateDonation: async (donation: Donation): Promise<Donation> => {
    if (!isOnline()) throw new OfflineError();
    const apiData = {
      id: donation.id,
      donorName: donation.donorName,
      pledgedAmount: donation.pledgedAmount,
      paidAmount: donation.paidAmount,
      date: donation.date,
      year: donation.year,
      notes: donation.notes,
    };

    await apiCall('/api/donations', {
      method: 'PUT',
      body: JSON.stringify(apiData),
    });

    return donation;
  },

  deleteDonation: async (id: string): Promise<void> => {
    if (!isOnline()) throw new OfflineError();
    await apiCall('/api/donations', {
      method: 'DELETE',
      body: JSON.stringify({ id }),
    });
  },

  // Expenses
  getExpenses: async (userId: string, year: number): Promise<Expense[]> => {
    const data = await apiCall<Expense[]>(`/api/expenses?year=${year}`);
    // Convert snake_case from DB to camelCase for frontend
    return data.map(e => ({
      id: e.id,
      userId: (e as any).user_id || e.userId,
      description: e.description,
      amount: e.amount,
      category: e.category,
      date: e.date,
      year: e.year,
      quantity: (e as any).quantity ?? e.quantity ?? undefined,
      unit: (e as any).unit ?? e.unit ?? undefined,
    }));
  },

  addExpense: async (expense: Expense): Promise<Expense & { _queued?: true }> => {
    // ── Offline path: queue for later sync ────────────────────────────────────
    if (!isOnline()) {
      await offlineQueue.enqueue('ADD_EXPENSE', expense);
      return { ...expense, _queued: true };
    }

    // ── Online path: normal API call ──────────────────────────────────────────
    const apiData = {
      description: expense.description,
      amount: expense.amount,
      category: expense.category,
      date: expense.date,
      year: expense.year,
      quantity: expense.quantity ?? null,
      unit: expense.unit ?? null,
    };

    const result = await apiCall<any>('/api/expenses', {
      method: 'POST',
      body: JSON.stringify(apiData),
    });

    return {
      id: result.id,
      userId: result.userId || expense.userId,
      description: result.description,
      amount: result.amount,
      category: result.category,
      date: result.date,
      year: result.year,
      quantity: result.quantity ?? undefined,
      unit: result.unit ?? undefined,
    };
  },

  updateExpense: async (expense: Expense): Promise<Expense> => {
    if (!isOnline()) throw new OfflineError();
    const apiData = {
      id: expense.id,
      description: expense.description,
      amount: expense.amount,
      category: expense.category,
      date: expense.date,
      year: expense.year,
      quantity: expense.quantity ?? null,
      unit: expense.unit ?? null,
    };

    await apiCall('/api/expenses', {
      method: 'PUT',
      body: JSON.stringify(apiData),
    });

    return expense;
  },

  deleteExpense: async (id: string): Promise<void> => {
    if (!isOnline()) throw new OfflineError();
    await apiCall('/api/expenses', {
      method: 'DELETE',
      body: JSON.stringify({ id }),
    });
  },

  // Categories
  getCategories: async (): Promise<string[]> => {
    return await apiCall<string[]>('/api/categories');
  },

  addCategory: async (category: string): Promise<string[]> => {
    return await apiCall<string[]>('/api/categories', {
      method: 'POST',
      body: JSON.stringify({ category }),
    });
  },

  updateCategory: async (oldName: string, newName: string): Promise<string[]> => {
    return await apiCall<string[]>('/api/categories', {
      method: 'PUT',
      body: JSON.stringify({ oldName, newName }),
    });
  },

  deleteCategory: async (category: string): Promise<string[]> => {
    return await apiCall<string[]>('/api/categories', {
      method: 'DELETE',
      body: JSON.stringify({ category }),
    });
  },

  // User Preferences
  getAvailableYears: async (): Promise<RamadanYear[]> => {
    const response = await apiCall<{ availableYears: RamadanYear[] }>('/api/user/preferences');
    return response.availableYears;
  },

  updateAvailableYears: async (years: RamadanYear[]): Promise<RamadanYear[]> => {
    const response = await apiCall<{ availableYears: RamadanYear[] }>('/api/user/preferences', {
      method: 'PUT',
      body: JSON.stringify({ availableYears: years }),
    });
    return response.availableYears;
  },
};