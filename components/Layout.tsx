import React, { ReactNode } from 'react';
import { useAuth } from '../services/authContext';
import { Moon, LogOut } from 'lucide-react';
import { APP_NAME } from '../constants';

interface LayoutProps {
  children: ReactNode;
  currentTab?: 'dashboard' | 'donations' | 'expenses';
  onTabChange?: (tab: 'dashboard' | 'donations' | 'expenses') => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentTab, onTabChange }) => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-slate-50 to-gold-50 flex flex-col relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gold-400/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-300/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      {/* Mobile Header - Minimal */}
      <header className="relative z-10 px-4 pt-4 pb-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-2.5 rounded-2xl shadow-lg shadow-emerald-500/30">
              <Moon size={22} fill="white" className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 leading-tight">Iftar Fund</h1>
              <p className="text-xs text-slate-500">Ramadan 2026</p>
            </div>
          </div>

          {user && (
            <div className="flex items-center space-x-2">
              {user.picture ? (
                <img src={user.picture} alt={user.name} className="w-10 h-10 rounded-2xl border-2 border-white shadow-lg" />
              ) : (
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-bold shadow-lg">
                  {user.name.charAt(0)}
                </div>
              )}
              <button 
                onClick={logout}
                className="p-2.5 bg-white/60 backdrop-blur-xl rounded-2xl shadow-lg hover:shadow-xl active:scale-95 transition-all border border-white/60"
                title="Sign Out"
              >
                <LogOut size={18} className="text-slate-700" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content with bottom padding for nav */}
      <main className="flex-1 relative z-10 px-4 pb-24 overflow-y-auto">
        {children}
      </main>
      
      {/* Floating Bottom Navigation */}
      {onTabChange && (
        <nav className="fixed bottom-4 left-4 right-4 z-50">
          <div className="bg-white/80 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-slate-900/10 border border-white/60 p-2">
            <div className="flex items-center justify-around">
              <button
                onClick={() => onTabChange('dashboard')}
                className={`flex-1 flex flex-col items-center py-2 px-4 rounded-2xl transition-all ${
                  currentTab === 'dashboard'
                    ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/40'
                    : 'text-slate-600 hover:bg-slate-100/50'
                }`}
              >
                <svg className="w-6 h-6 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="text-xs font-semibold">Dashboard</span>
              </button>

              <button
                onClick={() => onTabChange('donations')}
                className={`flex-1 flex flex-col items-center py-2 px-4 rounded-2xl transition-all ${
                  currentTab === 'donations'
                    ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/40'
                    : 'text-slate-600 hover:bg-slate-100/50'
                }`}
              >
                <svg className="w-6 h-6 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs font-semibold">Donations</span>
              </button>

              <button
                onClick={() => onTabChange('expenses')}
                className={`flex-1 flex flex-col items-center py-2 px-4 rounded-2xl transition-all ${
                  currentTab === 'expenses'
                    ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/40'
                    : 'text-slate-600 hover:bg-slate-100/50'
                }`}
              >
                <svg className="w-6 h-6 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                <span className="text-xs font-semibold">Expenses</span>
              </button>
            </div>
          </div>
        </nav>
      )}
    </div>
  );
};