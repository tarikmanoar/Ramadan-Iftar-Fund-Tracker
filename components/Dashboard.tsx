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
    <div className="space-y-6">
      {/* Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Pledged */}
        <div className="bg-white rounded-xl shadow-sm border border-emerald-100 p-6 flex items-center space-x-4">
          <div className="p-3 bg-emerald-100 rounded-full text-emerald-600">
            <PiggyBank size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Pledged</p>
            <h3 className="text-2xl font-bold text-slate-800">{formatCurrency(summary.totalPledged)}</h3>
          </div>
        </div>

        {/* Collected */}
        <div className="bg-white rounded-xl shadow-sm border border-emerald-100 p-6 flex items-center space-x-4">
          <div className="p-3 bg-gold-500/10 rounded-full text-gold-600">
            <Wallet size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Collected</p>
            <h3 className="text-2xl font-bold text-slate-800">{formatCurrency(summary.totalCollected)}</h3>
          </div>
        </div>

        {/* Expenses */}
        <div className="bg-white rounded-xl shadow-sm border border-emerald-100 p-6 flex items-center space-x-4">
          <div className="p-3 bg-red-50 rounded-full text-red-500">
            <Receipt size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Expenses</p>
            <h3 className="text-2xl font-bold text-slate-800">{formatCurrency(summary.totalExpenses)}</h3>
          </div>
        </div>

        {/* Balance */}
        <div className="bg-emerald-600 rounded-xl shadow-lg shadow-emerald-200 p-6 flex items-center space-x-4 text-white">
          <div className="p-3 bg-white/20 rounded-full text-white">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-emerald-100">Current Balance</p>
            <h3 className="text-2xl font-bold">{formatCurrency(summary.currentBalance)}</h3>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 lg:col-span-2">
           <h3 className="text-lg font-semibold text-slate-800 mb-4 font-serif">Financial Overview</h3>
           <div className="h-64">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: 'Pledged', amount: summary.totalPledged },
                    { name: 'Collected', amount: summary.totalCollected },
                    { name: 'Expenses', amount: summary.totalExpenses },
                  ]}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `$${value}`} />
                  <Tooltip 
                    cursor={{fill: '#f1f5f9'}}
                    formatter={(value: number) => [`$${value}`, 'Amount']}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]}>
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

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 font-serif">Expenses Breakdown</h3>
          {pieData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `$${value}`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {pieData.map((entry, index) => (
                  <div key={index} className="flex items-center text-xs text-slate-600">
                    <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                    {entry.name}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm italic">
              No expenses recorded yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};