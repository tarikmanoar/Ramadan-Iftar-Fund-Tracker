import { Donation, Expense, User } from '../types';
import { DEFAULT_EXPENSE_CATEGORIES } from '../constants';

// NOTE: In a production environment with Cloudflare D1, these methods 
// would make fetch() calls to your Cloudflare Worker endpoints.
// For this SPA demo, we are using localStorage to simulate persistence 
// so the app is immediately functional without backend deployment.

const STORAGE_KEY_DONATIONS = 'iftar_app_donations';
const STORAGE_KEY_EXPENSES = 'iftar_app_expenses';
const STORAGE_KEY_CATEGORIES = 'iftar_app_categories';

const getStoredDonations = (): Donation[] => {
  const stored = localStorage.getItem(STORAGE_KEY_DONATIONS);
  return stored ? JSON.parse(stored) : [];
};

const getStoredExpenses = (): Expense[] => {
  const stored = localStorage.getItem(STORAGE_KEY_EXPENSES);
  return stored ? JSON.parse(stored) : [];
};

const getStoredCategories = (): string[] => {
  const stored = localStorage.getItem(STORAGE_KEY_CATEGORIES);
  return stored ? JSON.parse(stored) : DEFAULT_EXPENSE_CATEGORIES;
};

export const dbService = {
  // Donations
  getDonations: async (userId: string, year: number): Promise<Donation[]> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));
    const allDonations = getStoredDonations();
    return allDonations.filter(d => {
      const donationYear = new Date(d.date).getFullYear();
      return d.userId === userId && donationYear === year;
    });
  },

  addDonation: async (donation: Donation): Promise<Donation> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const allDonations = getStoredDonations();
    const newDonations = [...allDonations, donation];
    localStorage.setItem(STORAGE_KEY_DONATIONS, JSON.stringify(newDonations));
    return donation;
  },

  updateDonation: async (donation: Donation): Promise<Donation> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const allDonations = getStoredDonations();
    const index = allDonations.findIndex(d => d.id === donation.id);
    if (index !== -1) {
      allDonations[index] = donation;
      localStorage.setItem(STORAGE_KEY_DONATIONS, JSON.stringify(allDonations));
    }
    return donation;
  },

  deleteDonation: async (id: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const allDonations = getStoredDonations();
    const newDonations = allDonations.filter(d => d.id !== id);
    localStorage.setItem(STORAGE_KEY_DONATIONS, JSON.stringify(newDonations));
  },

  // Expenses
  getExpenses: async (userId: string, year: number): Promise<Expense[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const allExpenses = getStoredExpenses();
    return allExpenses.filter(e => {
      const expenseYear = new Date(e.date).getFullYear();
      return e.userId === userId && expenseYear === year;
    });
  },

  addExpense: async (expense: Expense): Promise<Expense> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const allExpenses = getStoredExpenses();
    const newExpenses = [...allExpenses, expense];
    localStorage.setItem(STORAGE_KEY_EXPENSES, JSON.stringify(newExpenses));
    return expense;
  },

  updateExpense: async (expense: Expense): Promise<Expense> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const allExpenses = getStoredExpenses();
    const index = allExpenses.findIndex(e => e.id === expense.id);
    if (index !== -1) {
      allExpenses[index] = expense;
      localStorage.setItem(STORAGE_KEY_EXPENSES, JSON.stringify(allExpenses));
    }
    return expense;
  },

  deleteExpense: async (id: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const allExpenses = getStoredExpenses();
    const newExpenses = allExpenses.filter(e => e.id !== id);
    localStorage.setItem(STORAGE_KEY_EXPENSES, JSON.stringify(newExpenses));
  },

  // Categories
  getCategories: async (): Promise<string[]> => {
    await new Promise(resolve => setTimeout(resolve, 100));
    return getStoredCategories();
  },

  addCategory: async (category: string): Promise<string[]> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const categories = getStoredCategories();
    if (!categories.includes(category)) {
      const newCategories = [...categories, category];
      localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(newCategories));
      return newCategories;
    }
    return categories;
  },

  updateCategory: async (oldName: string, newName: string): Promise<string[]> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const categories = getStoredCategories();
    const index = categories.indexOf(oldName);
    
    if (index !== -1 && !categories.includes(newName)) {
      // Update Category List
      categories[index] = newName;
      localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(categories));
      
      // Update all expenses using this category
      const allExpenses = getStoredExpenses();
      let hasChanges = false;
      const updatedExpenses = allExpenses.map(e => {
        if (e.category === oldName) {
          hasChanges = true;
          return { ...e, category: newName };
        }
        return e;
      });

      if (hasChanges) {
        localStorage.setItem(STORAGE_KEY_EXPENSES, JSON.stringify(updatedExpenses));
      }
    }
    return categories;
  },

  deleteCategory: async (category: string): Promise<string[]> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const categories = getStoredCategories();
    const newCategories = categories.filter(c => c !== category);
    localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(newCategories));
    return newCategories;
  }
};