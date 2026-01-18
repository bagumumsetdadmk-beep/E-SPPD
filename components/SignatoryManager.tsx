
import React, { useState, useEffect } from 'react';
import { Plus, UserCheck, Trash2, Edit2, Search, X, RefreshCw, CheckCircle2 } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { Employee, Signatory } from '../types';
import ConfirmationModal from './ConfirmationModal';

const SignatoryManager: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>(() => {
    const saved = localStorage.getItem('employees');
    return saved ? JSON.parse(saved) : [];
  });

  const [signatories, setSignatories] = useState<Signatory[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSignatory, setEditingSignatory] = useState<Signatory | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [role, setRole] = useState('');

  // Delete Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  // 1. Helper Koneksi Supabase
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
    fetchSignatories();
    // Refresh employees too to ensure names are up to date
    const savedEmp = localStorage.getItem('employees');
    if(savedEmp) setEmployees(JSON.parse(savedEmp));
  }, []);

  // 2. Fetch Data dengan Mapping (snake_case -> camelCase)
  const fetchSignatories = async () => {
    setIsLoading(true);
    const client = getSupabase();
    
    if (client) {
      try {
        const { data, error } = await client.from('signatories').select('*');
        if (error) throw error;
        if (data) {
           // MAPPING PENTING: DB (employee_id) -> App (employeeId)
           const mappedData: Signatory[] = data.map((item: any) => ({
             id: item.id,
             employeeId: item.employee_id, // Mapping field
             role: item.role,
             isActive: item.is_active      // Mapping field
           }));
           setSignatories(mappedData);
           setIsLoading(false);
           return;
        }
      } catch (e) {
        console.error("DB Fetch Error:", e);
      }
    }

    // Fallback Offline
    const saved = localStorage.getItem('signatories');
    if (saved) {
        setSignatories(JSON.parse(saved));
    } else {
        // Mock default if empty
        setSignatories([
            { id: 'sig-1', employeeId: '1', role: 'Kuasa Pengguna Anggaran (KPA)', isActive: true }
        ]);
    }
    setIsLoading(false);
  };

  const syncToLocalStorage = (data: Signatory[]) => {
    localStorage.setItem('signatories', JSON.stringify(data));
  };

  const handleOpenModal = (sig?: Signatory) => {
    if (sig) {
      setEditingSignatory(sig);
      setSelectedEmployeeId(sig.employeeId);
      setRole(sig.role);
    } else {
      setEditingSignatory(null);
      setSelectedEmployeeId('');
      setRole('');
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId || !role) return;

    const client = getSupabase();
    const newId = editingSignatory ? editingSignatory.id : `sig-${Date.now()}`;
    
    // Object untuk UI (camelCase)
    const newSignatory: Signatory = {
      id: newId,
      employeeId: selectedEmployeeId,
      role,
      isActive: true,
    };

    // Object untuk DB (snake_case)
    const dbPayload = {
      id: newId,
      employee_id: selectedEmployeeId, // Mapping ke DB
      role: role,
      is_active: true
    };

    // Optimistic Update
    let updatedList;
    if (editingSignatory) {
      updatedList = signatories.map(s => s.id === editingSignatory.id ? newSignatory : s);
    } else {
      updatedList = [...signatories, newSignatory];
    }
    setSignatories(updatedList);
    syncToLocalStorage(updatedList);
    setIsModalOpen(false);

    // DB Update
    if (client) {
        try {
            const { error } = await client.from('signatories').upsert(dbPayload);
            if (error) {
                alert("Gagal menyimpan ke DB: " + error.message);
                fetchSignatories();
            }
        } catch (e) { console.error(e); }
    }
  };

  const requestDelete = (id: string) => {
    setItemToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (itemToDelete) {
      const updatedList = signatories.filter(s => s.id !== itemToDelete);
      setSignatories(updatedList);
      syncToLocalStorage(updatedList);

      const client = getSupabase();
      if(client) {
          try {
              await client.from('signatories').delete().eq('id', itemToDelete);
          } catch(e) { console.error(e); }
      }
      setItemToDelete(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pejabat Penandatangan</h1>
          <p className="text-slate-500">Tentukan pegawai yang berwenang menandatangani dokumen dinas.</p>
        </div>
        <div className="flex items-center space-x-2">
            <button onClick={fetchSignatories} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
                <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
            </button>
            <button 
            onClick={() => handleOpenModal()}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
            >
            <Plus size={18} />
            <span className="font-medium text-sm">Tambah Pejabat</span>
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {signatories.map((sig) => {
          const emp = employees.find(e => e.id === sig.employeeId);
          return (
            <div key={sig.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 group relative hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                  <UserCheck size={24} />
                </div>
                <div className="flex space-x-1">
                  <button onClick={() => handleOpenModal(sig)} className="p-2 text-slate-400 hover:text-indigo-600"><Edit2 size={16}/></button>
                  <button onClick={() => requestDelete(sig.id)} className="p-2 text-slate-400 hover:text-rose-600"><Trash2 size={16}/></button>
                </div>
              </div>
              <div>
                <span className="px-2 py-1 bg-amber-50 text-amber-700 text-[10px] font-bold uppercase rounded-md mb-2 inline-block tracking-wider">
                  {sig.role}
                </span>
                <h3 className="text-lg font-bold text-slate-900">{emp?.name || 'Pegawai Tidak Ditemukan'}</h3>
                <p className="text-slate-500 text-sm mt-1">{emp?.position}</p>
                <p className="text-slate-400 text-xs mt-1 font-mono">NIP: {emp?.nip}</p>
              </div>
            </div>
          );
        })}
        {signatories.length === 0 && (
            <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400">
                Belum ada data pejabat.
            </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Hapus Pejabat"
        message="Apakah Anda yakin ingin menghapus pejabat penandatangan ini?"
        confirmText="Ya, Hapus"
        isDanger={true}
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900">{editingSignatory ? 'Edit' : 'Tambah'} Pejabat</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Pilih Pegawai</label>
                <select 
                  required
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                >
                  <option value="">-- Pilih Pegawai --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.nip})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Peran Penandatangan</label>
                <select 
                  required
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                >
                  <option value="">-- Pilih Peran --</option>
                  <optgroup label="Umum">
                    <option value="Sekretaris Daerah">Sekretaris Daerah</option>
                    <option value="Asisten Administrasi Umum">Asisten Administrasi Umum</option>
                    <option value="Kepala Bagian Umum">Kepala Bagian Umum</option>
                  </optgroup>
                  <optgroup label="Keuangan/Kegiatan">
                    <option value="Kuasa Pengguna Anggaran (KPA)">Kuasa Pengguna Anggaran (KPA)</option>
                    <option value="Pejabat Pelaksana Teknis Kegiatan (PPTK)">Pejabat Pelaksana Teknis Kegiatan (PPTK)</option>
                    <option value="Bendahara">Bendahara</option>
                  </optgroup>
                </select>
              </div>
              <div className="pt-4 flex space-x-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl">Batal</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-indigo-600 text-white font-bold rounded-xl">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SignatoryManager;
