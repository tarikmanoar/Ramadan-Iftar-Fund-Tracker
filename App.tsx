import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from './services/authContext';
import { dbService } from './services/dbService';
import { Donation, Expense, DashboardSummary, RamadanYear } from './types';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { DonationSection } from './components/DonationSection';
import { ExpenseSection } from './components/ExpenseSection';
import { YearManagerModal } from './components/YearManagerModal';
import { Moon, LayoutDashboard, HeartHandshake, ReceiptText, CalendarRange, Lock, Settings } from 'lucide-react';
import clsx from 'clsx';

function App() {
  const { user, isLoading, login } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'donations' | 'expenses'>('dashboard');
  
  // Year Management
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [availableYears, setAvailableYears] = useState<RamadanYear[]>([
    { year: currentYear - 2, startDate: '' },
    { year: currentYear - 1, startDate: '' },
    { year: currentYear, startDate: '' },
    { year: currentYear + 1, startDate: '' },
  ]);
  const [isYearManagerOpen, setIsYearManagerOpen] = useState(false);
  const [yearsLoading, setYearsLoading] = useState(true);
  
  // Load available years from database
  useEffect(() => {
    const loadAvailableYears = async () => {
      if (!user) {
        setYearsLoading(false);
        return;
      }

      try {
        // Try to get years from database
        const dbYears = await dbService.getAvailableYears();
        
        // Check if localStorage has years that should be migrated
        const localStorageYears = localStorage.getItem('ramadan_years');
        if (localStorageYears && dbYears.length === 4) {
          // Migrate localStorage years to database (normalize plain numbers to RamadanYear)
          const parsedLocalYears: any[] = JSON.parse(localStorageYears);
          if (Array.isArray(parsedLocalYears) && parsedLocalYears.length > 0) {
            const normalized: RamadanYear[] = parsedLocalYears.map((y: any) =>
              typeof y === 'number' ? { year: y, startDate: '' } : y
            );
            const migratedYears = await dbService.updateAvailableYears(normalized);
            setAvailableYears(migratedYears);
            // Clear localStorage after successful migration
            localStorage.removeItem('ramadan_years');
          } else {
            setAvailableYears(dbYears);
          }
        } else {
          setAvailableYears(dbYears);
        }
      } catch (error) {
        console.error('Failed to load available years:', error);
        // Fallback to defaults
        setAvailableYears([
          { year: currentYear - 2, startDate: '' },
          { year: currentYear - 1, startDate: '' },
          { year: currentYear, startDate: '' },
          { year: currentYear + 1, startDate: '' },
        ]);
      } finally {
        setYearsLoading(false);
      }
    };

    loadAvailableYears();
  }, [user, currentYear]);
  
  // Save years to database whenever they change
  const handleYearsUpdate = async (years: RamadanYear[]) => {
    try {
      const updatedYears = await dbService.updateAvailableYears(years);
      setAvailableYears(updatedYears);
    } catch (error) {
      console.error('Failed to update years:', error);
    }
  };
  
  // Read-only mode for previous years
  const isReadOnly = selectedYear !== currentYear;
  
  // Ramadan start date for selected year (for day-based filtering)
  const selectedYearStartDate = availableYears.find(y => y.year === selectedYear)?.startDate ?? '';

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
      <div className="min-h-screen bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gold-400/30 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-400/30 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        </div>

        <div className="relative bg-white/90 backdrop-blur-2xl rounded-3xl shadow-2xl p-8 max-w-md w-full text-center border border-white/60">
          <div className="flex justify-center mb-6">
             <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 rounded-3xl shadow-2xl shadow-emerald-500/40 animate-pulse">
               <Moon size={48} fill="white" className="text-white" />
             </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Iftar Fund Tracker</h1>
          <p className="text-slate-600 mb-8 text-sm">Manage your Ramadan iftar donations and expenses with ease</p>
          
          <button 
            onClick={login}
            className="w-full flex items-center justify-center space-x-3 bg-white border-2 border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold py-4 px-4 rounded-2xl transition-all hover:shadow-xl active:scale-[0.98] mb-6"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 4.61c1.61 0 3.09.56 4.23 1.64l3.18-3.18C17.46 1.05 14.97 0 12 0 7.7 0 3.99 2.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="flex items-center justify-center space-x-4 text-xs text-slate-500">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              <span>Secure</span>
            </div>
            <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              <span>Fast</span>
            </div>
            <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              <span>Simple</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Layout currentTab={activeTab} onTabChange={setActiveTab}>
      <div className="space-y-4 pt-2">
        
        {/* Year Selector - only visible on Dashboard */}
        {activeTab === 'dashboard' && (
        <div className="bg-white/60 backdrop-blur-xl rounded-3xl shadow-lg border border-white/60 p-4">
           <div className="flex items-center justify-between">
             <div className="flex items-center space-x-3">
               <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl shadow-lg shadow-emerald-500/30">
                 <CalendarRange size={20} className="text-white" />
               </div>
               <div>
                 <p className="text-xs text-slate-500 font-medium">Ramadan Year</p>
                 <p className="text-lg font-bold text-slate-800">{selectedYear}</p>
               </div>
             </div>

             <div className="flex items-center space-x-2">
               <select 
                 value={selectedYear} 
                 onChange={(e) => setActiveTab('dashboard') || setSelectedYear(parseInt(e.target.value))}
                 className="bg-white/80 backdrop-blur-xl border-2 border-emerald-200 text-slate-800 font-bold rounded-2xl px-5 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none cursor-pointer shadow-lg hover:shadow-xl transition-all active:scale-95"
               >
                 {[...availableYears].sort((a, b) => b.year - a.year).map(({ year }) => (
                   <option key={year} value={year}>{year}</option>
                 ))}
               </select>
               
               <button
                 onClick={() => setIsYearManagerOpen(true)}
                 className="p-3 bg-white/80 backdrop-blur-xl border-2 border-slate-200 text-slate-700 rounded-2xl shadow-lg hover:shadow-xl hover:border-emerald-300 active:scale-95 transition-all"
                 title="Manage Years"
               >
                 <Settings size={20} />
               </button>
             </div>
           </div>

           {isReadOnly && (
             <div className="mt-3 flex items-center text-xs font-semibold text-gold-700 bg-gradient-to-r from-gold-50 to-gold-100 px-4 py-2.5 rounded-2xl border border-gold-200 shadow-sm">
               <Lock size={14} className="mr-2" />
               <span>Read-only mode • Editing disabled for past years</span>
             </div>
           )}
        </div>
        )}

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
                ramadanStartDate={selectedYearStartDate}
              />
            )}
          </div>
        )}
      </div>

      {/* Year Manager Modal */}
      <YearManagerModal 
        isOpen={isYearManagerOpen}
        onClose={() => setIsYearManagerOpen(false)}
        availableYears={availableYears}
        selectedYear={selectedYear}
        onYearsUpdate={handleYearsUpdate}
        onYearSelect={setSelectedYear}
        currentYear={currentYear}
      />
    </Layout>
  );
}

export default App;