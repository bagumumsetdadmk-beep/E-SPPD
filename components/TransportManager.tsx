
import React, { useState, useEffect } from 'react';
import { Bus, Plane, Train, Car, Plus, Settings, X, Trash2, Edit2, RefreshCw } from 'lucide-react';
import { getSupabase } from '../supabaseClient';
import { TransportMode } from '../types';
import ConfirmationModal from './ConfirmationModal';

const INITIAL_MODES: TransportMode[] = [
  { id: '1', type: 'Pesawat Terbang', description: 'Perjalanan antar pulau / jarak jauh' },
  { id: '2', type: 'Kereta Api', description: 'Perjalanan dalam pulau Jawa / Sumatera' },
];

const IconMap: Record<string, any> = {
  'Pesawat Terbang': Plane,
  'Kereta Api': Train,
  'Bus / Kendaraan Umum': Bus,
  'Kendaraan Dinas': Car,
};

const TransportManager: React.FC = () => {
  const [modes, setModes] = useState<TransportMode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMode, setEditingMode] = useState<TransportMode | null>(null);
  const [formData, setFormData] = useState({ type: '', description: '' });

  // Delete Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchModes();
  }, []);

  const fetchModes = async () => {
    setIsLoading(true);
    const client = getSupabase();
    if(client) {
        try {
            const { data, error } = await client.from('transport_modes').select('*');
            if(error) throw error;
            if(data) {
                setModes(data);
                setIsLoading(false);
                return;
            }
        } catch(e) { console.error(e); }
    }

    const saved = localStorage.getItem('transport_modes');
    setModes(saved ? JSON.parse(saved) : INITIAL_MODES);
    setIsLoading(false);
  };

  const syncToLocalStorage = (data: TransportMode[]) => {
    localStorage.setItem('transport_modes', JSON.stringify(data));
  };

  const handleOpenModal = (mode?: TransportMode) => {
    if (mode) {
      setEditingMode(mode);
      setFormData({ type: mode.type, description: mode.description });
    } else {
      setEditingMode(null);
      setFormData({ type: '', description: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const client = getSupabase();
    const newId = editingMode ? editingMode.id : Date.now().toString();
    const payload = { id: newId, ...formData };

    // Optimistic Update
    let updatedList;
    if (editingMode) {
      updatedList = modes.map(m => m.id === editingMode.id ? payload : m);
    } else {
      updatedList = [...modes, payload];
    }
    setModes(updatedList);
    syncToLocalStorage(updatedList);
    setIsModalOpen(false);

    if(client) {
        try {
            await client.from('transport_modes').upsert(payload);
        } catch(e) { console.error(e); }
    }
  };

  const requestDelete = (id: string) => {
    setItemToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (itemToDelete) {
      const updatedList = modes.filter(m => m.id !== itemToDelete);
      setModes(updatedList);
      syncToLocalStorage(updatedList);
      
      const client = getSupabase();
      if(client) {
          try {
              await client.from('transport_modes').delete().eq('id', itemToDelete);
          } catch(e) { console.error(e); }
      }
      setItemToDelete(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Moda Transportasi</h1>
          <p className="text-slate-500">Kelola jenis transportasi yang digunakan dalam perjalanan dinas.</p>
        </div>
        <div className="flex items-center space-x-2">
            <button onClick={fetchModes} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
                <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
            </button>
            <button 
              onClick={() => handleOpenModal()}
              className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
            >
              <Plus size={18} />
              <span className="font-medium text-sm">Tambah Moda</span>
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modes.map((mode) => {
          const Icon = IconMap[mode.type] || Bus;
          return (
            <div key={mode.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-start space-x-4 hover:shadow-md transition-all group">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <Icon size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900">{mode.type}</h3>
                <p className="text-sm text-slate-500 mt-1">{mode.description}</p>
              </div>
              <div className="flex flex-col space-y-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleOpenModal(mode)} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded"><Edit2 size={16}/></button>
                <button onClick={() => requestDelete(mode.id)} className="p-1.5 text-slate-400 hover:text-rose-600 rounded"><Trash2 size={16}/></button>
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Hapus Moda Transportasi"
        message="Apakah Anda yakin ingin menghapus data ini?"
        confirmText="Ya, Hapus"
        isDanger={true}
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900">{editingMode ? 'Edit' : 'Tambah'} Moda</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Jenis Transportasi</label>
                <input 
                  type="text" required 
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Deskripsi / Keterangan</label>
                <textarea 
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none" 
                />
              </div>
              <div className="pt-4 flex space-x-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200">Batal</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransportManager;
