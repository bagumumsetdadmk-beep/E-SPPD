
import React, { useState, useEffect } from 'react';
import { Download, Printer, Filter, Calendar, BarChart2, RefreshCw } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { Receipt, SPPD, AssignmentLetter, FundingSource, Employee, City } from '../types';

const RecapManager: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  
  // Data State
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [sppds, setSppds] = useState<SPPD[]>([]);
  const [assignments, setAssignments] = useState<AssignmentLetter[]>([]);
  const [fundingSources, setFundingSources] = useState<FundingSource[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [cities, setCities] = useState<City[]>([]);

  // Filter State
  const [filterPeriod, setFilterPeriod] = useState<string>(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [filterFunding, setFilterFunding] = useState<string>('');

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
    
    // FETCH MASTERS & TRANSACTIONS
    if (client) {
        try {
            const { data: rec } = await client.from('receipts').select('*');
            const { data: spd } = await client.from('sppds').select('*');
            const { data: asg } = await client.from('assignment_letters').select('*');
            const { data: fund } = await client.from('funding_sources').select('*');
            const { data: emp } = await client.from('employees').select('*');
            const { data: city } = await client.from('cities').select('*');

            if (rec) setReceipts(rec.map((r:any) => ({...r, totalAmount: Number(r.total_amount), sppdId: r.sppd_id})));
            if (spd) setSppds(spd.map((s:any) => ({...s, assignmentId: s.assignment_id, fundingId: s.funding_id})));
            if (asg) setAssignments(asg.map((a:any) => ({...a, employeeIds: a.employee_ids, destinationId: a.destination_id})));
            if (fund) setFundingSources(fund);
            if (emp) setEmployees(emp);
            if (city) setCities(city);
        } catch (e) {
            console.error("Error fetching recap data", e);
        }
    } else {
        // Fallback Local Storage
        try {
            setReceipts(JSON.parse(localStorage.getItem('receipt_data_v2') || '[]'));
            setSppds(JSON.parse(localStorage.getItem('sppd_data') || '[]'));
            setAssignments(JSON.parse(localStorage.getItem('assignment_tasks_v2') || '[]'));
            setFundingSources(JSON.parse(localStorage.getItem('funding_sources') || '[]'));
            setEmployees(JSON.parse(localStorage.getItem('employees') || '[]'));
            setCities(JSON.parse(localStorage.getItem('cities') || '[]'));
        } catch(e) {}
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- FILTER LOGIC ---
  const filteredData = receipts.filter(r => {
     const sppd = sppds.find(s => s.id === r.sppdId);
     if (!sppd) return false;

     // 1. Filter Period (YYYY-MM)
     const rDate = r.date.substring(0, 7); // 2024-05
     const dateMatch = filterPeriod ? rDate === filterPeriod : true;

     // 2. Filter Funding
     const fundingMatch = filterFunding ? sppd.fundingId === filterFunding : true;

     return dateMatch && fundingMatch;
  });

  // --- CALCULATE STATS ---
  const totalCost = filteredData.reduce((acc, curr) => acc + (Number(curr.totalAmount) || 0), 0);
  const totalTrip = filteredData.length;
  // Avg Cost
  const avgCost = totalTrip > 0 ? totalCost / totalTrip : 0;

  // --- EXPORT EXCEL ---
  const handleExportExcel = () => {
    const tableRows = filteredData.map(r => {
        const sppd = sppds.find(s => s.id === r.sppdId);
        const task = assignments.find(a => a.id === sppd?.assignmentId);
        const emp = employees.find(e => e.id === task?.employeeIds[0]);
        const dest = cities.find(c => c.id === task?.destinationId);
        const funding = fundingSources.find(f => f.id === sppd?.fundingId);
        
        return `
            <tr>
                <td>${r.date}</td>
                <td>${r.id}</td>
                <td>${emp?.name || '-'}</td>
                <td>${task?.subject || '-'}</td>
                <td>${dest?.name || '-'}</td>
                <td>${funding?.code || '-'}</td>
                <td style="text-align:right;">${Number(r.totalAmount || 0)}</td>
                <td>${r.status}</td>
            </tr>
        `;
    }).join('');

    const tableContent = `
        <table border="1">
            <thead>
                <tr>
                    <th style="background-color: #e2e8f0;">Tanggal</th>
                    <th style="background-color: #e2e8f0;">No. Kwitansi</th>
                    <th style="background-color: #e2e8f0;">Pegawai</th>
                    <th style="background-color: #e2e8f0;">Keperluan</th>
                    <th style="background-color: #e2e8f0;">Tujuan</th>
                    <th style="background-color: #e2e8f0;">Sumber Dana</th>
                    <th style="background-color: #e2e8f0;">Total Biaya (Rp)</th>
                    <th style="background-color: #e2e8f0;">Status</th>
                </tr>
            </thead>
            <tbody>
                ${tableRows}
                <tr>
                    <td colspan="6" style="text-align:right; font-weight:bold;">TOTAL</td>
                    <td style="text-align:right; font-weight:bold;">${totalCost}</td>
                    <td></td>
                </tr>
            </tbody>
        </table>
    `;

    const excelFile = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>Rekapitulasi SPPD</x:Name>
                  <x:WorksheetOptions>
                    <x:DisplayGridlines/>
                  </x:WorksheetOptions>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
          <![endif]-->
          <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
        </head>
        <body>
          <h3>REKAPITULASI BIAYA PERJALANAN DINAS</h3>
          <p>Periode: ${filterPeriod || 'Semua'}</p>
          ${tableContent}
        </body>
        </html>
      `;
      
      const blob = new Blob([excelFile], { type: 'application/vnd.ms-excel' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Rekap_SPPD_${filterPeriod}.xls`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handlePrint = () => {
      window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Rekap Data & Monitoring</h1>
          <p className="text-slate-500">Laporan komprehensif seluruh aktivitas perjalanan dinas.</p>
        </div>
        <div className="flex space-x-2">
          <button onClick={fetchData} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
                 <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
          </button>
          <button onClick={handlePrint} className="flex items-center space-x-2 px-4 py-2 bg-white border text-slate-600 rounded-lg hover:bg-slate-50 font-medium">
            <Printer size={18} />
            <span>Cetak Rekap</span>
          </button>
          <button onClick={handleExportExcel} className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium shadow-md">
            <Download size={18} />
            <span>Unduh Excel</span>
          </button>
        </div>
      </div>

      <div id="recap-print-area" className="bg-white p-6 rounded-2xl border shadow-sm print:shadow-none print:border-none print:p-0">
        <div className="flex flex-col md:flex-row gap-4 mb-8 print:hidden">
           <div className="flex-1">
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Periode (Bulan/Tahun)</label>
              <div className="flex items-center space-x-2 px-4 py-2 bg-slate-50 rounded-lg border">
                 <Calendar size={18} className="text-slate-400" />
                 <input 
                    type="month" 
                    value={filterPeriod} 
                    onChange={(e) => setFilterPeriod(e.target.value)} 
                    className="bg-transparent text-sm font-medium outline-none w-full text-slate-700"
                 />
              </div>
           </div>
           <div className="flex-1">
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Sumber Anggaran</label>
              <select 
                value={filterFunding} 
                onChange={(e) => setFilterFunding(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 rounded-lg border text-sm outline-none appearance-none cursor-pointer"
              >
                 <option value="">-- Semua Anggaran --</option>
                 {fundingSources.map(f => (
                     <option key={f.id} value={f.id}>{f.code} - {f.name}</option>
                 ))}
              </select>
           </div>
        </div>

        {/* PRINT HEADER */}
        <div className="hidden print:block mb-6 text-center">
            <h2 className="font-bold text-xl uppercase">REKAPITULASI PERJALANAN DINAS</h2>
            <p>Periode: {filterPeriod || 'Semua'} | Sumber Dana: {filterFunding ? fundingSources.find(f => f.id === filterFunding)?.name : 'Semua'}</p>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 print:grid-cols-3 print:gap-4">
           <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 print:border-gray-300">
              <p className="text-xs font-bold text-indigo-400 uppercase print:text-black">Total Transaksi</p>
              <p className="text-2xl font-black text-indigo-700 print:text-black">{totalTrip}</p>
           </div>
           <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 print:border-gray-300">
              <p className="text-xs font-bold text-emerald-400 uppercase print:text-black">Total Biaya (Realisasi)</p>
              <p className="text-2xl font-black text-emerald-700 print:text-black">
                  {totalCost >= 1000000000 
                    ? `Rp ${(totalCost/1000000000).toFixed(2)} M` 
                    : `Rp ${(totalCost/1000000).toFixed(1)} Jt`}
              </p>
           </div>
           <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 print:border-gray-300">
              <p className="text-xs font-bold text-amber-400 uppercase print:text-black">Rata-rata / Kegiatan</p>
              <p className="text-2xl font-black text-amber-700 print:text-black">
                  {avgCost >= 1000000 ? `Rp ${(avgCost/1000000).toFixed(1)} Jt` : `Rp ${(avgCost/1000).toFixed(0)} Rb`}
              </p>
           </div>
        </div>

        {/* TABLE */}
        <div className="rounded-xl border overflow-hidden print:border-black">
           <div className="bg-slate-50 p-4 font-bold text-slate-600 text-sm border-b print:bg-white print:border-black">Detail Transaksi</div>
           <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[10px] text-slate-400 uppercase font-black print:bg-gray-200 print:text-black">
                 <tr>
                    <th className="px-4 py-3">Tanggal</th>
                    <th className="px-4 py-3">Pegawai Utama</th>
                    <th className="px-4 py-3">Tujuan</th>
                    <th className="px-4 py-3">Anggaran</th>
                    <th className="px-4 py-3 text-right">Biaya</th>
                 </tr>
              </thead>
              <tbody className="divide-y print:divide-black">
                 {filteredData.map(r => {
                     const sppd = sppds.find(s => s.id === r.sppdId);
                     const task = assignments.find(a => a.id === sppd?.assignmentId);
                     const emp = employees.find(e => e.id === task?.employeeIds[0]);
                     const dest = cities.find(c => c.id === task?.destinationId);
                     const fund = fundingSources.find(f => f.id === sppd?.fundingId);

                     return (
                        <tr key={r.id}>
                            <td className="px-4 py-3 text-slate-500 print:text-black">{r.date}</td>
                            <td className="px-4 py-3 font-semibold print:text-black">{emp?.name || '-'}</td>
                            <td className="px-4 py-3 print:text-black">{dest?.name || '-'}</td>
                            <td className="px-4 py-3 text-xs text-slate-500 print:text-black">{fund?.code || '-'}</td>
                            <td className="px-4 py-3 font-bold text-slate-700 text-right print:text-black">Rp {Number(r.totalAmount).toLocaleString('id-ID')}</td>
                        </tr>
                     )
                 })}
                 {filteredData.length === 0 && (
                     <tr><td colSpan={5} className="p-8 text-center text-slate-400">Tidak ada data untuk periode/filter ini.</td></tr>
                 )}
              </tbody>
           </table>
        </div>
      </div>
      <style>{`
        @media print {
            @page { size: landscape; margin: 10mm; }
            body * { visibility: hidden; }
            #recap-print-area, #recap-print-area * { visibility: visible; }
            #recap-print-area { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; border: none; }
            .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default RecapManager;
