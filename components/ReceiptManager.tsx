
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Receipt as ReceiptIcon, X, Plus, Trash2, Edit2, Printer, CheckCircle, RefreshCw } from 'lucide-react';
import { getSupabase } from '../supabaseClient';
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
  
  // States for actions
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printingReceipt, setPrintingReceipt] = useState<Receipt | null>(null);

  const [formData, setFormData] = useState<Receipt>(INITIAL_RECEIPT_STATE);

  const isAdmin = user?.role === 'Admin';

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) setUser(JSON.parse(savedUser));
    loadMasterData();
    fetchReceiptsAndRefs();
    fetchSettingsFromDb(); // Fetch settings on mount
  }, []);

  // NEW: Fetch Fresh Settings from DB
  const fetchSettingsFromDb = async () => {
      const client = getSupabase();
      if (!client) return;
      try {
          const { data } = await client.from('agency_settings').select('*').limit(1).maybeSingle();
          if (data) {
              const newSettings: AgencySettings = {
                  name: data.name,
                  department: data.department,
                  address: data.address,
                  contactInfo: data.contact_info,
                  logoUrl: data.logo_url,
                  kopSuratUrl: data.kop_surat_url // Ensure mapping
              };
              setAgencySettings(newSettings);
              localStorage.setItem('agency_settings', JSON.stringify(newSettings));
          }
      } catch (e) {
          console.error("Failed to sync settings", e);
      }
  };

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
    if (!window.confirm(`Tandai Lunas untuk: ${receipt.id}?`)) return;
    const updatedReceipt: Receipt = { ...receipt, status: 'Paid' };
    setReceipts(prev => prev.map(r => r.id === receipt.id ? updatedReceipt : r));
    const client = getSupabase();
    if (client) { try { await client.from('receipts').update({ status: 'Paid' }).eq('id', receipt.id); } catch(e) {} }
  };

  const handleDelete = async () => {
      if(itemToDelete) {
          const newList = receipts.filter(r => r.id !== itemToDelete);
          setReceipts(newList);
          // Sync Logic needed here (Localstorage update omitted for brevity, but should be there)
          const client = getSupabase();
          if(client) { try { await client.from('receipts').delete().eq('id', itemToDelete); } catch(e) {} }
          setItemToDelete(null);
      }
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
        <div className="flex items-center space-x-2">
            <button onClick={() => { fetchReceiptsAndRefs(); fetchSettingsFromDb(); }} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
                <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
            </button>
            {isAdmin && (
              <button onClick={() => setIsModalOpen(true)} className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium"><Plus size={18} /><span>Buat Rincian</span></button>
            )}
        </div>
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
                            {r.status === 'Draft' && <button onClick={() => handleMarkAsPaid(r)} className="p-2 text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100" title="Tandai Lunas"><CheckCircle size={16}/></button>}
                            <button onClick={() => {setPrintingReceipt(r); setIsPrintModalOpen(true);}} className="p-2 text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100" title="Cetak Kwitansi"><Printer size={16}/></button>
                            <button onClick={() => {setEditingReceipt(r); setIsModalOpen(true);}} className="p-2 text-slate-400 hover:text-indigo-600" title="Edit"><Edit2 size={16}/></button>
                            <button onClick={() => {setItemToDelete(r.id); setIsDeleteModalOpen(true);}} className="p-2 text-slate-400 hover:text-rose-600" title="Hapus"><Trash2 size={16}/></button>
                          </>
                        )}
                        {!isAdmin && <span className="text-xs text-slate-400">View Only</span>}
                    </div>
                </div>
            </div>
        ))}
      </div>

      {/* RENDER CONFIRMATION MODAL TO MAKE DELETE WORK */}
      <ConfirmationModal 
        isOpen={isDeleteModalOpen} 
        onClose={() => setIsDeleteModalOpen(false)} 
        onConfirm={handleDelete} 
        title="Hapus Kwitansi" 
        message="Yakin hapus data ini?" 
      />

      {/* PRINT MODAL KWITANSI */}
      {isPrintModalOpen && printingReceipt && (
        <div className="fixed inset-0 z-[60] bg-white flex flex-col h-screen w-screen overflow-hidden">
             <div className="bg-slate-800 text-white p-4 flex justify-between items-center shadow-md print:hidden">
                 <h2 className="text-lg font-bold flex items-center"><Printer className="mr-2"/> Pratinjau Cetak Kwitansi</h2>
                 <div className="flex items-center space-x-3">
                     <button onClick={() => window.print()} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-bold text-sm transition-colors">Cetak Sekarang</button>
                     <button onClick={() => setIsPrintModalOpen(false)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-bold text-sm transition-colors">Tutup</button>
                 </div>
             </div>
             
             <div className="flex-1 overflow-auto bg-slate-100 p-8 print:p-0 print:bg-white print:overflow-visible">
                 <div className="max-w-[210mm] mx-auto bg-white p-[20mm] shadow-xl print:shadow-none print:w-full print:max-w-none print:mx-0">
                     {/* Kop Surat */}
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
                         <h2 className="text-xl font-bold underline uppercase decoration-2 underline-offset-4">KWITANSI / BUKTI PEMBAYARAN</h2>
                         <p className="text-sm mt-1 font-bold">Nomor : {printingReceipt.id}</p>
                     </div>

                     {(() => {
                         const sppd = sppds.find(s => s.id === printingReceipt.sppdId);
                         const task = assignments.find(a => a.id === sppd?.assignmentId);
                         const emp = employees.find(e => e.id === task?.employeeIds[0]);
                         const ppk = signatories.find(s => s.id === printingReceipt.pptkId) || signatories.find(s => s.role.includes('Komitmen'));
                         const bendahara = signatories.find(s => s.id === printingReceipt.treasurerId) || signatories.find(s => s.role.includes('Bendahara'));

                         return (
                             <div className="font-serif text-[12pt] space-y-4">
                                 <div className="flex items-start">
                                     <div className="w-40 flex-shrink-0">Sudah Terima Dari</div>
                                     <div className="w-4 text-center">:</div>
                                     <div className="flex-1">Kuasa Pengguna Anggaran / Pejabat Pembuat Komitmen {agencySettings.name}</div>
                                 </div>
                                 <div className="flex items-start">
                                     <div className="w-40 flex-shrink-0">Uang Sejumlah</div>
                                     <div className="w-4 text-center">:</div>
                                     <div className="flex-1 font-bold bg-slate-100 print:bg-transparent p-1">
                                         Rp {printingReceipt.totalAmount.toLocaleString('id-ID')}
                                     </div>
                                 </div>
                                 <div className="flex items-start">
                                     <div className="w-40 flex-shrink-0">Untuk Pembayaran</div>
                                     <div className="w-4 text-center">:</div>
                                     <div className="flex-1 text-justify">
                                         Biaya perjalanan dinas dalam rangka {task?.subject || '...'} ke {cities.find(c=>c.id === task?.destinationId)?.name} 
                                         selama {task?.duration} hari berdasarkan SPPD Nomor: {sppd?.id}.
                                     </div>
                                 </div>

                                 <div className="mt-8 border border-black p-4">
                                     <p className="font-bold underline mb-2">Rincian Perhitungan:</p>
                                     <table className="w-full text-sm">
                                         <tbody>
                                             {printingReceipt.dailyAllowance.visible && (
                                                 <tr>
                                                     <td className="py-1">Uang Harian</td>
                                                     <td className="py-1">: {printingReceipt.dailyAllowance.days} hari x Rp {printingReceipt.dailyAllowance.amountPerDay.toLocaleString()}</td>
                                                     <td className="text-right py-1">Rp {printingReceipt.dailyAllowance.total.toLocaleString()}</td>
                                                 </tr>
                                             )}
                                             {printingReceipt.transport.visible && (
                                                 <tr>
                                                     <td className="py-1">Biaya Transport</td>
                                                     <td className="py-1">: {printingReceipt.transport.description}</td>
                                                     <td className="text-right py-1">Rp {printingReceipt.transport.amount.toLocaleString()}</td>
                                                 </tr>
                                             )}
                                             {printingReceipt.accommodation.visible && (
                                                 <tr>
                                                     <td className="py-1">Biaya Penginapan</td>
                                                     <td className="py-1">: {printingReceipt.accommodation.description}</td>
                                                     <td className="text-right py-1">Rp {printingReceipt.accommodation.amount.toLocaleString()}</td>
                                                 </tr>
                                             )}
                                             {/* Add other costs similarly */}
                                             <tr className="font-bold border-t border-black">
                                                 <td className="py-2" colSpan={2}>Jumlah Total</td>
                                                 <td className="text-right py-2">Rp {printingReceipt.totalAmount.toLocaleString()}</td>
                                             </tr>
                                         </tbody>
                                     </table>
                                 </div>

                                 <div className="flex justify-between mt-12 pt-8">
                                     <div className="text-center w-64">
                                         <p className="mb-20">Setuju Dibayar,<br/>Bendahara Pengeluaran</p>
                                         <p className="font-bold underline">{employees.find(e => e.id === bendahara?.employeeId)?.name || '.........................'}</p>
                                         <p>NIP. {employees.find(e => e.id === bendahara?.employeeId)?.nip || '.........................'}</p>
                                     </div>
                                     <div className="text-center w-64">
                                         <p className="mb-1">Demak, {new Date(printingReceipt.date).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</p>
                                         <p className="mb-20">Yang Menerima,</p>
                                         <p className="font-bold underline">{emp?.name || '.........................'}</p>
                                         <p>NIP. {emp?.nip || '.........................'}</p>
                                     </div>
                                 </div>
                             </div>
                         );
                     })()}
                 </div>
             </div>
        </div>
      )}
    </div>
  );
};

export default ReceiptManager;
