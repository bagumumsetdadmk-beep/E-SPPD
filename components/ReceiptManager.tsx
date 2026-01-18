
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Receipt as ReceiptIcon, Upload, Camera, Search, Filter, X, Plus, Trash2, Edit2, Printer, Check, Eye, EyeOff, DollarSign, AlertTriangle, RefreshCw } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { Receipt, SPPD, AssignmentLetter, Employee, City, Signatory, FundingSource, AgencySettings } from '../types';
import ConfirmationModal from './ConfirmationModal';

const INITIAL_SETTINGS: AgencySettings = {
  name: 'PEMERINTAH KABUPATEN DEMAK',
  department: 'SEKRETARIAT DAERAH',
  address: 'Jalan Kyai Singkil 7, Demak, Jawa Tengah 59511',
  contactInfo: 'Telepon (0291) 685877, Faksimile (0291) 685625, Laman setda.demakkab.go.id, Pos-el setda@demakkab.go.id',
  logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/Lambang_Kabupaten_Demak.png/486px-Lambang_Kabupaten_Demak.png'
};

const terbilang = (nilai: number): string => {
  if (typeof nilai !== 'number' || isNaN(nilai) || !isFinite(nilai)) return "Nol";
  
  const n = Math.abs(Math.floor(nilai));
  const angka = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];

  if (n < 12) return " " + angka[n];
  if (n < 20) return terbilang(n - 10) + " Belas";
  if (n < 100) return terbilang(Math.floor(n / 10)) + " Puluh" + terbilang(n % 10);
  if (n < 200) return " Seratus" + terbilang(n - 100);
  if (n < 1000) return terbilang(Math.floor(n / 100)) + " Ratus" + terbilang(n % 100);
  if (n < 2000) return " Seribu" + terbilang(n - 1000);
  if (n < 1000000) return terbilang(Math.floor(n / 1000)) + " Ribu" + terbilang(n % 1000);
  if (n < 1000000000) return terbilang(Math.floor(n / 1000000)) + " Juta" + terbilang(n % 1000000);
  
  return "Angka Terlalu Besar";
};

const INITIAL_RECEIPT_STATE: Receipt = {
    id: '',
    sppdId: '',
    date: new Date().toISOString().split('T')[0],
    dailyAllowance: { days: 0, amountPerDay: 0, total: 0, visible: true },
    transport: { amount: 0, description: 'Biaya Transportasi', visible: false },
    accommodation: { amount: 0, description: 'Biaya Penginapan', visible: false },
    fuel: { amount: 0, description: 'Biaya BBM', visible: false },
    toll: { amount: 0, description: 'Biaya Tol', visible: false },
    representation: { amount: 0, visible: false },
    other: { amount: 0, description: 'Lain-lain', visible: false },
    totalAmount: 0,
    status: 'Draft',
    treasurerId: '',
    pptkId: '',
    kpaId: ''
};

const ReceiptManager: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

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
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
  const [printingReceipt, setPrintingReceipt] = useState<Receipt | null>(null);
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const [formData, setFormData] = useState<Receipt>(INITIAL_RECEIPT_STATE);

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
    loadMasterData();
    fetchReceiptsAndRefs();
  }, []);

  const loadMasterData = () => {
    try {
        setSppds(JSON.parse(localStorage.getItem('sppd_data') || '[]'));
        setAssignments(JSON.parse(localStorage.getItem('assignment_tasks_v2') || '[]'));
        setEmployees(JSON.parse(localStorage.getItem('employees') || '[]'));
        setCities(JSON.parse(localStorage.getItem('cities') || '[]'));
        setSignatories(JSON.parse(localStorage.getItem('signatories') || '[]'));
        setFundingSources(JSON.parse(localStorage.getItem('funding_sources') || '[]'));
        const settingsData = localStorage.getItem('agency_settings');
        if (settingsData) setAgencySettings(JSON.parse(settingsData));
    } catch (e) {
        console.error("Error loading master data", e);
    }
  };

  // UPDATED: Fetch Receipts AND Ref Data (SPPDs, Tasks) from DB to ensure fresh data
  const fetchReceiptsAndRefs = async () => {
    setIsLoading(true);
    const client = getSupabase();
    if(client) {
        try {
            // 1. Fetch Receipts
            const { data: recData, error: recError } = await client.from('receipts').select('*').order('created_at', { ascending: false });
            if(recError) throw recError;
            
            if(recData) {
                const mapped: Receipt[] = recData.map((item: any) => ({
                    id: item.id,
                    sppdId: item.sppd_id,
                    date: item.date,
                    dailyAllowance: typeof item.daily_allowance === 'string' ? JSON.parse(item.daily_allowance) : item.daily_allowance,
                    transport: typeof item.transport === 'string' ? JSON.parse(item.transport) : item.transport,
                    accommodation: typeof item.accommodation === 'string' ? JSON.parse(item.accommodation) : item.accommodation,
                    fuel: typeof item.fuel === 'string' ? JSON.parse(item.fuel) : item.fuel,
                    toll: typeof item.toll === 'string' ? JSON.parse(item.toll) : item.toll,
                    representation: typeof item.representation === 'string' ? JSON.parse(item.representation) : item.representation,
                    other: typeof item.other === 'string' ? JSON.parse(item.other) : item.other,
                    totalAmount: Number(item.total_amount),
                    status: item.status,
                    treasurerId: item.treasurer_id,
                    pptkId: item.pptk_id,
                    kpa_id: item.kpa_id
                }));
                setReceipts(mapped);
                // Also Sync LocalStorage
                syncToLocalStorage(mapped);
            }

            // 2. Fetch Reference Data (SPPD & Assignments) to ensure we can create new receipts
            const { data: sppdData } = await client.from('sppds').select('*');
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
                localStorage.setItem('sppd_data', JSON.stringify(mappedSppds));
            }

            const { data: taskData } = await client.from('assignment_letters').select('*');
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
                localStorage.setItem('assignment_tasks_v2', JSON.stringify(mappedTasks));
            }

            // Refresh other masters
            const { data: empData } = await client.from('employees').select('*');
            if(empData) setEmployees(empData);
            const { data: cityData } = await client.from('cities').select('*');
            if(cityData) {
                const mappedCities = cityData.map((d:any) => ({
                    id: d.id,
                    name: d.name,
                    province: d.province,
                    dailyAllowance: Number(d.daily_allowance || d.dailyAllowance)
                }));
                setCities(mappedCities);
            }

        } catch(e) { console.error(e); }
    } else {
        // Local Only
        const saved = localStorage.getItem('receipt_data_v2');
        const parsed = saved ? JSON.parse(saved) : [];
        const sanitized = parsed.map((r: any) => ({
            ...INITIAL_RECEIPT_STATE,
            ...r,
            totalAmount: Number(r.totalAmount) || 0
        }));
        setReceipts(sanitized);
    }
    setIsLoading(false);
  };

  const syncToLocalStorage = (data: Receipt[]) => {
    localStorage.setItem('receipt_data_v2', JSON.stringify(data));
  };

  // Navigate from SPPD Manager
  useEffect(() => {
    if (location.state && location.state.createSppdId) {
      // Check if data is ready (SPPDs, Tasks, AND Cities)
      if (sppds.length > 0 && assignments.length > 0 && cities.length > 0) {
          const sppdId = location.state.createSppdId;
          const existing = receipts.find(r => r.sppdId === sppdId);
          if (existing) {
            handleOpenModal(existing);
          } else {
            handleCreateFromSPPD(sppdId);
          }
          // Clear state to prevent loop, but careful not to break re-renders
          navigate(location.pathname, { replace: true, state: {} });
      }
    }
  }, [location.state, sppds, assignments, cities]); // Added cities dependency

  const handleCreateFromSPPD = (sppdId: string) => {
    const sppd = sppds.find(s => s.id === sppdId);
    if (!sppd) {
        console.warn("SPPD Not found for ID:", sppdId);
        return;
    }

    const task = assignments.find(a => a.id === sppd.assignmentId);
    if (!task) {
        console.warn("Task Not found for SPPD:", sppdId);
        return;
    }

    const city = cities.find(c => c.id === task.destinationId);
    const dailyRate = city ? city.dailyAllowance : 0;
    const duration = task.duration;
    const empCount = task.employeeIds.length || 1;

    setEditingReceipt(null);
    const total = duration * dailyRate * empCount;

    setFormData({
      ...INITIAL_RECEIPT_STATE,
      id: `RB/${new Date().getFullYear()}/${Math.floor(Math.random() * 1000)}`,
      sppdId: sppdId,
      dailyAllowance: { 
        days: duration, 
        amountPerDay: dailyRate, 
        total: total, 
        visible: true 
      },
      totalAmount: total,
    });
    setIsModalOpen(true);
  };

  const handleOpenModal = (receipt?: Receipt) => {
    if (receipt) {
      setEditingReceipt(receipt);
      setFormData({
        ...INITIAL_RECEIPT_STATE,
        ...receipt,
        dailyAllowance: { ...INITIAL_RECEIPT_STATE.dailyAllowance, ...(receipt.dailyAllowance || {}) },
        transport: { ...INITIAL_RECEIPT_STATE.transport, ...(receipt.transport || {}) },
        accommodation: { ...INITIAL_RECEIPT_STATE.accommodation, ...(receipt.accommodation || {}) },
        fuel: { ...INITIAL_RECEIPT_STATE.fuel, ...(receipt.fuel || {}) },
        toll: { ...INITIAL_RECEIPT_STATE.toll, ...(receipt.toll || {}) },
        representation: { ...INITIAL_RECEIPT_STATE.representation, ...(receipt.representation || {}) },
        other: { ...INITIAL_RECEIPT_STATE.other, ...(receipt.other || {}) },
      });
    } else {
      setEditingReceipt(null);
      setFormData({
          ...INITIAL_RECEIPT_STATE,
          id: `RB/${new Date().getFullYear()}/${Math.floor(Math.random() * 1000)}`
      });
    }
    setIsModalOpen(true);
  };

  const calculateTotal = (data: Receipt) => {
    let total = 0;
    if (data.dailyAllowance?.visible) total += (Number(data.dailyAllowance?.total) || 0);
    if (data.transport?.visible) total += (Number(data.transport?.amount) || 0);
    if (data.accommodation?.visible) total += (Number(data.accommodation?.amount) || 0);
    if (data.fuel?.visible) total += (Number(data.fuel?.amount) || 0);
    if (data.toll?.visible) total += (Number(data.toll?.amount) || 0);
    if (data.representation?.visible) total += (Number(data.representation?.amount) || 0);
    if (data.other?.visible) total += (Number(data.other?.amount) || 0);
    return total;
  };

  const handleFormChange = (section: keyof Receipt, field: string, value: any) => {
    setFormData(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      
      if (section === 'dailyAllowance') {
        updated.dailyAllowance[field] = value;
        if (field === 'days' || field === 'amountPerDay') {
            const sppd = sppds.find(s => s.id === prev.sppdId);
            const task = assignments.find(a => a.id === sppd?.assignmentId);
            const count = task?.employeeIds.length || 1;
            updated.dailyAllowance.total = updated.dailyAllowance.days * updated.dailyAllowance.amountPerDay * count;
        }
      } else if (['transport', 'accommodation', 'fuel', 'toll', 'representation', 'other'].includes(section as string)) {
        // Fix: Cast to any or CostItem to prevent TS error about spreading union types including primitives
        if (!updated[section]) updated[section] = { ...(INITIAL_RECEIPT_STATE[section as keyof Receipt] as any) };
        updated[section][field] = value;
      } else {
        updated[section] = value;
      }

      updated.totalAmount = calculateTotal(updated);
      return updated;
    });
  };

  const handleSave = async (e?: React.FormEvent) => {
    if(e) e.preventDefault();
    if (!formData.sppdId) return alert("Pilih SPPD!");
    
    const client = getSupabase();
    const safeTotal = Number(formData.totalAmount) || 0;
    const receiptToSave = { ...formData, totalAmount: safeTotal };

    // DB Payload
    const dbPayload = {
        id: formData.id,
        sppd_id: formData.sppdId,
        date: formData.date,
        daily_allowance: formData.dailyAllowance,
        transport: formData.transport,
        accommodation: formData.accommodation,
        fuel: formData.fuel,
        toll: formData.toll,
        representation: formData.representation,
        other: formData.other,
        total_amount: safeTotal,
        status: formData.status,
        treasurer_id: formData.treasurerId,
        pptk_id: formData.pptkId,
        kpa_id: formData.kpaId
    };

    if (editingReceipt) {
      setReceipts(prev => prev.map(r => r.id === editingReceipt.id ? receiptToSave : r));
    } else {
      setReceipts(prev => [...prev, receiptToSave]);
    }
    syncToLocalStorage(editingReceipt ? receipts.map(r => r.id === editingReceipt.id ? receiptToSave : r) : [...receipts, receiptToSave]);
    setIsModalOpen(false);

    if (client) {
        try {
            const { error } = await client.from('receipts').upsert(dbPayload);
            if(error) {
                alert("Simpan DB Gagal: " + error.message);
                fetchReceiptsAndRefs();
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
      const updatedList = receipts.filter(r => r.id !== itemToDelete);
      setReceipts(updatedList);
      syncToLocalStorage(updatedList);

      const client = getSupabase();
      if(client) {
          try {
              await client.from('receipts').delete().eq('id', itemToDelete);
          } catch(e) { console.error(e); }
      }
      setItemToDelete(null);
    }
  };

  const handlePrint = (receipt?: Receipt) => {
      if(receipt) {
          // Re-fetch employees incase names updated
          const empData = localStorage.getItem('employees');
          if(empData) setEmployees(JSON.parse(empData));
          
          setPrintingReceipt(receipt);
          setIsPrintModalOpen(true);
      } else {
          window.print();
      }
  };

  const getReceiptDetails = (receipt: Receipt) => {
    const sppd = sppds.find(s => s.id === receipt.sppdId);
    const task = assignments.find(a => a.id === sppd?.assignmentId);
    const emp = employees.find(e => e.id === task?.employeeIds[0]);
    const city = cities.find(c => c.id === task?.destinationId);
    const funding = fundingSources.find(f => f.id === sppd?.fundingId);
    
    return {
        sppdNumber: sppd?.id || '-',
        taskSubject: task?.subject || '-',
        empName: emp?.name || '-',
        empNip: emp?.nip || '-',
        destination: city?.name || '-',
        fundingName: funding?.name || '-',
        participants: task?.employeeIds.length || 1,
        employeeIds: task?.employeeIds || []
    };
  };

  const renderMoneyInput = (section: keyof Receipt, label: string) => {
    const item = (formData[section] as any) || { amount: 0, description: '', visible: false };
    return (
      <div className={`p-4 border rounded-xl transition-all ${item.visible ? 'bg-white border-indigo-200 shadow-sm' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <input type="checkbox" checked={!!item.visible} onChange={(e) => handleFormChange(section, 'visible', e.target.checked)} className="w-4 h-4 text-indigo-600 rounded" />
            <label className="font-semibold text-slate-700">{label}</label>
          </div>
        </div>
        {item.visible && (
          <div className="space-y-3 pl-6">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Nominal Total (Rp)</label>
              <input type="number" value={item.amount || 0} onChange={(e) => handleFormChange(section, 'amount', Number(e.target.value))} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm" />
            </div>
            {section !== 'representation' && (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Keterangan</label>
                <input type="text" value={item.description || ''} onChange={(e) => handleFormChange(section, 'description', e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm" />
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Rincian Biaya</h1>
          <p className="text-slate-500">Kelola rincian biaya perjalanan dinas.</p>
        </div>
        <div className="flex items-center space-x-2">
            <button onClick={fetchReceiptsAndRefs} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
                <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
            </button>
            <button onClick={() => handleOpenModal()} className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">
                <Plus size={18} /><span>Buat Rincian</span>
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 print:hidden">
        {receipts.map(r => {
            const details = getReceiptDetails(r);
            return (
                <div key={r.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all relative">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                            <ReceiptIcon size={24} />
                        </div>
                        <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${r.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {r.status === 'Paid' ? 'Lunas' : 'Draft'}
                        </span>
                    </div>
                    <h3 className="font-bold text-lg text-slate-900">{r.id}</h3>
                    <p className="text-xs text-slate-400 mb-4">{r.date}</p>
                    <div className="space-y-2 text-sm text-slate-600 mb-6">
                        <p><span className="font-semibold">Pegawai:</span> {details.empName} {details.participants > 1 ? `dan ${details.participants - 1} lainnya` : ''}</p>
                        <p><span className="font-semibold">Tujuan:</span> {details.destination}</p>
                        <p><span className="font-semibold">Ref SPPD:</span> {details.sppdNumber}</p>
                    </div>
                    <div className="pt-4 border-t flex items-center justify-between">
                        <p className="text-lg font-bold text-indigo-600">Rp {r.totalAmount.toLocaleString('id-ID')}</p>
                        <div className="flex space-x-1">
                            <button onClick={() => handlePrint(r)} className="p-2 text-slate-400 hover:text-indigo-600 rounded"><Printer size={16}/></button>
                            <button onClick={() => handleOpenModal(r)} className="p-2 text-slate-400 hover:text-indigo-600 rounded"><Edit2 size={16}/></button>
                            <button onClick={() => requestDelete(r.id)} className="p-2 text-slate-400 hover:text-rose-600 rounded"><Trash2 size={16}/></button>
                        </div>
                    </div>
                </div>
            );
        })}
        {receipts.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">Belum ada data rincian biaya.</div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-hidden">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-bold text-slate-900">{editingReceipt ? 'Edit' : 'Buat'} Rincian Biaya</h3>
              <button onClick={() => setIsModalOpen(false)}><X size={24} className="text-slate-400" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Nomor Rincian</label>
                        <input type="text" value={formData.id} onChange={(e) => setFormData({...formData, id: e.target.value})} className="w-full px-4 py-2 border rounded-xl" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Referensi SPPD</label>
                        <select value={formData.sppdId} onChange={(e) => setFormData({...formData, sppdId: e.target.value})} className="w-full px-4 py-2 border rounded-xl">
                            <option value="">-- Pilih SPPD --</option>
                            {sppds.map(s => <option key={s.id} value={s.id}>{s.id} - {assignments.find(a => a.id === s.assignmentId)?.subject}</option>)}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="p-4 border border-indigo-200 bg-indigo-50/50 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                            <label className="font-semibold text-indigo-900">Uang Harian (Total)</label>
                            <input type="checkbox" checked={formData.dailyAllowance.visible} onChange={(e) => handleFormChange('dailyAllowance', 'visible', e.target.checked)} className="w-4 h-4 text-indigo-600 rounded"/>
                        </div>
                        {formData.dailyAllowance.visible && (
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between"><span>Hari:</span><input type="number" value={formData.dailyAllowance.days} onChange={(e) => handleFormChange('dailyAllowance', 'days', Number(e.target.value))} className="w-16 p-1 border rounded" /></div>
                                <div className="flex justify-between"><span>Rate (Per Orang):</span><input type="number" value={formData.dailyAllowance.amountPerDay} onChange={(e) => handleFormChange('dailyAllowance', 'amountPerDay', Number(e.target.value))} className="w-24 p-1 border rounded" /></div>
                                <div className="font-bold text-right border-t pt-1">Total (Semua): Rp {formData.dailyAllowance.total.toLocaleString()}</div>
                            </div>
                        )}
                    </div>
                    {renderMoneyInput('transport', 'Biaya Transportasi')}
                    {renderMoneyInput('accommodation', 'Biaya Penginapan')}
                    {renderMoneyInput('fuel', 'BBM')}
                    {renderMoneyInput('toll', 'Tol')}
                    {renderMoneyInput('representation', 'Uang Representasi')}
                    {renderMoneyInput('other', 'Lain-lain')}
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border">
                    <h4 className="font-bold text-sm text-slate-700 mb-3">Tanda Tangan</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <select value={formData.treasurerId} onChange={(e) => setFormData({...formData, treasurerId: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm"><option value="">-- Bendahara --</option>{signatories.map(s => <option key={s.id} value={s.id}>{s.role}</option>)}</select>
                        <select value={formData.pptkId} onChange={(e) => setFormData({...formData, pptkId: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm"><option value="">-- PPTK --</option>{signatories.map(s => <option key={s.id} value={s.id}>{s.role}</option>)}</select>
                        <select value={formData.kpaId} onChange={(e) => setFormData({...formData, kpaId: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm"><option value="">-- KPA --</option>{signatories.map(s => <option key={s.id} value={s.id}>{s.role}</option>)}</select>
                    </div>
                </div>
            </div>
            <div className="p-6 border-t bg-white flex justify-between items-center">
                <div className="text-lg font-bold text-slate-900">Total: Rp {formData.totalAmount.toLocaleString('id-ID')}</div>
                <div className="flex space-x-2">
                    <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-slate-100 rounded-lg font-bold">Batal</button>
                    <button onClick={() => handleSave()} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold">Simpan</button>
                </div>
            </div>
          </div>
        </div>
      )}

      {isPrintModalOpen && printingReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
            <div className="bg-white w-full max-w-[210mm] max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl">
                <div className="p-4 border-b flex justify-between print:hidden sticky top-0 bg-white z-10">
                    <h3 className="font-bold">Cetak Rincian Biaya</h3>
                    <div className="flex space-x-2">
                        <button onClick={() => window.print()} className="px-3 py-1 bg-indigo-600 text-white rounded text-sm font-bold flex items-center"><Printer size={16} className="mr-1"/> Print</button>
                        <button onClick={() => setIsPrintModalOpen(false)} className="px-3 py-1 bg-slate-200 rounded text-sm font-bold">Tutup</button>
                    </div>
                </div>
                <div id="print-area" className="p-8 text-black font-serif text-sm bg-white" style={{ fontFamily: 'Times New Roman, serif' }}>
                    {(() => {
                        const details = getReceiptDetails(printingReceipt);
                        const participantCount = details.participants;
                        const mainEmployee = employees.find(e => e.id === details.employeeIds[0]);
                        const treasurer = signatories.find(s => s.id === printingReceipt.treasurerId);
                        const treasurerEmp = employees.find(e => e.id === treasurer?.employeeId);
                        const kpa = signatories.find(s => s.id === printingReceipt.kpaId);
                        const kpaEmp = employees.find(e => e.id === kpa?.employeeId);
                        const pptk = signatories.find(s => s.id === printingReceipt.pptkId);
                        const pptkEmp = employees.find(e => e.id === pptk?.employeeId);

                        // --- LAYOUT LOGIC ---
                        if (participantCount > 5) {
                            // FORMAT E: REKAPITULASI (> 5 Orang)
                            const tableBorder = "border border-black p-1";
                            return (
                                <div>
                                    <div className="text-center font-bold mb-4 uppercase">
                                        <h3 className="text-md">REKAPITULASI RINCIAN BIAYA PERJALANAN DINAS</h3>
                                    </div>
                                    <div className="mb-4">
                                        <table>
                                            <tbody>
                                                <tr><td className="w-40">Lampiran SPPD Nomor</td><td>: {details.sppdNumber}</td></tr>
                                                <tr><td>Tanggal</td><td>: {new Date(printingReceipt.date).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}</td></tr>
                                            </tbody>
                                        </table>
                                    </div>
                                    <table className="w-full border-collapse border border-black text-xs">
                                        <thead>
                                            <tr className="bg-gray-100 text-center">
                                                <th className={tableBorder}>No</th>
                                                <th className={tableBorder}>Nama Penerima</th>
                                                <th className={tableBorder}>Uang Harian</th>
                                                <th className={tableBorder}>Biaya Transport</th>
                                                <th className={tableBorder}>Biaya Penginapan</th>
                                                <th className={tableBorder}>Lain-Lain</th>
                                                <th className={tableBorder}>Total</th>
                                                <th className={tableBorder}>Tanda Tangan</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {details.employeeIds.map((eid, idx) => {
                                                const pEmp = employees.find(e => e.id === eid);
                                                // Simple calculation assumption: Total divided by N
                                                const uh = (printingReceipt.dailyAllowance.amountPerDay * printingReceipt.dailyAllowance.days);
                                                const trans = (printingReceipt.transport.amount + printingReceipt.fuel.amount) / participantCount;
                                                const hotel = printingReceipt.accommodation.amount / participantCount;
                                                const other = (printingReceipt.other.amount + printingReceipt.representation.amount) / participantCount;
                                                const subTotal = uh + trans + hotel + other;

                                                return (
                                                    <tr key={eid}>
                                                        <td className={`${tableBorder} text-center`}>{idx + 1}</td>
                                                        <td className={tableBorder}>{pEmp?.name}<br/>NIP: {pEmp?.nip}</td>
                                                        <td className={`${tableBorder} text-right`}>{uh.toLocaleString()}</td>
                                                        <td className={`${tableBorder} text-right`}>{trans.toLocaleString()}</td>
                                                        <td className={`${tableBorder} text-right`}>{hotel.toLocaleString()}</td>
                                                        <td className={`${tableBorder} text-right`}>{other.toLocaleString()}</td>
                                                        <td className={`${tableBorder} text-right font-bold`}>{subTotal.toLocaleString()}</td>
                                                        <td className={tableBorder}></td>
                                                    </tr>
                                                );
                                            })}
                                            <tr className="font-bold bg-gray-50">
                                                <td colSpan={2} className={`${tableBorder} text-center`}>JUMLAH TOTAL</td>
                                                <td colSpan={5} className={`${tableBorder} text-right`}>Rp {printingReceipt.totalAmount.toLocaleString()}</td>
                                                <td className={tableBorder}></td>
                                            </tr>
                                        </tbody>
                                    </table>
                                    
                                    <div className="flex justify-between mt-8 text-center text-xs">
                                        <div className="w-1/3">
                                            <p className="font-bold mb-16">Pengguna Anggaran / KPA</p>
                                            <p className="font-bold underline">{kpaEmp?.name}</p>
                                            <p>NIP. {kpaEmp?.nip}</p>
                                        </div>
                                        <div className="w-1/3">
                                            <p className="font-bold mb-16">Pejabat Pelaksana Teknis Kegiatan</p>
                                            <p className="font-bold underline">{pptkEmp?.name}</p>
                                            <p>NIP. {pptkEmp?.nip}</p>
                                        </div>
                                        <div className="w-1/3">
                                            <p className="font-bold mb-16">Bendahara Pengeluaran</p>
                                            <p className="font-bold underline">{treasurerEmp?.name}</p>
                                            <p>NIP. {treasurerEmp?.nip}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        } else if (participantCount >= 2) {
                            // FORMAT C1: 2-5 Orang
                            const tableBorder = "border border-black p-2 align-top";
                            return (
                                <div>
                                    <div className="text-center font-bold mb-6">
                                        <h3 className="text-md uppercase">RINCIAN BIAYA PERJALANAN DINAS</h3>
                                    </div>
                                    <div className="mb-4 text-xs">
                                        <table>
                                            <tbody>
                                                <tr><td className="w-40">Lampiran SPPD Nomor</td><td>: {details.sppdNumber}</td></tr>
                                                <tr><td>Tanggal</td><td>: {new Date(printingReceipt.date).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}</td></tr>
                                            </tbody>
                                        </table>
                                    </div>
                                    <table className="w-full border-collapse border border-black text-xs mb-6">
                                        <thead>
                                            <tr className="bg-gray-100 text-center">
                                                <th className={`${tableBorder} w-8`}>No.</th>
                                                <th className={tableBorder}>PERINCIAN BIAYA</th>
                                                <th className={`${tableBorder} w-32`}>JUMLAH</th>
                                                <th className={`${tableBorder} w-24`}>TANDA TANGAN</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {details.employeeIds.map((eid, idx) => {
                                                const pEmp = employees.find(e => e.id === eid);
                                                const uh = (printingReceipt.dailyAllowance.amountPerDay * printingReceipt.dailyAllowance.days);
                                                // Assuming even split for shared costs in the view
                                                const trans = (printingReceipt.transport.amount + printingReceipt.fuel.amount) / participantCount;
                                                const hotel = printingReceipt.accommodation.amount / participantCount;
                                                
                                                return (
                                                    <tr key={eid}>
                                                        <td className={`${tableBorder} text-center`}>{idx + 1}.</td>
                                                        <td className={tableBorder}>
                                                            <div className="font-bold mb-1">{pEmp?.name}</div>
                                                            <div className="flex justify-between pl-4"><span>Uang Harian</span><span>Rp {uh.toLocaleString()}</span></div>
                                                            <div className="flex justify-between pl-4"><span>Biaya Transport</span><span>Rp {trans.toLocaleString()}</span></div>
                                                            <div className="flex justify-between pl-4"><span>Biaya Penginapan</span><span>Rp {hotel.toLocaleString()}</span></div>
                                                        </td>
                                                        <td className={`${tableBorder} text-right align-bottom font-bold`}>
                                                            <br/><br/><br/>
                                                            Rp {(uh + trans + hotel).toLocaleString()}
                                                        </td>
                                                        <td className={`${tableBorder} align-middle`}>
                                                            <div className="h-10 text-xs text-gray-400">{idx+1}.</div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            <tr>
                                                <td colSpan={2} className={`${tableBorder} text-center font-bold`}>JUMLAH TOTAL</td>
                                                <td className={`${tableBorder} text-right font-bold`}>Rp {printingReceipt.totalAmount.toLocaleString()}</td>
                                                <td className={tableBorder}></td>
                                            </tr>
                                            <tr>
                                                <td colSpan={4} className={`${tableBorder} italic`}>Terbilang: {terbilang(printingReceipt.totalAmount)} Rupiah</td>
                                            </tr>
                                        </tbody>
                                    </table>

                                    <div className="flex justify-between items-start text-xs mt-4">
                                        <div className="w-[40%]">
                                            <p>Telah dibayar sejumlah</p>
                                            <p className="font-bold mb-4">Rp {printingReceipt.totalAmount.toLocaleString()}</p>
                                            <p className="mb-16">Bendahara Pengeluaran</p>
                                            <p className="font-bold underline">{treasurerEmp?.name}</p>
                                            <p>NIP. {treasurerEmp?.nip}</p>
                                        </div>
                                        <div className="w-[40%]">
                                            <p>Demak, {new Date(printingReceipt.date).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}</p>
                                            <p>Telah menerima jumlah uang sebesar</p>
                                            <p className="font-bold mb-4">Rp {printingReceipt.totalAmount.toLocaleString()}</p>
                                            <p className="mb-16">Pejabat Pelaksana Teknis Kegiatan (PPTK)</p>
                                            <p className="font-bold underline">{pptkEmp?.name}</p>
                                            <p>NIP. {pptkEmp?.nip}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="border-t border-black mt-4 pt-2 text-center text-xs">
                                        <p className="font-bold mb-2">MENGETAHUI</p>
                                        <p className="mb-16">Pengguna Anggaran / Kuasa Pengguna Anggaran</p>
                                        <p className="font-bold underline">{kpaEmp?.name}</p>
                                        <p>NIP. {kpaEmp?.nip}</p>
                                    </div>
                                </div>
                            );
                        } else {
                            // FORMAT C: 1 Orang (Default)
                            const tableBorder = "border border-black p-2";
                            let rowNum = 1;
                            return (
                                <div>
                                    <div className="text-center font-bold mb-6">
                                        <h3 className="text-md uppercase">RINCIAN BIAYA PERJALANAN DINAS</h3>
                                    </div>
                                    <div className="mb-4 text-xs">
                                        <table>
                                            <tbody>
                                                <tr><td className="w-40">Lampiran SPPD Nomor</td><td>: {details.sppdNumber}</td></tr>
                                                <tr><td>Tanggal</td><td>: {new Date(printingReceipt.date).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}</td></tr>
                                            </tbody>
                                        </table>
                                    </div>
                                    
                                    <table className="w-full border-collapse border border-black text-xs mb-6">
                                        <thead>
                                            <tr className="bg-gray-100 text-center">
                                                <th className={`${tableBorder} w-10`}>No.</th>
                                                <th className={tableBorder}>PERINCIAN BIAYA</th>
                                                <th className={`${tableBorder} w-32`}>JUMLAH</th>
                                                <th className={`${tableBorder} w-40`}>KETERANGAN</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {/* Cost Items */}
                                            {printingReceipt.dailyAllowance.visible && (
                                                <tr>
                                                    <td className={`${tableBorder} text-center`}>{rowNum++}.</td>
                                                    <td className={tableBorder}>Uang Harian ({printingReceipt.dailyAllowance.days} hari x Rp {printingReceipt.dailyAllowance.amountPerDay.toLocaleString()})</td>
                                                    <td className={`${tableBorder} text-right`}>Rp {printingReceipt.dailyAllowance.total.toLocaleString()}</td>
                                                    <td className={tableBorder}></td>
                                                </tr>
                                            )}
                                            {printingReceipt.transport.visible && (
                                                <tr>
                                                    <td className={`${tableBorder} text-center`}>{rowNum++}.</td>
                                                    <td className={tableBorder}>Biaya Transport: {printingReceipt.transport.description}</td>
                                                    <td className={`${tableBorder} text-right`}>Rp {printingReceipt.transport.amount.toLocaleString()}</td>
                                                    <td className={tableBorder}></td>
                                                </tr>
                                            )}
                                            {printingReceipt.fuel.visible && (
                                                <tr>
                                                    <td className={`${tableBorder} text-center`}>{rowNum++}.</td>
                                                    <td className={tableBorder}>Biaya BBM: {printingReceipt.fuel.description}</td>
                                                    <td className={`${tableBorder} text-right`}>Rp {printingReceipt.fuel.amount.toLocaleString()}</td>
                                                    <td className={tableBorder}></td>
                                                </tr>
                                            )}
                                            {printingReceipt.accommodation.visible && (
                                                <tr>
                                                    <td className={`${tableBorder} text-center`}>{rowNum++}.</td>
                                                    <td className={tableBorder}>Biaya Penginapan: {printingReceipt.accommodation.description}</td>
                                                    <td className={`${tableBorder} text-right`}>Rp {printingReceipt.accommodation.amount.toLocaleString()}</td>
                                                    <td className={tableBorder}></td>
                                                </tr>
                                            )}
                                            {/* Add filler rows to match format look */}
                                            {[...Array(Math.max(0, 8 - rowNum))].map((_, i) => (
                                                <tr key={i}>
                                                    <td className={`${tableBorder} text-center`}>{rowNum + i}.</td>
                                                    <td className={tableBorder}></td>
                                                    <td className={tableBorder}></td>
                                                    <td className={tableBorder}></td>
                                                </tr>
                                            ))}
                                            
                                            <tr>
                                                <td colSpan={2} className={`${tableBorder} font-bold`}>JUMLAH</td>
                                                <td className={`${tableBorder} text-right font-bold`}>Rp {printingReceipt.totalAmount.toLocaleString()}</td>
                                                <td className={tableBorder}></td>
                                            </tr>
                                            <tr>
                                                <td colSpan={4} className={`${tableBorder} italic`}>Terbilang: {terbilang(printingReceipt.totalAmount)} Rupiah</td>
                                            </tr>
                                        </tbody>
                                    </table>

                                    <div className="flex justify-between items-start text-xs mt-4">
                                        <div className="w-[40%]">
                                            <p>Telah dibayar sejumlah</p>
                                            <p className="font-bold mb-4">Rp {printingReceipt.totalAmount.toLocaleString()}</p>
                                            <p className="mb-16">Bendahara Pengeluaran</p>
                                            <p className="font-bold underline">{treasurerEmp?.name}</p>
                                            <p>NIP. {treasurerEmp?.nip}</p>
                                        </div>
                                        <div className="w-[40%]">
                                            <p>Demak, {new Date(printingReceipt.date).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}</p>
                                            <p>Telah menerima jumlah uang sebesar</p>
                                            <p className="font-bold mb-4">Rp {printingReceipt.totalAmount.toLocaleString()}</p>
                                            <p className="mb-16">Yang Menerima</p>
                                            <p className="font-bold underline">{mainEmployee?.name}</p>
                                            <p>NIP. {mainEmployee?.nip}</p>
                                        </div>
                                    </div>

                                    {/* Perhitungan Rampung */}
                                    <div className="mt-6 border-t border-b border-black py-2 text-xs">
                                        <p className="font-bold text-center mb-2">PERHITUNGAN SPPD RAMPUNG</p>
                                        <table className="w-full">
                                            <tbody>
                                                <tr>
                                                    <td className="w-40">Ditetapkan sejumlah</td>
                                                    <td>: Rp {printingReceipt.totalAmount.toLocaleString()}</td>
                                                </tr>
                                                <tr>
                                                    <td>Yang telah dibayar semula</td>
                                                    <td>: Rp 0</td>
                                                </tr>
                                                <tr>
                                                    <td>Sisa kurang / lebih</td>
                                                    <td>: Rp {printingReceipt.totalAmount.toLocaleString()}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="flex justify-between mt-6 text-center text-xs">
                                        <div className="w-1/2">
                                            <p className="font-bold mb-16">Pengguna Anggaran / KPA</p>
                                            <p className="font-bold underline">{kpaEmp?.name}</p>
                                            <p>NIP. {kpaEmp?.nip}</p>
                                        </div>
                                        <div className="w-1/2">
                                            <p className="font-bold mb-16">Pejabat Pelaksana Teknis Kegiatan</p>
                                            <p className="font-bold underline">{pptkEmp?.name}</p>
                                            <p>NIP. {pptkEmp?.nip}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        }
                    })()}
                </div>
            </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Hapus Rincian Biaya"
        message="Apakah Anda yakin ingin menghapus data ini?"
        confirmText="Ya, Hapus"
        isDanger={true}
      />

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
            background: white;
            color: black;
          }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default ReceiptManager;
