import React, { useState } from 'react';
import { Donation } from '../types';
import { Plus, Trash2, Calendar, DollarSign, User as UserIcon, Edit2, X, Banknote, CheckCircle2, Lock } from 'lucide-react';

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
    if (window.innerWidth < 1024) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleCancelEdit = () => {
    resetForm();
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
    <div className={`grid grid-cols-1 ${!isReadOnly ? 'lg:grid-cols-3' : 'lg:grid-cols-1'} gap-6 relative`}>
      {/* Pay Due Modal */}
      {payModalOpen && selectedDonation && !isReadOnly && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm border-t-4 border-emerald-500 transform transition-all scale-100">
             <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-slate-800 flex items-center">
                  <div className="bg-emerald-100 p-2 rounded-full mr-2 text-emerald-600">
                    <Banknote size={20} />
                  </div>
                  Record Payment
                </h3>
                <button onClick={closePayModal} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
             </div>
             
             <div className="bg-slate-50 rounded-lg p-3 mb-4 space-y-2 border border-slate-100">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Donor:</span>
                  <span className="font-semibold text-slate-700">{selectedDonation.donorName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Total Pledged:</span>
                  <span className="text-slate-700">৳{selectedDonation.pledgedAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Already Paid:</span>
                  <span className="text-emerald-600 font-medium">৳{selectedDonation.paidAmount.toFixed(2)}</span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-700">Remaining Due:</span>
                  <span className="text-red-600 font-bold">৳{selectedDue.toFixed(2)}</span>
                </div>
             </div>

             <form onSubmit={handlePaySubmit}>
               <div className="relative mb-2">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="number"
                    min="0"
                    max={selectedDue}
                    step="0.01"
                    required
                    autoFocus
                    value={payAmount}
                    onChange={e => setPayAmount(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 text-lg font-semibold border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    placeholder="Enter amount"
                  />
               </div>
               
               <div className="flex justify-end mb-4">
                 <button 
                   type="button"
                   onClick={() => setPayAmount(selectedDue.toString())}
                   className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center"
                 >
                   <CheckCircle2 size={12} className="mr-1" /> Pay Full Due (৳{selectedDue.toFixed(2)})
                 </button>
               </div>

               <div className="flex space-x-3">
                 <button
                   type="button"
                   onClick={closePayModal}
                   className="flex-1 py-2.5 bg-slate-100 text-slate-600 font-medium rounded-lg hover:bg-slate-200 transition-colors"
                 >
                   Cancel
                 </button>
                 <button
                   type="submit"
                   className="flex-1 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 shadow-md shadow-emerald-200 transition-colors"
                 >
                   Confirm Payment
                 </button>
               </div>
             </form>
          </div>
        </div>
      )}

      {/* Form Section - Hidden if Read Only */}
      {!isReadOnly && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 h-fit relative">
          <h3 className="text-xl font-serif font-bold text-slate-800 mb-6 flex items-center justify-between">
            <div className="flex items-center">
              <span className={`w-8 h-8 rounded-full ${editingId ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'} flex items-center justify-center mr-3`}>
                {editingId ? <Edit2 size={18} /> : <Plus size={18} />}
              </span>
              {editingId ? 'Edit Donation' : 'New Donation'}
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
              <label className="block text-sm font-medium text-slate-700 mb-1">Donor Name</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  required
                  value={formData.donorName}
                  onChange={e => setFormData({ ...formData, donorName: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                  placeholder="Brother Ali"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Pledged</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={formData.pledgedAmount}
                    onChange={e => setFormData({ ...formData, pledgedAmount: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Paid</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={formData.paidAmount}
                    onChange={e => setFormData({ ...formData, paidAmount: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                    placeholder="0.00"
                  />
                </div>
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
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full text-white font-medium py-2.5 rounded-lg shadow-sm transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed ${
                editingId 
                  ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' 
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
              }`}
            >
              {isSubmitting ? (editingId ? 'Updating...' : 'Adding...') : (editingId ? 'Update Donation' : 'Add Donation')}
            </button>
          </form>
        </div>
      )}

      {/* List Section */}
      <div className={`${!isReadOnly ? 'lg:col-span-2' : ''} bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col`}>
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h3 className="text-xl font-serif font-bold text-slate-800">Recent Donations</h3>
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
                <th className="px-6 py-4">Donor</th>
                <th className="px-6 py-4 text-right">Pledged</th>
                <th className="px-6 py-4 text-right">Paid</th>
                <th className="px-6 py-4 text-right">Due</th>
                {!isReadOnly && <th className="px-6 py-4 text-center">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {donations.length === 0 ? (
                <tr>
                  <td colSpan={isReadOnly ? 4 : 5} className="px-6 py-12 text-center text-slate-400 italic">
                    No donations recorded yet.
                  </td>
                </tr>
              ) : (
                donations.map((donation) => {
                  const due = donation.pledgedAmount - donation.paidAmount;
                  return (
                    <tr key={donation.id} className={`transition-colors ${editingId === donation.id ? 'bg-blue-50' : 'hover:bg-emerald-50/30'}`}>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-800">{donation.donorName}</div>
                        <div className="text-xs text-slate-500">{new Date(donation.date).toLocaleDateString()}</div>
                      </td>
                      <td className="px-6 py-4 text-right text-slate-600">৳{donation.pledgedAmount.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right font-medium text-emerald-600">৳{donation.paidAmount.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right">
                         {due > 0.01 ? (
                           <span className="bg-red-100 text-red-600 py-1 px-2 rounded text-xs font-bold">
                             ৳{due.toFixed(2)}
                           </span>
                         ) : (
                           <span className="text-slate-400 text-xs flex items-center justify-end">
                             <CheckCircle2 size={14} className="mr-1 text-emerald-500" /> Paid
                           </span>
                         )}
                      </td>
                      {!isReadOnly && (
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            {due > 0.01 && (
                               <button
                                 onClick={() => openPayModal(donation.id)}
                                 className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-full transition-all"
                                 title="Pay Due"
                               >
                                 <Banknote size={16} />
                               </button>
                            )}
                            <button
                              onClick={() => handleEditClick(donation)}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"
                              title="Edit Entry"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => onDelete(donation.id)}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                              title="Delete Entry"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};