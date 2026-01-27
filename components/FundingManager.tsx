
import React, { useState, useEffect } from 'react';
import { Wallet, Landmark, PieChart, Plus, X, Trash2, Edit2, TrendingUp, RefreshCw } from 'lucide-react';
import { getSupabase } from '../supabaseClient';
import { FundingSource } from '../types';
import ConfirmationModal from './ConfirmationModal';

const INITIAL_SOURCES: FundingSource[] = [
  { id: '1', code: 'DIPA-001', name: 'APBN Operasional Kantor', budgetYear: '2024', amount: 1500000000 },
];

const FundingManager: React.FC = () => {
  const [sources, setSources] = useState<FundingSource[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<FundingSource | null>(null);
  const [formData, setFormData] = useState({ 
    code: '', 
    name: '', 
    budgetYear: '2024',
    amount: 0
  });

  // Delete Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchFunding();
  }, []);

  const fetchFunding = async () => {
    setIsLoading(true);
    const client = getSupabase();
    
    if (client) {
      try {
        const { data, error } = await client.from('funding_sources').select('*');
        if (error) throw error;
        if (data) {
           // MAPPING: DB (budget_year) -> App (budgetYear)
           const mapped: FundingSource[] = data.map((item: any) => ({
               id: item.id,
               code: item.code,
               name: item.name,
               budgetYear: item.budget_year, // Mapping snake_case
               amount: Number(item.amount)   // Ensure number
           }));
           setSources(mapped);
           setIsLoading(false);
           return;
        }
      } catch (e) {
        console.error("DB Fetch Error:", e);
      }
    }

    // Offline Fallback
    const saved = localStorage.getItem('funding_sources');
    if (saved) {
        setSources(JSON.parse(saved));
    } else {
        setSources(INITIAL_SOURCES);
    }
    setIsLoading(false);
  };

  const syncToLocalStorage = (data: FundingSource[]) => {
    localStorage.setItem('funding_sources', JSON.stringify(data));
  };

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const client = getSupabase();
    const newId = editingSource ? editingSource.id : Date.now().toString();

    // UI Object
    const newSource: FundingSource = { ...formData, id: newId };
    
    // DB Payload (Mapping snake_case)
    const dbPayload = {
        id: newId,
        code: formData.code,
        name: formData.name,
        budget_year: formData.budgetYear, // Mapping to DB
        amount: formData.amount
    };

    // Optimistic Update
    let updatedList;
    if (editingSource) {
      updatedList = sources.map(s => s.id === editingSource.id ? newSource : s);
    } else {
      updatedList = [...sources, newSource];
    }
    setSources(updatedList);
    syncToLocalStorage(updatedList);
    setIsModalOpen(false);

    // DB Insert/Update
    if(client) {
        try {
            const { error } = await client.from('funding_sources').upsert(dbPayload);
            if(error) {
                alert("Gagal simpan DB: " + error.message);
                fetchFunding();
            }
        } catch(e) { console.error(e); }
    }
  };

  const requestDelete = (id: string) => {
    setItemToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (itemToDelete) {
      const updatedList = sources.filter(s => s.id !== itemToDelete);
      setSources(updatedList);
      syncToLocalStorage(updatedList);

      const client = getSupabase();
      if(client) {
          try {
              await client.from('funding_sources').delete().eq('id', itemToDelete);
          } catch(e) { console.error(e); }
      }
      setItemToDelete(null);
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
          <button onClick={fetchFunding} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
                 <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
          </button>
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
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => requestDelete(s.id)} 
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Hapus Sumber Dana"
        message="Apakah Anda yakin ingin menghapus sumber dana ini?"
        confirmText="Ya, Hapus"
        isDanger={true}
      />

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
