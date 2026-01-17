
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  ClipboardList, 
  MapPin, 
  TrendingUp, 
  Wallet,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Receipt, FundingSource, SPPD } from '../types';

const StatCard = ({ title, value, subValue, icon: Icon, color }: any) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-xl bg-opacity-10 ${color.bg} ${color.text}`}>
        <Icon size={24} />
      </div>
      <div className="flex items-center text-emerald-500 text-sm font-medium">
        <TrendingUp size={16} className="mr-1" />
        <span>Update</span>
      </div>
    </div>
    <div>
      <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">{title}</p>
      <h3 className="text-3xl font-bold text-slate-900 mt-1">{value}</h3>
      <p className="text-slate-400 text-xs mt-2">{subValue}</p>
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    employees: 0,
    sppds: 0,
    cities: 0,
    remainingBudget: 0,
    usedBudget: 0
  });

  const [pieData, setPieData] = useState<any[]>([]);

  useEffect(() => {
    // Load data from localStorage
    const emps = JSON.parse(localStorage.getItem('employees') || '[]');
    const sppds = JSON.parse(localStorage.getItem('sppd_data') || '[]');
    const cities = JSON.parse(localStorage.getItem('cities') || '[]');
    const funds: FundingSource[] = JSON.parse(localStorage.getItem('funding_sources') || '[]');
    const receipts: Receipt[] = JSON.parse(localStorage.getItem('receipt_data_v2') || '[]');

    // Calculate Financials
    // 1. Used Budget = Sum of all PAID receipts
    const used = receipts
      .filter(r => r.status === 'Paid')
      .reduce((acc, curr) => acc + curr.totalAmount, 0);

    // 2. Remaining Budget = Sum of current amounts in FundingSources (because ReceiptManager subtracts directly)
    const remaining = funds.reduce((acc, curr) => acc + curr.amount, 0);

    setStats({
      employees: emps.length,
      sppds: sppds.length,
      cities: cities.length,
      remainingBudget: remaining,
      usedBudget: used
    });

    // Calculate Pie Data (Expenses Breakdown)
    let transport = 0, hotel = 0, perdiem = 0, other = 0;
    receipts.filter(r => r.status === 'Paid').forEach(r => {
        if(r.transport?.visible) transport += r.transport.amount;
        if(r.fuel?.visible) transport += r.fuel.amount;
        if(r.toll?.visible) transport += r.toll.amount;
        
        if(r.accommodation?.visible) hotel += r.accommodation.amount;
        
        if(r.dailyAllowance?.visible) perdiem += r.dailyAllowance.total;
        
        if(r.representation?.visible) other += r.representation.amount;
        if(r.other?.visible) other += r.other.amount;
    });

    setPieData([
      { name: 'Transport & BBM', value: transport },
      { name: 'Penginapan', value: hotel },
      { name: 'Uang Harian', value: perdiem },
      { name: 'Lainnya', value: other },
    ]);

  }, []);

  // Format currency shorthand (e.g., 1.2M)
  const formatCurrencyShort = (value: number) => {
    if (value >= 1000000000) return `Rp ${(value / 1000000000).toFixed(1)}M`;
    if (value >= 1000000) return `Rp ${(value / 1000000).toFixed(1)}Jt`;
    return `Rp ${value.toLocaleString('id-ID')}`;
  };

  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e'];

  // Dummy Chart Data for Area (Visual Only)
  const chartData = [
    { name: 'Jan', budget: 40, actual: 24 },
    { name: 'Feb', budget: 30, actual: 13 },
    { name: 'Mar', budget: 20, actual: 98 },
    { name: 'Apr', budget: 27, actual: 39 },
    { name: 'May', budget: 18, actual: 48 },
    { name: 'Jun', budget: 23, actual: 38 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ringkasan Sistem</h1>
          <p className="text-slate-500">Selamat datang kembali, berikut perkembangan SPPD hari ini.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium shadow-lg shadow-indigo-200 hover:bg-indigo-700">Unduh Laporan</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Pegawai" 
          value={stats.employees.toString()} 
          subValue="Aktif dalam database"
          icon={Users} 
          color={{ bg: 'bg-indigo-500', text: 'text-indigo-600' }} 
        />
        <StatCard 
          title="Dokumen SPPD" 
          value={stats.sppds.toString()} 
          subValue="Total diterbitkan"
          icon={ClipboardList} 
          color={{ bg: 'bg-blue-500', text: 'text-blue-600' }} 
        />
        <StatCard 
          title="Anggaran Terpakai" 
          value={formatCurrencyShort(stats.usedBudget)} 
          subValue="Realisasi (Paid)"
          icon={Wallet} 
          color={{ bg: 'bg-amber-500', text: 'text-amber-600' }} 
        />
        <StatCard 
          title="Sisa Anggaran" 
          value={formatCurrencyShort(stats.remainingBudget)} 
          subValue="Saldo Tersedia"
          icon={Wallet} 
          color={{ bg: 'bg-emerald-500', text: 'text-emerald-600' }} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-slate-800 text-lg">Statistik Realisasi Anggaran</h3>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                <span className="text-xs text-slate-500">Target</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-indigo-200 rounded-full"></div>
                <span className="text-xs text-slate-500">Realisasi</span>
              </div>
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorBudget" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  cursor={{ stroke: '#6366f1', strokeWidth: 2 }}
                />
                <Area type="monotone" dataKey="budget" stroke="#6366f1" fillOpacity={1} fill="url(#colorBudget)" strokeWidth={3} />
                <Area type="monotone" dataKey="actual" stroke="#cbd5e1" fillOpacity={0} strokeWidth={2} strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-800 text-lg mb-8">Komposisi Biaya (Realized)</h3>
          <div className="h-[250px] relative">
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
                <Tooltip formatter={(value: number) => `Rp ${value.toLocaleString('id-ID')}`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
              <p className="text-2xl font-bold text-slate-800">100%</p>
              <p className="text-xs text-slate-400">Total Biaya</p>
            </div>
          </div>
          <div className="space-y-3 mt-6">
            {pieData.map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx] }}></div>
                  <span className="text-sm text-slate-600">{item.name}</span>
                </div>
                <span className="text-sm font-semibold text-slate-800">
                    {stats.usedBudget > 0 ? Math.round((item.value / stats.usedBudget) * 100) : 0}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
