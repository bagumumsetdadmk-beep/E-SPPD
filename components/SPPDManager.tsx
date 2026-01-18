
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ClipboardList, 
  Calendar, 
  CheckCircle, 
  FileCheck, 
  Plus, 
  X, 
  Trash2, 
  Edit2, 
  ArrowRight, 
  FileText, 
  User, 
  MapPin, 
  Printer, 
  DollarSign,
  RefreshCw
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { AssignmentLetter, Employee, City, SPPD, TransportMode, FundingSource, Signatory, AgencySettings } from '../types';
import ConfirmationModal from './ConfirmationModal';

const INITIAL_SETTINGS: AgencySettings = {
  name: 'PEMERINTAH KABUPATEN DEMAK',
  department: 'SEKRETARIAT DAERAH',
  address: 'Jalan Kyai Singkil 7, Demak, Jawa Tengah 59511',
  contactInfo: 'Telepon (0291) 685877, Faksimile (0291) 685625, Laman setda.demakkab.go.id, Pos-el setda@demakkab.go.id',
  logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/Lambang_Kabupaten_Demak.png/486px-Lambang_Kabupaten_Demak.png'
};

const SPPDManager: React.FC = () => {
  const navigate = useNavigate();

  // Master Data
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [transportModes, setTransportModes] = useState<TransportMode[]>([]);
  const [fundingSources, setFundingSources] = useState<FundingSource[]>([]);
  const [signatories, setSignatories] = useState<Signatory[]>([]);
  const [assignments, setAssignments] = useState<AssignmentLetter[]>([]);
  const [agencySettings, setAgencySettings] = useState<AgencySettings>(INITIAL_SETTINGS);

  // SPPD State
  const [sppds, setSppds] = useState<SPPD[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  
  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const [editingSppd, setEditingSppd] = useState<Partial<SPPD> | null>(null);
  const [printingSppd, setPrintingSppd] = useState<SPPD | null>(null);
  
  // Helper State for form display
  const [formData, setFormData] = useState<{
    id: string;
    assignmentId: string;
    ref: string; // Nomor Surat Tugas
    startDate: string;
    endDate: string;
    displayEmployeeNames: string; // Helper for UI
    destinationName: string; // Helper for UI
    transportId: string;
    fundingId: string;
  }>({ 
    id: '', 
    assignmentId: '',
    ref: '', 
    startDate: '',
    endDate: '', 
    displayEmployeeNames: '',
    destinationName: '',
    transportId: '',
    fundingId: ''
  });

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

  // Load Data
  useEffect(() => {
    loadLocalData();
    fetchData();
  }, []);

  const loadLocalData = () => {
    const empData = localStorage.getItem('employees');
    const cityData = localStorage.getItem('cities');
    const taskData = localStorage.getItem('assignment_tasks_v2');
    const transData = localStorage.getItem('transport_modes');
    const fundData = localStorage.getItem('funding_sources');
    const sigData = localStorage.getItem('signatories');
    const settingsData = localStorage.getItem('agency_settings');
    const sppdData = localStorage.getItem('sppd_data');

    setEmployees(empData ? JSON.parse(empData) : []);
    setCities(cityData ? JSON.parse(cityData) : []);
    setAssignments(taskData ? JSON.parse(taskData) : []);
    setTransportModes(transData ? JSON.parse(transData) : []);
    setFundingSources(fundData ? JSON.parse(fundData) : []);
    setSignatories(sigData ? JSON.parse(sigData) : []);
    setSppds(sppdData ? JSON.parse(sppdData) : []);
    if (settingsData) {
      setAgencySettings(JSON.parse(settingsData));
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    const client = getSupabase();
    
    if (client) {
      try {
        // 1. Fetch SPPDs
        const { data: sppdData, error: sppdError } = await client.from('sppds').select('*').order('created_at', { ascending: false });
        if (sppdError) throw sppdError;
        if (sppdData) {
           const mappedSppds: SPPD[] = sppdData.map((item: any) => ({
             id: item.id,
             assignmentId: item.assignment_id,
             startDate: item.start_date,
             endDate: item.end_date,
             status: item.status,
             transportId: item.transport_id,
             fundingId: item.funding_id
           }));
           setSppds(mappedSppds);
        }

        // 2. Fetch Assignments (To check status 'Approved')
        const { data: taskData, error: taskError } = await client.from('assignment_letters').select('*').order('created_at', { ascending: false });
        if (taskData) {
            const mappedTasks: AssignmentLetter[] = taskData.map((item: any) => ({
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
            setAssignments(mappedTasks);
        }

      } catch (e) {
        console.error("DB Fetch Error:", e);
      }
    }
    setIsLoading(false);
  };

  const syncToLocalStorage = (data: SPPD[]) => {
    localStorage.setItem('sppd_data', JSON.stringify(data));
  };

  // Filter: Assignment Approved but NOT in SPPDs
  const readyToProcess = assignments.filter(task => 
    task.status === 'Approved' && !sppds.some(sppd => sppd.assignmentId === task.id)
  );

  const handleCreateFromAssignment = (task: AssignmentLetter) => {
    const taskEmployees = employees.filter(e => task.employeeIds.includes(e.id)).map(e => e.name).join(', ');
    const dest = cities.find(c => c.id === task.destinationId)?.name || '-';
    
    // Generate new ID
    const newId = `090/${Math.floor(100 + Math.random() * 900)}/2024`;

    setEditingSppd(null); // Mode Create
    setFormData({
      id: newId,
      assignmentId: task.id,
      ref: task.number,
      startDate: task.startDate,
      endDate: task.endDate,
      displayEmployeeNames: taskEmployees,
      destinationName: dest,
      transportId: '',
      fundingId: ''
    });
    setIsModalOpen(true);
  };

  const handleEditSppd = (sppd: SPPD) => {
    const task = assignments.find(a => a.id === sppd.assignmentId);
    let empNames = '-';
    let destName = '-';

    if (task) {
      empNames = employees.filter(e => task.employeeIds.includes(e.id)).map(e => e.name).join(', ');
      destName = cities.find(c => c.id === task.destinationId)?.name || '-';
    }

    setEditingSppd(sppd);
    setFormData({
      id: sppd.id,
      assignmentId: sppd.assignmentId,
      ref: task?.number || '',
      startDate: sppd.startDate,
      endDate: sppd.endDate,
      displayEmployeeNames: empNames,
      destinationName: destName,
      transportId: sppd.transportId || '',
      fundingId: sppd.fundingId || ''
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const client = getSupabase();
    const currentStatus = editingSppd ? (editingSppd.status || 'Sedang Berjalan') : 'Sedang Berjalan';

    const newSppdData: SPPD = {
      id: formData.id,
      assignmentId: formData.assignmentId,
      startDate: formData.startDate,
      endDate: formData.endDate,
      status: currentStatus as 'Sedang Berjalan' | 'Selesai',
      transportId: formData.transportId,
      fundingId: formData.fundingId
    };

    const dbPayload = {
      id: formData.id,
      assignment_id: formData.assignmentId,
      start_date: formData.startDate,
      end_date: formData.endDate,
      status: currentStatus,
      transport_id: formData.transportId,
      funding_id: formData.fundingId
    };

    if (editingSppd) {
      setSppds(sppds.map(s => s.id === editingSppd.id ? { ...newSppdData } : s));
    } else {
      setSppds([...sppds, newSppdData]);
    }
    syncToLocalStorage(editingSppd ? sppds.map(s => s.id === editingSppd.id ? newSppdData : s) : [...sppds, newSppdData]);
    setIsModalOpen(false);

    if(client) {
      try {
        const { error } = await client.from('sppds').upsert(dbPayload);
        if(error) {
          alert("Gagal simpan DB: " + error.message);
          fetchData();
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
      const updatedList = sppds.filter(s => s.id !== itemToDelete);
      setSppds(updatedList);
      syncToLocalStorage(updatedList);

      const client = getSupabase();
      if(client) {
        try {
          await client.from('sppds').delete().eq('id', itemToDelete);
        } catch(e) { console.error(e); }
      }
      setItemToDelete(null);
    }
  };

  const handleGoToReceipt = (sppdId: string) => {
    // Navigate to Receipt Manager with the SPPD ID to trigger creation
    navigate('/kwitansi', { state: { createSppdId: sppdId } });
  };

  const handlePrint = (sppd?: SPPD) => {
    if (sppd) {
        // Refresh master data to ensure names are correct before printing
        loadLocalData();
        setPrintingSppd(sppd);
        setIsPrintModalOpen(true);
    } else {
        window.print();
    }
  };

  // Helper renderers
  const getTaskDetails = (assignmentId: string) => {
    const task = assignments.find(a => a.id === assignmentId);
    if (!task) return { names: 'Data Terhapus', dest: 'Unknown', ref: 'Unknown' };
    
    const names = employees.filter(e => task.employeeIds.includes(e.id)).map(e => e.name).join(', ');
    const dest = cities.find(c => c.id === task.destinationId)?.name || '-';
    
    return { names, dest, ref: task.number, taskObj: task };
  };

  const formatDateRange = (start: string, end: string) => {
    const s = new Date(start).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    const e = new Date(end).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${s} - ${e}`;
  };

  const formatDateIndo = (dateStr: string) => {
    if(!dateStr) return '-';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).format(date);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* ... (Keep existing header and lists) ... */}
      <div className="flex justify-between items-center print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Penerbitan SPPD</h1>
          <p className="text-slate-500">Kelola penerbitan dokumen SPPD berdasarkan Surat Tugas yang disetujui.</p>
        </div>
        <div className="flex items-center space-x-2">
            <button onClick={fetchData} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
                <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
            </button>
        </div>
      </div>

      {/* SECTION 1: READY TO PROCESS */}
      <div className="space-y-4 print:hidden">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center">
          <div className="w-2 h-2 rounded-full bg-amber-500 mr-2"></div>
          Surat Tugas Siap Proses SPPD ({readyToProcess.length})
        </h3>
        
        {readyToProcess.length === 0 ? (
          <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-6 text-center text-slate-400">
            <CheckCircle className="mx-auto mb-2 opacity-50" size={32} />
            <p>Semua Surat Tugas (Approved) telah diterbitkan SPPD-nya.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {readyToProcess.map(task => {
              const details = getTaskDetails(task.id);
              return (
                <div key={task.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between hover:border-indigo-300 transition-all group">
                  <div className="flex items-start space-x-4 mb-4 md:mb-0">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <FileText size={24} />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-600">{task.number}</span>
                        <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded flex items-center"><CheckCircle size={10} className="mr-1"/> APPROVED</span>
                      </div>
                      <h4 className="font-bold text-slate-900 mt-1">{task.subject}</h4>
                      <div className="flex flex-wrap gap-3 mt-2 text-sm text-slate-500">
                         <div className="flex items-center"><User size={14} className="mr-1"/> {details.names}</div>
                         <div className="flex items-center"><MapPin size={14} className="mr-1"/> {details.dest}</div>
                         <div className="flex items-center"><Calendar size={14} className="mr-1"/> {formatDateRange(task.startDate, task.endDate)}</div>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleCreateFromAssignment(task)}
                    className="whitespace-nowrap px-4 py-2 bg-indigo-600 text-white font-bold text-sm rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-100 flex items-center"
                  >
                    Terbitkan SPPD <ArrowRight size={16} className="ml-2" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 my-6 print:hidden"></div>

      {/* SECTION 2: ISSUED SPPDs */}
      <div className="space-y-4 print:hidden">
         <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center">
          <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></div>
          Dokumen SPPD Terbit ({sppds.length})
        </h3>

        <div className="max-h-[800px] overflow-y-auto pr-2 custom-scrollbar p-1">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
              {sppds.map((s) => {
                const details = getTaskDetails(s.assignmentId);
                const isCompleted = s.status === 'Selesai';
                
                return (
                  <div key={s.id} className={`bg-white p-6 rounded-2xl border shadow-sm flex flex-col justify-between transition-all ${isCompleted ? 'border-emerald-200 bg-emerald-50/30' : 'hover:border-indigo-300'}`}>
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center space-x-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isCompleted ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
                          <ClipboardList size={24} />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900">{s.id}</h3>
                          <p className="text-xs text-slate-400 font-medium">Ref: {details.ref}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          isCompleted ? 'bg-emerald-600 text-white' : 'bg-amber-100 text-amber-600'
                        }`}>
                          {s.status}
                        </span>
                        
                        <button 
                             onClick={() => handleGoToReceipt(s.id)}
                             className="p-1.5 bg-emerald-100 text-emerald-600 hover:bg-emerald-200 rounded-lg transition-colors"
                             title="Buat Kwitansi / Pembayaran"
                            >
                             <DollarSign size={16} />
                        </button>
                        
                        {!isCompleted && (
                           <button onClick={() => requestDelete(s.id)} className="p-1.5 text-slate-300 hover:text-rose-600 transition-colors"><Trash2 size={16}/></button>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div className="flex items-start space-x-2 text-sm text-slate-600">
                        <User size={16} className="text-slate-400 mt-0.5 shrink-0" />
                        <span className="font-medium">{details.names}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-slate-600">
                        <MapPin size={16} className="text-slate-400 shrink-0" />
                        <span>{details.dest}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-slate-600">
                        <Calendar size={16} className="text-slate-400 shrink-0" />
                        <span>{formatDateRange(s.startDate, s.endDate)}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t flex space-x-2">
                      {!isCompleted ? (
                        <button onClick={() => handleEditSppd(s)} className="flex-1 px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-bold rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-center space-x-2">
                          <Edit2 size={16} />
                          <span>Edit</span>
                        </button>
                      ) : (
                        <div className="flex-1"></div>
                      )}
                      
                      <button onClick={() => handlePrint(s)} className="flex-1 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center space-x-2">
                        <Printer size={16} />
                        <span>Cetak SPPD</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
        </div>
      </div>

      {/* Confirmation Modal and Input Modal ... (Keep unchanged) */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Hapus SPPD"
        message="Apakah Anda yakin ingin menghapus dokumen SPPD ini? Data akan dikembalikan ke daftar 'Siap Proses'."
        confirmText="Ya, Hapus"
        isDanger={true}
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50 rounded-t-2xl">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{editingSppd ? 'Edit' : 'Terbitkan'} Dokumen SPPD</h3>
                <p className="text-xs text-slate-500">Lengkapi data untuk keperluan cetak dokumen</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 mb-4">
                 <div className="text-xs text-indigo-500 font-bold uppercase mb-1">Referensi Surat Tugas</div>
                 <div className="font-mono font-bold text-indigo-900">{formData.ref}</div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Nomor SPPD</label>
                <input type="text" required value={formData.id} onChange={(e) => setFormData({...formData, id: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Pegawai yang Ditugaskan</label>
                <textarea readOnly rows={2} value={formData.displayEmployeeNames} className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 text-sm outline-none resize-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Mulai</label>
                    <input type="date" required value={formData.startDate} onChange={(e) => setFormData({...formData, startDate: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                 </div>
                 <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Selesai</label>
                    <input type="date" required value={formData.endDate} onChange={(e) => setFormData({...formData, endDate: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                 </div>
              </div>

              {/* Data Tambahan untuk SPPD */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Alat Angkut / Transportasi</label>
                <select required value={formData.transportId} onChange={(e) => setFormData({...formData, transportId: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">-- Pilih Transportasi --</option>
                  {transportModes.map(tm => (
                    <option key={tm.id} value={tm.id}>{tm.type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Pembebanan Anggaran</label>
                <select required value={formData.fundingId} onChange={(e) => setFormData({...formData, fundingId: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">-- Pilih Sumber Dana --</option>
                  {fundingSources.map(fs => (
                    <option key={fs.id} value={fs.id}>{fs.code} - {fs.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="pt-4 flex space-x-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">Batal</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-colors">Simpan Dokumen</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINT MODAL (COMPLETELY REDESIGNED) */}
      {isPrintModalOpen && printingSppd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
          <div className="bg-white rounded-2xl w-full max-w-[210mm] shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 print:shadow-none print:m-0 print:w-full print:max-h-none print:h-auto">
             <div className="p-4 border-b flex justify-between items-center bg-white rounded-t-2xl flex-shrink-0 print:hidden">
               <div className="flex items-center space-x-2">
                 <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Printer size={20} /></div>
                 <h3 className="text-lg font-bold text-slate-900">Cetak SPPD</h3>
               </div>
               <div className="flex space-x-2">
                 <button onClick={() => handlePrint()} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg text-sm hover:bg-indigo-700 flex items-center space-x-2"><Printer size={16} /><span>Cetak Sekarang</span></button>
                 <button onClick={() => setIsPrintModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600"><X size={24} /></button>
               </div>
            </div>

            <div className="overflow-y-auto flex-1 custom-scrollbar">
              <div id="print-area" className="bg-white text-black p-[15mm]" style={{ fontFamily: 'Times New Roman, serif', color: '#000000', fontSize: '11pt' }}>
                {(() => {
                    const details = getTaskDetails(printingSppd.assignmentId);
                    if (!details.taskObj) return <div className="p-10 text-center text-red-500">Data tidak ditemukan</div>;
                    const { taskObj } = details;
                    const emp = employees.find(e => taskObj?.employeeIds[0] === e.id);
                    const signatory = signatories.find(s => s.id === taskObj?.signatoryId);
                    const signatoryEmp = employees.find(e => e.id === signatory?.employeeId);
                    const dest = cities.find(c => c.id === taskObj?.destinationId);
                    const trans = transportModes.find(t => t.id === printingSppd.transportId);
                    const fund = fundingSources.find(f => f.id === printingSppd.fundingId);
                    const followers = taskObj?.employeeIds.slice(1).map(eid => employees.find(e => e.id === eid)) || [];

                    const commonBorder = "border border-black align-top p-1";

                    return (
                        <div>
                            {/* PAGE 1 */}
                            <table width="100%" style={{ borderBottom: '3px double black', marginBottom: '10px' }}>
                                <tbody>
                                    <tr>
                                        <td width="15%" align="center" style={{verticalAlign: 'middle'}}>
                                            <img src={agencySettings.logoUrl} style={{ height: '80px', width: 'auto' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                        </td>
                                        <td align="center">
                                            <div style={{ fontSize: '14pt', fontWeight: 'bold' }}>{agencySettings.name}</div>
                                            <div style={{ fontSize: '16pt', fontWeight: 'bold' }}>{agencySettings.department}</div>
                                            <div style={{ fontSize: '9pt' }}>{agencySettings.address}</div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>

                            <div className="flex justify-end mb-4" style={{ fontSize: '10pt' }}>
                                <table>
                                    <tbody>
                                        <tr><td>Lembar Ke</td><td>: ....................</td></tr>
                                        <tr><td>Kode No</td><td>: ....................</td></tr>
                                        <tr><td>Nomor</td><td>: {printingSppd.id}</td></tr>
                                    </tbody>
                                </table>
                            </div>

                            <div className="text-center mb-4">
                                <u style={{ fontWeight: 'bold', fontSize: '12pt' }}>SURAT PERINTAH PERJALANAN DINAS</u>
                            </div>

                            <table width="100%" style={{ borderCollapse: 'collapse', fontSize: '11pt' }}>
                                <tbody>
                                    <tr>
                                        <td className={`${commonBorder} text-center`} width="5%">1</td>
                                        <td className={`${commonBorder}`} width="45%">Pejabat berwenang yang memberi Perintah</td>
                                        <td className={`${commonBorder}`}>{signatory?.role}</td>
                                    </tr>
                                    <tr>
                                        <td className={`${commonBorder} text-center`}>2</td>
                                        <td className={`${commonBorder}`}>Nama/NIP Pegawai yang Diperintahkan</td>
                                        <td className={`${commonBorder}`}>{emp?.name} <br/> NIP. {emp?.nip}</td>
                                    </tr>
                                    <tr>
                                        <td className={`${commonBorder} text-center`}>3</td>
                                        <td className={`${commonBorder}`}>
                                            a. Pangkat dan Golongan ruang gaji<br/>
                                            b. Jabatan / Instansi<br/>
                                            c. Tingkat Biaya Perjalanan Dinas
                                        </td>
                                        <td className={`${commonBorder}`}>
                                            a. {emp?.grade}<br/>
                                            b. {emp?.position}<br/>
                                            c.
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={`${commonBorder} text-center`}>4</td>
                                        <td className={`${commonBorder}`}>Maksud Perjalanan Dinas</td>
                                        <td className={`${commonBorder}`}>{taskObj?.subject}</td>
                                    </tr>
                                    <tr>
                                        <td className={`${commonBorder} text-center`}>5</td>
                                        <td className={`${commonBorder}`}>Alat angkutan yang dipergunakan</td>
                                        <td className={`${commonBorder}`}>{trans?.type}</td>
                                    </tr>
                                    <tr>
                                        <td className={`${commonBorder} text-center`}>6</td>
                                        <td className={`${commonBorder}`}>
                                            a. Tempat berangkat<br/>
                                            b. Tempat Tujuan
                                        </td>
                                        <td className={`${commonBorder}`}>
                                            a. Kabupaten Demak<br/>
                                            b. {dest?.name}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={`${commonBorder} text-center`}>7</td>
                                        <td className={`${commonBorder}`}>
                                            a. Lamanya Perjalanan Dinas<br/>
                                            b. Tanggal berangkat<br/>
                                            c. Tanggal harus kembali/tiba di tempat baru *)
                                        </td>
                                        <td className={`${commonBorder}`}>
                                            a. {taskObj?.duration} hari<br/>
                                            b. {formatDateIndo(printingSppd.startDate)}<br/>
                                            c. {formatDateIndo(printingSppd.endDate)}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={`${commonBorder} text-center`}>8</td>
                                        <td className={`${commonBorder}`}>
                                            Pengikut : Nama
                                        </td>
                                        <td className={`${commonBorder}`}>
                                            {followers.length > 0 ? followers.map((f, i) => (
                                                <div key={i}>{i+1}. {f?.name}</div>
                                            )) : '-'}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={`${commonBorder} text-center`}>9</td>
                                        <td className={`${commonBorder}`}>
                                            Pembebanan Anggaran<br/>
                                            a. Instansi<br/>
                                            b. Mata Anggaran
                                        </td>
                                        <td className={`${commonBorder}`}>
                                            <br/>
                                            a. {agencySettings.department}<br/>
                                            b. {fund?.code}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={`${commonBorder} text-center`}>10</td>
                                        <td className={`${commonBorder}`}>Keterangan lain-lain</td>
                                        <td className={`${commonBorder}`}></td>
                                    </tr>
                                </tbody>
                            </table>

                            <div style={{ marginTop: '5px', fontSize: '10pt' }}>*) coret yang tidak perlu</div>

                            <table width="100%" style={{ marginTop: '20px' }}>
                                <tbody>
                                    <tr>
                                        <td width="50%"></td>
                                        <td width="50%">
                                            Dikeluarkan di : Demak<br/>
                                            Tanggal : {formatDateIndo(printingSppd.startDate)}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td align="center" style={{ paddingTop: '20px' }}>
                                            Pelaksana SPPD<br/><br/><br/><br/><br/>
                                            <u style={{ fontWeight: 'bold' }}>{emp?.name}</u><br/>
                                            NIP. {emp?.nip}
                                        </td>
                                        <td align="center" style={{ paddingTop: '20px' }}>
                                            {signatory?.role}<br/><br/><br/><br/><br/>
                                            <u style={{ fontWeight: 'bold' }}>{signatoryEmp?.name}</u><br/>
                                            {signatoryEmp?.grade}<br/>
                                            NIP. {signatoryEmp?.nip}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* PAGE BREAK FOR VISUM */}
                            <div className="page-break"></div>

                            {/* VISUM PAGE */}
                            <div className="border border-black mt-8 text-sm">
                                {/* ROW I */}
                                <div className="grid grid-cols-2 border-b border-black">
                                    <div className="p-2 border-r border-black"></div>
                                    <div className="p-2">
                                        <p>I. Berangkat dari : Kabupaten Demak</p>
                                        <p>&nbsp;&nbsp;(Tempat Kedudukan)</p>
                                        <p>&nbsp;&nbsp;Ke : {dest?.name}</p>
                                        <p>&nbsp;&nbsp;Pada Tanggal : {formatDateIndo(printingSppd.startDate)}</p>
                                        <div className="text-center mt-4">
                                            <p className="font-bold">{signatory?.role}</p>
                                            <div className="h-16"></div>
                                            <p className="font-bold underline">{signatoryEmp?.name}</p>
                                            <p>NIP. {signatoryEmp?.nip}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* ROW II */}
                                <div className="grid grid-cols-2 border-b border-black">
                                    <div className="p-2 border-r border-black">
                                        <p>II. Tiba di : {dest?.name}</p>
                                        <p>&nbsp;&nbsp;&nbsp;Pada Tanggal : {formatDateIndo(printingSppd.startDate)}</p>
                                        <p>&nbsp;&nbsp;&nbsp;Kepala :</p>
                                        <div className="h-16"></div>
                                        <p className="text-center">(...................................................)</p>
                                        <p className="text-center">NIP. ..........................................</p>
                                    </div>
                                    <div className="p-2">
                                        <p>Berangkat dari : {dest?.name}</p>
                                        <p>Ke : Kabupaten Demak</p>
                                        <p>Pada Tanggal : {formatDateIndo(printingSppd.endDate)}</p>
                                        <p>Kepala :</p>
                                        <div className="h-16"></div>
                                        <p className="text-center">(...................................................)</p>
                                        <p className="text-center">NIP. ..........................................</p>
                                    </div>
                                </div>

                                {/* ROW III */}
                                <div className="grid grid-cols-2 border-b border-black">
                                    <div className="p-2 border-r border-black">
                                        <p>III. Tiba di : ..........................................</p>
                                        <p>&nbsp;&nbsp;&nbsp;&nbsp;Pada Tanggal : ..........................................</p>
                                        <p>&nbsp;&nbsp;&nbsp;&nbsp;Kepala :</p>
                                    </div>
                                    <div className="p-2">
                                        <p>Berangkat dari : ..........................................</p>
                                        <p>Ke : ..........................................</p>
                                        <p>Pada Tanggal : ..........................................</p>
                                        <p>Kepala :</p>
                                    </div>
                                </div>

                                {/* ROW IV */}
                                <div className="grid grid-cols-2 border-b border-black">
                                    <div className="p-2 border-r border-black">
                                        <p>IV. Tiba di : Kabupaten Demak</p>
                                        <p>&nbsp;&nbsp;&nbsp;&nbsp;(Tempat Kedudukan)</p>
                                        <p>&nbsp;&nbsp;&nbsp;&nbsp;Pada Tanggal : {formatDateIndo(printingSppd.endDate)}</p>
                                        <div className="text-center mt-4">
                                            <p className="font-bold">Pejabat Pelaksana Teknis Kegiatan</p>
                                            <div className="h-16"></div>
                                            <p className="font-bold underline">(...................................................)</p>
                                            <p>NIP. ..........................................</p>
                                        </div>
                                    </div>
                                    <div className="p-2 text-justify">
                                        <p>V. Telah diperiksa dengan keterangan bahwa perjalanan atas perintahnya dan semata-mata untuk kepentingan jabatan dalam waktu yang sesingkat-singkatnya.</p>
                                        <div className="text-center mt-4">
                                            <p className="font-bold">{signatory?.role}</p>
                                            <div className="h-16"></div>
                                            <p className="font-bold underline">{signatoryEmp?.name}</p>
                                            <p>NIP. {signatoryEmp?.nip}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* ROW V & VI */}
                                <div className="p-2 border-b border-black">
                                    VI. Catatan Lain-lain
                                </div>
                                <div className="p-2">
                                    VII. PERHATIAN:<br/>
                                    Pejabat yang berwenang menerbitkan SPPD, pegawai yang melakukan perjalanan dinas, para pejabat yang mengesahkan tanggal berangkat/tiba, serta bendaharawan bertanggung jawab berdasarkan peraturan-peraturan Keuangan Negara apabila Daerah menderita rugi akibat kesalahan, kelalaian dan kealpaannya.
                                </div>
                            </div>
                        </div>
                    );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          @page { size: auto; margin: 10mm; }
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%; 
            padding: 0;
            margin: 0;
            color: black !important;
            background: white;
          }
          .page-break { page-break-before: always; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default SPPDManager;
