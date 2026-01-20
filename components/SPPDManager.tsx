
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
    
      {/* SPPD CREATE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900">Terbitkan SPPD Baru</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                 <label className="block text-sm font-semibold text-slate-700 mb-1">Nomor SPPD</label>
                 <input type="text" required value={formData.id} onChange={(e) => setFormData({...formData, id: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm" />
              </div>
              <div>
                 <label className="block text-sm font-semibold text-slate-700 mb-1">Referensi Surat Tugas</label>
                 <input type="text" readOnly value={formData.ref} className="w-full px-4 py-2 bg-slate-100 border border-slate-300 rounded-xl text-sm text-slate-500" />
              </div>
              <div>
                 <label className="block text-sm font-semibold text-slate-700 mb-1">Pegawai</label>
                 <textarea readOnly value={formData.displayEmployeeNames} className="w-full px-4 py-2 bg-slate-100 border border-slate-300 rounded-xl text-sm text-slate-500" rows={2}/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Moda Transportasi</label>
                    <select required value={formData.transportId} onChange={(e) => setFormData({...formData, transportId: e.target.value})} className="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl text-sm">
                        <option value="">-- Pilih --</option>
                        {transportModes.map(m => <option key={m.id} value={m.id}>{m.type}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Sumber Dana</label>
                    <select required value={formData.fundingId} onChange={(e) => setFormData({...formData, fundingId: e.target.value})} className="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl text-sm">
                        <option value="">-- Pilih --</option>
                        {fundingSources.map(f => <option key={f.id} value={f.id}>{f.code}</option>)}
                    </select>
                  </div>
              </div>
              <div className="pt-4">
                 <button type="submit" className="w-full py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700">Simpan & Terbitkan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINT MODAL SPPD - USING FULL IMAGE HEADER */}
      {isPrintModalOpen && printingSppd && (
        <div className="fixed inset-0 z-[60] bg-white flex flex-col h-screen w-screen overflow-hidden">
             <div className="bg-slate-800 text-white p-4 flex justify-between items-center shadow-md print:hidden">
                 <h2 className="text-lg font-bold flex items-center"><Printer className="mr-2"/> Pratinjau Cetak SPPD</h2>
                 <div className="flex items-center space-x-3">
                     <button onClick={() => window.print()} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-bold text-sm transition-colors">Cetak Sekarang</button>
                     <button onClick={() => setIsPrintModalOpen(false)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-bold text-sm transition-colors">Tutup</button>
                 </div>
             </div>
             
             <div className="flex-1 overflow-auto bg-slate-100 p-8 print:p-0 print:bg-white print:overflow-visible">
                 <div className="max-w-[210mm] mx-auto bg-white p-[20mm] shadow-xl print:shadow-none print:w-full print:max-w-none print:mx-0">
                     
                     {/* FULL WIDTH IMAGE HEADER (Updated to use kopSuratUrl) */}
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
                         <h2 className="text-xl font-bold underline uppercase decoration-2 underline-offset-4">SURAT PERJALANAN DINAS (SPD)</h2>
                         <p className="text-sm mt-1 font-bold">Nomor : {printingSppd.id}</p>
                     </div>

                     <div className="space-y-4 font-serif text-[11pt]">
                        {(() => {
                           const task = assignments.find(a => a.id === printingSppd.assignmentId);
                           const empId = task?.employeeIds[0]; // Assuming first employee for simple SPPD print
                           const emp = employees.find(e => e.id === empId);
                           const transport = transportModes.find(t => t.id === printingSppd.transportId);
                           const funding = fundingSources.find(f => f.id === printingSppd.fundingId);
                           const city = cities.find(c => c.id === task?.destinationId);
                           const signatory = signatories.find(s => s.id === task?.signatoryId);
                           const sigEmp = employees.find(e => e.id === signatory?.employeeId);

                           return (
                               <table className="w-full border border-black border-collapse">
                                   <tbody>
                                       <tr>
                                           <td className="border border-black p-2 w-10 text-center">1.</td>
                                           <td className="border border-black p-2 w-1/3">Pejabat Pembuat Komitmen</td>
                                           <td className="border border-black p-2 font-bold">{signatories.find(s => s.role.includes('Komitmen') || s.role.includes('Pengguna'))?.role || 'Kuasa Pengguna Anggaran'}</td>
                                       </tr>
                                       <tr>
                                           <td className="border border-black p-2 text-center">2.</td>
                                           <td className="border border-black p-2">Nama Pegawai yang diperintah</td>
                                           <td className="border border-black p-2 font-bold">{emp?.name}</td>
                                       </tr>
                                       <tr>
                                           <td className="border border-black p-2 text-center">3.</td>
                                           <td className="border border-black p-2">
                                               a. Pangkat dan Golongan<br/>
                                               b. Jabatan / Instansi<br/>
                                               c. Tingkat Biaya Perjalanan Dinas
                                           </td>
                                           <td className="border border-black p-2">
                                               a. {emp?.grade}<br/>
                                               b. {emp?.position}<br/>
                                               c. -
                                           </td>
                                       </tr>
                                       <tr>
                                           <td className="border border-black p-2 text-center">4.</td>
                                           <td className="border border-black p-2">Maksud Perjalanan Dinas</td>
                                           <td className="border border-black p-2">{task?.subject}</td>
                                       </tr>
                                       <tr>
                                           <td className="border border-black p-2 text-center">5.</td>
                                           <td className="border border-black p-2">Alat Angkutan yang dipergunakan</td>
                                           <td className="border border-black p-2">{transport?.type || '-'}</td>
                                       </tr>
                                       <tr>
                                           <td className="border border-black p-2 text-center">6.</td>
                                           <td className="border border-black p-2">
                                               a. Tempat Berangkat<br/>
                                               b. Tempat Tujuan
                                           </td>
                                           <td className="border border-black p-2">
                                               a. {agencySettings.name.replace('PEMERINTAH ', '')}<br/>
                                               b. {city?.name}
                                           </td>
                                       </tr>
                                       <tr>
                                           <td className="border border-black p-2 text-center">7.</td>
                                           <td className="border border-black p-2">
                                               a. Lamanya Perjalanan Dinas<br/>
                                               b. Tanggal Berangkat<br/>
                                               c. Tanggal Harus Kembali
                                           </td>
                                           <td className="border border-black p-2">
                                               a. {task?.duration} (Hari)<br/>
                                               b. {printingSppd.startDate}<br/>
                                               c. {printingSppd.endDate}
                                           </td>
                                       </tr>
                                       <tr>
                                           <td className="border border-black p-2 text-center">8.</td>
                                           <td className="border border-black p-2">Pembebanan Anggaran</td>
                                           <td className="border border-black p-2">
                                               a. Instansi: {agencySettings.department}<br/>
                                               b. Mata Anggaran: {funding?.code}
                                           </td>
                                       </tr>
                                       <tr>
                                           <td className="border border-black p-2 text-center">9.</td>
                                           <td className="border border-black p-2">Keterangan Lain-lain</td>
                                           <td className="border border-black p-2">Lihat Sebelah</td>
                                       </tr>
                                   </tbody>
                               </table>
                           );
                        })()}
                     </div>

                     <div className="mt-8 flex justify-end">
                         <div className="w-80 text-center font-serif text-[11pt]">
                             <p className="mb-1">Ditetapkan di Demak</p>
                             <p className="mb-4">Pada Tanggal {new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</p>
                             <p className="font-bold mb-20">PEJABAT PEMBUAT KOMITMEN</p>
                             <p className="font-bold underline text-sm">( ..................................................... )</p>
                             <p className="text-sm">NIP. ..........................................</p>
                         </div>
                     </div>
                 </div>
             </div>
        </div>
      )}
    </div>
  );
};

export default SPPDManager;
