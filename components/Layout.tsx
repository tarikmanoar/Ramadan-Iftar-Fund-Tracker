import React, { ReactNode } from 'react';
import { useAuth } from '../services/authContext';
import { Moon, LogOut } from 'lucide-react';
import { APP_NAME } from '../constants';

interface LayoutProps {
  children: ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-emerald-700 text-white sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-gold-500 p-2 rounded-lg text-emerald-900 shadow-lg shadow-gold-500/20">
                <Moon size={20} fill="currentColor" />
              </div>
              <h1 className="text-xl font-serif font-bold tracking-wide text-white">{APP_NAME}</h1>
            </div>

            <div className="flex items-center space-x-4">
              {user && (
                <>
                  <div className="hidden md:flex items-center space-x-3 bg-emerald-800/50 py-1 px-3 rounded-full border border-emerald-600/30">
                     {user.picture ? (
                       <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full border-2 border-gold-500" />
                     ) : (
                       <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-sm font-bold">
                         {user.name.charAt(0)}
                       </div>
                     )}
                     <span className="text-sm font-medium text-emerald-50 max-w-[120px] truncate">{user.name}</span>
                  </div>
                  <button 
                    onClick={logout}
                    className="p-2 hover:bg-emerald-600 rounded-full transition-colors text-emerald-100 hover:text-white"
                    title="Sign Out"
                  >
                    <LogOut size={20} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      
      {/* Footer */}
      <footer className="bg-emerald-900 text-emerald-100 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm opacity-80 font-serif">May your Ramadan be blessed and your deeds accepted.</p>
          <p className="text-xs mt-2 opacity-50">&copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};