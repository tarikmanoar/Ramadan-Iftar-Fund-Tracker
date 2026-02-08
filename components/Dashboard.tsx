import React from 'react';
import { DashboardSummary, Expense } from '../types';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Wallet, PiggyBank, Receipt, TrendingUp } from 'lucide-react';

interface DashboardProps {
  summary: DashboardSummary;
  expenses: Expense[];
}

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6'];

export const Dashboard: React.FC<DashboardProps> = ({ summary, expenses }) => {
  
  // Prepare data for Expense Category Pie Chart
  const expenseByCategory = expenses.reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.keys(expenseByCategory).map(key => ({
    name: key,
    value: expenseByCategory[key]
  }));

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Hero Balance Card - Glassmorphic */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 rounded-3xl shadow-2xl shadow-emerald-500/40 p-6 mb-4">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE4YzAtOS45NC04LjA2LTE4LTE4LTE4IDE5Ljk0IDAgMzYgMTYuMDYgMzYgMzYgMC05Ljk0LTguMDYtMTgtMTgtMTh6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-emerald-100 text-sm font-medium mb-1">Current Balance</p>
            <h2 className="text-4xl font-bold text-white mb-2">{formatCurrency(summary.currentBalance)}</h2>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
              <span className="text-emerald-100 text-xs">All transactions synced</span>
            </div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl border border-white/30 shadow-lg">
            <TrendingUp size={32} className="text-white" />
          </div>
        </div>
      </div>

      {/* Stats Grid - Glass Cards */}
      <div className="grid grid-cols-3 gap-3">
        {/* Pledged */}
        <div className="bg-white/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/60 p-4">
          <div className="flex flex-col items-center text-center">
            <div className="p-3 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-2xl shadow-lg shadow-emerald-500/30 mb-2">
              <PiggyBank size={20} className="text-white" />
            </div>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Pledged</p>
            <h3 className="text-lg font-bold text-slate-800 leading-tight">{formatCurrency(summary.totalPledged)}</h3>
          </div>
        </div>

        {/* Collected */}
        <div className="bg-white/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/60 p-4">
          <div className="flex flex-col items-center text-center">
            <div className="p-3 bg-gradient-to-br from-gold-400 to-gold-500 rounded-2xl shadow-lg shadow-gold-500/30 mb-2">
              <Wallet size={20} className="text-white" />
            </div>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Collected</p>
            <h3 className="text-lg font-bold text-slate-800 leading-tight">{formatCurrency(summary.totalCollected)}</h3>
          </div>
        </div>

        {/* Expenses */}
        <div className="bg-white/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/60 p-4">
          <div className="flex flex-col items-center text-center">
            <div className="p-3 bg-gradient-to-br from-red-400 to-red-500 rounded-2xl shadow-lg shadow-red-500/30 mb-2">
              <Receipt size={20} className="text-white" />
            </div>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Expenses</p>
            <h3 className="text-lg font-bold text-slate-800 leading-tight">{formatCurrency(summary.totalExpenses)}</h3>
          </div>
        </div>
      </div>

      {/* Charts Section - Mobile Optimized */}
      <div className="space-y-4">
        {/* Financial Overview Chart */}
        <div className="bg-white/60 backdrop-blur-xl rounded-3xl shadow-lg border border-white/60 p-5">
           <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center">
             <span className="w-1 h-5 bg-gradient-to-b from-emerald-500 to-emerald-600 rounded-full mr-2"></span>
             Financial Overview
           </h3>
           <div className="h-56">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: 'Pledged', amount: summary.totalPledged },
                    { name: 'Collected', amount: summary.totalCollected },
                    { name: 'Expenses', amount: summary.totalExpenses },
                  ]}
                  margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} tickFormatter={(value) => `$${value/1000}k`} />
                  <Tooltip 
                    cursor={{fill: '#f1f5f9', radius: 8}}
                    formatter={(value: number) => [`$${value}`, 'Amount']}
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: 'none', 
                      boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)',
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      backdropFilter: 'blur(12px)'
                    }}
                  />
                  <Bar dataKey="amount" radius={[12, 12, 0, 0]}>
                    {
                      [{ name: 'Pledged' }, { name: 'Collected' }, { name: 'Expenses' }].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 2 ? '#ef4444' : (index === 1 ? '#f59e0b' : '#10b981')} />
                      ))
                    }
                  </Bar>
                </BarChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* Expense Breakdown */}
        <div className="bg-white/60 backdrop-blur-xl rounded-3xl shadow-lg border border-white/60 p-5">
          <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center">
            <span className="w-1 h-5 bg-gradient-to-b from-red-500 to-red-600 rounded-full mr-2"></span>
            Expenses Breakdown
          </h3>
          {pieData.length > 0 ? (
            <div>
              <div className="h-56 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => `$${value}`}
                      contentStyle={{ 
                        borderRadius: '16px', 
                        border: 'none', 
                        boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)',
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        backdropFilter: 'blur(12px)'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {pieData.map((entry, index) => (
                  <div key={index} className="flex items-center bg-slate-50/50 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium">
                    <div className="w-3 h-3 rounded-full mr-2 shadow-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                    <span className="truncate flex-1">{entry.name}</span>
                    <span className="text-slate-900 font-bold ml-1">${entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-56 flex flex-col items-center justify-center text-slate-400">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                <Receipt size={28} className="text-slate-300" />
              </div>
              <p className="text-sm font-medium">No expenses yet</p>
              <p className="text-xs mt-1">Start adding expenses to see breakdown</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};