
import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Filter, MoreVertical, Download, X, RefreshCw, CheckCircle2 } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { Employee } from '../types';

const INITIAL_EMPLOYEES: Employee[] = [
  { id: '1', nip: '198801012015031001', name: 'Andi Pratama, S.T.', position: 'Kepala Bagian IT', grade: 'IV/a' },
  { id: '2', nip: '199205122018012002', name: 'Siti Wahyuni, M.Ak.', position: 'Staf Keuangan', grade: 'III/c' },
];

const EmployeeManager: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  
  // Form State
  const [formData, setFormData] = useState<Omit<Employee, 'id'>>({
    nip: '',
    name: '',
    position: '',
    grade: ''
  });

  // Helper: Get Supabase Client
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
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setIsLoading(true);
    const client = getSupabase();
    
    // 1. Try DB
    if (client) {
      try {
        const { data, error } = await client.from('employees').select('*').order('name');
        if (error) throw error;
        if (data && data.length > 0) {
           setEmployees(data);
           setIsLoading(false);
           return;
        }
      } catch (e) {
        console.error("DB Fetch Error:", e);
      }
    }

    // 2. Fallback Local Storage
    const saved = localStorage.getItem('employees');
    setEmployees(saved ? JSON.parse(saved) : INITIAL_EMPLOYEES);
    setIsLoading(false);
  };

  const syncToLocalStorage = (data: Employee[]) => {
    localStorage.setItem('employees', JSON.stringify(data));
  };

  const handleOpenModal = (emp?: Employee) => {
    if (emp) {
      setEditingEmployee(emp);
      setFormData({ nip: emp.nip, name: emp.name, position: emp.position, grade: emp.grade });
    } else {
      setEditingEmployee(null);
      setFormData({ nip: '', name: '', position: '', grade: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const client = getSupabase();
    
    const newId = editingEmployee ? editingEmployee.id : Date.now().toString();
    const payload = { ...formData, id: newId };
    
    // Optimistic Update
    let updatedList = [];
    if (editingEmployee) {
      updatedList = employees.map(emp => emp.id === editingEmployee.id ? payload : emp);
    } else {
      updatedList = [...employees, payload];
    }
    setEmployees(updatedList);
    syncToLocalStorage(updatedList);
    setIsModalOpen(false);

    // DB Update
    if (client) {
      try {
        const { error } = await client.from('employees').upsert(payload);
        if (error) {
           alert("Gagal menyimpan ke Database: " + error.message);
           fetchEmployees(); // Revert on error
        }
      } catch (e) {
        console.error("DB Save Error:", e);
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus data ini?')) {
      const updatedList = employees.filter(emp => emp.id !== id);
      setEmployees(updatedList);
      syncToLocalStorage(updatedList);

      const client = getSupabase();
      if (client) {
        try {
           const { error } = await client.from('employees').delete().eq('id', id);
           if (error) alert("Gagal menghapus dari Database: " + error.message);
        } catch (e) {
           console.error("DB Delete Error:", e);
        }
      }
    }
  };

  const filteredEmployees = employees.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.nip.includes(searchTerm)
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Data Pegawai</h1>
          <p className="text-slate-500">Kelola informasi pegawai yang berhak melakukan perjalanan dinas.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button onClick={fetchEmployees} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors" title="Refresh Data">
             <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
          </button>
          <button className="flex items-center space-x-2 px-4 py-2 border border-slate-200 bg-white text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
            <Download size={18} />
            <span className="font-medium text-sm">Ekspor Excel</span>
          </button>
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
          >
            <Plus size={18} />
            <span className="font-medium text-sm">Tambah Pegawai</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari NIP atau Nama..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border-transparent rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
            />
          </div>
          {getSupabase() && (
             <div className="text-xs font-medium text-emerald-600 flex items-center bg-emerald-50 px-3 py-1 rounded-full">
                <CheckCircle2 size={12} className="mr-1"/> Database Terhubung
             </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">NIP</th>
                <th className="px-6 py-4">Nama Lengkap</th>
                <th className="px-6 py-4">Jabatan</th>
                <th className="px-6 py-4">Golongan</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4 font-mono text-slate-600">{emp.nip}</td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-900">{emp.name}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{emp.position}</td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-md text-xs font-bold">
                      {emp.grade}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button 
                        onClick={() => handleOpenModal(emp)}
                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(emp.id)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredEmployees.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-slate-400">Tidak ada data pegawai.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900">{editingEmployee ? 'Edit' : 'Tambah'} Pegawai</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">NIP</label>
                <input 
                  type="text" required 
                  value={formData.nip}
                  onChange={(e) => setFormData({...formData, nip: e.target.value})}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Nama Lengkap</label>
                <input 
                  type="text" required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Jabatan</label>
                <input 
                  type="text" required
                  value={formData.position}
                  onChange={(e) => setFormData({...formData, position: e.target.value})}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Golongan</label>
                <input 
                  type="text" required
                  value={formData.grade}
                  onChange={(e) => setFormData({...formData, grade: e.target.value})}
                  placeholder="Contoh: IV/a"
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                />
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
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeManager;
