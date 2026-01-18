
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  ClipboardList, 
  TrendingUp, 
  Wallet,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { createClient } from '@supabase/supabase-js';

const StatCard = ({ title, value, subValue, icon: Icon, color, isLoading }: any) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
    {isLoading && (
        <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center">
            <Loader2 className="animate-spin text-slate-300" />
        </div>
    )}
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-xl bg-opacity-10 ${color.bg} ${color.text}`}>
        <Icon size={24} />
      </div>
      <div className="flex items-center text-emerald-500 text-xs font-bold bg-emerald-50 px-2 py-1 rounded-full">
        <TrendingUp size={14} className="mr-1" />
        <span>Live</span>
      </div>
    </div>
    <div>
      <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{title}</p>
      <h3 className="text-2xl font-black text-slate-900 mt-1 truncate" title={value}>{value}</h3>
      <p className="text-slate-400 text-xs mt-2 font-medium">{subValue}</p>
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isDbConnected, setIsDbConnected] = useState(false);
  
  const [stats, setStats] = useState({
    employees: 0,
    sppds: 0,
    remainingBudget: 0,
    usedBudget: 0
  });

  const [pieData, setPieData] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  // Helper untuk mendapatkan client Supabase
  const getSupabase = () => {
    const env = (import.meta as any).env;
    if (env?.VITE_SUPABASE_URL && env?.VITE_SUPABASE_KEY) {
      return createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_KEY);
    }
    const saved = localStorage.getItem('supabase_config');
    if (saved) {
      try {
        const config = JSON.parse(saved);
        if (config.url && config.key) return createClient(config.url, config.key);
      } catch (e) {}
    }
    return null;
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    const client = getSupabase();
    
    // --- MODE ONLINE (SUPABASE) ---
    if (client) {
        setIsDbConnected(true);
        try {
            // 1. Hitung Pegawai
            const { count: empCount } = await client.from('employees').select('*', { count: 'exact', head: true });
            
            // 2. Hitung SPPD
            const { count: sppdCount } = await client.from('sppds').select('*', { count: 'exact', head: true });

            // 3. Hitung Total Pagu Anggaran (Total di Funding Sources)
            const { data: funds } = await client.from('funding_sources').select('amount');
            const totalFunding = funds ? funds.reduce((acc: number, curr: any) => acc + Number(curr.amount), 0) : 0;

            // 4. Hitung Realisasi & Data Grafik (Dari Receipts yang Status = 'Paid')
            const { data: receipts } = await client.from('receipts').select('*');
            
            let totalUsed = 0;
            let transportCost = 0;
            let hotelCost = 0;
            let perdiemCost = 0;
            let otherCost = 0;
            const monthlySpending: Record<string, number> = {};

            if (receipts) {
                receipts.forEach((r: any) => {
                    const amount = Number(r.total_amount) || 0;
                    
                    // FIXED: Hanya hitung realisasi jika status 'Paid' (Lunas)
                    if (r.status === 'Paid') {
                        totalUsed += amount;

                        // PIE CHART DATA AGGREGATION
                        const daily = typeof r.daily_allowance === 'string' ? JSON.parse(r.daily_allowance) : r.daily_allowance;
                        const trans = typeof r.transport === 'string' ? JSON.parse(r.transport) : r.transport;
                        const fuel = typeof r.fuel === 'string' ? JSON.parse(r.fuel) : r.fuel;
                        const toll = typeof r.toll === 'string' ? JSON.parse(r.toll) : r.toll;
                        const acc = typeof r.accommodation === 'string' ? JSON.parse(r.accommodation) : r.accommodation;
                        const rep = typeof r.representation === 'string' ? JSON.parse(r.representation) : r.representation;
                        const other = typeof r.other === 'string' ? JSON.parse(r.other) : r.other;

                        if (daily?.visible) perdiemCost += Number(daily.total || 0);
                        if (trans?.visible) transportCost += Number(trans.amount || 0);
                        if (fuel?.visible) transportCost += Number(fuel.amount || 0);
                        if (toll?.visible) transportCost += Number(toll.amount || 0);
                        if (acc?.visible) hotelCost += Number(acc.amount || 0);
                        if (rep?.visible) otherCost += Number(rep.amount || 0);
                        if (other?.visible) otherCost += Number(other.amount || 0);

                        // AREA CHART DATA AGGREGATION (Monthly)
                        if (r.date) {
                            const date = new Date(r.date);
                            const monthKey = date.toLocaleDateString('id-ID', { month: 'short' }); // e.g., "Mei"
                            monthlySpending[monthKey] = (monthlySpending[monthKey] || 0) + amount;
                        }
                    }
                });
            }

            setStats({
                employees: empCount || 0,
                sppds: sppdCount || 0,
                remainingBudget: totalFunding - totalUsed, // FIXED: Total Pagu - Realisasi
                usedBudget: totalUsed
            });

            // Set Chart Data
            setPieData([
                { name: 'Transport & BBM', value: transportCost },
                { name: 'Penginapan', value: hotelCost },
                { name: 'Uang Harian', value: perdiemCost },
                { name: 'Lainnya', value: otherCost },
            ]);

            // Convert Monthly Spending Object to Array
            const monthsOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
            const areaData = monthsOrder.map(m => ({
                name: m,
                realisasi: monthlySpending[m] || 0
            }));
            setChartData(areaData);

        } catch (error) {
            console.error("Dashboard Fetch Error:", error);
        }
    } 
    // --- MODE OFFLINE (LOCALSTORAGE) ---
    else {
        setIsDbConnected(false);
        const emps = JSON.parse(localStorage.getItem('employees') || '[]');
        const sppds = JSON.parse(localStorage.getItem('sppd_data') || '[]');
        const funds = JSON.parse(localStorage.getItem('funding_sources') || '[]');
        const receipts = JSON.parse(localStorage.getItem('receipt_data_v2') || '[]'); // Use v2

        // Hitung Used Budget hanya dari status 'Paid'
        const used = receipts
            .filter((r: any) => r.status === 'Paid')
            .reduce((acc: number, curr: any) => acc + (Number(curr.totalAmount) || 0), 0);

        const totalFunding = funds.reduce((acc: number, curr: any) => acc + (Number(curr.amount) || 0), 0);

        setStats({
            employees: emps.length,
            sppds: sppds.length,
            remainingBudget: totalFunding - used, // FIXED
            usedBudget: used
        });

        // Simple breakdown for offline (Only Paid)
        let transport = 0, hotel = 0, perdiem = 0, other = 0;
        const monthlySpending: Record<string, number> = {};

        receipts.forEach((r: any) => {
             if (r.status === 'Paid') {
                 const amt = Number(r.totalAmount) || 0;
                 if(r.transport?.visible) transport += r.transport.amount;
                 if(r.fuel?.visible) transport += r.fuel.amount;
                 if(r.accommodation?.visible) hotel += r.accommodation.amount;
                 if(r.dailyAllowance?.visible) perdiem += r.dailyAllowance.total;
                 if(r.representation?.visible) other += r.representation.amount;
                 
                 if (r.date) {
                    const date = new Date(r.date);
                    const monthKey = date.toLocaleDateString('id-ID', { month: 'short' });
                    monthlySpending[monthKey] = (monthlySpending[monthKey] || 0) + amt;
                 }
             }
        });

        setPieData([
            { name: 'Transport', value: transport },
            { name: 'Hotel', value: hotel },
            { name: 'UH', value: perdiem },
            { name: 'Lain', value: other },
        ]);

        const monthsOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
        setChartData(monthsOrder.map(m => ({
            name: m,
            realisasi: monthlySpending[m] || 0
        })));
    }
    
    setIsLoading(false);
  };

  // Format currency shorthand (e.g., 1.2M)
  const formatCurrencyShort = (value: number) => {
    if (value >= 1000000000) return `Rp ${(value / 1000000000).toFixed(1)} Milyar`;
    if (value >= 1000000) return `Rp ${(value / 1000000).toFixed(1)} Juta`;
    return `Rp ${value.toLocaleString('id-ID')}`;
  };

  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e'];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard Eksekutif</h1>
          <p className="text-slate-500 flex items-center mt-1">
             Status Data: 
             <span className={`ml-2 px-2 py-0.5 rounded text-xs font-bold ${isDbConnected ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
                {isDbConnected ? 'CLOUD DATABASE (SUPABASE)' : 'PENYIMPANAN LOKAL (OFFLINE)'}
             </span>
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={fetchDashboardData}
            className="p-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors shadow-sm" 
            title="Refresh Data"
          >
            <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
          </button>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all">
            Unduh Laporan
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          isLoading={isLoading}
          title="Total Pegawai" 
          value={stats.employees.toString()} 
          subValue="Aktif dalam database"
          icon={Users} 
          color={{ bg: 'bg-indigo-500', text: 'text-indigo-600' }} 
        />
        <StatCard 
          isLoading={isLoading}
          title="Dokumen SPPD" 
          value={stats.sppds.toString()} 
          subValue="Total diterbitkan"
          icon={ClipboardList} 
          color={{ bg: 'bg-blue-500', text: 'text-blue-600' }} 
        />
        <StatCard 
          isLoading={isLoading}
          title="Realisasi Anggaran" 
          value={formatCurrencyShort(stats.usedBudget)} 
          subValue="Total Terbayar (Lunas)"
          icon={Wallet} 
          color={{ bg: 'bg-amber-500', text: 'text-amber-600' }} 
        />
        <StatCard 
          isLoading={isLoading}
          title="Sisa Anggaran" 
          value={formatCurrencyShort(stats.remainingBudget)} 
          subValue="Saldo Tersedia"
          icon={Wallet} 
          color={{ bg: 'bg-emerald-500', text: 'text-emerald-600' }} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* CHART 1: Realisasi Bulanan */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative">
          {isLoading && <div className="absolute inset-0 bg-white/50 z-10" />}
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800 text-lg">Tren Realisasi Anggaran</h3>
            <div className="flex items-center space-x-2 text-xs font-medium text-slate-500">
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                <span>Pengeluaran per Bulan (Lunas)</span>
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRealisasi" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 11}} 
                    tickFormatter={(val) => {
                        if(val >= 1000000) return `${(val/1000000).toFixed(0)}Jt`;
                        return val;
                    }}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  formatter={(value: number) => [`Rp ${value.toLocaleString('id-ID')}`, 'Realisasi']}
                />
                <Area 
                    type="monotone" 
                    dataKey="realisasi" 
                    stroke="#6366f1" 
                    fillOpacity={1} 
                    fill="url(#colorRealisasi)" 
                    strokeWidth={3} 
                    activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: Komposisi Biaya */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative">
          {isLoading && <div className="absolute inset-0 bg-white/50 z-10" />}
          <h3 className="font-bold text-slate-800 text-lg mb-4">Komposisi Biaya</h3>
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
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Text */}
            <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
              <p className="text-xs text-slate-400 font-bold uppercase">Total</p>
              <p className="text-sm font-bold text-slate-800">
                  {stats.usedBudget >= 1000000000 
                    ? (stats.usedBudget / 1000000000).toFixed(1) + 'M' 
                    : (stats.usedBudget / 1000000).toFixed(1) + 'Jt'}
              </p>
            </div>
          </div>
          
          <div className="mt-4 space-y-3">
             {pieData.map((item, idx) => (
                 <div key={idx} className="flex justify-between items-center text-sm border-b border-slate-50 last:border-0 pb-2 last:pb-0">
                     <div className="flex items-center">
                         <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                         <span className="text-slate-600">{item.name}</span>
                     </div>
                     <span className="font-semibold text-slate-900">
                         {stats.usedBudget > 0 ? ((item.value / stats.usedBudget) * 100).toFixed(1) : 0}%
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
