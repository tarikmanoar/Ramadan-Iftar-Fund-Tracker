import React, { useState, useEffect } from 'react';
import { Expense } from '../types';
import { dbService } from '../services/dbService';
import { Plus, Trash2, Calendar, Tag, FileText, Edit2, X, Settings, Check, Edit3, Lock, Receipt, AlertCircle } from 'lucide-react';
import { BottomSheet } from './BottomSheet';

interface ExpenseSectionProps {
  expenses: Expense[];
  onAdd: (expense: Omit<Expense, 'id' | 'userId'>) => Promise<void>;
  onUpdate: (expense: Expense) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  selectedYear: number;
  onCategoryChange?: () => void;
  isReadOnly?: boolean;
}

export const ExpenseSection: React.FC<ExpenseSectionProps> = ({ expenses, onAdd, onUpdate, onDelete, selectedYear, onCategoryChange, isReadOnly = false }) => {
  const [categories, setCategories] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: '',
    date: new Date().toISOString().split('T')[0]
  });
  
  // State for adding a new category
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // State for Managing Categories
  const [isManagingCategories, setIsManagingCategories] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    const loadCategories = async () => {
      const cats = await dbService.getCategories();
      setCategories(cats);
      // Set default category if not set
      if (!formData.category && cats.length > 0) {
        setFormData(prev => ({ ...prev, category: cats[0] }));
      }
    };
    loadCategories();
  }, [formData.category]); // Reload if formData.category changes to ensure sync, mainly on mount

  const resetForm = () => {
    setFormData({
      description: '',
      amount: '',
      category: categories[0] || 'Food',
      date: new Date().toISOString().split('T')[0]
    });
    setEditingId(null);
    setIsAddingCategory(false);
    setNewCategoryName('');
    setIsFormOpen(false);
  };

  const handleEditClick = (expense: Expense) => {
    if (isReadOnly) return;
    setFormData({
      description: expense.description,
      amount: expense.amount.toString(),
      category: expense.category,
      date: expense.date
    });
    setEditingId(expense.id);
    setIsAddingCategory(false);
    setIsFormOpen(true);
  };

  const handleOpenForm = () => {
    if (isReadOnly) return;
    resetForm();
    setIsFormOpen(true);
  };

  const handleAddCategory = async () => {
    if (newCategoryName.trim()) {
      const updatedCats = await dbService.addCategory(newCategoryName.trim());
      setCategories(updatedCats);
      setFormData(prev => ({ ...prev, category: newCategoryName.trim() }));
      setIsAddingCategory(false);
      setNewCategoryName('');
    }
  };

  // Category Management Handlers
  const handleUpdateCategory = async (oldName: string) => {
    if (editCategoryName.trim() && editCategoryName !== oldName) {
      const updatedCats = await dbService.updateCategory(oldName, editCategoryName.trim());
      setCategories(updatedCats);
      if (formData.category === oldName) {
        setFormData(prev => ({ ...prev, category: editCategoryName.trim() }));
      }
      if (onCategoryChange) onCategoryChange();
    }
    setEditingCategory(null);
    setEditCategoryName('');
  };

  const handleDeleteCategory = async (catName: string) => {
    if (window.confirm(`Are you sure you want to delete the category "${catName}"?`)) {
      const updatedCats = await dbService.deleteCategory(catName);
      setCategories(updatedCats);
      if (formData.category === catName) {
        setFormData(prev => ({ ...prev, category: updatedCats[0] || '' }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    setIsSubmitting(true);
    
    // Validate category
    let finalCategory = formData.category;
    if (isAddingCategory && newCategoryName.trim()) {
      await handleAddCategory();
      finalCategory = newCategoryName.trim();
    }

    if (editingId) {
      const originalExpense = expenses.find(e => e.id === editingId);
      if (originalExpense) {
        await onUpdate({
          ...originalExpense,
          description: formData.description,
          amount: parseFloat(formData.amount) || 0,
          category: finalCategory,
          date: formData.date,
          year: selectedYear
        });
      }
    } else {
      await onAdd({
        description: formData.description,
        amount: parseFloat(formData.amount) || 0,
        category: finalCategory,
        date: formData.date,
        year: selectedYear
      });
    }

    resetForm();
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-3 relative pb-6">
      
      {/* Category Manager Modal */}
      {isManagingCategories && !isReadOnly && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl p-6 w-full max-w-md border-t-4 border-blue-500 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800 flex items-center">
                <div className="bg-gradient-to-br from-blue-400 to-blue-500 p-2.5 rounded-2xl mr-3 text-white shadow-lg shadow-blue-500/30">
                  <Settings size={20} />
                </div>
                Manage Categories
              </h3>
              <button onClick={() => setIsManagingCategories(false)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 pr-2 space-y-2">
              {categories.map(cat => (
                <div key={cat} className="flex items-center justify-between p-4 bg-white/60 backdrop-blur-xl rounded-2xl border border-white/80 group hover:shadow-lg transition-all">
                  {editingCategory === cat ? (
                    <div className="flex items-center flex-1 space-x-2">
                      <input 
                        type="text" 
                        value={editCategoryName}
                        onChange={(e) => setEditCategoryName(e.target.value)}
                        className="flex-1 px-3 py-2 border-2 border-blue-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        autoFocus
                      />
                      <button 
                        onClick={() => handleUpdateCategory(cat)}
                        className="p-2 text-emerald-600 bg-emerald-100 hover:bg-emerald-200 rounded-xl transition-colors active:scale-95"
                        title="Save"
                      >
                        <Check size={18} />
                      </button>
                      <button 
                        onClick={() => setEditingCategory(null)}
                        className="p-2 text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors active:scale-95"
                        title="Cancel"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="font-bold text-slate-700 flex items-center">
                        <span className="w-2 h-2 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full mr-2"></span>
                        {cat}
                      </span>
                      <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => { setEditingCategory(cat); setEditCategoryName(cat); }}
                          className="p-2 text-blue-600 bg-blue-100 hover:bg-blue-200 rounded-xl transition-all active:scale-95"
                          title="Rename"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteCategory(cat)}
                          className="p-2 text-red-500 bg-red-100 hover:bg-red-200 rounded-xl transition-all active:scale-95"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
            
            <div className="mt-6 pt-4 border-t border-slate-200 flex justify-end">
               <button
                 onClick={() => setIsManagingCategories(false)}
                 className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/40 hover:shadow-xl transition-all active:scale-95"
               >
                 Done
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Form Bottom Sheet */}
      <BottomSheet
        isOpen={isFormOpen}
        onClose={resetForm}
        title={editingId ? 'Edit Expense' : 'New Expense'}
      >
        <form onSubmit={handleSubmit} className="space-y-4 pb-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Description</label>
            <div className="relative">
              <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                required
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="w-full pl-12 pr-4 py-4 border-2 border-slate-200 rounded-2xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-base"
                placeholder="Iftar Boxes"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 font-bold">৳</span>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={formData.amount}
                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                className="w-full pl-10 pr-4 py-4 border-2 border-slate-200 rounded-2xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-base"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
             <div className="flex justify-between items-center mb-2">
               <label className="block text-sm font-bold text-slate-700">Category</label>
               {!isAddingCategory && (
                 <button 
                   type="button" 
                   onClick={() => setIsManagingCategories(true)}
                   className="text-xs text-blue-600 hover:text-blue-800 flex items-center font-semibold bg-blue-50 px-2 py-1 rounded-full hover:bg-blue-100 transition-colors"
                 >
                   <Settings size={12} className="mr-1" /> Manage
                 </button>
               )}
             </div>
             <div className="relative">
                <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                {isAddingCategory ? (
                   <div className="flex space-x-2">
                     <input
                       type="text"
                       autoFocus
                       value={newCategoryName}
                       onChange={e => setNewCategoryName(e.target.value)}
                       placeholder="New Category Name"
                       className="w-full pl-12 pr-4 py-4 border-2 border-blue-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base"
                     />
                     <button 
                       type="button" 
                       onClick={() => setIsAddingCategory(false)}
                       className="p-4 text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-colors active:scale-95"
                     >
                       <X size={20} />
                     </button>
                   </div>
                ) : (
                  <select
                    value={formData.category}
                    onChange={(e) => {
                      if (e.target.value === '__NEW__') {
                        setIsAddingCategory(true);
                      } else {
                        setFormData({ ...formData, category: e.target.value });
                      }
                    }}
                    className="w-full pl-12 pr-4 py-4 border-2 border-slate-200 rounded-2xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all bg-white/90 backdrop-blur-sm appearance-none text-base font-medium shadow-sm"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="__NEW__" className="font-bold text-blue-600">+ Create New Category</option>
                  </select>
                )}
             </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Date</label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" size={18} />
              <input
                type="date"
                required
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
                className="w-full pl-12 pr-4 py-4 border-2 border-slate-200 rounded-2xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-base [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full text-white font-bold py-4 rounded-2xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed ${
              editingId 
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:shadow-blue-500/40' 
                : 'bg-gradient-to-r from-red-500 to-red-600 hover:shadow-red-500/40'
            }`}
          >
            {isSubmitting ? (editingId ? 'Updating...' : 'Adding...') : (editingId ? 'Update Expense' : 'Add Expense')}
          </button>
        </form>
      </BottomSheet>

      {/* Expense Cards - Mobile Native */}
      {expenses.length === 0 ? (
        <div className="bg-white/60 backdrop-blur-xl rounded-3xl shadow-lg border border-white/60 p-12 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={36} className="text-red-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">No expenses yet</h3>
          <p className="text-sm text-slate-500 mb-6">Start tracking expenses by adding your first entry</p>
          {!isReadOnly && (
            <button
              onClick={handleOpenForm}
              className="bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-2xl font-semibold shadow-lg shadow-red-500/40 hover:shadow-xl transition-all active:scale-95"
            >
              Add First Expense
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {expenses.map((expense) => {
            return (
              <div
                key={expense.id}
                className="bg-white/60 backdrop-blur-xl rounded-3xl shadow-lg border border-white/60 p-5 hover:shadow-xl transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <span className="px-3 py-1 text-xs font-bold bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 rounded-full border border-slate-300 flex items-center">
                        <Tag size={12} className="mr-1" />
                        {expense.category}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-1">{expense.description}</h3>
                    <p className="text-xs text-slate-500 flex items-center">
                      <Calendar size={12} className="mr-1" />
                      {new Date(expense.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>

                  {!isReadOnly && (
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleEditClick(expense)}
                        className="p-2.5 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded-2xl transition-all active:scale-95"
                        title="Edit"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => onDelete(expense.id)}
                        className="p-2.5 bg-red-100 text-red-600 hover:bg-red-200 rounded-2xl transition-all active:scale-95"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Amount Display */}
                <div className="bg-gradient-to-br from-red-50 to-red-100/50 rounded-2xl p-4 border border-red-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600 font-medium flex items-center">
                      <Receipt size={16} className="mr-2 text-red-500" />
                      Amount Spent
                    </span>
                    <span className="text-2xl font-bold text-red-600">৳{expense.amount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Action Button */}
      {!isReadOnly && expenses.length > 0 && (
        <button
          onClick={handleOpenForm}
          className="fixed bottom-28 right-6 z-40 w-16 h-16 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full shadow-2xl shadow-red-500/50 flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
        >
          <Plus size={28} strokeWidth={3} />
        </button>
      )}

      {isReadOnly && (
        <div className="flex items-center justify-center text-xs font-semibold text-slate-500 bg-slate-100 px-4 py-3 rounded-2xl mt-4">
          <Lock size={14} className="mr-2" />
          Read-only mode • Viewing past year data
        </div>
      )}
    </div>
  );
};