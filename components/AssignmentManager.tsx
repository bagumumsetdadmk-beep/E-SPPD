
import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  X, 
  Trash2, 
  Edit2, 
  UserPlus, 
  MapPin, 
  UserMinus, 
  Printer, 
  Clock, 
  CheckCircle, 
  ShieldCheck, 
  Check, 
  XCircle, 
  RefreshCw,
  CheckCircle2,
  Calendar,
  FileText
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { AssignmentLetter, Employee, Signatory, City, AgencySettings, User } from '../types';
import ConfirmationModal from './ConfirmationModal';

const INITIAL_SETTINGS: AgencySettings = {
  name: 'PEMERINTAH KABUPATEN DEMAK',
  department: 'SEKRETARIAT DAERAH',
  address: 'Jalan Kyai Singkil 7, Demak, Jawa Tengah 59511',
  contactInfo: 'Telepon (0291) 685877, Faksimile (0291) 685625, Laman setda.demakkab.go.id, Pos-el setda@demakkab.go.id',
  logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/Lambang_Kabupaten_Demak.png/486px-Lambang_Kabupaten_Demak.png'
};

const AssignmentManager: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [signatories, setSignatories] = useState<Signatory[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [agencySettings, setAgencySettings] = useState<AgencySettings>(INITIAL_SETTINGS);
  const [tasks, setTasks] = useState<AssignmentLetter[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<AssignmentLetter | null>(null);
  const [printingTask, setPrintingTask] = useState<AssignmentLetter | null>(null);
  const [selectedEmpId, setSelectedEmpId] = useState('');

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

  const isAdmin = user?.role === 'Admin';
  const isOperator = user?.role === 'Operator';
  const isVerificator = user?.role === 'Verificator';

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

  const loadMasterData = () => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) setUser(JSON.parse(savedUser));

    const empData = localStorage.getItem('employees');
    const sigData = localStorage.getItem('signatories');
    const cityData = localStorage.getItem('cities');
    const settingsData = localStorage.getItem('agency_settings');
    
    setEmployees(empData ? JSON.parse(empData) : []);
    setSignatories(sigData ? JSON.parse(sigData) : []);
    setCities(cityData ? JSON.parse(cityData) : []);
    if (settingsData) setAgencySettings(JSON.parse(settingsData));
  };

  useEffect(() => {
    loadMasterData();
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setIsLoading(true);
    const client = getSupabase();
    if (client) {
      try {
        const { data } = await client.from('assignment_letters').select('*').order('created_at', { ascending: false });
        if (data) {
           const mappedData: AssignmentLetter[] = data.map((item: any) => ({
             id: item.id,
             number: item.number,
             date: item.date,
             basis: item.basis,
             employeeIds: item.employee_ids || [], 
             subject: item.subject,
             destinationId: item.destination_id,
             destinationAddress: item.destination_address,
             startDate: item.start_date,
             endDate: item.end_date,
             duration: item.duration,
             signatoryId: item.signatory_id,
             status: item.status,
             signatureType: item.signature_type,
             upperTitle: item.upper_title,
             intermediateTitle: item.intermediate_title
           }));
           setTasks(mappedData);
           setIsLoading(false);
           return;
        }
      } catch (e) {}
    }
    const saved = localStorage.getItem('assignment_tasks_v2');
    setTasks(saved ? JSON.parse(saved) : []);
    setIsLoading(false);
  };

  const syncToLocalStorage = (data: AssignmentLetter[]) => {
    localStorage.setItem('assignment_tasks_v2', JSON.stringify(data));
  };

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
    // Permission: Admin OR Operator
    if (!isAdmin && !isOperator) return;
    
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
    setIsModalOpen(true);
  };

  const handleOpenPrint = (task: AssignmentLetter) => {
    // Permission: Admin OR Operator
    if (!isAdmin && !isOperator) return;
    setPrintingTask(task);
    setIsPrintModalOpen(true);
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    if (!isAdmin && !isVerificator) return;
    setTasks(tasks.map(t => t.id === id ? { ...t, status: newStatus } : t));
    const client = getSupabase();
    if (client) {
        try {
            await client.from('assignment_letters').update({ status: newStatus }).eq('id', id);
        } catch(e) {}
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.employeeIds.length === 0) {
        alert("Pilih minimal satu pegawai yang bertugas.");
        return;
    }

    const client = getSupabase();
    const newId = editingTask ? editingTask.id : Date.now().toString();
    const currentStatus = editingTask ? editingTask.status : 'Pending';

    const newTask: AssignmentLetter = { ...formData, id: newId, status: currentStatus };
    const dbPayload = {
        id: newId,
        number: formData.number,
        date: formData.date,
        basis: formData.basis,
        employee_ids: formData.employeeIds,
        subject: formData.subject,
        destination_id: formData.destinationId,
        destination_address: formData.destinationAddress,
        start_date: formData.startDate,
        end_date: formData.endDate,
        duration: formData.duration,
        signatory_id: formData.signatoryId,
        status: currentStatus,
        signature_type: formData.signatureType,
        upper_title: formData.upperTitle,
        intermediate_title: formData.intermediateTitle
    };

    let updatedList;
    if (editingTask) {
      updatedList = tasks.map((t) => t.id === editingTask.id ? newTask : t);
    } else {
      updatedList = [newTask, ...tasks];
    }
    setTasks(updatedList);
    syncToLocalStorage(updatedList);
    setIsModalOpen(false);

    if (client) {
        try { await client.from('assignment_letters').upsert(dbPayload); } catch (e) {}
    }
  };

  const confirmDelete = async () => {
    if (itemToDelete) {
      const updatedList = tasks.filter((t) => t.id !== itemToDelete);
      setTasks(updatedList);
      syncToLocalStorage(updatedList);
      const client = getSupabase();
      if(client) {
          try { await client.from('assignment_letters').delete().eq('id', itemToDelete); } catch(e) {}
      }
      setItemToDelete(null);
    }
  };

  const addEmployee = () => {
    if (selectedEmpId && !formData.employeeIds.includes(selectedEmpId)) {
      setFormData(prev => ({ ...prev, employeeIds: [...prev.employeeIds, selectedEmpId] }));
      setSelectedEmpId('');
    }
  };

  const removeEmployee = (id: string) => {
    setFormData(prev => ({ ...prev, employeeIds: prev.employeeIds.filter(empId => empId !== id) }));
  };

  const formatDateIndo = (dateStr: string) => {
    if(!dateStr) return '-';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).format(date);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Surat Tugas</h1>
          <p className="text-slate-500">Penerbitan, Verifikasi, dan Pencetakan Surat Tugas resmi.</p>
        </div>
        <div className="flex items-center space-x-2">
            <button onClick={fetchTasks} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
                <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
            </button>
            {(isAdmin || isOperator) && (
              <button 
                type="button"
                onClick={() => handleOpenModal()}
                className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all font-bold"
              >
                <Plus size={18} />
                <span className="text-sm">Buat Surat Tugas</span>
              </button>
            )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden print:hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Nomor & Tanggal</th>
                <th className="px-6 py-4">Kegiatan</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Waktu</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y text-sm divide-slate-100">
              {tasks.map((task) => {
                const dest = cities.find(c => c.id === task.destinationId);
                const isApproved = task.status === 'Approved';
                const canVerify = (isAdmin) || (isVerificator && !isApproved);
                const canPrint = (isAdmin || isOperator) && isApproved;
                const canManage = (isAdmin) || (isOperator && !isApproved);

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
                        {task.status === 'Approved' ? (
                            <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md text-xs font-bold flex w-fit items-center">
                                <CheckCircle2 size={12} className="mr-1"/> Disetujui
                            </span>
                        ) : task.status === 'Rejected' ? (
                            <span className="px-2 py-1 bg-rose-100 text-rose-700 rounded-md text-xs font-bold flex w-fit items-center">
                                <XCircle size={12} className="mr-1"/> Ditolak
                            </span>
                        ) : (
                            <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-bold flex w-fit items-center">
                                <Clock size={12} className="mr-1"/> Menunggu
                            </span>
                        )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-700 font-medium">{task.duration} Hari</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end items-center space-x-1">
                        {canVerify && (
                            <div className="flex border-r pr-2 mr-1 space-x-1">
                                {task.status !== 'Approved' && (
                                    <button onClick={() => handleUpdateStatus(task.id, 'Approved')} className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100" title="Setujui"><Check size={16} /></button>
                                )}
                                {task.status !== 'Rejected' && (
                                    <button onClick={() => handleUpdateStatus(task.id, 'Rejected')} className="p-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100" title="Tolak"><XCircle size={16} /></button>
                                )}
                            </div>
                        )}
                        {canPrint && (
                            <button onClick={() => handleOpenPrint(task)} className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100" title="Cetak Surat Tugas">
                                <Printer size={16} />
                            </button>
                        )}
                        {canManage && (
                          <>
                            <button onClick={() => handleOpenModal(task)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Edit"><Edit2 size={16} /></button>
                            <button onClick={() => {setItemToDelete(task.id); setIsDeleteModalOpen(true);}} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Hapus"><Trash2 size={16} /></button>
                          </>
                        )}
                        {!canVerify && !canPrint && !canManage && (
                            <span className="text-xs text-slate-400">View Only</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmationModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={confirmDelete} title="Hapus Surat Tugas" message="Hapus data?" />

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50 rounded-t-2xl">
              <h3 className="text-xl font-bold text-slate-900 flex items-center">
                  <FileText className="mr-2 text-indigo-600" />
                  {editingTask ? 'Edit' : 'Buat'} Surat Tugas
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Header Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Nomor Surat</label>
                    <input type="text" required value={formData.number} onChange={(e) => setFormData({...formData, number: e.target.value})} className="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Contoh: 094/015/2024" />
                 </div>
                 <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Tanggal Surat</label>
                    <input type="date" required value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                 </div>
              </div>

              <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Dasar Pelaksanaan</label>
                  <textarea required rows={3} value={formData.basis} onChange={(e) => setFormData({...formData, basis: e.target.value})} className="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none" placeholder="Dasar hukum atau disposisi..." />
              </div>

              {/* Employee Selection */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Pegawai yang Ditugaskan</label>
                  <div className="flex gap-2 mb-3">
                     <select value={selectedEmpId} onChange={(e) => setSelectedEmpId(e.target.value)} className="flex-1 px-4 py-2 bg-white border border-slate-300 rounded-xl text-sm outline-none">
                        <option value="">-- Pilih Pegawai --</option>
                        {employees.map(emp => (
                           <option key={emp.id} value={emp.id} disabled={formData.employeeIds.includes(emp.id)}>{emp.name} - {emp.position}</option>
                        ))}
                     </select>
                     <button type="button" onClick={addEmployee} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 text-sm"><UserPlus size={16}/></button>
                  </div>
                  <div className="space-y-2">
                      {formData.employeeIds.map((empId, idx) => {
                          const emp = employees.find(e => e.id === empId);
                          return (
                              <div key={empId} className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                  <div className="flex items-center space-x-3">
                                      <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">{idx + 1}</div>
                                      <div>
                                          <p className="text-sm font-bold text-slate-900">{emp?.name}</p>
                                          <p className="text-xs text-slate-500">{emp?.nip} • {emp?.grade}</p>
                                      </div>
                                  </div>
                                  <button type="button" onClick={() => removeEmployee(empId)} className="text-rose-500 hover:bg-rose-50 p-1 rounded"><UserMinus size={16}/></button>
                              </div>
                          );
                      })}
                      {formData.employeeIds.length === 0 && <p className="text-center text-slate-400 text-sm py-2 italic">Belum ada pegawai dipilih.</p>}
                  </div>
              </div>

              <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Maksud Perjalanan Dinas</label>
                  <textarea required rows={3} value={formData.subject} onChange={(e) => setFormData({...formData, subject: e.target.value})} className="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none" placeholder="Uraian kegiatan..." />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-4">
                     <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Kota Tujuan</label>
                        <select required value={formData.destinationId} onChange={(e) => setFormData({...formData, destinationId: e.target.value})} className="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl text-sm outline-none">
                            <option value="">-- Pilih Kota --</option>
                            {cities.map(city => <option key={city.id} value={city.id}>{city.name} ({city.province})</option>)}
                        </select>
                     </div>
                     <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Alamat Tujuan (Spesifik)</label>
                        <textarea value={formData.destinationAddress} onChange={(e) => setFormData({...formData, destinationAddress: e.target.value})} className="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl text-sm outline-none resize-none" rows={2} placeholder="Nama Gedung / Hotel / Instansi..." />
                     </div>
                 </div>
                 <div className="space-y-4">
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Tgl. Berangkat</label>
                            <input type="date" required value={formData.startDate} onChange={(e) => setFormData({...formData, startDate: e.target.value})} className="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl text-sm outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Tgl. Kembali</label>
                            <input type="date" required value={formData.endDate} onChange={(e) => setFormData({...formData, endDate: e.target.value})} className="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl text-sm outline-none" />
                        </div>
                     </div>
                     <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100 flex items-center justify-between">
                        <span className="text-sm font-bold text-indigo-700">Durasi Perjalanan:</span>
                        <span className="text-lg font-black text-indigo-700">{formData.duration} Hari</span>
                     </div>
                 </div>
              </div>

              {/* Signature Section */}
              <div className="border-t pt-4">
                  <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center"><ShieldCheck className="mr-2 text-slate-400" size={18}/> Otorisasi & Tanda Tangan</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Jenis Tanda Tangan</label>
                        <select value={formData.signatureType} onChange={(e) => setFormData({...formData, signatureType: e.target.value as any})} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm outline-none">
                            <option value="Direct">Langsung (Kepala)</option>
                            <option value="AN">Atas Nama (a.n.)</option>
                            <option value="UB">Untuk Beliau (u.b.)</option>
                        </select>
                     </div>
                     {(formData.signatureType === 'AN' || formData.signatureType === 'UB') && (
                         <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Jabatan Atasan (Baris 1)</label>
                            <input type="text" value={formData.upperTitle} onChange={(e) => setFormData({...formData, upperTitle: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm outline-none" placeholder="Contoh: Sekretaris Daerah" />
                         </div>
                     )}
                     {formData.signatureType === 'UB' && (
                         <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Jabatan Menjabat (Baris 2)</label>
                            <input type="text" value={formData.intermediateTitle} onChange={(e) => setFormData({...formData, intermediateTitle: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm outline-none" placeholder="Contoh: Asisten Administrasi" />
                         </div>
                     )}
                  </div>
                  <div className="mt-3">
                     <label className="block text-sm font-semibold text-slate-700 mb-1">Pejabat Penandatangan</label>
                     <select required value={formData.signatoryId} onChange={(e) => setFormData({...formData, signatoryId: e.target.value})} className="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl text-sm outline-none">
                        <option value="">-- Pilih Pejabat --</option>
                        {signatories.map(sig => {
                            const emp = employees.find(e => e.id === sig.employeeId);
                            return <option key={sig.id} value={sig.id}>{emp?.name} ({sig.role})</option>
                        })}
                     </select>
                  </div>
              </div>

            </form>
            <div className="p-6 border-t bg-slate-50 rounded-b-2xl flex justify-end space-x-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors">Batal</button>
                <button type="button" onClick={handleSave} className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all">Simpan Dokumen</button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT MODAL */}
      {isPrintModalOpen && printingTask && (
        <div className="fixed inset-0 z-[60] bg-white flex flex-col h-screen w-screen overflow-hidden">
             <div className="bg-slate-800 text-white p-4 flex justify-between items-center shadow-md print:hidden">
                 <h2 className="text-lg font-bold flex items-center"><Printer className="mr-2"/> Pratinjau Cetak Surat Tugas</h2>
                 <div className="flex items-center space-x-3">
                     <button onClick={() => window.print()} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-bold text-sm transition-colors">Cetak Sekarang</button>
                     <button onClick={() => setIsPrintModalOpen(false)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-bold text-sm transition-colors">Tutup</button>
                 </div>
             </div>
             
             <div className="flex-1 overflow-auto bg-slate-100 p-8 print:p-0 print:bg-white print:overflow-visible">
                 <div className="max-w-[210mm] mx-auto bg-white p-[20mm] shadow-xl print:shadow-none print:w-full print:max-w-none print:mx-0">
                     {/* Kop Surat Full Image (Updated to use kopSuratUrl) */}
                     <div className="mb-6 w-full">
                         {agencySettings.kopSuratUrl ? (
                             <img 
                               src={agencySettings.kopSuratUrl} 
                               alt="Kop Surat" 
                               className="w-full h-auto object-contain max-h-[150px] mx-auto" 
                               onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                             />
                         ) : (
                             <div className="w-full text-center p-4 border border-dashed text-slate-400">
                                 [Kop Surat Belum Diatur]
                             </div>
                         )}
                     </div>

                     <div className="text-center mb-8">
                         <h2 className="text-xl font-bold underline uppercase decoration-2 underline-offset-4">SURAT TUGAS</h2>
                         <p className="text-sm mt-1">Nomor : {printingTask.number}</p>
                     </div>

                     <div className="space-y-6 text-justify leading-relaxed font-serif text-[12pt]">
                         <div className="flex items-start">
                             <div className="w-32 flex-shrink-0">Dasar</div>
                             <div className="w-4 flex-shrink-0 text-center">:</div>
                             <div className="flex-1 whitespace-pre-line">{printingTask.basis}</div>
                         </div>

                         <div className="text-center font-bold my-4">MEMERINTAHKAN:</div>

                         <div className="flex items-start">
                             <div className="w-32 flex-shrink-0">Kepada</div>
                             <div className="w-4 flex-shrink-0 text-center">:</div>
                             <div className="flex-1">
                                 <table className="w-full border-collapse">
                                     <tbody>
                                         {printingTask.employeeIds.map((empId, idx) => {
                                             const emp = employees.find(e => e.id === empId);
                                             return (
                                                 <tr key={empId} className="align-top">
                                                     <td className="w-6 py-1">{idx + 1}.</td>
                                                     <td className="w-32 py-1">Nama</td>
                                                     <td className="w-4 text-center py-1">:</td>
                                                     <td className="py-1 font-bold">{emp?.name}</td>
                                                 </tr>
                                             );
                                         })}
                                     </tbody>
                                 </table>
                             </div>
                         </div>

                         <div className="flex items-start">
                             <div className="w-32 flex-shrink-0">Untuk</div>
                             <div className="w-4 flex-shrink-0 text-center">:</div>
                             <div className="flex-1">
                                 <ol className="list-decimal pl-4 space-y-2">
                                     <li>
                                         <span className="font-bold">Maksud:</span> {printingTask.subject}.
                                     </li>
                                     <li>
                                         <span className="font-bold">Tujuan:</span> {cities.find(c => c.id === printingTask.destinationId)?.name}.
                                         {printingTask.destinationAddress && <span> ({printingTask.destinationAddress})</span>}
                                     </li>
                                     <li>
                                         <span className="font-bold">Waktu:</span> {printingTask.duration} hari, 
                                         Terhitung mulai tanggal {new Date(printingTask.startDate).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})} s/d {new Date(printingTask.endDate).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}.
                                     </li>
                                     <li>
                                         Melaporkan hasil pelaksanaan tugas kepada atasan.
                                     </li>
                                 </ol>
                             </div>
                         </div>
                         
                         <div className="mt-8">
                             <p>Demikian Surat Tugas ini dibuat untuk dilaksanakan dengan penuh tanggung jawab.</p>
                         </div>
                     </div>

                     <div className="mt-16 flex justify-end">
                         <div className="w-80 text-center font-serif text-[12pt]">
                             <p className="mb-1">Ditetapkan di Demak</p>
                             <p className="mb-4">Pada Tanggal {new Date(printingTask.date).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</p>
                             
                             {/* Dynamic Signature Block */}
                             {(() => {
                                 const sig = signatories.find(s => s.id === printingTask.signatoryId);
                                 const sigEmp = employees.find(e => e.id === sig?.employeeId);
                                 
                                 if(printingTask.signatureType === 'AN') {
                                     return (
                                         <>
                                            <p className="font-bold">a.n. {printingTask.upperTitle || 'BUPATI DEMAK'}</p>
                                            <p className="font-bold mb-20">{sig?.role}</p>
                                            <p className="font-bold underline text-sm">{sigEmp?.name}</p>
                                            <p className="text-sm">{sigEmp?.grade}</p>
                                            <p className="text-sm">NIP. {sigEmp?.nip}</p>
                                         </>
                                     );
                                 } else if (printingTask.signatureType === 'UB') {
                                     return (
                                         <>
                                            <p className="font-bold">a.n. {printingTask.upperTitle || 'BUPATI DEMAK'}</p>
                                            <p className="font-bold">{printingTask.intermediateTitle || 'SEKRETARIS DAERAH'}</p>
                                            <p className="mb-2">u.b.</p>
                                            <p className="font-bold mb-16">{sig?.role}</p>
                                            <p className="font-bold underline text-sm">{sigEmp?.name}</p>
                                            <p className="text-sm">{sigEmp?.grade}</p>
                                            <p className="text-sm">NIP. {sigEmp?.nip}</p>
                                         </>
                                     );
                                 } else {
                                     return (
                                         <>
                                            <p className="font-bold mb-20">{sig?.role?.toUpperCase()}</p>
                                            <p className="font-bold underline text-sm">{sigEmp?.name}</p>
                                            <p className="text-sm">{sigEmp?.grade}</p>
                                            <p className="text-sm">NIP. {sigEmp?.nip}</p>
                                         </>
                                     );
                                 }
                             })()}
                         </div>
                     </div>
                 </div>
             </div>
        </div>
      )}
    </div>
  );
};

export default AssignmentManager;
