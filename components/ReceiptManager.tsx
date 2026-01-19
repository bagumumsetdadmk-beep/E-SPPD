
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Receipt as ReceiptIcon, X, Plus, Trash2, Edit2, Printer, CheckCircle, RefreshCw } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { Receipt, SPPD, AssignmentLetter, Employee, City, Signatory, FundingSource, AgencySettings, User } from '../types';
import ConfirmationModal from './ConfirmationModal';

const INITIAL_SETTINGS: AgencySettings = {
  name: 'PEMERINTAH KABUPATEN DEMAK',
  department: 'SEKRETARIAT DAERAH',
  address: 'Jalan Kyai Singkil 7, Demak, Jawa Tengah 59511',
  contactInfo: 'Telepon (0291) 685877, Faksimile (0291) 685625, Laman setda.demakkab.go.id, Pos-el setda@demakkab.go.id',
  logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/Lambang_Kabupaten_Demak.png/486px-Lambang_Kabupaten_Demak.png'
};

const INITIAL_RECEIPT_STATE: Receipt = {
    id: '', sppdId: '', date: new Date().toISOString().split('T')[0],
    dailyAllowance: { days: 0, amountPerDay: 0, total: 0, visible: true },
    transport: { amount: 0, description: 'Biaya Transportasi', visible: false },
    accommodation: { amount: 0, description: 'Biaya Penginapan', visible: false },
    fuel: { amount: 0, description: 'Biaya BBM', visible: false },
    toll: { amount: 0, description: 'Biaya Tol', visible: false },
    representation: { amount: 0, visible: false },
    other: { amount: 0, description: 'Lain-lain', visible: false },
    totalAmount: 0, status: 'Draft', treasurerId: '', pptkId: '', kpaId: ''
};

const ReceiptManager: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [sppds, setSppds] = useState<SPPD[]>([]);
  const [assignments, setAssignments] = useState<AssignmentLetter[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [signatories, setSignatories] = useState<Signatory[]>([]);
  const [fundingSources, setFundingSources] = useState<FundingSource[]>([]);
  const [agencySettings, setAgencySettings] = useState<AgencySettings>(INITIAL_SETTINGS);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState<Receipt>(INITIAL_RECEIPT_STATE);

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
    loadMasterData();
    fetchReceiptsAndRefs();
  }, []);

  const loadMasterData = () => {
    setSppds(JSON.parse(localStorage.getItem('sppd_data') || '[]'));
    setAssignments(JSON.parse(localStorage.getItem('assignment_tasks_v2') || '[]'));
    setEmployees(JSON.parse(localStorage.getItem('employees') || '[]'));
    setCities(JSON.parse(localStorage.getItem('cities') || '[]'));
    setSignatories(JSON.parse(localStorage.getItem('signatories') || '[]'));
    setFundingSources(JSON.parse(localStorage.getItem('funding_sources') || '[]'));
    const settingsData = localStorage.getItem('agency_settings');
    if (settingsData) setAgencySettings(JSON.parse(settingsData));
  };

  const fetchReceiptsAndRefs = async () => {
    setIsLoading(true);
    const client = getSupabase();
    if(client) {
        try {
            const { data: recData } = await client.from('receipts').select('*').order('created_at', { ascending: false });
            if(recData) {
                const mapped: Receipt[] = recData.map((item: any) => ({
                    id: item.id, sppdId: item.sppd_id, date: item.date,
                    dailyAllowance: typeof item.daily_allowance === 'string' ? JSON.parse(item.daily_allowance) : item.daily_allowance,
                    transport: typeof item.transport === 'string' ? JSON.parse(item.transport) : item.transport,
                    accommodation: typeof item.accommodation === 'string' ? JSON.parse(item.accommodation) : item.accommodation,
                    fuel: typeof item.fuel === 'string' ? JSON.parse(item.fuel) : item.fuel,
                    toll: typeof item.toll === 'string' ? JSON.parse(item.toll) : item.toll,
                    representation: typeof item.representation === 'string' ? JSON.parse(item.representation) : item.representation,
                    other: typeof item.other === 'string' ? JSON.parse(item.other) : item.other,
                    totalAmount: Number(item.total_amount), status: item.status, treasurerId: item.treasurer_id, pptkId: item.pptk_id, kpaId: item.kpa_id
                }));
                setReceipts(mapped);
                localStorage.setItem('receipt_data_v2', JSON.stringify(mapped));
            }
        } catch(e) {}
    }
    setIsLoading(false);
  };

  const handleMarkAsPaid = async (receipt: Receipt) => {
    if (!isAdmin) return;
    if (!window.confirm(`Lunas: ${receipt.id}?`)) return;
    const updatedReceipt: Receipt = { ...receipt, status: 'Paid' };
    setReceipts(prev => prev.map(r => r.id === receipt.id ? updatedReceipt : r));
    const client = getSupabase();
    if (client) { try { await client.from('receipts').update({ status: 'Paid' }).eq('id', receipt.id); } catch(e) {} }
  };

  const getReceiptDetails = (receipt: Receipt) => {
    const sppd = sppds.find(s => s.id === receipt.sppdId);
    const task = assignments.find(a => a.id === sppd?.assignmentId);
    const emp = employees.find(e => e.id === task?.employeeIds[0]);
    return { empName: emp?.name || '-' };
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center print:hidden">
        <div><h1 className="text-2xl font-bold text-slate-900">Rincian Biaya</h1><p className="text-slate-500">Kelola rincian biaya perjalanan dinas.</p></div>
        {isAdmin && (
          <button onClick={() => setIsModalOpen(true)} className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium"><Plus size={18} /><span>Buat Rincian</span></button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {receipts.map(r => (
            <div key={r.id} className="bg-white p-6 rounded-2xl border">
                <div className="flex justify-between items-start mb-4">
                    <div className={`p-3 rounded-xl ${r.status === 'Paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100'}`}><ReceiptIcon size={24} /></div>
                    <span className="px-2 py-1 text-[10px] font-bold uppercase rounded">{r.status}</span>
                </div>
                <h3 className="font-bold">{r.id}</h3>
                <p className="text-sm text-slate-600 mb-6">{getReceiptDetails(r).empName}</p>
                <div className="pt-4 border-t flex items-center justify-between">
                    <p className="text-lg font-bold text-indigo-600">Rp {r.totalAmount.toLocaleString()}</p>
                    <div className="flex space-x-1">
                        {isAdmin && (
                          <>
                            {r.status === 'Draft' && <button onClick={() => handleMarkAsPaid(r)} className="p-2 text-emerald-600"><CheckCircle size={16}/></button>}
                            <button onClick={() => {setEditingReceipt(r); setIsModalOpen(true);}} className="p-2 text-slate-400"><Edit2 size={16}/></button>
                            <button onClick={() => {setItemToDelete(r.id); setIsDeleteModalOpen(true);}} className="p-2 text-rose-600"><Trash2 size={16}/></button>
                          </>
                        )}
                        {!isAdmin && <span className="text-xs text-slate-400">View Only</span>}
                    </div>
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};

export default ReceiptManager;
