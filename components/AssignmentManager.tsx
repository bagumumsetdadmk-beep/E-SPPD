
import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  FileText, 
  X, 
  Trash2, 
  Edit2, 
  UserPlus, 
  Info, 
  MapPin, 
  UserMinus, 
  Calendar,
  CheckCircle2,
  Users,
  Printer,
  Clock,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  FileSearch,
  Check,
  XCircle,
  Settings
} from 'lucide-react';
import { AssignmentLetter, Employee, Signatory, City } from '../types';
import ConfirmationModal from './ConfirmationModal';

const AssignmentManager: React.FC = () => {
  // Master Data States
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [signatories, setSignatories] = useState<Signatory[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  
  // Tasks state
  const [tasks, setTasks] = useState<AssignmentLetter[]>(() => {
    const saved = localStorage.getItem('assignment_tasks_v2');
    return saved ? JSON.parse(saved) : [];
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  
  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const [editingTask, setEditingTask] = useState<AssignmentLetter | null>(null);
  const [printingTask, setPrintingTask] = useState<AssignmentLetter | null>(null);
  const [selectedEmpId, setSelectedEmpId] = useState('');

  // Form State
  const [formData, setFormData] = useState<Omit<AssignmentLetter, 'id' | 'status'>>({
    number: '',
    date: new Date().toISOString().split('T')[0],
    basis: '',
    employeeIds: [],
    subject: '',
    destinationId: '',
    destinationAddress: '', 
    startDate: '',
    endDate: '',
    duration: 0,
    signatoryId: '',
    signatureType: 'Direct',
    upperTitle: '',
    intermediateTitle: ''
  });

  const loadMasterData = () => {
    const empData = localStorage.getItem('employees');
    const sigData = localStorage.getItem('signatories');
    const cityData = localStorage.getItem('cities');
    
    setEmployees(empData ? JSON.parse(empData) : []);
    setSignatories(sigData ? JSON.parse(sigData) : []);
    setCities(cityData ? JSON.parse(cityData) : []);
  };

  useEffect(() => {
    loadMasterData();
  }, []);

  useEffect(() => {
    localStorage.setItem('assignment_tasks_v2', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      setFormData(prev => ({ ...prev, duration: diffDays > 0 ? diffDays : 0 }));
    }
  }, [formData.startDate, formData.endDate]);

  const handleOpenModal = (task?: AssignmentLetter) => {
    loadMasterData();
    if (task) {
      setEditingTask(task);
      setFormData({
        number: task.number,
        date: task.date,
        basis: task.basis,
        employeeIds: task.employeeIds,
        subject: task.subject,
        destinationId: task.destinationId,
        destinationAddress: task.destinationAddress || '',
        startDate: task.startDate,
        endDate: task.endDate,
        duration: task.duration,
        signatoryId: task.signatoryId,
        signatureType: task.signatureType || 'Direct',
        upperTitle: task.upperTitle || '',
        intermediateTitle: task.intermediateTitle || ''
      });
    } else {
      setEditingTask(null);
      setFormData({
        number: '',
        date: new Date().toISOString().split('T')[0],
        basis: '',
        employeeIds: [],
        subject: '',
        destinationId: '',
        destinationAddress: '',
        startDate: '',
        endDate: '',
        duration: 0,
        signatoryId: '',
        signatureType: 'Direct',
        upperTitle: '',
        intermediateTitle: ''
      });
    }
    setSelectedEmpId('');
    setIsModalOpen(true);
  };

  const handleOpenPrint = (task: AssignmentLetter) => {
    setPrintingTask(task);
    setIsPrintModalOpen(true);
  };

  const handleUpdateStatus = (id: string, newStatus: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, status: newStatus } : t));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.employeeIds.length === 0) {
      alert('Harap tambahkan setidaknya satu pegawai.');
      return;
    }
    if (editingTask) {
      setTasks(tasks.map((t) => t.id === editingTask.id ? { ...formData, id: t.id, status: t.status } : t));
    } else {
      setTasks([...tasks, { ...formData, id: Date.now().toString(), status: 'Pending' }]);
    }
    setIsModalOpen(false);
  };

  // Logic Hapus dengan Modal
  const requestDelete = (id: string) => {
    setItemToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      setTasks(tasks.filter((t) => t.id !== itemToDelete));
      setItemToDelete(null);
    }
  };

  const addEmployeeToTask = () => {
    if (!selectedEmpId) return;
    if (formData.employeeIds.includes(selectedEmpId)) {
      alert('Pegawai sudah ada.');
      return;
    }
    setFormData(prev => ({
      ...prev,
      employeeIds: [...prev.employeeIds, selectedEmpId]
    }));
    setSelectedEmpId('');
  };

  const removeEmployeeFromTask = (empId: string) => {
    setFormData(prev => ({
      ...prev,
      employeeIds: prev.employeeIds.filter(id => id !== empId)
    }));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Verified':
        return <span className="flex items-center px-2 py-1 bg-blue-50 text-blue-600 rounded-md text-[10px] font-bold uppercase"><ShieldCheck size={12} className="mr-1" /> Terverifikasi</span>;
      case 'Approved':
        return <span className="flex items-center px-2 py-1 bg-emerald-50 text-emerald-600 rounded-md text-[10px] font-bold uppercase"><CheckCircle size={12} className="mr-1" /> Disetujui</span>;
      case 'Rejected':
        return <span className="flex items-center px-2 py-1 bg-rose-50 text-rose-600 rounded-md text-[10px] font-bold uppercase"><AlertCircle size={12} className="mr-1" /> Ditolak</span>;
      default:
        return <span className="flex items-center px-2 py-1 bg-amber-50 text-amber-600 rounded-md text-[10px] font-bold uppercase"><Clock size={12} className="mr-1" /> Menunggu</span>;
    }
  };

  const formatDateIndo = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).format(date);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Surat Tugas</h1>
          <p className="text-slate-500">Penerbitan, Verifikasi, dan Pencetakan Surat Tugas resmi.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all font-bold"
        >
          <Plus size={18} />
          <span className="text-sm">Buat Surat Tugas</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Nomor & Tanggal</th>
                <th className="px-6 py-4">Kegiatan</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Waktu</th>
                <th className="px-6 py-4 text-right">Aksi & Persetujuan</th>
              </tr>
            </thead>
            <tbody className="divide-y text-sm divide-slate-100">
              {tasks.map((task) => {
                const dest = cities.find(c => c.id === task.destinationId);
                const isApproved = task.status === 'Approved';

                return (
                  <tr key={task.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-mono font-bold text-indigo-600">{task.number}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{formatDateIndo(task.date)}</p>
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <p className="font-semibold text-slate-900 line-clamp-1">{task.subject}</p>
                      <div className="flex items-center text-[10px] text-slate-400 mt-1">
                        <MapPin size={12} className="mr-1" />
                        <span>{dest?.name || '-'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(task.status)}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-700 font-medium">{task.duration} Hari</p>
                      <p className="text-[10px] text-slate-400">{task.startDate}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end items-center space-x-1">
                        <div className="flex border-r pr-2 mr-1 space-x-1">
                          {task.status !== 'Approved' && task.status !== 'Rejected' && (
                            <>
                              <button 
                                onClick={() => handleUpdateStatus(task.id, task.status === 'Pending' ? 'Verified' : 'Approved')} 
                                className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"
                                title={task.status === 'Pending' ? 'Verifikasi' : 'Setujui (Final)'}
                              >
                                <Check size={16} />
                              </button>
                              <button 
                                onClick={() => handleUpdateStatus(task.id, 'Rejected')} 
                                className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors"
                                title="Tolak"
                              >
                                <XCircle size={16} />
                              </button>
                            </>
                          )}
                          {task.status === 'Rejected' && (
                            <button 
                              onClick={() => handleUpdateStatus(task.id, 'Pending')} 
                              className="p-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                              title="Kembalikan ke Pending"
                            >
                              <Clock size={16} />
                            </button>
                          )}
                        </div>
                        
                        {/* Tombol Cetak hanya muncul jika status Approved */}
                        {isApproved && (
                          <button onClick={() => handleOpenPrint(task)} className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors" title="Cetak"><Printer size={16} /></button>
                        )}

                        {/* Tombol Edit dan Delete HILANG jika Approved */}
                        {!isApproved && (
                          <>
                            <button onClick={() => handleOpenModal(task)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Edit"><Edit2 size={16} /></button>
                            <button onClick={() => requestDelete(task.id)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Hapus"><Trash2 size={16} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {tasks.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-slate-500">Belum ada data.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Hapus Surat Tugas"
        message="Apakah Anda yakin ingin menghapus surat tugas ini? Data yang dihapus tidak dapat dikembalikan."
        confirmText="Ya, Hapus"
      />

      {/* MODAL INPUT / EDIT */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-hidden">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b flex justify-between items-center bg-white rounded-t-2xl flex-shrink-0">
              <h3 className="text-xl font-bold text-slate-900">{editingTask ? 'Edit' : 'Buat'} Surat Tugas</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={24} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar bg-slate-50/30">
              <form id="assignment-form" onSubmit={handleSave} className="space-y-8">
                {/* ... (Form Content remains same as before) ... */}
                {/* Section 1 */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-widest flex items-center">
                    <span className="w-6 h-px bg-indigo-100 mr-2"></span> Identitas Surat
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Nomor Surat</label>
                      <input 
                        type="text" required 
                        value={formData.number} 
                        onChange={(e) => setFormData({...formData, number: e.target.value})} 
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Tanggal Surat</label>
                      <input 
                        type="date" required 
                        value={formData.date} 
                        onChange={(e) => setFormData({...formData, date: e.target.value})} 
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2 */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-widest flex items-center">
                    <span className="w-6 h-px bg-indigo-100 mr-2"></span> Dasar Penugasan
                  </h4>
                  <textarea 
                    required 
                    value={formData.basis} 
                    onChange={(e) => setFormData({...formData, basis: e.target.value})} 
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-sm outline-none focus:ring-2 focus:ring-indigo-500 h-20 resize-none" 
                    placeholder="Masukkan dasar penugasan. Tekan Enter untuk membuat poin baru."
                  />
                </div>

                {/* Section 3 */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-widest flex items-center">
                    <span className="w-6 h-px bg-indigo-100 mr-2"></span> Daftar Pegawai
                  </h4>
                  <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-4 shadow-sm">
                    <div className="flex flex-col md:flex-row items-end gap-3">
                      <div className="flex-1 w-full">
                        <select 
                          value={selectedEmpId} 
                          onChange={(e) => setSelectedEmpId(e.target.value)} 
                          className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">-- Pilih Pegawai --</option>
                          {employees.map(emp => (
                            <option key={emp.id} value={emp.id} className="text-black">{emp.name}</option>
                          ))}
                        </select>
                      </div>
                      <button type="button" onClick={addEmployeeToTask} className="w-full md:w-auto px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 flex items-center justify-center space-x-2">
                        <UserPlus size={18} /><span>Tambah</span>
                      </button>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <tbody className="divide-y">
                          {formData.employeeIds.map((eid, index) => {
                            const emp = employees.find(e => e.id === eid);
                            return (
                              <tr key={eid} className="hover:bg-slate-50">
                                <td className="px-4 py-2 font-bold text-black">{index + 1}. {emp?.name}</td>
                                <td className="px-4 py-2 text-right">
                                  <button type="button" onClick={() => removeEmployeeFromTask(eid)} className="text-rose-500 hover:bg-rose-50 p-1 rounded"><UserMinus size={14} /></button>
                                </td>
                              </tr>
                            );
                          })}
                          {formData.employeeIds.length === 0 && <tr><td className="px-4 py-4 text-center text-slate-400 italic">Harap tambahkan minimal 1 personel.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Section 4 */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-widest flex items-center">
                    <span className="w-6 h-px bg-indigo-100 mr-2"></span> Detail Kegiatan & Waktu
                  </h4>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Judul Kegiatan</label>
                      <input 
                        type="text" required 
                        value={formData.subject} 
                        onChange={(e) => setFormData({...formData, subject: e.target.value})} 
                        placeholder="Contoh: Konsultasi dan Koordinasi..." 
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                       <label className="block text-sm font-semibold text-slate-700 mb-1">Kota Tujuan (Uang Harian)</label>
                       <select 
                        required 
                        value={formData.destinationId} 
                        onChange={(e) => setFormData({...formData, destinationId: e.target.value})} 
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">-- Pilih Kota --</option>
                        {cities.map(c => <option key={c.id} value={c.id} className="text-black">{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Detail Lokasi / Alamat</label>
                      <input 
                        type="text"
                        value={formData.destinationAddress} 
                        onChange={(e) => setFormData({...formData, destinationAddress: e.target.value})} 
                        placeholder="Contoh: Hotel Borobudur..." 
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Tgl Mulai</label>
                      <input 
                        type="date" required 
                        value={formData.startDate} 
                        onChange={(e) => setFormData({...formData, startDate: e.target.value})} 
                        className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-black text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Tgl Selesai</label>
                      <input 
                        type="date" required 
                        value={formData.endDate} 
                        onChange={(e) => setFormData({...formData, endDate: e.target.value})} 
                        className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-black text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Total Hari</label>
                      <div className="flex items-center justify-center flex-1 bg-slate-100 text-slate-900 font-black rounded-lg text-sm border border-slate-200">
                        {formData.duration} Hari
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 5: Signature Configuration */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-widest flex items-center">
                    <span className="w-6 h-px bg-indigo-100 mr-2"></span> Pengaturan Tanda Tangan
                  </h4>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div>
                         <label className="block text-sm font-semibold text-slate-700 mb-1">Pejabat Penandatangan</label>
                         <select 
                            required 
                            value={formData.signatoryId} 
                            onChange={(e) => setFormData({...formData, signatoryId: e.target.value})} 
                            className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="">-- Pilih Pejabat --</option>
                            {signatories.map(sig => {
                              const emp = employees.find(e => e.id === sig.employeeId);
                              return <option key={sig.id} value={sig.id} className="text-black">{sig.role} - {emp?.name}</option>;
                            })}
                          </select>
                       </div>
                       <div>
                         <label className="block text-sm font-semibold text-slate-700 mb-1">Jenis Tanda Tangan</label>
                         <select 
                            value={formData.signatureType} 
                            onChange={(e) => setFormData({...formData, signatureType: e.target.value as any})} 
                            className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="Direct">Langsung (Kepala Dinas / Sekretaris)</option>
                            <option value="AN">Atas Nama (a.n.)</option>
                            <option value="UB">Untuk Beliau (u.b.)</option>
                          </select>
                       </div>
                    </div>

                    {(formData.signatureType === 'AN' || formData.signatureType === 'UB') && (
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">
                          Nama Jabatan Atasan (a.n.)
                        </label>
                        <input 
                          type="text" 
                          value={formData.upperTitle} 
                          onChange={(e) => setFormData({...formData, upperTitle: e.target.value})} 
                          placeholder="Contoh: Sekretaris Daerah" 
                          className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
                        />
                      </div>
                    )}

                    {formData.signatureType === 'UB' && (
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">
                          Nama Jabatan Menengah (u.b.)
                        </label>
                        <input 
                          type="text" 
                          value={formData.intermediateTitle} 
                          onChange={(e) => setFormData({...formData, intermediateTitle: e.target.value})} 
                          placeholder="Contoh: Asisten Administrasi Umum" 
                          className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
                        />
                      </div>
                    )}
                  </div>
                </div>
              </form>
            </div>

            <div className="p-6 border-t flex space-x-3 bg-white rounded-b-2xl flex-shrink-0">
              <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">Batal</button>
              <button form="assignment-form" type="submit" className="flex-1 px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-indigo-100 hover:bg-indigo-700">
                <CheckCircle2 size={20} /><span>Simpan Surat Tugas</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PRINT PREVIEW */}
      {/* ... Content stays same ... */}
       {isPrintModalOpen && printingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
          <div className="bg-white rounded-2xl w-full max-w-[210mm] shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 print:shadow-none print:m-0 print:w-full print:max-h-none print:h-auto">
            <div className="p-4 border-b flex justify-between items-center bg-white rounded-t-2xl flex-shrink-0 print:hidden">
               <div className="flex items-center space-x-2">
                 <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Printer size={20} /></div>
                 <h3 className="text-lg font-bold text-slate-900">Pratinjau Cetak</h3>
               </div>
               <div className="flex space-x-2">
                 <button onClick={() => window.print()} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg text-sm hover:bg-indigo-700 flex items-center space-x-2"><Printer size={16} /><span>Cetak Sekarang</span></button>
                 <button onClick={() => setIsPrintModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600"><X size={24} /></button>
               </div>
            </div>
            
            <div className="overflow-y-auto flex-1 custom-scrollbar">
              <div id="print-area" className="p-[25mm] text-black bg-white leading-normal" style={{ fontFamily: 'Times New Roman, serif' }}>
                {/* Header KOP */}
                 <div className="flex items-center justify-center border-b-[3px] border-black pb-4 mb-6 relative">
                   <div className="absolute left-0 top-0 h-24 w-20 flex items-center justify-center">
                      <img 
                        src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/Lambang_Kabupaten_Demak.png/486px-Lambang_Kabupaten_Demak.png" 
                        alt="Logo" 
                        className="h-20 w-auto object-contain"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                   </div>
                   <div className="text-center w-full ml-10">
                      <h3 className="text-xl font-medium tracking-wide">PEMERINTAH KABUPATEN DEMAK</h3>
                      <h1 className="text-2xl font-bold tracking-wider">SEKRETARIAT DAERAH</h1>
                      <p className="text-sm">Jalan Kyai Singkil 7, Demak, Jawa Tengah 59511,</p>
                      <p className="text-sm">Telepon (0291) 685877, Faksimile (0291) 685625,</p>
                      <p className="text-sm">Laman setda.demakkab.go.id, Pos-el setda@demakkab.go.id</p>
                   </div>
                </div>

                <div className="text-center mb-6">
                   <h3 className="text-lg font-bold underline uppercase tracking-widest">SURAT PERINTAH TUGAS</h3>
                   <p className="text-md uppercase">NOMOR : {printingTask.number}</p>
                </div>

                <div className="text-md text-justify">
                  <div className="flex mb-4">
                    <div className="w-[100px] shrink-0">Dasar</div>
                    <div className="w-[10px] shrink-0">:</div>
                    <div className="flex-1">
                      {printingTask.basis.split('\n').map((item, idx) => (
                        <div key={idx} className="flex mb-1">
                          <span className="mr-2">{idx + 1}.</span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="text-center font-bold uppercase my-6">MEMERINTAHKAN</div>

                  <div className="flex mb-4">
                    <div className="w-[100px] shrink-0">Kepada</div>
                    <div className="w-[10px] shrink-0">:</div>
                    <div className="flex-1">
                      {printingTask.employeeIds.map((eid, idx) => {
                        const emp = employees.find(e => e.id === eid);
                        return (
                          <div key={eid} className="mb-4">
                             <div className="flex">
                                <div className="w-6 shrink-0">{idx + 1}.</div>
                                <div className="w-32 shrink-0">Nama</div>
                                <div className="w-4 shrink-0">:</div>
                                <div className="font-bold">{emp?.name}</div>
                             </div>
                             <div className="flex">
                                <div className="w-6 shrink-0"></div>
                                <div className="w-32 shrink-0">Pangkat / Gol</div>
                                <div className="w-4 shrink-0">:</div>
                                <div>{emp?.grade}</div>
                             </div>
                             <div className="flex">
                                <div className="w-6 shrink-0"></div>
                                <div className="w-32 shrink-0">NIP</div>
                                <div className="w-4 shrink-0">:</div>
                                <div>{emp?.nip}</div>
                             </div>
                             <div className="flex">
                                <div className="w-6 shrink-0"></div>
                                <div className="w-32 shrink-0">Jabatan</div>
                                <div className="w-4 shrink-0">:</div>
                                <div>{emp?.position}</div>
                             </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex mb-4">
                    <div className="w-[100px] shrink-0">Untuk</div>
                    <div className="w-[10px] shrink-0">:</div>
                    <div className="flex-1">
                      <div className="flex mb-1">
                         <span className="mr-2">1.</span>
                         <span>{printingTask.subject};</span>
                      </div>
                      <div className="flex mb-1">
                         <span className="mr-2">2.</span>
                         <span>Tempat {printingTask.destinationAddress ? `${printingTask.destinationAddress}, ` : ''}{cities.find(c => c.id === printingTask.destinationId)?.name};</span>
                      </div>
                      <div className="flex mb-1">
                         <span className="mr-2">3.</span>
                         <span>Waktu Pelaksanaan {formatDateIndo(printingTask.startDate)} s.d {formatDateIndo(printingTask.endDate)} ({printingTask.duration} hari);</span>
                      </div>
                      <div className="flex mb-1">
                         <span className="mr-2">4.</span>
                         <span>Melaporkan hasil pelaksanaan tugas kepada pimpinan.</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-10 flex justify-end">
                     <div className="w-[350px]">
                        <div className="mb-4">
                          <p>Dikeluarkan di Demak</p>
                          <p>Pada tanggal {formatDateIndo(printingTask.date)}</p>
                        </div>
                        
                        <div className="space-y-1 mb-20">
                          {(!printingTask.signatureType || printingTask.signatureType === 'Direct') && (
                             <p className="font-bold">{employees.find(e => e.id === signatories.find(s => s.id === printingTask.signatoryId)?.employeeId)?.position}</p>
                          )}

                          {printingTask.signatureType === 'AN' && (
                            <>
                              <p>a.n. {printingTask.upperTitle}</p>
                              <p className="font-bold">{employees.find(e => e.id === signatories.find(s => s.id === printingTask.signatoryId)?.employeeId)?.position},</p>
                            </>
                          )}

                          {printingTask.signatureType === 'UB' && (
                            <>
                              <p>a.n. {printingTask.upperTitle}</p>
                              <p>{printingTask.intermediateTitle},</p>
                              <p className="italic">u.b.</p>
                              <p className="font-bold">{employees.find(e => e.id === signatories.find(s => s.id === printingTask.signatoryId)?.employeeId)?.position}</p>
                            </>
                          )}
                        </div>

                        <div>
                          <p className="font-bold underline">
                             {employees.find(e => e.id === signatories.find(s => s.id === printingTask.signatoryId)?.employeeId)?.name}
                          </p>
                          <p>{employees.find(e => e.id === signatories.find(s => s.id === printingTask.signatoryId)?.employeeId)?.grade}</p>
                          <p>NIP {employees.find(e => e.id === signatories.find(s => s.id === printingTask.signatoryId)?.employeeId)?.nip}</p>
                        </div>
                     </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%; 
            padding: 0;
            margin: 0;
          }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default AssignmentManager;
