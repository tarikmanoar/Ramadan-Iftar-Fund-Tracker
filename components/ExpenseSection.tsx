import React, { useState, useEffect } from 'react';
import { Expense } from '../types';
import { dbService } from '../services/dbService';
import { Plus, Trash2, Calendar, DollarSign, Tag, FileText, Edit2, X, Settings, Check, Edit3, Lock } from 'lucide-react';

interface ExpenseSectionProps {
  expenses: Expense[];
  onAdd: (expense: Omit<Expense, 'id' | 'userId'>) => Promise<void>;
  onUpdate: (expense: Expense) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onCategoryChange?: () => void;
  isReadOnly?: boolean;
}

export const ExpenseSection: React.FC<ExpenseSectionProps> = ({ expenses, onAdd, onUpdate, onDelete, onCategoryChange, isReadOnly = false }) => {
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
    if (window.innerWidth < 1024) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleCancelEdit = () => {
    resetForm();
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
          date: formData.date
        });
      }
    } else {
      await onAdd({
        description: formData.description,
        amount: parseFloat(formData.amount) || 0,
        category: finalCategory,
        date: formData.date
      });
    }

    resetForm();
    setIsSubmitting(false);
  };

  return (
    <div className={`grid grid-cols-1 ${!isReadOnly ? 'lg:grid-cols-3' : 'lg:grid-cols-1'} gap-6 relative`}>
      
      {/* Category Manager Modal */}
      {isManagingCategories && !isReadOnly && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md border-t-4 border-blue-500 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800 flex items-center">
                <div className="bg-blue-100 p-2 rounded-full mr-2 text-blue-600">
                  <Settings size={20} />
                </div>
                Manage Categories
              </h3>
              <button onClick={() => setIsManagingCategories(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 pr-2 space-y-2">
              {categories.map(cat => (
                <div key={cat} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 group hover:border-blue-200 transition-colors">
                  {editingCategory === cat ? (
                    <div className="flex items-center flex-1 space-x-2">
                      <input 
                        type="text" 
                        value={editCategoryName}
                        onChange={(e) => setEditCategoryName(e.target.value)}
                        className="flex-1 px-2 py-1 border border-blue-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                      <button 
                        onClick={() => handleUpdateCategory(cat)}
                        className="p-1 text-emerald-600 hover:bg-emerald-100 rounded"
                        title="Save"
                      >
                        <Check size={16} />
                      </button>
                      <button 
                        onClick={() => setEditingCategory(null)}
                        className="p-1 text-slate-500 hover:bg-slate-200 rounded"
                        title="Cancel"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="font-medium text-slate-700">{cat}</span>
                      <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => { setEditingCategory(cat); setEditCategoryName(cat); }}
                          className="p-1.5 text-blue-600 hover:bg-blue-100 rounded"
                          title="Rename"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteCategory(cat)}
                          className="p-1.5 text-red-500 hover:bg-red-100 rounded"
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
            
            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
               <button
                 onClick={() => setIsManagingCategories(false)}
                 className="px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-900 transition-colors"
               >
                 Done
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Form Section - Hidden if Read Only */}
      {!isReadOnly && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 h-fit relative">
          <h3 className="text-xl font-serif font-bold text-slate-800 mb-6 flex items-center justify-between">
            <div className="flex items-center">
              <span className={`w-8 h-8 rounded-full ${editingId ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-500'} flex items-center justify-center mr-3`}>
                {editingId ? <Edit2 size={18} /> : <Plus size={18} />}
              </span>
              {editingId ? 'Edit Expense' : 'New Expense'}
            </div>
            {editingId && (
              <button 
                onClick={handleCancelEdit}
                className="text-xs flex items-center text-slate-500 hover:text-red-500 bg-slate-100 hover:bg-red-50 px-2 py-1 rounded transition-colors"
              >
                <X size={14} className="mr-1" /> Cancel
              </button>
            )}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  required
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                  placeholder="Iftar Boxes"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={formData.amount}
                  onChange={e => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
               <div className="flex justify-between items-center mb-1">
                 <label className="block text-sm font-medium text-slate-700">Category</label>
                 {!isAddingCategory && (
                   <button 
                     type="button" 
                     onClick={() => setIsManagingCategories(true)}
                     className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
                   >
                     <Settings size={12} className="mr-1" /> Manage
                   </button>
                 )}
               </div>
               <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  {isAddingCategory ? (
                     <div className="flex space-x-2">
                       <input
                         type="text"
                         autoFocus
                         value={newCategoryName}
                         onChange={e => setNewCategoryName(e.target.value)}
                         placeholder="New Category Name"
                         className="w-full pl-10 pr-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                       />
                       <button 
                         type="button" 
                         onClick={() => setIsAddingCategory(false)}
                         className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
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
                      className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all bg-white appearance-none"
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
              <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full text-white font-medium py-2.5 rounded-lg shadow-sm transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed ${
                 editingId 
                  ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' 
                  : 'bg-red-500 hover:bg-red-600 shadow-red-200'
              }`}
            >
              {isSubmitting ? (editingId ? 'Updating...' : 'Adding...') : (editingId ? 'Update Expense' : 'Add Expense')}
            </button>
          </form>
        </div>
      )}

      {/* List Section */}
      <div className={`${!isReadOnly ? 'lg:col-span-2' : ''} bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col`}>
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h3 className="text-xl font-serif font-bold text-slate-800">Expense History</h3>
          {isReadOnly && (
            <span className="text-xs font-semibold text-slate-500 bg-slate-200 px-2 py-1 rounded flex items-center">
              <Lock size={12} className="mr-1" /> Read Only
            </span>
          )}
        </div>
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4 text-right">Amount</th>
                {!isReadOnly && <th className="px-6 py-4 text-center">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={isReadOnly ? 4 : 5} className="px-6 py-12 text-center text-slate-400 italic">
                    No expenses recorded yet.
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => (
                  <tr key={expense.id} className={`transition-colors ${editingId === expense.id ? 'bg-blue-50' : 'hover:bg-red-50/30'}`}>
                    <td className="px-6 py-4 font-medium text-slate-800">{expense.description}</td>
                    <td className="px-6 py-4 text-slate-600">{new Date(expense.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded-md">
                        {expense.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-red-500">-৳{expense.amount.toFixed(2)}</td>
                    {!isReadOnly && (
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => handleEditClick(expense)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"
                            title="Edit Entry"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => onDelete(expense.id)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                            title="Delete Entry"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};