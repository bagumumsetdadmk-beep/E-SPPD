
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Receipt as ReceiptIcon, Upload, Camera, Search, Filter, X, Plus, Trash2, Edit2, Printer, Check, Eye, EyeOff, DollarSign, AlertTriangle } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { Receipt, SPPD, AssignmentLetter, Employee, City, Signatory, FundingSource } from '../types';
import ConfirmationModal from './ConfirmationModal';

// Helper function for Terbilang
// FIX: Logic corrected to prevent infinite recursion
const terbilang = (nilai: number): string => {
  if (typeof nilai !== 'number' || isNaN(nilai) || !isFinite(nilai)) return "Nol";
  
  const n = Math.floor(Math.abs(nilai));
  const angka = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];

  if (n < 12) {
    return " " + angka[n];
  } else if (n < 20) {
    return terbilang(n - 10) + " Belas";
  } else if (n < 100) {
    return terbilang(Math.floor(n / 10)) + " Puluh" + terbilang(n % 10);
  } else if (n < 200) {
    return " Seratus" + terbilang(n - 100);
  } else if (n < 1000) {
    return terbilang(Math.floor(n / 100)) + " Ratus" + terbilang(n % 100);
  } else if (n < 2000) {
    return " Seribu" + terbilang(n - 1000);
  } else if (n < 1000000) {
    return terbilang(Math.floor(n / 1000)) + " Ribu" + terbilang(n % 1000);
  } else if (n < 1000000000) {
    return terbilang(Math.floor(n / 1000000)) + " Juta" + terbilang(n % 1000000);
  } else if (n < 1000000000000) {
    return terbilang(Math.floor(n / 1000000000)) + " Milyar" + terbilang(n % 1000000000);
  } else {
    return "Angka Terlalu Besar";
  }
};

// Default Initial State
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

  // Load All Master Data
  const [sppds, setSppds] = useState<SPPD[]>([]);
  const [assignments, setAssignments] = useState<AssignmentLetter[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [signatories, setSignatories] = useState<Signatory[]>([]);
  const [fundingSources, setFundingSources] = useState<FundingSource[]>([]);
  
  const [receipts, setReceipts] = useState<Receipt[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
  const [printingReceipt, setPrintingReceipt] = useState<Receipt | null>(null);
  
  // Delete Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  // Verification Confirm Modal
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState("");

  // Form State
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
    // Load data from local storage
    try {
        setSppds(JSON.parse(localStorage.getItem('sppd_data') || '[]'));
        setAssignments(JSON.parse(localStorage.getItem('assignment_tasks_v2') || '[]'));
        setEmployees(JSON.parse(localStorage.getItem('employees') || '[]'));
        setCities(JSON.parse(localStorage.getItem('cities') || '[]'));
        setSignatories(JSON.parse(localStorage.getItem('signatories') || '[]'));
        setFundingSources(JSON.parse(localStorage.getItem('funding_sources') || '[]'));
    } catch (e) {
        console.error("Error loading master data", e);
    }
    fetchReceipts();
  }, []);

  const fetchReceipts = async () => {
    const client = getSupabase();
    if(client) {
        try {
            const { data, error } = await client.from('receipts').select('*').order('created_at', { ascending: false });
            if(error) throw error;
            if(data) {
                const mapped: Receipt[] = data.map((item: any) => ({
                    id: item.id,
                    sppdId: item.sppd_id,
                    date: item.date,
                    dailyAllowance: item.daily_allowance,
                    transport: item.transport,
                    accommodation: item.accommodation,
                    fuel: item.fuel,
                    toll: item.toll,
                    representation: item.representation,
                    other: item.other,
                    totalAmount: Number(item.total_amount),
                    status: item.status,
                    treasurerId: item.treasurer_id,
                    pptkId: item.pptk_id,
                    kpaId: item.kpa_id
                }));
                setReceipts(mapped);
                return;
            }
        } catch(e) { console.error(e); }
    }

    const saved = localStorage.getItem('receipt_data_v2');
    const parsed = saved ? JSON.parse(saved) : [];
    // SANITIZATION
    const sanitized = parsed.map((r: any) => ({
      ...INITIAL_RECEIPT_STATE,
      ...r,
      dailyAllowance: { ...INITIAL_RECEIPT_STATE.dailyAllowance, ...(r.dailyAllowance || {}) },
      transport: { ...INITIAL_RECEIPT_STATE.transport, ...(r.transport || {}) },
      accommodation: { ...INITIAL_RECEIPT_STATE.accommodation, ...(r.accommodation || {}) },
      fuel: { ...INITIAL_RECEIPT_STATE.fuel, ...(r.fuel || {}) },
      toll: { ...INITIAL_RECEIPT_STATE.toll, ...(r.toll || {}) },
      representation: { ...INITIAL_RECEIPT_STATE.representation, ...(r.representation || {}) },
      other: { ...INITIAL_RECEIPT_STATE.other, ...(r.other || {}) },
      totalAmount: Number(r.totalAmount) || 0
    }));
    setReceipts(sanitized);
  };

  const syncToLocalStorage = (data: Receipt[]) => {
    localStorage.setItem('receipt_data_v2', JSON.stringify(data));
  };

  // Check for navigation from SPPD Manager
  useEffect(() => {
    if (location.state && location.state.createSppdId) {
      const sppdId = location.state.createSppdId;
      // Check if receipt already exists
      const existing = receipts.find(r => r.sppdId === sppdId);
      if (existing) {
        handleOpenModal(existing);
      } else {
        handleCreateFromSPPD(sppdId);
      }
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, receipts, sppds, assignments, navigate, location.pathname]);

  const handleCreateFromSPPD = (sppdId: string) => {
    const sppd = sppds.find(s => s.id === sppdId);
    if (!sppd) return;

    const task = assignments.find(a => a.id === sppd.assignmentId);
    if (!task) return;

    const city = cities.find(c => c.id === task.destinationId);
    const dailyRate = city ? city.dailyAllowance : 0;
    const duration = task.duration;
    const empCount = task.employeeIds.length || 1;

    setEditingReceipt(null);
    // Suggest Total: Duration * Rate * Number of People
    const total = duration * dailyRate * empCount;

    setFormData({
      ...INITIAL_RECEIPT_STATE,
      id: `KW-${Date.now()}`,
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
        dailyAllowance: { ...INITIAL_RECEIPT_STATE.dailyAllowance, ...receipt.dailyAllowance },
        transport: { ...INITIAL_RECEIPT_STATE.transport, ...receipt.transport },
        accommodation: { ...INITIAL_RECEIPT_STATE.accommodation, ...receipt.accommodation },
        fuel: { ...INITIAL_RECEIPT_STATE.fuel, ...(receipt.fuel || {}) },
        toll: { ...INITIAL_RECEIPT_STATE.toll, ...(receipt.toll || {}) },
        representation: { ...INITIAL_RECEIPT_STATE.representation, ...receipt.representation },
        other: { ...INITIAL_RECEIPT_STATE.other, ...receipt.other },
        pptkId: receipt.pptkId || '',
        kpaId: receipt.kpaId || ''
      });
    } else {
      setEditingReceipt(null);
      setFormData({
          ...INITIAL_RECEIPT_STATE,
          id: `KW-${Date.now()}`
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
        // @ts-ignore
        if (!updated[section]) updated[section] = { ...INITIAL_RECEIPT_STATE[section] };
        // @ts-ignore
        updated[section][field] = value;
      } else {
        // @ts-ignore
        updated[section] = value;
      }

      updated.totalAmount = calculateTotal(updated);
      return updated;
    });
  };

  const handleSave = async (e?: React.FormEvent) => {
    if(e) e.preventDefault();
    
    if (!formData.sppdId) {
        alert("Harap pilih Referensi SPPD terlebih dahulu.");
        return;
    }
    
    const client = getSupabase();
    const safeTotal = Number(formData.totalAmount) || 0;
    const receiptToSave = { ...formData, totalAmount: safeTotal };

    // DB Payload (snake_case)
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
            await client.from('receipts').upsert(dbPayload);
        } catch(e) { console.error(e); }
    }
  };

  // Step 1: Request Verification (Trigger Modal)
  const requestVerifyPayment = () => {
    if (!formData.sppdId) {
      alert("SPPD belum dipilih!");
      return;
    }

    const safeTotal = Number(formData.totalAmount) || 0;
    const sppd = sppds.find(s => s.id === formData.sppdId);
    
    if (!sppd) {
      alert("Data SPPD tidak ditemukan!");
      return;
    }

    if (!sppd.fundingId) {
      alert("SPPD ini belum memiliki Sumber Dana. Mohon edit data SPPD terlebih dahulu.");
      return;
    }

    const source = fundingSources.find(f => f.id === sppd.fundingId);
    if (!source) {
       alert("Sumber dana tidak ditemukan!");
       return;
    }

    if (safeTotal > 0 && source.amount < safeTotal) {
      alert(`Saldo anggaran tidak mencukupi! \nSisa Anggaran: Rp ${source.amount.toLocaleString()} \nDibutuhkan: Rp ${safeTotal.toLocaleString()}`);
      return;
    }

    const msg = safeTotal > 0 
        ? `Konfirmasi Pembayaran:\n\nTotal: Rp ${safeTotal.toLocaleString()}\nSumber Dana: ${source.name}\n\nSaldo akan dikurangi secara otomatis. Lanjutkan?`
        : `Konfirmasi Verifikasi:\n\nTotal Biaya: Rp 0\nStatus akan diubah menjadi Selesai. Lanjutkan?`;
    
    setVerifyMessage(msg);
    setIsVerifyModalOpen(true);
  };

  // Step 2: Confirm Verification (Execute Action)
  const confirmVerifyPayment = async () => {
    const client = getSupabase();
    const safeTotal = Number(formData.totalAmount) || 0;
    const sppd = sppds.find(s => s.id === formData.sppdId);
    const source = fundingSources.find(f => f.id === sppd?.fundingId);

    // 1. Update Funding (Local)
    if (source && safeTotal > 0) {
        const updatedSources = fundingSources.map(s => 
          s.id === source.id ? { ...s, amount: s.amount - safeTotal } : s
        );
        setFundingSources(updatedSources);
        localStorage.setItem('funding_sources', JSON.stringify(updatedSources));
        
        // Update DB Funding
        if(client) {
            await client.from('funding_sources').update({ amount: source.amount - safeTotal }).eq('id', source.id);
        }
    }

    // 2. Update SPPD Status (Local)
    if (sppd) {
        const updatedSppds = sppds.map(s => 
          s.id === sppd.id ? { ...s, status: 'Selesai' as const } : s
        );
        setSppds(updatedSppds);
        localStorage.setItem('sppd_data', JSON.stringify(updatedSppds));
        
        // Update DB SPPD
        if(client) {
            await client.from('sppds').update({ status: 'Selesai' }).eq('id', sppd.id);
        }
    }

    // 3. Update Receipt
    const paidReceipt: Receipt = { 
        ...formData, 
        totalAmount: safeTotal,
        status: 'Paid' 
    };
    
    // DB Payload for Receipt
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
        status: 'Paid',
        treasurer_id: formData.treasurerId,
        pptk_id: formData.pptkId,
        kpa_id: formData.kpaId
    };

    if (editingReceipt) {
      setReceipts(prev => prev.map(r => r.id === editingReceipt.id ? paidReceipt : r));
    } else {
      setReceipts(prev => [...prev, paidReceipt]);
    }
    syncToLocalStorage(editingReceipt ? receipts.map(r => r.id === editingReceipt.id ? paidReceipt : r) : [...receipts, paidReceipt]);

    // Update DB Receipt
    if(client) {
        await client.from('receipts').upsert(dbPayload);
    }

    setIsModalOpen(false);
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

  const handlePrint = (receipt: Receipt) => {
    setPrintingReceipt(receipt);
    setIsPrintModalOpen(true);
  };

  // ... (renderMoneyInput and getReceiptDetails remain unchanged)
  const renderMoneyInput = (section: keyof Receipt, label: string) => {
    // Cast to any to safely access properties that might not exist on all Receipt keys
    const item = (formData[section] as any) || { amount: 0, description: '', visible: false };

    return (
      <div className={`p-4 border rounded-xl transition-all ${item.visible ? 'bg-white border-indigo-200 shadow-sm' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <input 
              type="checkbox" 
              checked={!!item.visible} 
              onChange={(e) => handleFormChange(section, 'visible', e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
            />
            <label className="font-semibold text-slate-700">{label}</label>
          </div>
        </div>
        
        {item.visible && (
          <div className="space-y-3 pl-6">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Nominal (Rp)</label>
              <input 
                type="number" 
                value={item.amount || 0} 
                onChange={(e) => handleFormChange(section, 'amount', Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-indigo-500 outline-none" 
              />
            </div>
            {section !== 'representation' && (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Keterangan / Rincian</label>
                <input 
                  type="text" 
                  value={item.description || ''} 
                  onChange={(e) => handleFormChange(section, 'description', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-indigo-500 outline-none" 
                />
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const getReceiptDetails = (receipt: Receipt) => {
    const sppd = sppds.find(s => s.id === receipt.sppdId);
    const task = assignments.find(a => a.id === sppd?.assignmentId);
    const emp = employees.find(e => e.id === task?.employeeIds[0]);
    
    const treasurer = signatories.find(s => s.id === receipt.treasurerId);
    const treasurerEmp = employees.find(e => e.id === treasurer?.employeeId);
    
    const pptk = signatories.find(s => s.id === receipt.pptkId);
    const pptkEmp = employees.find(e => e.id === pptk?.employeeId);
    
    const kpa = signatories.find(s => s.id === receipt.kpaId);
    const kpaEmp = employees.find(e => e.id === kpa?.employeeId);

    return { sppd, task, emp, treasurer, treasurerEmp, pptk, pptkEmp, kpa, kpaEmp };
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kwitansi & Rincian Biaya</h1>
          <p className="text-slate-500">Kelola bukti pembayaran dan rincian biaya perjalanan dinas.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)} 
          className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-md"
        >
          <Plus size={18} />
          <span className="font-medium text-sm">Buat Manual</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {receipts.map((r) => {
          const { emp } = getReceiptDetails(r);
          const isPaid = r.status === 'Paid';
          
          return (
            <div key={r.id} className={`bg-white p-6 rounded-2xl border shadow-sm flex flex-col justify-between hover:shadow-md transition-all ${isPaid ? 'border-emerald-200 bg-emerald-50/20' : ''}`}>
              <div>
                <div className="flex justify-between items-start mb-4">
                   <div className={`p-3 rounded-xl ${isPaid ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
                      <ReceiptIcon size={24} />
                   </div>
                   <span className={`px-2 py-1 text-[10px] font-bold rounded-md uppercase tracking-wider ${isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                     {r.status === 'Paid' ? 'Lunas / Selesai' : r.status}
                   </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">Rp {Number(r.totalAmount).toLocaleString('id-ID') || '0'}</h3>
                <p className="text-xs text-slate-500 mb-4">{terbilang(Number(r.totalAmount) || 0)} Rupiah</p>
                
                <div className="space-y-2 text-sm text-slate-600 border-t pt-4">
                   <div className="flex justify-between">
                     <span className="text-slate-400">Pegawai:</span>
                     <span className="font-medium">{emp?.name || '-'}</span>
                   </div>
                   <div className="flex justify-between">
                     <span className="text-slate-400">SPPD:</span>
                     <span className="font-mono text-xs bg-slate-100 px-1 rounded">{r.sppdId}</span>
                   </div>
                   <div className="flex justify-between">
                     <span className="text-slate-400">Tanggal:</span>
                     <span>{r.date}</span>
                   </div>
                </div>
              </div>
              <div className="flex mt-6 space-x-2">
                 <button onClick={() => handlePrint(r)} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 flex items-center justify-center space-x-2">
                    <Printer size={16} /> <span>Cetak</span>
                 </button>
                 {!isPaid && (
                   <button onClick={() => handleOpenModal(r)} className="p-2 text-slate-400 hover:text-indigo-600 border rounded-lg"><Edit2 size={18} /></button>
                 )}
                 <button onClick={() => requestDelete(r.id)} className="p-2 text-slate-400 hover:text-rose-600 border rounded-lg"><Trash2 size={18} /></button>
              </div>
            </div>
          );
        })}
         {receipts.length === 0 && (
          <div className="col-span-full py-20 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl">
            <ReceiptIcon className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-slate-500 font-medium">Belum ada data kwitansi.</p>
            <p className="text-xs text-slate-400 mt-1">Buat kwitansi dari menu SPPD (Klik icon $).</p>
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Hapus Kwitansi"
        message="Apakah Anda yakin ingin menghapus kwitansi ini?"
        confirmText="Ya, Hapus"
        isDanger={true}
      />

      <ConfirmationModal
        isOpen={isVerifyModalOpen}
        onClose={() => setIsVerifyModalOpen(false)}
        onConfirm={confirmVerifyPayment}
        title="Konfirmasi Pembayaran"
        message={verifyMessage}
        confirmText="Proses Bayar"
        isDanger={false}
      />

      {/* INPUT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-hidden">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50 rounded-t-2xl">
              <h3 className="text-xl font-bold text-slate-900">Rincian Biaya Perjalanan</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                     <label className="block text-sm font-semibold text-slate-700 mb-1">Nomor Kwitansi</label>
                     <input type="text" readOnly value={formData.id} className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 text-sm" />
                  </div>
                  <div>
                     <label className="block text-sm font-semibold text-slate-700 mb-1">Tanggal Kwitansi</label>
                     <input type="date" value={formData.date} onChange={(e) => handleFormChange('date', '', e.target.value)} className="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl text-black text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div className="md:col-span-2">
                     <label className="block text-sm font-semibold text-slate-700 mb-1">Referensi SPPD</label>
                     <select value={formData.sppdId} disabled={!!editingReceipt} onChange={(e) => handleCreateFromSPPD(e.target.value)} className="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl text-black text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="">-- Pilih SPPD --</option>
                        {sppds.map(s => (
                           <option key={s.id} value={s.id}>{s.id} - {assignments.find(a => a.id === s.assignmentId)?.subject}</option>
                        ))}
                     </select>
                  </div>
               </div>

               <div className="border-t pt-4">
                  <h4 className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-4">Komponen Biaya</h4>
                  <div className="space-y-4">
                     {/* 1. Uang Harian */}
                     <div className="p-4 border border-indigo-200 bg-indigo-50/50 rounded-xl">
                        <div className="flex items-center justify-between mb-3">
                           <div className="flex items-center space-x-2">
                              <Check size={18} className="text-indigo-600" />
                              <label className="font-semibold text-slate-700">Uang Harian (Otomatis)</label>
                           </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 pl-6">
                           <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">Hari</label>
                              <input type="number" value={formData.dailyAllowance?.days || 0} onChange={(e) => handleFormChange('dailyAllowance', 'days', Number(e.target.value))} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-black outline-none focus:ring-2 focus:ring-indigo-500" />
                           </div>
                           <div className="col-span-2">
                              <label className="block text-xs font-medium text-slate-500 mb-1">Nominal per Hari</label>
                              <input type="number" value={formData.dailyAllowance?.amountPerDay || 0} onChange={(e) => handleFormChange('dailyAllowance', 'amountPerDay', Number(e.target.value))} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-black outline-none focus:ring-2 focus:ring-indigo-500" />
                           </div>
                        </div>
                        <div className="text-right mt-2 text-sm font-bold text-indigo-700">
                           Total: Rp {(formData.dailyAllowance?.total || 0).toLocaleString()}
                        </div>
                     </div>

                     {/* 2. Transport */}
                     {renderMoneyInput('transport', 'Biaya Transport')}

                     {/* 3. BBM */}
                     {renderMoneyInput('fuel', 'Biaya BBM')}

                     {/* 4. Tol */}
                     {renderMoneyInput('toll', 'Biaya Tol')}
                     
                     {/* 5. Penginapan */}
                     {renderMoneyInput('accommodation', 'Biaya Penginapan')}
                     
                     {/* 6. Representasi */}
                     {renderMoneyInput('representation', 'Uang Representasi')}
                     
                     {/* 7. Lain-lain */}
                     {renderMoneyInput('other', 'Lain-lain')}
                  </div>
               </div>

               <div className="border-t pt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Bendahara Pengeluaran</label>
                    <select 
                       value={formData.treasurerId} 
                       onChange={(e) => handleFormChange('treasurerId', '', e.target.value)} 
                       className="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl text-black text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                       <option value="">-- Pilih Bendahara --</option>
                       {signatories.map(s => {
                          const emp = employees.find(e => e.id === s.employeeId);
                          return <option key={s.id} value={s.id}>{s.role} - {emp?.name}</option>;
                       })}
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Kuasa Pengguna Anggaran (KPA)</label>
                        <select 
                           value={formData.kpaId} 
                           onChange={(e) => handleFormChange('kpaId', '', e.target.value)} 
                           className="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl text-black text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                           <option value="">-- Pilih KPA / PA --</option>
                           {signatories.map(s => {
                              const emp = employees.find(e => e.id === s.employeeId);
                              return <option key={s.id} value={s.id}>{s.role} - {emp?.name}</option>;
                           })}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">PPTK</label>
                        <select 
                           value={formData.pptkId} 
                           onChange={(e) => handleFormChange('pptkId', '', e.target.value)} 
                           className="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl text-black text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                           <option value="">-- Pilih PPTK --</option>
                           {signatories.map(s => {
                              const emp = employees.find(e => e.id === s.employeeId);
                              return <option key={s.id} value={s.id}>{s.role} - {emp?.name}</option>;
                           })}
                        </select>
                      </div>
                  </div>
               </div>
            </div>

            <div className="p-6 border-t bg-slate-50 rounded-b-2xl flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
               <div>
                  <p className="text-xs text-slate-500 uppercase font-bold">Total Biaya</p>
                  <p className="text-2xl font-black text-slate-900">Rp {Number(formData.totalAmount).toLocaleString()}</p>
               </div>
               <div className="flex space-x-3 w-full md:w-auto">
                  {formData.status !== 'Paid' ? (
                    <>
                       <button type="button" onClick={() => handleSave()} className="flex-1 px-4 py-2.5 bg-white border border-slate-300 text-slate-600 font-bold rounded-xl hover:bg-slate-50">Simpan Draft</button>
                       <button type="button" onClick={requestVerifyPayment} className="flex-1 px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-100 flex items-center justify-center space-x-2">
                         <Check size={18} />
                         <span>Bayar & Verifikasi</span>
                       </button>
                    </>
                  ) : (
                    <div className="px-6 py-2 bg-emerald-100 text-emerald-700 font-bold rounded-xl flex items-center">
                       <Check size={20} className="mr-2"/> Terbayar
                    </div>
                  )}
               </div>
            </div>
          </div>
        </div>
      )}

      {/* PRINT PREVIEW */}
      {isPrintModalOpen && printingReceipt && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
            <div className="bg-white rounded-2xl w-full max-w-[210mm] shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 print:shadow-none print:m-0 print:w-full print:max-h-none print:h-auto">
               <div className="p-4 border-b flex justify-between items-center bg-white rounded-t-2xl flex-shrink-0 print:hidden">
                  <h3 className="text-lg font-bold text-slate-900">Cetak Kwitansi</h3>
                  <div className="flex space-x-2">
                     <button onClick={() => window.print()} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg text-sm hover:bg-indigo-700 flex items-center space-x-2"><Printer size={16} /><span>Cetak</span></button>
                     <button onClick={() => setIsPrintModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600"><X size={24} /></button>
                  </div>
               </div>
               
               <div className="overflow-y-auto flex-1 custom-scrollbar">
                  <div id="print-area" className="p-[25mm] bg-white text-black leading-tight text-sm" style={{ fontFamily: 'Times New Roman, serif', color: '#000000' }}>
                     
                     {(() => {
                        const { sppd, task, emp, treasurer, treasurerEmp, kpa, kpaEmp, pptk, pptkEmp } = getReceiptDetails(printingReceipt);
                        const r = printingReceipt;
                        const employeeCount = task?.employeeIds.length || 0;
                        const isMoreThanFour = employeeCount > 4;
                        const isMultiPersonFormatC = employeeCount > 1 && employeeCount <= 4;
                        let itemNo = 1;

                        const renderRow = (label: string, amount: number) => (
                           <tr>
                              <td className="border border-black p-1 text-center w-8">{itemNo++}.</td>
                              <td className="border border-black p-1">{label}</td>
                              <td className="border border-black p-1 w-32 border-r-0">Rp</td>
                              <td className="border border-black p-1 w-32 border-l-0 text-right">{Number(amount).toLocaleString('id-ID')}</td>
                              <td className="border border-black p-1"></td>
                           </tr>
                        );
                        
                        const renderRowFormatD = (label: string, amount: number, attachmentNote = "") => (
                           <tr>
                              <td className="border border-black p-1 text-center w-8">{itemNo++}.</td>
                              <td className="border border-black p-1">{label}</td>
                              <td className="border border-black p-1 w-32 border-r-0">Rp</td>
                              <td className="border border-black p-1 w-32 border-l-0 text-right">{Number(amount).toLocaleString('id-ID')}</td>
                              <td className="border border-black p-1 text-center">{attachmentNote}</td>
                           </tr>
                        );

                        // Calculation for Recap (Format F) - Distribute Costs
                        const perPersonDaily = r.dailyAllowance.visible ? (r.dailyAllowance.total / employeeCount) : 0;
                        const totalTransport = (r.transport?.visible ? r.transport.amount : 0) + (r.fuel?.visible ? r.fuel.amount : 0) + (r.toll?.visible ? r.toll.amount : 0);
                        const perPersonTransport = totalTransport / employeeCount;
                        const perPersonHotel = r.accommodation.visible ? (r.accommodation.amount / employeeCount) : 0;
                        const perPersonRep = r.representation.visible ? (r.representation.amount / employeeCount) : 0;
                        const perPersonOther = r.other.visible ? (r.other.amount / employeeCount) : 0;
                        
                        // Recalculate per person total to handle rounding differences, though simplistic
                        const perPersonTotal = perPersonDaily + perPersonTransport + perPersonHotel + perPersonRep + perPersonOther;

                        return (
                           <div className="text-black" style={{ color: '#000000' }}>
                              
                              {/* --- FORMAT UTAMA (COVER) --- */}

                              {/* LOGIC UNTUK FORMAT HEADER */}
                              {isMoreThanFour ? (
                                <div className="font-bold mb-6 text-justify uppercase" style={{ fontSize: '11pt' }}>
                                   D. RINCIAN BIAYA PERJALANAN DINAS LEBIH DARI 4 (EMPAT) ORANG SELAIN PIMPINAN DAN ANGGOTA DPRD
                                </div>
                              ) : (
                                 <div className="mb-6"></div> 
                              )}
                              
                              <div className="mb-4">
                                 <table className="w-full">
                                    <tbody>
                                       <tr><td className="w-48">Lampiran SPPD Nomor</td><td>: {sppd?.id}</td></tr>
                                       <tr><td>Tanggal</td><td>: {new Date(r.date).toLocaleDateString('id-ID', {day: '2-digit', month: 'long', year: 'numeric'})}</td></tr>
                                    </tbody>
                                 </table>
                              </div>

                              <table className="w-full border-collapse border border-black mb-1 text-black" style={{ color: '#000000' }}>
                                 <thead className="text-center font-bold">
                                    <tr>
                                       <th className="border border-black p-1 w-10">No.</th>
                                       <th className="border border-black p-1">PERINCIAN BIAYA</th>
                                       <th className="border border-black p-1 w-40">JUMLAH</th>
                                       <th className="border border-black p-1 w-32">KETERANGAN</th>
                                    </tr>
                                 </thead>
                                 <tbody>
                                    {isMoreThanFour ? (
                                       // ---- FORMAT D (> 4 Orang) ----
                                       <>
                                         {r.dailyAllowance.visible && renderRowFormatD(`Uang Harian*`, r.dailyAllowance.total, "Terlampir")}
                                         
                                         {totalTransport > 0 && renderRowFormatD('Biaya Transport*', totalTransport, "Terlampir")}

                                         {r.accommodation.visible && renderRowFormatD('Biaya Penginapan*', r.accommodation.amount, "Terlampir")}
                                         {r.representation.visible && renderRowFormatD('Uang Representasi*', r.representation.amount, "Terlampir")}
                                         {r.other.visible && renderRowFormatD('Lain-lain*', r.other.amount, "Terlampir")}
                                       </>
                                    ) : (
                                       // ---- FORMAT C (<= 4 Orang) - EXISTING ----
                                       <>
                                          {r.dailyAllowance.visible && (
                                             <tr>
                                                <td className="border border-black p-1 text-center">{itemNo++}.</td>
                                                <td className="border border-black p-1">
                                                   Uang Harian {employeeCount > 1 ? `${employeeCount} Orang x ` : ''}{r.dailyAllowance.days} hari x Rp {Number(r.dailyAllowance.amountPerDay).toLocaleString('id-ID')}
                                                </td>
                                                <td className="border border-black p-1 border-r-0">Rp</td>
                                                <td className="border border-black p-1 border-l-0 text-right">{Number(r.dailyAllowance.total).toLocaleString('id-ID')}</td>
                                                <td className="border border-black p-1"></td>
                                             </tr>
                                          )}
                                          
                                          {r.transport.visible && renderRow(r.transport.description || 'Biaya Transport', r.transport.amount)}
                                          {r.fuel?.visible && renderRow(r.fuel.description || 'Biaya BBM', r.fuel.amount)}
                                          {r.toll?.visible && renderRow(r.toll.description || 'Biaya Tol', r.toll.amount)}
                                          {r.accommodation.visible && renderRow(r.accommodation.description || 'Biaya Penginapan', r.accommodation.amount)}
                                          {r.representation.visible && renderRow('Uang Representasi', r.representation.amount)}
                                          {r.other.visible && renderRow(r.other.description || 'Lain-lain', r.other.amount)}
                                       </>
                                    )}
                                    
                                    <tr className="font-bold">
                                       <td className="border border-black p-1 text-center"></td>
                                       <td className="border border-black p-1">JUMLAH</td>
                                       <td className="border border-black p-1 border-r-0">Rp</td>
                                       <td className="border border-black p-1 border-l-0 text-right">{Number(r.totalAmount).toLocaleString('id-ID')}</td>
                                       <td className="border border-black p-1"></td>
                                    </tr>
                                    <tr>
                                       <td className="border border-black p-1 font-bold" colSpan={4}>
                                          Terbilang: <span className="italic font-normal">{terbilang(Number(r.totalAmount))} Rupiah</span>
                                       </td>
                                    </tr>
                                 </tbody>
                              </table>
                              
                              {isMoreThanFour && (
                                <div className="text-sm mb-4">*Catatan : Jumlah merupakan total dari lampiran</div>
                              )}

                              {/* Middle Section (Treasurer & Recipient) */}
                              <div className="flex justify-between mt-4 text-black" style={{ color: '#000000' }}>
                                 <div className="w-[45%]">
                                    <div className="mb-4 text-white">.</div> {/* Spacer */}
                                    <p>Telah dibayar sejumlah</p>
                                    <p>Rp. {Number(r.totalAmount).toLocaleString('id-ID')}</p>
                                    <p className="mt-4 font-bold">Bendahara Pengeluaran</p>
                                    <br/><br/><br/>
                                    <p className="font-bold underline">{treasurerEmp?.name || '(................................)'}</p>
                                    <p>Pangkat: {treasurerEmp?.grade || '-'}</p>
                                    <p>NIP. {treasurerEmp?.nip || '.......................'}</p>
                                 </div>
                                 <div className="w-[45%]">
                                    <p className="text-right mb-4">..........., {new Date(r.date).toLocaleDateString('id-ID', {day: '2-digit', month: 'long', year: 'numeric'})}</p>
                                    <p>Telah menerima jumlah uang sebesar</p>
                                    <p>Rp. {Number(r.totalAmount).toLocaleString('id-ID')}</p>
                                    <p className="mt-4 font-bold">Yang Menerima</p>
                                    
                                    {/* SIGNATURE LOGIC FOR FORMAT C */}
                                    {isMoreThanFour ? (
                                       <>
                                         <br/><br/><br/>
                                         <p className="font-bold underline">(Terlampir)</p>
                                         <p>Pangkat: -</p>
                                         <p>NIP. -</p>
                                       </>
                                    ) : (
                                       // FORMAT C: Handle 1-4 People
                                       employeeCount > 1 ? (
                                         <table className="w-full text-xs mt-4">
                                            <tbody>
                                               {task?.employeeIds.map((eid, idx) => {
                                                  const e = employees.find(em => em.id === eid);
                                                  return (
                                                     <tr key={eid}>
                                                       <td className="align-bottom pb-6 w-5">{idx + 1}.</td>
                                                       <td className="align-bottom pb-6">
                                                          <span className="font-bold">{e?.name}</span><br/>
                                                          NIP. {e?.nip}
                                                       </td>
                                                       <td className="align-bottom pb-6 text-right font-bold tracking-widest">.............</td>
                                                     </tr>
                                                  );
                                               })}
                                            </tbody>
                                         </table>
                                       ) : (
                                         // 1 Person Standard
                                         <>
                                            <br/><br/><br/>
                                            <p className="font-bold underline">{emp?.name}</p>
                                            <p>Pangkat: {emp?.grade || '-'}</p>
                                            <p>NIP. {emp?.nip}</p>
                                         </>
                                       )
                                    )}
                                 </div>
                              </div>

                              <div className="border-t border-black my-6"></div>
                              
                              <div className="text-center font-bold mb-2">PERHITUNGAN SPPD RAMPUNG</div>
                              <div className="mb-6 w-3/4 mx-auto text-black" style={{ color: '#000000' }}>
                                 <table className="w-full">
                                    <tbody>
                                       <tr>
                                          <td>Ditetapkan sejumlah</td>
                                          <td>: Rp {Number(r.totalAmount).toLocaleString('id-ID')}</td>
                                       </tr>
                                       <tr>
                                          <td>Yang telah dibayar semula</td>
                                          <td>: Rp 0</td>
                                       </tr>
                                       <tr>
                                          <td>Sisa kurang / lebih</td>
                                          <td>: Rp {Number(r.totalAmount).toLocaleString('id-ID')}</td>
                                       </tr>
                                    </tbody>
                                 </table>
                              </div>

                              <div className="text-center font-bold mb-4">MENGETAHUI</div>
                              
                              {/* Bottom Section (KPA & PPTK) */}
                              <div className="flex justify-between text-black" style={{ color: '#000000' }}>
                                 <div className="w-[45%] text-center">
                                    <p className="mb-20 font-bold">Pengguna Anggaran/<br/>Kuasa Pengguna Anggaran</p>
                                    <p className="font-bold underline">{kpaEmp?.name || '(..................................................)'}</p>
                                    <p>NIP. {kpaEmp?.nip || '...................................'}</p>
                                 </div>
                                 <div className="w-[45%] text-center">
                                    <p className="mb-20 font-bold">PPTK</p>
                                    <p className="font-bold underline">{pptkEmp?.name || '(..................................................)'}</p>
                                    <p>NIP. {pptkEmp?.nip || '...................................'}</p>
                                 </div>
                              </div>
                              
                              {/* --- LAMPIRAN FORMAT F (REKAPITULASI) --- */}
                              {isMoreThanFour && (
                                <>
                                  <div className="page-break" />
                                  
                                  <div className="font-bold mb-6 text-justify uppercase mt-4" style={{ fontSize: '11pt' }}>
                                     DAFTAR REKAPITULASI RINCIAN BIAYA PERJALANAN DINAS
                                  </div>
                                  
                                  <div className="mb-4">
                                     <table className="w-full">
                                        <tbody>
                                           <tr><td className="w-48">Lampiran SPPD Nomor</td><td>: {sppd?.id}</td></tr>
                                           <tr><td>Tanggal</td><td>: {new Date(r.date).toLocaleDateString('id-ID', {day: '2-digit', month: 'long', year: 'numeric'})}</td></tr>
                                        </tbody>
                                     </table>
                                  </div>
                                  
                                  <table className="w-full border-collapse border border-black mb-6 text-black text-xs" style={{ color: '#000000' }}>
                                     <thead className="text-center font-bold bg-gray-100">
                                        <tr>
                                           <th className="border border-black p-1">No</th>
                                           <th className="border border-black p-1">Nama / NIP</th>
                                           <th className="border border-black p-1">Uang Harian</th>
                                           <th className="border border-black p-1">Biaya Transport</th>
                                           <th className="border border-black p-1">Biaya Penginapan</th>
                                           <th className="border border-black p-1">Uang Reps.</th>
                                           <th className="border border-black p-1">Lain-lain</th>
                                           <th className="border border-black p-1">Jumlah</th>
                                           <th className="border border-black p-1">Tanda Tangan</th>
                                        </tr>
                                     </thead>
                                     <tbody>
                                       {task?.employeeIds.map((eid, idx) => {
                                          const e = employees.find(emp => emp.id === eid);
                                          return (
                                            <tr key={eid}>
                                               <td className="border border-black p-1 text-center">{idx + 1}</td>
                                               <td className="border border-black p-1">
                                                  <div className="font-bold">{e?.name}</div>
                                                  <div>NIP. {e?.nip}</div>
                                               </td>
                                               <td className="border border-black p-1 text-right">{perPersonDaily > 0 ? Number(perPersonDaily).toLocaleString('id-ID') : '-'}</td>
                                               <td className="border border-black p-1 text-right">{perPersonTransport > 0 ? Number(perPersonTransport).toLocaleString('id-ID') : '-'}</td>
                                               <td className="border border-black p-1 text-right">{perPersonHotel > 0 ? Number(perPersonHotel).toLocaleString('id-ID') : '-'}</td>
                                               <td className="border border-black p-1 text-right">{perPersonRep > 0 ? Number(perPersonRep).toLocaleString('id-ID') : '-'}</td>
                                               <td className="border border-black p-1 text-right">{perPersonOther > 0 ? Number(perPersonOther).toLocaleString('id-ID') : '-'}</td>
                                               <td className="border border-black p-1 text-right font-bold">{Number(perPersonTotal).toLocaleString('id-ID')}</td>
                                               <td className="border border-black p-1 text-center font-bold text-gray-300">{idx+1}..............</td>
                                            </tr>
                                          );
                                       })}
                                       <tr className="font-bold bg-gray-50">
                                          <td className="border border-black p-1 text-center" colSpan={2}>TOTAL</td>
                                          <td className="border border-black p-1 text-right">{r.dailyAllowance.visible ? Number(r.dailyAllowance.total).toLocaleString('id-ID') : '-'}</td>
                                          <td className="border border-black p-1 text-right">{totalTransport > 0 ? Number(totalTransport).toLocaleString('id-ID') : '-'}</td>
                                          <td className="border border-black p-1 text-right">{r.accommodation.visible ? Number(r.accommodation.amount).toLocaleString('id-ID') : '-'}</td>
                                          <td className="border border-black p-1 text-right">{r.representation.visible ? Number(r.representation.amount).toLocaleString('id-ID') : '-'}</td>
                                          <td className="border border-black p-1 text-right">{r.other.visible ? Number(r.other.amount).toLocaleString('id-ID') : '-'}</td>
                                          <td className="border border-black p-1 text-right">{Number(r.totalAmount).toLocaleString('id-ID')}</td>
                                          <td className="border border-black p-1"></td>
                                       </tr>
                                       <tr>
                                         <td className="border border-black p-2 font-bold" colSpan={9}>
                                            Terbilang: <span className="italic font-normal">{terbilang(Number(r.totalAmount))} Rupiah</span>
                                         </td>
                                       </tr>
                                     </tbody>
                                  </table>

                                  <div className="flex justify-between mt-8 text-black" style={{ color: '#000000' }}>
                                     {/* Left Signature Block */}
                                     <div className="w-[30%] text-center">
                                        <p className="font-bold mb-16">Pengguna Anggaran /<br/>Kuasa Pengguna Anggaran</p>
                                        <p className="font-bold underline">{kpaEmp?.name || '(...................................)'}</p>
                                        <p>NIP. {kpaEmp?.nip || '.........................'}</p>
                                     </div>

                                     {/* Center Signature Block */}
                                     <div className="w-[30%] text-center">
                                        <p className="font-bold mb-16">Pejabat Pelaksana Teknis Kegiatan</p>
                                        <p className="font-bold underline">{pptkEmp?.name || '(...................................)'}</p>
                                        <p>NIP. {pptkEmp?.nip || '.........................'}</p>
                                     </div>

                                     {/* Right Signature Block */}
                                     <div className="w-[30%] text-center">
                                        <p className="font-bold mb-16">Bendahara Pengeluaran /<br/>Bendahara Pengeluaran Pembantu</p>
                                        <p className="font-bold underline">{treasurerEmp?.name || '(...................................)'}</p>
                                        <p>NIP. {treasurerEmp?.nip || '.........................'}</p>
                                     </div>
                                  </div>
                                </>
                              )}

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
            color: #000000 !important;
          }
          .page-break { page-break-before: always; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default ReceiptManager;
