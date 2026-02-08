import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from './services/authContext';
import { dbService } from './services/dbService';
import { Donation, Expense, DashboardSummary } from './types';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { DonationSection } from './components/DonationSection';
import { ExpenseSection } from './components/ExpenseSection';
import { Moon, LayoutDashboard, HeartHandshake, ReceiptText, CalendarRange, Lock } from 'lucide-react';
import clsx from 'clsx';

function App() {
  const { user, isLoading, login } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'donations' | 'expenses'>('dashboard');
  
  // Year Management
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const availableYears = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];
  
  // Read-only mode for previous years
  const isReadOnly = selectedYear !== currentYear;

  // Data State
  const [donations, setDonations] = useState<Donation[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(false);

  // Define fetch data function
  const refreshData = useCallback(async () => {
    if (user) {
      try {
        const [fetchedDonations, fetchedExpenses] = await Promise.all([
          dbService.getDonations(user.id, selectedYear),
          dbService.getExpenses(user.id, selectedYear)
        ]);
        setDonations(fetchedDonations);
        setExpenses(fetchedExpenses);
      } catch (error) {
        console.error("Failed to load data", error);
      }
    }
  }, [user, selectedYear]);

  // Fetch Data on User or Year Change
  useEffect(() => {
    if (user) {
        setIsDataLoading(true);
        refreshData().finally(() => setIsDataLoading(false));
    }
  }, [user, refreshData]);

  // Derived Summary State
  const summary: DashboardSummary = useMemo(() => {
    const totalPledged = donations.reduce((sum, d) => sum + d.pledgedAmount, 0);
    const totalCollected = donations.reduce((sum, d) => sum + d.paidAmount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    
    return {
      totalPledged,
      totalCollected,
      totalExpenses,
      currentBalance: totalCollected - totalExpenses
    };
  }, [donations, expenses]);

  // Handlers
  const handleAddDonation = async (data: Omit<Donation, 'id' | 'userId'>) => {
    if (!user || isReadOnly) return;
    const newDonation: Donation = {
      ...data,
      id: crypto.randomUUID(),
      userId: user.id,
      year: data.year || selectedYear // Ensure year is set
    };
    await dbService.addDonation(newDonation);
    setDonations(prev => [...prev, newDonation]);
  };

  const handleUpdateDonation = async (updatedDonation: Donation) => {
    if (!user || isReadOnly) return;
    await dbService.updateDonation(updatedDonation);
    setDonations(prev => prev.map(d => d.id === updatedDonation.id ? updatedDonation : d));
  };

  const handleDeleteDonation = async (id: string) => {
    if (!user || isReadOnly) return;
    await dbService.deleteDonation(id);
    setDonations(prev => prev.filter(d => d.id !== id));
  };

  const handleAddExpense = async (data: Omit<Expense, 'id' | 'userId'>) => {
    if (!user || isReadOnly) return;
    const newExpense: Expense = {
      ...data,
      id: crypto.randomUUID(),
      userId: user.id,
      year: data.year || selectedYear // Ensure year is set
    };
    await dbService.addExpense(newExpense);
    setExpenses(prev => [...prev, newExpense]);
  };

  const handleUpdateExpense = async (updatedExpense: Expense) => {
    if (!user || isReadOnly) return;
    await dbService.updateExpense(updatedExpense);
    setExpenses(prev => prev.map(e => e.id === updatedExpense.id ? updatedExpense : e));
  };

  const handleDeleteExpense = async (id: string) => {
    if (!user || isReadOnly) return;
    await dbService.deleteExpense(id);
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const handleCategoryChange = async () => {
    // Reload data to reflect any category renaming in expenses
    await refreshData();
  };

  // Login Screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin text-emerald-600">
           <Moon size={48} />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-800 to-emerald-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center border-t-8 border-gold-500">
          <div className="flex justify-center mb-6">
             <div className="bg-emerald-100 p-4 rounded-full text-emerald-700">
               <Moon size={40} fill="currentColor" />
             </div>
          </div>
          <h1 className="text-3xl font-serif font-bold text-slate-800 mb-2">Ramadan Iftar Fund</h1>
          <p className="text-slate-500 mb-8">Track donations and manage expenses for your community Iftar efficiently.</p>
          
          <button 
            onClick={login}
            className="w-full flex items-center justify-center space-x-3 bg-white border-2 border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold py-3 px-4 rounded-xl transition-all hover:shadow-lg active:scale-[0.98]"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 4.61c1.61 0 3.09.56 4.23 1.64l3.18-3.18C17.46 1.05 14.97 0 12 0 7.7 0 3.99 2.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span>Sign in with Google</span>
          </button>
          
          <p className="mt-8 text-xs text-slate-400">
            By signing in, you agree to our terms of service and privacy policy. 
            Data is persisted locally for this demo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        
        {/* Year Selector & Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-sm gap-3">
           <div className="flex items-center space-x-2 text-slate-600">
             <CalendarRange size={20} className="text-emerald-600" />
             <span className="font-medium">Ramadan Year:</span>
             <select 
               value={selectedYear} 
               onChange={(e) => setActiveTab('dashboard') || setSelectedYear(parseInt(e.target.value))}
               className="bg-slate-50 border border-slate-200 text-slate-800 font-bold rounded-lg p-1.5 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
             >
               {availableYears.map(year => (
                 <option key={year} value={year}>{year}</option>
               ))}
             </select>
           </div>

           {isReadOnly && (
             <div className="flex items-center text-xs font-semibold text-gold-600 bg-gold-50 px-3 py-1.5 rounded-full border border-gold-100">
               <Lock size={12} className="mr-1.5" />
               View Only Mode (Past Year)
             </div>
           )}

           {/* Mobile-Friendly Tab Navigation */}
           <div className="flex p-1 space-x-1 bg-slate-200/50 rounded-lg w-full sm:w-auto overflow-x-auto">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'donations', label: 'Donations', icon: HeartHandshake },
              { id: 'expenses', label: 'Expenses', icon: ReceiptText },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={clsx(
                  'flex-1 flex items-center justify-center space-x-2 py-1.5 px-3 rounded-md text-sm font-medium transition-all whitespace-nowrap',
                  activeTab === tab.id
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-800 hover:bg-white/50'
                )}
              >
                <tab.icon size={16} />
                <span>{tab.label}</span>
              </button>
            ))}
           </div>
        </div>

        {/* Content Area */}
        {isDataLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin text-emerald-500">
              <Moon size={32} />
            </div>
          </div>
        ) : (
          <div className="animate-fade-in">
            {activeTab === 'dashboard' && (
              <Dashboard summary={summary} expenses={expenses} />
            )}
            {activeTab === 'donations' && (
              <DonationSection 
                donations={donations} 
                onAdd={handleAddDonation}
                onUpdate={handleUpdateDonation}
                onDelete={handleDeleteDonation}
                selectedYear={selectedYear}
                isReadOnly={isReadOnly}
              />
            )}
            {activeTab === 'expenses' && (
              <ExpenseSection 
                expenses={expenses}
                onAdd={handleAddExpense}
                onUpdate={handleUpdateExpense}
                onDelete={handleDeleteExpense}
                selectedYear={selectedYear}
                onCategoryChange={handleCategoryChange}
                isReadOnly={isReadOnly}
              />
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

export default App;