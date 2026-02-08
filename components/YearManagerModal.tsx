import React, { useState } from 'react';
import { X, Plus, Trash2, Calendar } from 'lucide-react';

interface YearManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableYears: number[];
  selectedYear: number;
  onYearsUpdate: (years: number[]) => void;
  onYearSelect: (year: number) => void;
  currentYear: number;
}

export const YearManagerModal: React.FC<YearManagerModalProps> = ({
  isOpen,
  onClose,
  availableYears,
  selectedYear,
  onYearsUpdate,
  onYearSelect,
  currentYear
}) => {
  const [newYear, setNewYear] = useState('');
  const [error, setError] = useState('');

  const handleAddYear = () => {
    const year = parseInt(newYear);
    
    if (!newYear || isNaN(year)) {
      setError('Please enter a valid year');
      return;
    }

    if (year < 2020 || year > 2050) {
      setError('Year must be between 2020 and 2050');
      return;
    }

    if (availableYears.includes(year)) {
      setError('Year already exists');
      return;
    }

    const updatedYears = [...availableYears, year].sort((a, b) => b - a); // Sort descending
    onYearsUpdate(updatedYears);
    setNewYear('');
    setError('');
  };

  const handleRemoveYear = (year: number) => {
    if (availableYears.length <= 1) {
      setError('Cannot remove the last year');
      return;
    }

    const updatedYears = availableYears.filter(y => y !== year);
    onYearsUpdate(updatedYears);
    
    // If the removed year was selected, switch to the first available year
    if (selectedYear === year) {
      onYearSelect(updatedYears[0]);
    }
    setError('');
  };

  const handleQuickAdd = (year: number) => {
    if (!availableYears.includes(year)) {
      const updatedYears = [...availableYears, year].sort((a, b) => b - a);
      onYearsUpdate(updatedYears);
    }
  };

  if (!isOpen) return null;

  const suggestedYears = [
    currentYear - 3,
    currentYear - 2,
    currentYear - 1,
    currentYear,
    currentYear + 1,
    currentYear + 2
  ].filter(y => !availableYears.includes(y));

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center sm:justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full sm:w-auto sm:min-w-[450px] max-w-lg bg-white/95 backdrop-blur-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 duration-300 border-t-4 border-emerald-500">
        {/* Handle (mobile only) */}
        <div className="flex justify-center pt-3 pb-2 sm:hidden">
          <div className="w-10 h-1 bg-slate-300 rounded-full"></div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <Calendar size={22} className="text-emerald-600" />
            <h3 className="text-xl font-bold text-slate-800">Manage Years</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-2xl transition-colors active:scale-95"
          >
            <X size={22} className="text-slate-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto pb-32">
          {/* Add New Year */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Add New Year
            </label>
            <div className="flex space-x-2">
              <input
                type="number"
                value={newYear}
                onChange={(e) => {
                  setNewYear(e.target.value);
                  setError('');
                }}
                placeholder="2023"
                min="2020"
                max="2050"
                className="flex-1 bg-white/80 backdrop-blur-sm border-2 border-slate-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
              <button
                onClick={handleAddYear}
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold px-6 py-3 rounded-2xl shadow-lg shadow-emerald-500/40 hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center space-x-2"
              >
                <Plus size={20} />
                <span>Add</span>
              </button>
            </div>
            {error && (
              <p className="text-sm text-red-600 mt-2">{error}</p>
            )}
          </div>

          {/* Quick Add Suggestions */}
          {suggestedYears.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3">
                Quick Add
              </label>
              <div className="flex flex-wrap gap-2">
                {suggestedYears.map(year => (
                  <button
                    key={year}
                    onClick={() => handleQuickAdd(year)}
                    className="bg-emerald-50 border-2 border-emerald-200 text-emerald-700 font-semibold px-4 py-2 rounded-xl hover:bg-emerald-100 active:scale-95 transition-all"
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-slate-100"></div>

          {/* Available Years List */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              Available Years ({availableYears.length})
            </label>
            <div className="space-y-2">
              {availableYears.map(year => (
                <div
                  key={year}
                  className={`flex items-center justify-between bg-white/80 backdrop-blur-sm rounded-2xl p-4 border-2 transition-all ${
                    year === selectedYear
                      ? 'border-emerald-500 shadow-lg shadow-emerald-500/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-xl ${
                      year === currentYear
                        ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white'
                        : year === selectedYear
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      <Calendar size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">
                        {year}
                        {year === currentYear && (
                          <span className="ml-2 text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg font-semibold">
                            Current
                          </span>
                        )}
                        {year === selectedYear && year !== currentYear && (
                          <span className="ml-2 text-xs bg-gold-100 text-gold-700 px-2 py-1 rounded-lg font-semibold">
                            Selected
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleRemoveYear(year)}
                    disabled={availableYears.length <= 1}
                    className={`p-2 rounded-xl transition-all ${
                      availableYears.length <= 1
                        ? 'text-slate-300 cursor-not-allowed'
                        : 'text-red-600 hover:bg-red-50 active:scale-95'
                    }`}
                    title={availableYears.length <= 1 ? 'Cannot remove the last year' : 'Remove year'}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
