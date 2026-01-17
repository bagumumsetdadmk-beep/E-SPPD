
import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle, Clock, Plus, X, Trash2, Edit2 } from 'lucide-react';

const ReportManager: React.FC = () => {
  const [reports, setReports] = useState(() => {
    const saved = localStorage.getItem('travel_reports');
    const initial = [
      { id: 'REP-2024-001', subject: 'Sosialisasi di Jakarta', results: 'Kegiatan berjalan dengan lancar. Seluruh peserta memahami mekanisme digitalisasi sistem terbaru...', status: 'Completed' },
    ];
    return saved ? JSON.parse(saved) : initial;
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<any>(null);
  const [formData, setFormData] = useState({ id: '', subject: '', results: '', status: 'Completed' });

  useEffect(() => {
    localStorage.setItem('travel_reports', JSON.stringify(reports));
  }, [reports]);

  const handleOpenModal = (report?: any) => {
    if (report) {
      setEditingReport(report);
      setFormData(report);
    } else {
      setEditingReport(null);
      setFormData({ id: `REP-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`, subject: '', results: '', status: 'Completed' });
    }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingReport) {
      setReports(reports.map((r: any) => r.id === editingReport.id ? formData : r));
    } else {
      setReports([...reports, formData]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Hapus laporan ini?')) {
      setReports(reports.filter((r: any) => r.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Laporan Perjalanan</h1>
          <p className="text-slate-500">Penyusunan laporan hasil kegiatan dinas.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center space-x-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all font-bold"
        >
          <Plus size={18} />
          <span>Tulis Laporan Baru</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h3 className="font-bold text-slate-400 uppercase text-xs tracking-widest px-1">Daftar Laporan</h3>
          {reports.map((report: any) => (
            <div key={report.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group relative">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                    <CheckCircle size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{report.subject}</h4>
                    <p className="text-xs text-slate-400">ID Laporan: {report.id}</p>
                  </div>
                </div>
                <div className="flex space-x-1">
                  <button onClick={() => handleOpenModal(report)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded"><Edit2 size={16} /></button>
                  <button onClick={() => handleDelete(report.id)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded"><Trash2 size={16} /></button>
                </div>
              </div>
              <p className="text-sm text-slate-500 line-clamp-3">
                {report.results}
              </p>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <h3 className="font-bold text-slate-400 uppercase text-xs tracking-widest px-1">Laporan Mendatang</h3>
          <div className="bg-white p-6 rounded-2xl border border-dashed border-slate-300 flex items-center justify-center h-32 hover:border-indigo-400 transition-colors group cursor-pointer">
             <div className="text-center">
                <Clock className="mx-auto text-slate-300 mb-2 group-hover:text-indigo-400" size={24} />
                <p className="text-sm text-slate-400 group-hover:text-indigo-600 font-medium">Laporan Surabaya belum diselesaikan</p>
             </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900">{editingReport ? 'Edit' : 'Tulis'} Laporan Perjalanan</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">ID Laporan</label>
                <input type="text" readOnly value={formData.id} className="w-full px-4 py-2.5 bg-slate-100 border border-slate-300 rounded-xl text-slate-500 text-sm outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Subjek / Judul Laporan</label>
                <input type="text" required value={formData.subject} onChange={(e) => setFormData({...formData, subject: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-sm outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Hasil Kegiatan / Ringkasan</label>
                <textarea required rows={5} value={formData.results} onChange={(e) => setFormData({...formData, results: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-sm outline-none resize-none" />
              </div>
              <div className="pt-4 flex space-x-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl">Batal</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-indigo-600 text-white font-bold rounded-xl">Simpan Laporan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportManager;
