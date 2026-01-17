
import React from 'react';
import { Download, Printer, Filter, Calendar, BarChart2 } from 'lucide-react';

const RecapManager: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Rekap Data & Monitoring</h1>
          <p className="text-slate-500">Laporan komprehensif seluruh aktivitas perjalanan dinas.</p>
        </div>
        <div className="flex space-x-2">
          <button className="flex items-center space-x-2 px-4 py-2 bg-white border text-slate-600 rounded-lg hover:bg-slate-50 font-medium">
            <Printer size={18} />
            <span>Cetak Rekap</span>
          </button>
          <button className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium shadow-md">
            <Download size={18} />
            <span>Unduh CSV</span>
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 mb-8">
           <div className="flex-1">
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Periode</label>
              <div className="flex items-center space-x-2 px-4 py-2 bg-slate-50 rounded-lg border">
                 <Calendar size={18} className="text-slate-400" />
                 <span className="text-sm font-medium">Mei 2024</span>
              </div>
           </div>
           <div className="flex-1">
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Departemen</label>
              <select className="w-full px-4 py-2 bg-slate-50 rounded-lg border text-sm outline-none appearance-none">
                 <option>Semua Departemen</option>
                 <option>Keuangan</option>
                 <option>IT & Teknologi</option>
                 <option>Humas</option>
              </select>
           </div>
           <div className="flex items-end">
              <button className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold h-[42px]">Terapkan Filter</button>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
           <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
              <p className="text-xs font-bold text-indigo-400 uppercase">Total Perjalanan</p>
              <p className="text-2xl font-black text-indigo-700">124 Kali</p>
           </div>
           <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <p className="text-xs font-bold text-emerald-400 uppercase">Penyelesaian Laporan</p>
              <p className="text-2xl font-black text-emerald-700">92%</p>
           </div>
           <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
              <p className="text-xs font-bold text-amber-400 uppercase">Rata-rata Biaya</p>
              <p className="text-2xl font-black text-amber-700">Rp 2.4jt</p>
           </div>
        </div>

        <div className="rounded-xl border overflow-hidden">
           <div className="bg-slate-50 p-4 font-bold text-slate-600 text-sm border-b">Detail Perjalanan Terakhir</div>
           <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[10px] text-slate-400 uppercase font-black">
                 <tr>
                    <th className="px-4 py-3">Nama Pegawai</th>
                    <th className="px-4 py-3">Tujuan</th>
                    <th className="px-4 py-3">Transport</th>
                    <th className="px-4 py-3">Biaya</th>
                    <th className="px-4 py-3">Tgl Kembali</th>
                 </tr>
              </thead>
              <tbody className="divide-y">
                 <tr>
                    <td className="px-4 py-3 font-semibold">Andi Pratama</td>
                    <td className="px-4 py-3">Jakarta</td>
                    <td className="px-4 py-3 text-slate-500">Pesawat</td>
                    <td className="px-4 py-3 font-bold text-slate-700">Rp 3.500.000</td>
                    <td className="px-4 py-3 text-slate-400">20/05/2024</td>
                 </tr>
                 <tr>
                    <td className="px-4 py-3 font-semibold">Siti Wahyuni</td>
                    <td className="px-4 py-3">Surabaya</td>
                    <td className="px-4 py-3 text-slate-500">Kereta</td>
                    <td className="px-4 py-3 font-bold text-slate-700">Rp 1.800.000</td>
                    <td className="px-4 py-3 text-slate-400">24/05/2024</td>
                 </tr>
              </tbody>
           </table>
        </div>
      </div>
    </div>
  );
};

export default RecapManager;
