import React, { useState } from 'react';
import { Donation } from '../types';
import { Plus, Trash2, Calendar, User as UserIcon, Edit2, X, Banknote, CheckCircle2, Lock, AlertCircle } from 'lucide-react';
import { BottomSheet } from './BottomSheet';

interface DonationSectionProps {
  donations: Donation[];
  onAdd: (donation: Omit<Donation, 'id' | 'userId'>) => Promise<void>;
  onUpdate: (donation: Donation) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  selectedYear: number;
  isReadOnly?: boolean;
}

export const DonationSection: React.FC<DonationSectionProps> = ({ donations, onAdd, onUpdate, onDelete, selectedYear, isReadOnly = false }) => {
  const [formData, setFormData] = useState({
    donorName: '',
    pledgedAmount: '',
    paidAmount: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Pay Due Modal State
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payDonationId, setPayDonationId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState('');

  const resetForm = () => {
    setFormData({
      donorName: '',
      pledgedAmount: '',
      paidAmount: '',
      date: new Date().toISOString().split('T')[0]
    });
    setEditingId(null);
    setIsFormOpen(false);
  };

  const handleEditClick = (donation: Donation) => {
    if (isReadOnly) return;
    setFormData({
      donorName: donation.donorName,
      pledgedAmount: donation.pledgedAmount.toString(),
      paidAmount: donation.paidAmount.toString(),
      date: donation.date
    });
    setEditingId(donation.id);
    setIsFormOpen(true);
  };

  const handleOpenForm = () => {
    if (isReadOnly) return;
    resetForm();
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    setIsSubmitting(true);

    if (editingId) {
      const originalDonation = donations.find(d => d.id === editingId);
      if (originalDonation) {
        await onUpdate({
          ...originalDonation,
          donorName: formData.donorName,
          pledgedAmount: parseFloat(formData.pledgedAmount) || 0,
          paidAmount: parseFloat(formData.paidAmount) || 0,
          date: formData.date,
          year: selectedYear
        });
      }
    } else {
      await onAdd({
        donorName: formData.donorName,
        pledgedAmount: parseFloat(formData.pledgedAmount) || 0,
        paidAmount: parseFloat(formData.paidAmount) || 0,
        date: formData.date,
        year: selectedYear
      });
    }

    resetForm();
    setIsSubmitting(false);
  };

  // Logic for Pay Due Modal
  const openPayModal = (donationId: string) => {
    if (isReadOnly) return;
    setPayDonationId(donationId);
    setPayAmount('');
    setPayModalOpen(true);
  };

  const closePayModal = () => {
    setPayModalOpen(false);
    setPayDonationId(null);
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly || !payDonationId) return;

    const donation = donations.find(d => d.id === payDonationId);
    if (!donation) return;

    const amountToAdd = parseFloat(payAmount) || 0;
    if (amountToAdd <= 0) return;

    await onUpdate({
      ...donation,
      paidAmount: donation.paidAmount + amountToAdd
    });

    closePayModal();
  };

  // Helper to get selected donation for modal
  const selectedDonation = donations.find(d => d.id === payDonationId);
  const selectedDue = selectedDonation ? selectedDonation.pledgedAmount - selectedDonation.paidAmount : 0;

  return (
    <div className="space-y-3 relative pb-6">
      {/* Pay Due Modal */}
      {payModalOpen && selectedDonation && !isReadOnly && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm border-t-4 border-emerald-500 transform transition-all scale-100">
             <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-slate-800 flex items-center">
                  <Banknote className="mr-2 text-emerald-600" size={22} />
                  Record Payment
                </h3>
                <button onClick={closePayModal} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={20} />
                </button>
             </div>
             
             <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-2xl p-4 mb-4 space-y-2 border border-emerald-200">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Donor:</span>
                  <span className="font-bold text-slate-800">{selectedDonation.donorName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Total Pledged:</span>
                  <span className="font-semibold text-slate-800">৳{selectedDonation.pledgedAmount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Already Paid:</span>
                  <span className="font-semibold text-emerald-600">৳{selectedDonation.paidAmount}</span>
                </div>
                <div className="border-t border-emerald-300 pt-2 mt-2 flex justify-between items-center">
                  <span className="text-slate-700 font-medium">Amount Due:</span>
                  <span className="text-xl font-bold text-red-600">৳{selectedDue.toFixed(2)}</span>
                </div>
             </div>

             <form onSubmit={handlePaySubmit}>
               <div className="relative mb-2">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 font-bold text-lg">৳</span>
                  <input
                    type="number"
                    min="0"
                    max={selectedDue}
                    step="0.01"
                    required
                    autoFocus
                    value={payAmount}
                    onChange={e => setPayAmount(e.target.value)}
                    className="w-full pl-11 pr-4 py-4 text-lg font-semibold border-2 border-slate-300 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    placeholder="Enter amount"
                  />
               </div>
               
               <div className="flex justify-end mb-4 space-x-2">
                 <button
                   type="button"
                   onClick={() => setPayAmount(selectedDue.toFixed(2))}
                   className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full font-medium hover:bg-emerald-200 transition-colors"
                 >
                   Full Amount
                 </button>
                 <button
                   type="button"
                   onClick={() => setPayAmount((selectedDue / 2).toFixed(2))}
                   className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-full font-medium hover:bg-slate-200 transition-colors"
                 >
                   Half
                 </button>
               </div>

               <div className="flex space-x-3">
                 <button
                   type="button"
                   onClick={closePayModal}
                   className="flex-1 py-3 bg-slate-100 text-slate-700 font-medium rounded-2xl hover:bg-slate-200 transition-colors active:scale-95"
                 >
                   Cancel
                 </button>
                 <button
                   type="submit"
                   className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium rounded-2xl hover:shadow-lg hover:shadow-emerald-500/40 transition-all active:scale-95"
                 >
                   Confirm Payment
                 </button>
               </div>
             </form>
          </div>
        </div>
      )}

      {/* Form Bottom Sheet */}
      <BottomSheet
        isOpen={isFormOpen}
        onClose={resetForm}
        title={editingId ? 'Edit Donation' : 'New Donation'}
      >
        <form onSubmit={handleSubmit} className="space-y-4 pb-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Donor Name</label>
            <div className="relative">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                required
                value={formData.donorName}
                onChange={e => setFormData({ ...formData, donorName: e.target.value })}
                className="w-full pl-12 pr-4 py-4 border-2 border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-base"
                placeholder="Brother Ali"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Pledged Amount</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 font-bold">৳</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={formData.pledgedAmount}
                  onChange={e => setFormData({ ...formData, pledgedAmount: e.target.value })}
                  className="w-full pl-10 pr-4 py-4 border-2 border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-base"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Paid Amount</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 font-bold">৳</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={formData.paidAmount}
                  onChange={e => setFormData({ ...formData, paidAmount: e.target.value })}
                  className="w-full pl-10 pr-4 py-4 border-2 border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-base"
                  placeholder="0.00"
                />
              </div>
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
                className="w-full pl-12 pr-4 py-4 border-2 border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-base [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full text-white font-bold py-4 rounded-2xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed ${
              editingId 
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:shadow-blue-500/40' 
                : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:shadow-emerald-500/40'
            }`}
          >
            {isSubmitting ? (editingId ? 'Updating...' : 'Adding...') : (editingId ? 'Update Donation' : 'Add Donation')}
          </button>
        </form>
      </BottomSheet>

      {/* Donation Cards - Mobile Native */}
      {donations.length === 0 ? (
        <div className="bg-white/60 backdrop-blur-xl rounded-3xl shadow-lg border border-white/60 p-12 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={36} className="text-emerald-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">No donations yet</h3>
          <p className="text-sm text-slate-500 mb-6">Start tracking donations by adding your first entry</p>
          {!isReadOnly && (
            <button
              onClick={handleOpenForm}
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-6 py-3 rounded-2xl font-semibold shadow-lg shadow-emerald-500/40 hover:shadow-xl transition-all active:scale-95"
            >
              Add First Donation
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {donations.map((donation) => {
            const due = donation.pledgedAmount - donation.paidAmount;
            const paidPercentage = (donation.paidAmount / donation.pledgedAmount) * 100;
            
            return (
              <div
                key={donation.id}
                className="bg-white/60 backdrop-blur-xl rounded-3xl shadow-lg border border-white/60 p-5 hover:shadow-xl transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-800 mb-1">{donation.donorName}</h3>
                    <p className="text-xs text-slate-500 flex items-center">
                      <Calendar size={12} className="mr-1" />
                      {new Date(donation.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>

                  {!isReadOnly && (
                    <div className="flex space-x-1">
                      {due > 0.01 && (
                        <button
                          onClick={() => openPayModal(donation.id)}
                          className="p-2.5 bg-emerald-100 text-emerald-600 hover:bg-emerald-200 rounded-2xl transition-all active:scale-95"
                          title="Pay Due"
                        >
                          <Banknote size={18} />
                        </button>
                      )}
                      <button
                        onClick={() => handleEditClick(donation)}
                        className="p-2.5 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded-2xl transition-all active:scale-95"
                        title="Edit"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => onDelete(donation.id)}
                        className="p-2.5 bg-red-100 text-red-600 hover:bg-red-200 rounded-2xl transition-all active:scale-95"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-slate-600 mb-1.5">
                    <span>Payment Progress</span>
                    <span className="font-bold">{paidPercentage.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(paidPercentage, 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Amounts Grid */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-50 rounded-2xl p-3 text-center">
                    <p className="text-xs text-slate-500 mb-1">Pledged</p>
                    <p className="text-sm font-bold text-slate-800">৳{donation.pledgedAmount}</p>
                  </div>
                  <div className="bg-emerald-50 rounded-2xl p-3 text-center">
                    <p className="text-xs text-emerald-600 mb-1">Paid</p>
                    <p className="text-sm font-bold text-emerald-700">৳{donation.paidAmount}</p>
                  </div>
                  <div className={`rounded-2xl p-3 text-center ${due > 0.01 ? 'bg-red-50' : 'bg-green-50'}`}>
                    <p className={`text-xs mb-1 ${due > 0.01 ? 'text-red-600' : 'text-green-600'}`}>
                      {due > 0.01 ? 'Due' : 'Paid'}
                    </p>
                    <p className={`text-sm font-bold ${due > 0.01 ? 'text-red-700' : 'text-green-700'}`}>
                      {due > 0.01 ? `৳${due.toFixed(2)}` : <CheckCircle2 size={16} className="inline" />}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Action Button */}
      {!isReadOnly && donations.length > 0 && (
        <button
          onClick={handleOpenForm}
          className="fixed bottom-28 right-6 z-40 w-16 h-16 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-full shadow-2xl shadow-emerald-500/50 flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
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
