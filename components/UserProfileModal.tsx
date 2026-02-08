import React, { useState, useEffect } from 'react';
import { X, Download, LogOut, User as UserIcon, Mail, Check } from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    name: string;
    email: string;
    picture?: string;
  };
  onLogout: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose, user, onLogout }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Capture the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if app was installed
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }

    setIsInstalling(true);

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user's response
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
    }

    setIsInstalling(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center sm:justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full sm:w-auto sm:min-w-[400px] bg-white/95 backdrop-blur-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 duration-300 border-t-4 border-emerald-500">
        {/* Handle (mobile only) */}
        <div className="flex justify-center pt-3 pb-2 sm:hidden">
          <div className="w-10 h-1 bg-slate-300 rounded-full"></div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-xl font-bold text-slate-800">Profile</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-2xl transition-colors active:scale-95"
          >
            <X size={22} className="text-slate-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* User Info */}
          <div className="flex items-center space-x-4">
            {user.picture ? (
              <img 
                src={user.picture} 
                alt={user.name} 
                className="w-20 h-20 rounded-3xl border-4 border-emerald-100 shadow-lg"
              />
            ) : (
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-bold text-3xl shadow-lg border-4 border-emerald-100">
                {user.name.charAt(0)}
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <h4 className="text-lg font-bold text-slate-800 truncate">{user.name}</h4>
              <div className="flex items-center text-sm text-slate-500 mt-1">
                <Mail size={14} className="mr-1.5 flex-shrink-0" />
                <span className="truncate">{user.email}</span>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-100"></div>

          {/* Install App Button */}
          {!isInstalled && deferredPrompt && (
            <button
              onClick={handleInstallClick}
              disabled={isInstalling}
              className="w-full flex items-center justify-center space-x-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-500/40 hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-70"
            >
              <Download size={20} />
              <span>{isInstalling ? 'Installing...' : 'Install App'}</span>
            </button>
          )}

          {isInstalled && (
            <div className="flex items-center justify-center space-x-2 bg-emerald-50 text-emerald-700 font-semibold py-4 rounded-2xl border border-emerald-200">
              <Check size={20} />
              <span>App Installed</span>
            </div>
          )}

          {!deferredPrompt && !isInstalled && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <p className="text-sm text-slate-600 text-center">
                💡 To install, open menu <span className="font-bold">⋮</span> and select <span className="font-semibold">"Install app"</span> or <span className="font-semibold">"Add to Home Screen"</span>
              </p>
            </div>
          )}

          {/* Sign Out Button */}
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center space-x-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-4 rounded-2xl transition-all active:scale-95"
          >
            <LogOut size={20} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
