
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ClipboardList, 
  Calendar, 
  CheckCircle, 
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
import { AssignmentLetter, Employee, City, SPPD, TransportMode, FundingSource, Signatory, AgencySettings, User as UserType } from '../types';
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
  const [user, setUser] = useState<UserType | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [transportModes, setTransportModes] = useState<TransportMode[]>([]);
  const [fundingSources, setFundingSources] = useState<FundingSource[]>([]);
  const [signatories, setSignatories] = useState<Signatory[]>([]);
  const [assignments, setAssignments] = useState<AssignmentLetter[]>([]);
  const [agencySettings, setAgencySettings] = useState<AgencySettings>(INITIAL_SETTINGS);
  const [sppds, setSppds] = useState<SPPD[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [editingSppd, setEditingSppd] = useState<Partial<SPPD> | null>(null);
  const [printingSppd, setPrintingSppd] = useState<SPPD | null>(null);
  
  const [formData, setFormData] = useState({ 
    id: '', assignmentId: '', ref: '', startDate: '', endDate: '', 
    displayEmployeeNames: '', destinationName: '', transportId: '', fundingId: '' 
  });

  const isAdmin = user?.role === 'Admin';

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
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) setUser(JSON.parse(savedUser));
    loadLocalData();
    fetchData();
  }, []);

  const loadLocalData = () => {
    setEmployees(JSON.parse(localStorage.getItem('employees') || '[]'));
    setCities(JSON.parse(localStorage.getItem('cities') || '[]'));
    setAssignments(JSON.parse(localStorage.getItem('assignment_tasks_v2') || '[]'));
    setTransportModes(JSON.parse(localStorage.getItem('transport_modes') || '[]'));
    setFundingSources(JSON.parse(localStorage.getItem('funding_sources') || '[]'));
    setSignatories(JSON.parse(localStorage.getItem('signatories') || '[]'));
    setSppds(JSON.parse(localStorage.getItem('sppd_data') || '[]'));
    const settingsData = localStorage.getItem('agency_settings');
    if (settingsData) setAgencySettings(JSON.parse(settingsData));
  };

  const fetchData = async () => {
    setIsLoading(true);
    const client = getSupabase();
    if (client) {
      try {
        const { data: sppdData } = await client.from('sppds').select('*').order('created_at', { ascending: false });
        if (sppdData) {
           setSppds(sppdData.map((item: any) => ({
             id: item.id, assignmentId: item.assignment_id, startDate: item.start_date, endDate: item.end_date, 
             status: item.status, transportId: item.transport_id, fundingId: item.funding_id
           })));
        }
      } catch (e) {}
    }
    setIsLoading(false);
  };

  const syncToLocalStorage = (data: SPPD[]) => {
    localStorage.setItem('sppd_data', JSON.stringify(data));
  };

  const readyToProcess = assignments.filter(task => 
    task.status === 'Approved' && !sppds.some(sppd => sppd.assignmentId === task.id)
  );

  const handleCreateFromAssignment = (task: AssignmentLetter) => {
    if (!isAdmin) return;
    const taskEmployees = employees.filter(e => task.employeeIds.includes(e.id)).map(e => e.name).join(', ');
    const dest = cities.find(c => c.id === task.destinationId)?.name || '-';
    setFormData({
      id: `090/${Math.floor(100 + Math.random() * 900)}/2024`,
      assignmentId: task.id, ref: task.number, startDate: task.startDate, endDate: task.endDate,
      displayEmployeeNames: taskEmployees, destinationName: dest, transportId: '', fundingId: ''
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const client = getSupabase();
    const newSppdData: SPPD = { ...formData, status: 'Sedang Berjalan' as any };
    const dbPayload = { id: formData.id, assignment_id: formData.assignmentId, start_date: formData.startDate, end_date: formData.endDate, status: 'Sedang Berjalan', transport_id: formData.transportId, funding_id: formData.fundingId };
    
    const newList = [...sppds, newSppdData];
    setSppds(newList);
    syncToLocalStorage(newList);
    setIsModalOpen(false);
    if(client) { try { await client.from('sppds').upsert(dbPayload); } catch(e) {} }
  };

  const confirmDelete = async () => {
    if (itemToDelete) {
      const newList = sppds.filter(s => s.id !== itemToDelete);
      setSppds(newList);
      syncToLocalStorage(newList);
      const client = getSupabase();
      if(client) { try { await client.from('sppds').delete().eq('id', itemToDelete); } catch(e) {} }
      setItemToDelete(null);
    }
  };

  const getTaskDetails = (assignmentId: string) => {
    const task = assignments.find(a => a.id === assignmentId);
    if (!task) return { names: 'Unknown', dest: 'Unknown', ref: 'Unknown' };
    const names = employees.filter(e => task.employeeIds.includes(e.id)).map(e => e.name).join(', ');
    const dest = cities.find(c => c.id === task.destinationId)?.name || '-';
    return { names, dest, ref: task.number, taskObj: task };
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Penerbitan SPPD</h1>
          <p className="text-slate-500">Kelola penerbitan dokumen SPPD berdasarkan Surat Tugas yang disetujui.</p>
        </div>
      </div>

      {isAdmin && readyToProcess.length > 0 && (
        <div className="space-y-4 print:hidden">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center">
            <div className="w-2 h-2 rounded-full bg-amber-500 mr-2"></div>
            Surat Tugas Siap Proses SPPD ({readyToProcess.length})
          </h3>
          <div className="grid grid-cols-1 gap-4">
            {readyToProcess.map(task => (
              <div key={task.id} className="bg-white p-5 rounded-xl border flex flex-col md:flex-row md:items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900">{task.subject}</h4>
                  <p className="text-sm text-slate-500">{task.number}</p>
                </div>
                <button onClick={() => handleCreateFromAssignment(task)} className="px-4 py-2 bg-indigo-600 text-white font-bold text-sm rounded-lg flex items-center">
                  Terbitkan SPPD <ArrowRight size={16} className="ml-2" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4 print:hidden">
         <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center">
          <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></div>
          Dokumen SPPD Terbit ({sppds.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sppds.map((s) => {
            const details = getTaskDetails(s.assignmentId);
            return (
              <div key={s.id} className="bg-white p-6 rounded-2xl border shadow-sm">
                <div className="flex justify-between items-start mb-6">
                  <div><h3 className="font-bold">{s.id}</h3><p className="text-xs text-slate-400">Ref: {details.ref}</p></div>
                  <div className="flex space-x-1">
                    {isAdmin && (
                      <>
                        <button onClick={() => navigate('/kwitansi', { state: { createSppdId: s.id } })} className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg"><DollarSign size={16} /></button>
                        <button onClick={() => {setItemToDelete(s.id); setIsDeleteModalOpen(true);}} className="p-1.5 text-rose-600"><Trash2 size={16}/></button>
                      </>
                    )}
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t flex space-x-2">
                  {isAdmin && (
                    <button onClick={() => {setPrintingSppd(s); setIsPrintModalOpen(true);}} className="flex-1 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg flex items-center justify-center space-x-2">
                      <Printer size={16} /><span>Cetak SPPD</span>
                    </button>
                  )}
                  {!isAdmin && <span className="text-xs text-slate-400">View Only</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <ConfirmationModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={confirmDelete} title="Hapus SPPD" message="Hapus data?" />
    </div>
  );
};

export default SPPDManager;
