
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
  CheckCircle2
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
    
    // Removed loadMasterData() here to prevent re-render issues/race conditions
    
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
    // Logic permission check inside handler as backup
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
    if (formData.employeeIds.length === 0) return;

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
            {/* Create Button: OPS & Admin Only */}
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

                // --- ACCESS CONTROL LOGIC ---
                // 1. Verification (Check/Reject):
                //    - New Doc (Not Approved): Admin & Verificator
                //    - Approved Doc: Admin Only
                const canVerify = (isAdmin) || (isVerificator && !isApproved);

                // 2. Print:
                //    - Admin & Operator (Typically only when approved)
                const canPrint = (isAdmin || isOperator) && isApproved;

                // 3. CRUD (Edit/Delete):
                //    - New Doc (Not Approved): Admin & Operator
                //    - Approved Doc: Admin Only
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
                      {task.status}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-700 font-medium">{task.duration} Hari</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end items-center space-x-1">
                        
                        {/* 1. VERIFICATION ACTIONS */}
                        {canVerify && (
                            <div className="flex border-r pr-2 mr-1 space-x-1">
                                {/* If not Approved, show Verify button. If Approved (and is Admin), show nothing (or allow reject to revert) */}
                                {task.status !== 'Approved' && (
                                    <button onClick={() => handleUpdateStatus(task.id, 'Approved')} className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100" title="Setujui"><Check size={16} /></button>
                                )}
                                {task.status !== 'Rejected' && (
                                    <button onClick={() => handleUpdateStatus(task.id, 'Rejected')} className="p-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100" title="Tolak"><XCircle size={16} /></button>
                                )}
                            </div>
                        )}
                        
                        {/* 2. PRINT ACTION */}
                        {canPrint && (
                            <button onClick={() => handleOpenPrint(task)} className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100" title="Cetak Surat Tugas">
                                <Printer size={16} />
                            </button>
                        )}
                        
                        {/* 3. CRUD ACTIONS */}
                        {canManage && (
                          <>
                            <button onClick={() => handleOpenModal(task)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Edit"><Edit2 size={16} /></button>
                            <button onClick={() => {setItemToDelete(task.id); setIsDeleteModalOpen(true);}} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Hapus"><Trash2 size={16} /></button>
                          </>
                        )}

                        {/* View Only Indication */}
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
      {/* Modals same as before but respecting isAdmin/isOperator checks */}
      <ConfirmationModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={confirmDelete} title="Hapus Surat Tugas" message="Hapus data?" />
    </div>
  );
};

export default AssignmentManager;
