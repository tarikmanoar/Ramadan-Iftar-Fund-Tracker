import { Donation, Expense } from '../types';

// API Base URL - set via environment variable or default to localhost
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
      userId: (d as any).user_id || d.userId,
      donorName: (d as any).donor_name || d.donorName,
      pledgedAmount: (d as any).pledged_amount || d.pledgedAmount,
      paidAmount: (d as any).paid_amount || d.paidAmount,
      date: d.date,
      year: d.year,
      notes: d.notes,
    }));
  },

  addDonation: async (donation: Donation): Promise<Donation> => {
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
    }));
  },

  addExpense: async (expense: Expense): Promise<Expense> => {
    const apiData = {
      description: expense.description,
      amount: expense.amount,
      category: expense.category,
      date: expense.date,
      year: expense.year,
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
    };
  },

  updateExpense: async (expense: Expense): Promise<Expense> => {
    const apiData = {
      id: expense.id,
      description: expense.description,
      amount: expense.amount,
      category: expense.category,
      date: expense.date,
      year: expense.year,
    };

    await apiCall('/api/expenses', {
      method: 'PUT',
      body: JSON.stringify(apiData),
    });

    return expense;
  },

  deleteExpense: async (id: string): Promise<void> => {
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
};