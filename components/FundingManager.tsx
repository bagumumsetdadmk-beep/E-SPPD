
import React, { useState, useEffect } from 'react';
import { Wallet, Landmark, PieChart, Plus, X, Trash2, Edit2, TrendingUp } from 'lucide-react';
import { FundingSource } from '../types';

const INITIAL_SOURCES: FundingSource[] = [
  { id: '1', code: 'DIPA-001', name: 'APBN Operasional Kantor', budgetYear: '2024', amount: 1500000000 },
  { id: '2', code: 'PROJ-X', name: 'Hibah Penelitian Luar Negeri', budgetYear: '2024', amount: 750000000 },
  { id: '3', code: 'DIPA-002', name: 'Anggaran Pengembangan SDM', budgetYear: '2024', amount: 500000000 },
];

const FundingManager: React.FC = () => {
  const [sources, setSources] = useState<FundingSource[]>(() => {
    const saved = localStorage.getItem('funding_sources');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure old data gets default amount if missing
        return parsed.map((s: any) => ({
          ...s,
          amount: s.amount || 0
        }));
      } catch (e) {
        return INITIAL_SOURCES;
      }
    }
    return INITIAL_SOURCES;
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<FundingSource | null>(null);
  const [formData, setFormData] = useState({ 
    code: '', 
    name: '', 
    budgetYear: '2024',
    amount: 0
  });

  useEffect(() => {
    localStorage.setItem('funding_sources', JSON.stringify(sources));
  }, [sources]);

  const handleOpenModal = (source?: FundingSource) => {
    if (source) {
      setEditingSource(source);
      setFormData({ 
        code: source.code, 
        name: source.name, 
        budgetYear: source.budgetYear,
        amount: source.amount
      });
    } else {
      setEditingSource(null);
      setFormData({ 
        code: '', 
        name: '', 
        budgetYear: new Date().getFullYear().toString(),
        amount: 0
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSource) {
      setSources(sources.map(s => s.id === editingSource.id ? { ...formData, id: s.id } : s));
    } else {
      setSources([...sources, { ...formData, id: Date.now().toString() }]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus sumber dana ini?')) {
      setSources(sources.filter(s => s.id !== id));
    }
  };

  const totalAllBudget = sources.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sumber Dana</h1>
          <p className="text-slate-500">Alokasi anggaran untuk pembiayaan perjalanan dinas organisasi.</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="hidden lg:block bg-white px-4 py-2 rounded-lg border border-slate-100 shadow-sm">
             <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1">Total Plafon Anggaran</p>
             <p className="text-lg font-bold text-indigo-600">Rp {totalAllBudget.toLocaleString('id-ID')}</p>
          </div>
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all font-medium"
          >
            <Plus size={18} />
            <span className="text-sm">Tambah Alokasi</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sources.map((s) => (
          <div key={s.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
            <div className="absolute -top-4 -right-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Landmark size={120} />
            </div>
            
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                  <Wallet size={20} />
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.code}</span>
                  <h3 className="font-bold text-slate-900 leading-tight">{s.name}</h3>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-xs text-slate-500">
                <Landmark size={14} className="text-slate-300" />
                <span>Tahun Anggaran {s.budgetYear}</span>
              </div>
              
              <div className="pt-4 border-t flex items-end justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Jumlah Anggaran</p>
                  <p className="text-xl font-bold text-slate-900">Rp {s.amount.toLocaleString('id-ID')}</p>
                </div>
                <div className="flex space-x-1 mb-1">
                  <button 
                    onClick={() => handleOpenModal(s)} 
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Edit Data"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(s.id)} 
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Hapus Data"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {sources.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200">
            <Wallet className="mx-auto text-slate-200 mb-4" size={64} />
            <p className="text-slate-500 font-medium">Belum ada data sumber dana yang terdaftar.</p>
            <button 
              onClick={() => handleOpenModal()}
              className="mt-4 text-indigo-600 font-bold hover:underline"
            >
              Buat Alokasi Dana Pertama
            </button>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900">{editingSource ? 'Edit' : 'Tambah'} Sumber Dana</h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Kode DIPA / Anggaran</label>
                <input 
                  type="text" 
                  required 
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value})}
                  placeholder="Contoh: DIPA-001"
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Nama Anggaran</label>
                <input 
                  type="text" 
                  required 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Contoh: APBN Operasional 2024"
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Tahun Anggaran</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.budgetYear}
                    onChange={(e) => setFormData({...formData, budgetYear: e.target.value})}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Jumlah Anggaran (Rp)</label>
                  <input 
                    type="number" 
                    required 
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: Number(e.target.value)})}
                    placeholder="0"
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
                  />
                </div>
              </div>
              
              <div className="pt-4 flex space-x-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
                >
                  Simpan Alokasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FundingManager;
