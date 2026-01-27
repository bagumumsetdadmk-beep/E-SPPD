
import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, Filter, MoreVertical, Download, X, RefreshCw, CheckCircle2, Upload, FileSpreadsheet } from 'lucide-react';
import { getSupabase } from '../supabaseClient';
import { Employee } from '../types';
import ConfirmationModal from './ConfirmationModal';

const INITIAL_EMPLOYEES: Employee[] = [
  { id: '1', nip: '198801012015031001', name: 'Andi Pratama, S.T.', position: 'Kepala Bagian IT', rank: 'Penata', grade: 'III/c' },
  { id: '2', nip: '199205122018012002', name: 'Siti Wahyuni, M.Ak.', position: 'Staf Keuangan', rank: 'Penata Muda Tk.I', grade: 'III/b' },
];

// --- KONSTANTA PANGKAT & GOLONGAN ---

const RANK_OPTIONS = [
  {
    group: "PNS - Golongan IV (Pembina)",
    options: [
      "Pembina Utama",
      "Pembina Utama Madya",
      "Pembina Utama Muda",
      "Pembina Tk. I",
      "Pembina"
    ]
  },
  {
    group: "PNS - Golongan III (Penata)",
    options: [
      "Penata Tk. I",
      "Penata",
      "Penata Muda Tk. I",
      "Penata Muda"
    ]
  },
  {
    group: "PNS - Golongan II (Pengatur)",
    options: [
      "Pengatur Tk. I",
      "Pengatur",
      "Pengatur Muda Tk. I",
      "Pengatur Muda"
    ]
  },
  {
    group: "PNS - Golongan I (Juru)",
    options: [
      "Juru Tk. I",
      "Juru",
      "Juru Muda Tk. I",
      "Juru Muda"
    ]
  },
  {
    group: "PPPK (Fungsional)",
    options: [
      "Ahli Utama",
      "Ahli Madya",
      "Ahli Muda",
      "Ahli Pertama",
      "Penyelia",
      "Mahir",
      "Terampil",
      "Pemula"
    ]
  },
  {
    group: "Lainnya",
    options: [
      "Tenaga Kontrak",
      "Honorer",
      "Magang"
    ]
  }
];

const GRADE_OPTIONS = [
  {
    group: "PNS",
    options: [
      "IV/e", "IV/d", "IV/c", "IV/b", "IV/a",
      "III/d", "III/c", "III/b", "III/a",
      "II/d", "II/c", "II/b", "II/a",
      "I/d", "I/c", "I/b", "I/a"
    ]
  },
  {
    group: "PPPK",
    options: [
      "XVII", "XVI", "XV", "XIV", "XIII", "XII", "XI",
      "X", "IX", "VIII", "VII", "VI", "V", "IV", "III", "II", "I"
    ]
  },
  {
    group: "Lainnya",
    options: ["-"]
  }
];

const EmployeeManager: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  
  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  // Hidden File Input Ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form State
  const [formData, setFormData] = useState<Omit<Employee, 'id'>>({
    nip: '',
    name: '',
    position: '',
    rank: '',
    grade: ''
  });

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
           // Ensure mapping if DB columns are snake_case vs camelCase types
           const mapped: Employee[] = data.map((d: any) => ({
             id: d.id,
             nip: d.nip,
             name: d.name,
             position: d.position,
             rank: d.rank, // New column
             grade: d.grade
           }));
           setEmployees(mapped);
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
      setFormData({ 
        nip: emp.nip, 
        name: emp.name, 
        position: emp.position, 
        rank: emp.rank || '', 
        grade: emp.grade 
      });
    } else {
      setEditingEmployee(null);
      setFormData({ nip: '', name: '', position: '', rank: '', grade: '' });
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

  const requestDelete = (id: string) => {
    setItemToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (itemToDelete) {
      const updatedList = employees.filter(emp => emp.id !== itemToDelete);
      setEmployees(updatedList);
      syncToLocalStorage(updatedList);

      const client = getSupabase();
      if (client) {
        try {
           const { error } = await client.from('employees').delete().eq('id', itemToDelete);
           if (error) console.error("Gagal menghapus dari Database: " + error.message);
        } catch (e) {
           console.error("DB Delete Error:", e);
        }
      }
      setItemToDelete(null);
    }
  };

  // --- IMPORT / EXPORT LOGIC UPDATED TO EXCEL ---

  const handleDownloadTemplate = () => {
      // Create HTML Table string for Excel
      const tableContent = `
        <table border="1">
          <thead>
            <tr>
              <th style="background-color: #e2e8f0; font-weight: bold;">NIP</th>
              <th style="background-color: #e2e8f0; font-weight: bold;">Nama Lengkap</th>
              <th style="background-color: #e2e8f0; font-weight: bold;">Jabatan</th>
              <th style="background-color: #e2e8f0; font-weight: bold;">Pangkat</th>
              <th style="background-color: #e2e8f0; font-weight: bold;">Golongan</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="mso-number-format:'@'">199001012020011001</td>
              <td>Budi Santoso</td>
              <td>Staf Teknis</td>
              <td>Penata Muda</td>
              <td>III/a</td>
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
                  <x:Name>Template Pegawai</x:Name>
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
          ${tableContent}
        </body>
        </html>
      `;
      
      const blob = new Blob([excelFile], { type: 'application/vnd.ms-excel' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "Template_Pegawai_New.xls"; // .xls allows HTML content
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleImportClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
        alert("Untuk fitur Import, mohon simpan file Excel Anda sebagai format CSV (Comma/Semicolon Separated) terlebih dahulu.");
        return;
      }

      const reader = new FileReader();
      reader.onload = async (e) => {
          const text = e.target?.result as string;
          if (!text) return;

          const rows = text.split(/\r?\n/).slice(1);
          const newEmployees: Employee[] = [];
          
          rows.forEach(row => {
              if (!row.trim()) return;
              // Detect delimiter
              const delimiter = row.includes(';') ? ';' : ',';
              const cols = row.split(delimiter).map(c => c.replace(/^"|"$/g, '').trim());
              
              if (cols.length >= 4) {
                  const nip = cols[0];
                  const name = cols[1];
                  if (nip && name) {
                      newEmployees.push({
                          id: Date.now().toString() + Math.floor(Math.random() * 1000),
                          nip: nip.replace(/'/g, ''),
                          name,
                          position: cols[2] || '',
                          rank: cols[3] || '',
                          grade: cols[4] || '' // Assuming grade is 5th column now if rank inserted
                      });
                  }
              }
          });

          if (newEmployees.length > 0) {
              const merged = [...employees, ...newEmployees];
              setEmployees(merged);
              syncToLocalStorage(merged);
              
              const client = getSupabase();
              if (client) {
                  const { error } = await client.from('employees').upsert(newEmployees);
                  if (error) alert("Warning: Data tersimpan lokal, tapi gagal sync DB: " + error.message);
              }
              alert(`Berhasil mengimpor ${newEmployees.length} pegawai.`);
          } else {
              alert("Gagal membaca data. Pastikan format CSV benar.");
          }
      };
      reader.readAsText(file);
      event.target.value = '';
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
          
          <div className="flex bg-white border border-slate-200 rounded-lg overflow-hidden">
             <button onClick={handleDownloadTemplate} className="px-3 py-2 text-slate-600 hover:bg-slate-50 border-r border-slate-200 text-xs font-medium flex items-center" title="Download Template Excel">
                <FileSpreadsheet size={16} className="mr-1"/> Template Excel
             </button>
             <button onClick={handleImportClick} className="px-3 py-2 text-indigo-600 hover:bg-indigo-50 text-xs font-medium flex items-center" title="Import CSV">
                <Upload size={16} className="mr-1"/> Import CSV
             </button>
             <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv,.txt" className="hidden" />
          </div>

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
                <th className="px-6 py-4">Pangkat / Golongan</th>
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
                    <div className="flex flex-col space-y-1">
                      {emp.rank && <span className="text-xs font-bold text-slate-700">{emp.rank}</span>}
                      <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-bold w-fit">
                        {emp.grade}
                      </span>
                    </div>
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
                        onClick={() => requestDelete(emp.id)}
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

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Hapus Data Pegawai"
        message="Apakah Anda yakin ingin menghapus data pegawai ini? Tindakan ini tidak dapat dibatalkan."
        confirmText="Ya, Hapus"
        isDanger={true}
      />

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
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Pangkat</label>
                    <select
                      value={formData.rank}
                      onChange={(e) => setFormData({...formData, rank: e.target.value})}
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    >
                        <option value="">-- Pilih Pangkat --</option>
                        {RANK_OPTIONS.map((group, idx) => (
                            <optgroup key={idx} label={group.group}>
                                {group.options.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Golongan</label>
                    <select
                      required
                      value={formData.grade}
                      onChange={(e) => setFormData({...formData, grade: e.target.value})}
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    >
                        <option value="">-- Pilih Golongan --</option>
                        {GRADE_OPTIONS.map((group, idx) => (
                            <optgroup key={idx} label={group.group}>
                                {group.options.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
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
