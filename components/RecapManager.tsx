
import React, { useState, useEffect } from 'react';
import { Download, Printer, Calendar, RefreshCw } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { Receipt, SPPD, AssignmentLetter, FundingSource, Employee, City, User } from '../types';

const RecapManager: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [sppds, setSppds] = useState<SPPD[]>([]);
  const [assignments, setAssignments] = useState<AssignmentLetter[]>([]);
  const [fundingSources, setFundingSources] = useState<FundingSource[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [filterPeriod, setFilterPeriod] = useState<string>(new Date().toISOString().substring(0, 7));
  const [filterFunding, setFilterFunding] = useState<string>('');

  const isAdmin = user?.role === 'Admin';

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

  const fetchData = async () => {
    setIsLoading(true);
    const client = getSupabase();
    if (client) {
        try {
            const { data: rec } = await client.from('receipts').select('*');
            if (rec) setReceipts(rec.map((r:any) => ({...r, totalAmount: Number(r.total_amount), sppdId: r.sppd_id})));
        } catch (e) {}
    } else {
        setReceipts(JSON.parse(localStorage.getItem('receipt_data_v2') || '[]'));
    }
    setIsLoading(false);
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) setUser(JSON.parse(savedUser));
    fetchData();
    setSppds(JSON.parse(localStorage.getItem('sppd_data') || '[]'));
    setAssignments(JSON.parse(localStorage.getItem('assignment_tasks_v2') || '[]'));
    setFundingSources(JSON.parse(localStorage.getItem('funding_sources') || '[]'));
    setEmployees(JSON.parse(localStorage.getItem('employees') || '[]'));
    setCities(JSON.parse(localStorage.getItem('cities') || '[]'));
  }, []);

  const filteredData = receipts.filter(r => {
     const sppd = sppds.find(s => s.id === r.sppdId);
     if (!sppd) return false;
     const rDate = r.date.substring(0, 7);
     const dateMatch = filterPeriod ? rDate === filterPeriod : true;
     const fundingMatch = filterFunding ? sppd.fundingId === filterFunding : true;
     return dateMatch && fundingMatch;
  });

  const totalCost = filteredData.reduce((acc, curr) => acc + (Number(curr.totalAmount) || 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center print:hidden">
        <div><h1 className="text-2xl font-bold text-slate-900">Rekap Data</h1><p className="text-slate-500">Monitoring seluruh aktivitas perjalanan dinas.</p></div>
        <div className="flex space-x-2">
          {isAdmin && (
            <>
              <button onClick={() => window.print()} className="flex items-center space-x-2 px-4 py-2 bg-white border text-slate-600 rounded-lg hover:bg-slate-50 font-medium">
                <Printer size={18} /><span>Cetak</span>
              </button>
              <button className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium shadow-md">
                <Download size={18} /><span>Excel</span>
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border shadow-sm print:shadow-none print:border-none print:p-0">
        <div className="flex flex-col md:flex-row gap-4 mb-8 print:hidden">
           <div className="flex-1">
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Periode</label>
              <div className="flex items-center space-x-2 px-4 py-2 bg-slate-50 rounded-lg border">
                 <Calendar size={18} className="text-slate-400" />
                 <input type="month" value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value)} className="bg-transparent text-sm w-full outline-none" />
              </div>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
           <div className="p-4 bg-indigo-50 rounded-xl border">
              <p className="text-xs font-bold text-indigo-400 uppercase">Total Transaksi</p>
              <p className="text-2xl font-black text-indigo-700">{filteredData.length}</p>
           </div>
           <div className="p-4 bg-emerald-50 rounded-xl border">
              <p className="text-xs font-bold text-emerald-400 uppercase">Total Biaya</p>
              <p className="text-2xl font-black text-emerald-700">Rp {totalCost.toLocaleString()}</p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default RecapManager;
