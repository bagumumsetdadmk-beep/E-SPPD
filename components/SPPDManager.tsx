
import React, { useState, useEffect } from 'react';
import { Printer, RefreshCw, FileText, Trash2, Edit2, X, CheckCircle2, Clock, Save, FilePlus, ArrowRight, Search, Eye } from 'lucide-react';
import { getSupabase } from '../supabaseClient';
import { AssignmentLetter, Employee, City, SPPD, TransportMode, FundingSource, Signatory, AgencySettings } from '../types';
import ConfirmationModal from './ConfirmationModal';

const SPPDManager: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [transportModes, setTransportModes] = useState<TransportMode[]>([]);
  const [fundingSources, setFundingSources] = useState<FundingSource[]>([]);
  const [signatories, setSignatories] = useState<Signatory[]>([]);
  const [assignments, setAssignments] = useState<AssignmentLetter[]>([]);
  const [agencySettings, setAgencySettings] = useState<AgencySettings>({ name: '', department: '', address: '', contactInfo: '', logoUrl: '', kopSuratUrl: '' });
  const [sppds, setSppds] = useState<SPPD[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals & State
  const [activeTab, setActiveTab] = useState<'Ready' | 'Issued'>('Ready');
  
  // Edit/Create Modal
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentLetter | null>(null); // For creating new
  const [editingSppd, setEditingSppd] = useState<SPPD | null>(null); // For editing existing
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  // Form Data
  const [formData, setFormData] = useState({
      transportId: '',
      fundingId: '',
      status: 'Selesai' as 'Sedang Berjalan' | 'Selesai' // Default to Selesai/Published
  });

  const fetchData = async () => {
    setIsLoading(true);
    const client = getSupabase();
    
    const fetchLocal = () => {
        setEmployees(JSON.parse(localStorage.getItem('employees') || '[]'));
        setCities(JSON.parse(localStorage.getItem('cities') || '[]'));
        setTransportModes(JSON.parse(localStorage.getItem('transport_modes') || '[]'));
        setFundingSources(JSON.parse(localStorage.getItem('funding_sources') || '[]'));
        setSignatories(JSON.parse(localStorage.getItem('signatories') || '[]'));
        setAssignments(JSON.parse(localStorage.getItem('assignment_tasks_v2') || '[]'));
        setSppds(JSON.parse(localStorage.getItem('sppd_data') || '[]'));
        const settings = localStorage.getItem('agency_settings');
        if(settings) setAgencySettings(JSON.parse(settings));
    };

    if (!client) {
        fetchLocal();
        setIsLoading(false);
        return;
    }

    try {
        const { data: emps } = await client.from('employees').select('*');
        if (emps) {
            setEmployees(emps.map((d: any) => ({
                id: d.id, nip: d.nip, name: d.name, position: d.position, rank: d.rank, grade: d.grade
            })));
        }
        
        const { data: cts } = await client.from('cities').select('*');
        if (cts) setCities(cts.map(c => ({ id: c.id, name: c.name, province: c.province, dailyAllowance: c.daily_allowance })));
        
        const { data: asgs } = await client.from('assignment_letters').select('*');
        if (asgs) setAssignments(asgs.map(a => ({ id: a.id, number: a.number, date: a.date, basis: a.basis, employeeIds: a.employee_ids, subject: a.subject, destinationId: a.destination_id, destinationAddress: a.destination_address, startDate: a.start_date, endDate: a.end_date, duration: a.duration, signatoryId: a.signatory_id, status: a.status, signatureType: a.signature_type, upperTitle: a.upper_title, intermediateTitle: a.intermediate_title })));
        
        const { data: sps } = await client.from('sppds').select('*').order('created_at', { ascending: false });
        if (sps) setSppds(sps.map(s => ({ id: s.id, assignmentId: s.assignment_id, startDate: s.start_date, endDate: s.end_date, status: s.status, transportId: s.transport_id, fundingId: s.funding_id })));
        
        const { data: tms } = await client.from('transport_modes').select('*');
        if (tms) setTransportModes(tms);
        
        const { data: fns } = await client.from('funding_sources').select('*');
        if (fns) setFundingSources(fns.map(f => ({ id: f.id, code: f.code, name: f.name, amount: f.amount, budgetYear: f.budget_year })));
        
        const { data: sigs } = await client.from('signatories').select('*');
        if (sigs) setSignatories(sigs.map(s => ({ id: s.id, employeeId: s.employee_id, role: s.role, isActive: s.is_active })));

        const { data: stgs } = await client.from('agency_settings').select('*').limit(1).maybeSingle();
        if (stgs) setAgencySettings({ name: stgs.name, department: stgs.department, address: stgs.address, contactInfo: stgs.contact_info, logoUrl: stgs.logo_url, kopSuratUrl: stgs.kop_surat_url });

    } catch (e) {
        console.error(e);
        fetchLocal();
    } finally { 
        setIsLoading(false); 
    }
  };

  useEffect(() => { fetchData(); }, []);

  // --- HELPER --
  const getHelperDetails = (assignmentId: string) => {
      const task = assignments.find(a => a.id === assignmentId);
      if (!task) return { empName: 'Unknown', dest: '-', refNumber: '-', subject: '-' };
      
      const mainEmp = employees.find(e => e.id === task.employeeIds[0]);
      const dest = cities.find(c => c.id === task.destinationId)?.name || '-';
      return { 
          empName: mainEmp?.name || 'Unknown', 
          dest, 
          refNumber: task.number,
          subject: task.subject
      };
  };

  // --- DERIVED LISTS WITH SEARCH FILTER ---
  const filterList = (list: any[], type: 'Ready' | 'Issued') => {
      if (!searchTerm) return list;
      const lowerTerm = searchTerm.toLowerCase();

      return list.filter(item => {
          if (type === 'Ready') {
              const task = item as AssignmentLetter;
              const emp = employees.find(e => e.id === task.employeeIds[0]);
              const dest = cities.find(c => c.id === task.destinationId);
              return (
                  task.number.toLowerCase().includes(lowerTerm) ||
                  (emp?.name || '').toLowerCase().includes(lowerTerm) ||
                  (dest?.name || '').toLowerCase().includes(lowerTerm)
              );
          } else {
              const sppd = item as SPPD;
              const details = getHelperDetails(sppd.assignmentId);
              return (
                  sppd.id.toLowerCase().includes(lowerTerm) ||
                  details.empName.toLowerCase().includes(lowerTerm) ||
                  details.refNumber.toLowerCase().includes(lowerTerm) ||
                  details.dest.toLowerCase().includes(lowerTerm)
              );
          }
      });
  };

  const rawReadyList = assignments.filter(a => a.status === 'Approved' && !sppds.some(s => s.assignmentId === a.id));
  const rawIssuedList = sppds;

  const readyList = filterList(rawReadyList, 'Ready');
  const issuedList = filterList(rawIssuedList, 'Issued');

  // --- CRUD ACTIONS ---

  const openCreateModal = (assignment: AssignmentLetter) => {
      setSelectedAssignment(assignment);
      setEditingSppd(null);
      setFormData({
          transportId: '',
          fundingId: '',
          status: 'Selesai'
      });
      setIsFormModalOpen(true);
  };

  const openEditModal = (sppd: SPPD) => {
      setEditingSppd(sppd);
      setSelectedAssignment(null);
      setFormData({
          transportId: sppd.transportId || '',
          fundingId: sppd.fundingId || '',
          status: sppd.status
      });
      setIsFormModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      const client = getSupabase();

      if (editingSppd) {
          // UPDATE EXISTING SPPD
          const updatedSppd: SPPD = { 
              ...editingSppd, 
              transportId: formData.transportId,
              fundingId: formData.fundingId,
              status: formData.status
          };

          const newSppdList = sppds.map(s => s.id === editingSppd.id ? updatedSppd : s);
          setSppds(newSppdList);
          localStorage.setItem('sppd_data', JSON.stringify(newSppdList));

          if (client) {
              try {
                  await client.from('sppds').update({
                      transport_id: formData.transportId,
                      funding_id: formData.fundingId,
                      status: formData.status
                  }).eq('id', editingSppd.id);
              } catch(err) { console.error(err); }
          }
      } else if (selectedAssignment) {
          // CREATE NEW SPPD FROM ASSIGNMENT
          const newId = `SPPD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
          const newSppd: SPPD = {
              id: newId,
              assignmentId: selectedAssignment.id,
              startDate: selectedAssignment.startDate,
              endDate: selectedAssignment.endDate,
              transportId: formData.transportId,
              fundingId: formData.fundingId,
              status: formData.status
          };

          const newSppdList = [newSppd, ...sppds];
          setSppds(newSppdList);
          localStorage.setItem('sppd_data', JSON.stringify(newSppdList));

          if (client) {
              try {
                  await client.from('sppds').insert({
                      id: newId,
                      assignment_id: selectedAssignment.id,
                      start_date: selectedAssignment.startDate,
                      end_date: selectedAssignment.endDate,
                      transport_id: formData.transportId,
                      funding_id: formData.fundingId,
                      status: formData.status
                  });
              } catch(err) { console.error(err); }
          }
      }

      setIsFormModalOpen(false);
  };

  const handleDelete = async () => {
      if (!itemToDelete) return;
      
      const newSppdList = sppds.filter(s => s.id !== itemToDelete);
      setSppds(newSppdList);
      localStorage.setItem('sppd_data', JSON.stringify(newSppdList));
      setIsDeleteModalOpen(false);

      const client = getSupabase();
      if (client) {
          try { await client.from('sppds').delete().eq('id', itemToDelete); } catch(e) { console.error(e); }
      }
      setItemToDelete(null);
  };

  // --- PRINT LOGIC (NEW TAB) ---
  const handlePrint = (sppd: SPPD) => {
      const task = assignments.find(a => a.id === sppd.assignmentId);
      if (!task) return alert("Data Surat Tugas tidak ditemukan.");

      const emp = employees.find(e => e.id === task.employeeIds[0]);
      // Followers (Pengikut) are employees starting from index 1
      const followers = task.employeeIds.slice(1).map(id => employees.find(e => e.id === id)).filter(Boolean);
      
      const signatory = signatories.find(s => s.id === task.signatoryId);
      const signatoryEmp = employees.find(e => e.id === signatory?.employeeId);
      const fund = fundingSources.find(f => f.id === sppd.fundingId);
      const transport = transportModes.find(t => t.id === sppd.transportId);
      const destCity = cities.find(c => c.id === task.destinationId);

      const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'}) : '-';

      // HTML String Construction
      const printContent = `
        <!DOCTYPE html>
        <html lang="id">
        <head>
            <meta charset="UTF-8">
            <title>Cetak SPPD - ${sppd.id}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
                @media print {
                    @page { size: A4; margin: 1cm 1.5cm; }
                    body { margin: 0; background: white; -webkit-print-color-adjust: exact; }
                    .no-print { display: none !important; }
                    .page-break { page-break-before: always; }
                    .avoid-break { page-break-inside: avoid; }
                    /* Reduced padding top for print container */
                    .print-container { padding: 5mm 20mm; width: 100%; box-sizing: border-box; }
                }
                body { font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.3; color: black; background: #f1f5f9; }
                .print-container { 
                    margin: 0 auto; 
                    background: white; 
                    padding: 10mm 20mm; 
                    width: 210mm; 
                    min-height: 297mm; 
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                    margin-bottom: 20px;
                }
                table { width: 100%; border-collapse: collapse; }
                .bordered-table td, .bordered-table th { border: 1px solid black; padding: 4px 6px; vertical-align: top; }
                .noborder-table td { border: none; padding: 2px; vertical-align: top; }
                .visum-table td { border: 1px solid black; padding: 5px; vertical-align: top; }
            </style>
        </head>
        <body>
            <!-- Toolbar -->
            <div class="no-print fixed top-0 left-0 right-0 bg-slate-800 text-white p-4 flex justify-between items-center shadow-lg z-50">
                <div class="font-bold">Pratinjau Cetak SPPD: ${sppd.id}</div>
                <div class="flex space-x-3">
                    <button onclick="window.close()" class="px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded font-bold">Tutup</button>
                    <button onclick="window.print()" class="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded font-bold flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2-2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                        Cetak Sekarang
                    </button>
                </div>
            </div>
            <div class="h-16 no-print"></div>

            <!-- HALAMAN 1 -->
            <div class="print-container">
                <!-- KOP -->
                <div class="w-full mb-2 flex justify-center">
                    ${agencySettings.kopSuratUrl ? 
                        `<img src="${agencySettings.kopSuratUrl}" alt="KOP" class="w-full max-h-[120px] object-contain" />` : 
                        `<div class="w-full text-center border-b-2 border-black pb-4 mb-4">
                            <h2 class="text-lg font-bold uppercase">${agencySettings.name}</h2>
                            <h1 class="text-xl font-bold uppercase">${agencySettings.department}</h1>
                            <p class="text-sm">${agencySettings.address}</p>
                        </div>`
                    }
                </div>

                <div class="flex justify-end mb-1 text-[10pt]">
                    <table style="width: auto;"><tbody>
                        <tr><td class="pr-2">Lembar Ke</td><td>:</td><td>1</td></tr>
                        <tr><td class="pr-2">Kode No</td><td>:</td><td></td></tr>
                        <tr><td class="pr-2">Nomor</td><td>:</td><td class="font-bold">${sppd.id}</td></tr>
                    </tbody></table>
                </div>

                <div class="text-center mb-6 mt-4">
                    <h2 class="text-[14pt] font-bold underline uppercase m-0 text-black decoration-2 underline-offset-4">SURAT PERINTAH PERJALANAN DINAS</h2>
                    <p class="font-bold uppercase m-0 text-black text-[12pt]">(SPPD)</p>
                </div>

                <table class="bordered-table mb-8">
                    <colgroup>
                        <col style="width: 40px;" />
                        <col style="width: 38%;" />
                        <col />
                    </colgroup>
                    <tbody>
                        <tr>
                            <td class="text-center">1</td>
                            <td>Pejabat berwenang yang memberi perintah</td>
                            <td class="font-bold">${signatory?.role || '-'}</td>
                        </tr>
                        <tr>
                            <td class="text-center">2</td>
                            <td>Nama / NIP Pegawai yang diperintahkan</td>
                            <td>
                                <span class="font-bold">${emp?.name || '-'}</span><br/>
                                NIP. ${emp?.nip || '-'}
                            </td>
                        </tr>
                        <tr>
                            <td class="text-center">3</td>
                            <td>
                                a. Pangkat dan Golongan<br/>
                                b. Jabatan / Instansi<br/>
                                c. Tingkat Biaya Perjalanan Dinas
                            </td>
                            <td>
                                a. ${emp?.rank || '-'} / ${emp?.grade || '-'}<br/>
                                b. ${emp?.position || '-'}<br/>
                                c. -
                            </td>
                        </tr>
                        <tr>
                            <td class="text-center">4</td>
                            <td>Maksud Perjalanan Dinas</td>
                            <td class="text-justify">${task.subject}</td>
                        </tr>
                        <tr>
                            <td class="text-center">5</td>
                            <td>Alat angkutan yang dipergunakan</td>
                            <td>${transport?.type || 'Kendaraan Dinas'}</td>
                        </tr>
                        <tr>
                            <td class="text-center">6</td>
                            <td>
                                a. Tempat berangkat<br/>
                                b. Tempat Tujuan
                            </td>
                            <td>
                                a. Demak<br/>
                                b. ${destCity?.name || '-'}
                            </td>
                        </tr>
                        <tr>
                            <td class="text-center">7</td>
                            <td>
                                a. Lamanya Perjalanan Dinas<br/>
                                b. Tanggal berangkat<br/>
                                c. Tanggal harus kembali
                            </td>
                            <td>
                                a. ${task.duration} Hari<br/>
                                b. ${fmtDate(task.startDate)}<br/>
                                c. ${fmtDate(task.endDate)}
                            </td>
                        </tr>
                        
                        <!-- ITEM 8: Nested Table -->
                        <tr>
                            <td class="text-center align-top">8</td>
                            <td colspan="2" style="padding: 0; border: none;">
                                <table style="width: 100%; border-collapse: collapse; border: none;">
                                    <colgroup>
                                        <col style="width: 45%" />
                                        <col style="width: 25%" />
                                        <col style="width: 30%" />
                                    </colgroup>
                                    <thead>
                                        <tr>
                                            <td style="border-right: 1px solid black; border-bottom: 1px solid black; font-weight: bold;">Pengikut: Nama dan NIP</td>
                                            <td style="border-right: 1px solid black; border-bottom: 1px solid black; font-weight: bold;">Gol Ruang</td>
                                            <td style="border-bottom: 1px solid black; font-weight: bold;">Tanda tangan</td>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${followers.length > 0 ? followers.map((f, i) => `
                                            <tr>
                                                <td style="border-right: 1px solid black; border-bottom: 1px solid black;">
                                                    ${i+1}. ${f?.name || ''} <br/> 
                                                    &nbsp;&nbsp;&nbsp; NIP. ${f?.nip || ''}
                                                </td>
                                                <td style="border-right: 1px solid black; border-bottom: 1px solid black;">
                                                    ${f?.rank || ''} ${f?.grade || ''}
                                                </td>
                                                <td style="border-bottom: 1px solid black; text-align: center; vertical-align: middle;">${i+1}.</td>
                                            </tr>
                                        `).join('') : `
                                            <!-- Empty Rows Template -->
                                            <tr><td style="border-right: 1px solid black; border-bottom: 1px solid black;">1.</td><td style="border-right: 1px solid black; border-bottom: 1px solid black;"></td><td style="border-bottom: 1px solid black;"></td></tr>
                                            <tr><td style="border-right: 1px solid black; border-bottom: 1px solid black;">2.</td><td style="border-right: 1px solid black; border-bottom: 1px solid black;"></td><td style="border-bottom: 1px solid black;"></td></tr>
                                        `}
                                    </tbody>
                                </table>
                            </td>
                        </tr>

                        <tr>
                            <td class="text-center">9</td>
                            <td>
                                Pembebanan Anggaran:<br/>
                                a. Instansi<br/>
                                b. Mata Anggaran
                            </td>
                            <td>
                                a. ${agencySettings.department}<br/>
                                b. ${fund?.code || '-'}
                            </td>
                        </tr>
                        <tr>
                            <td class="text-center">10</td>
                            <td>Keterangan lain-lain</td>
                            <td>-</td>
                        </tr>
                    </tbody>
                </table>

                <div class="mt-8 flex justify-between items-end avoid-break">
                    <!-- Tanda Tangan Pegawai (Kiri) -->
                    <div class="w-[40%] text-center">
                        <br/><br/>
                        <p class="font-bold">Pegawai yang diperintahkan,</p>
                        <div class="h-20"></div>
                        <p class="font-bold underline">${emp?.name || '....................'}</p>
                        <p class="">NIP. ${emp?.nip || '....................'}</p>
                    </div>

                    <!-- Tanda Tangan Pejabat (Kanan) -->
                    <div class="w-[50%] text-left">
                        <div class="mb-4">
                            Dikeluarkan di : Demak<br/>
                            Pada Tanggal : ${fmtDate(task.date)}
                        </div>
                        ${(() => {
                            if (task.signatureType === 'AN') {
                                return `
                                    <table class="w-full text-[11pt] border-none" style="border-spacing: 0;">
                                        <tr>
                                            <td style="vertical-align: top; width: 30px; padding: 0;">a.n.</td>
                                            <td style="vertical-align: top; padding: 0;">
                                                ${task.upperTitle || ''}
                                                <div style="font-weight: bold; text-transform: uppercase;">${signatory?.role || ''},</div>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td></td>
                                            <td style="padding-top: 60px;">
                                                <p class="font-bold underline m-0">${signatoryEmp?.name || ''}</p>
                                                <p class="m-0 capitalize">${signatoryEmp?.rank || ''}</p>
                                                <p class="m-0">NIP ${signatoryEmp?.nip || ''}</p>
                                            </td>
                                        </tr>
                                    </table>
                                `;
                            } else if (task.signatureType === 'UB') {
                                return `
                                    <table class="w-full text-[11pt] border-none" style="border-spacing: 0;">
                                        <tr>
                                            <td style="vertical-align: top; width: 30px; padding: 0;">a.n.</td>
                                            <td style="vertical-align: top; padding: 0;">
                                                ${task.upperTitle || ''}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td></td>
                                            <td style="padding: 0;">
                                                ${task.intermediateTitle || ''},
                                            </td>
                                        </tr>
                                        <tr>
                                            <td></td>
                                            <td style="padding: 0;">
                                                <div style="margin: 2px 0;">u.b.</div>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td></td>
                                            <td style="padding: 0;">
                                                <div style="font-weight: bold; text-transform: uppercase;">${signatory?.role || ''},</div>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td></td>
                                            <td style="padding-top: 60px;">
                                                <p class="font-bold underline m-0">${signatoryEmp?.name || ''}</p>
                                                <p class="m-0 capitalize">${signatoryEmp?.rank || ''}</p>
                                                <p class="m-0">NIP ${signatoryEmp?.nip || ''}</p>
                                            </td>
                                        </tr>
                                    </table>
                                `;
                            } else {
                                return `
                                    <div class="mt-2">
                                        <p class="font-bold m-0 mb-20 uppercase">${signatory?.role || ''},</p>
                                        <div class="pt-2">
                                            <p class="font-bold underline m-0">${signatoryEmp?.name || ''}</p>
                                            <p class="m-0 capitalize">${signatoryEmp?.rank || ''}</p>
                                            <p class="m-0">NIP ${signatoryEmp?.nip || ''}</p>
                                        </div>
                                    </div>
                                `;
                            }
                        })()}
                    </div>
                </div>
            </div>

            <div class="page-break"></div>

            <!-- HALAMAN 2: VISUM -->
            <div class="print-container">
                <table class="visum-table w-full">
                    <tbody>
                        <!-- Row 1: I (Right only) -->
                        <tr>
                            <td class="w-1/2"></td>
                            <td class="w-1/2">
                                <div class="mb-8">
                                    <table class="noborder-table w-full">
                                        <tr><td class="w-5">I.</td><td class="w-28">Berangkat dari</td><td>: Demak</td></tr>
                                        <tr><td></td><td>(Tempat Kedudukan)</td><td></td></tr>
                                        <tr><td></td><td>Ke</td><td>: ${destCity?.name || '.............'}</td></tr>
                                        <tr><td></td><td>Pada Tanggal</td><td>: ${fmtDate(sppd.startDate)}</td></tr>
                                    </table>
                                    <div class="mt-4 text-center">
                                        <p class="font-bold mb-16">${signatory?.role || 'Kepala SKPD'},</p>
                                        <p class="font-bold underline">${signatoryEmp?.name || '(..................................)'}</p>
                                        <p>NIP. ${signatoryEmp?.nip || '...................'}</p>
                                    </div>
                                </div>
                            </td>
                        </tr>

                        <!-- Row 2: II (Left & Right) -->
                        <tr>
                            <td class="w-1/2 align-top">
                                <table class="noborder-table w-full">
                                    <tr><td class="w-5">II.</td><td class="w-24">Tiba di</td><td>: ${destCity?.name || '.............'}</td></tr>
                                    <tr><td></td><td>Pada Tanggal</td><td>: ${fmtDate(sppd.startDate)}</td></tr>
                                </table>
                                <div class="mt-8 text-center">
                                    <p class="mb-16">Kepala ....................................</p>
                                    <p class="font-bold underline">(..............................................)</p>
                                    <p>NIP.</p>
                                </div>
                            </td>
                            <td class="w-1/2 align-top">
                                <table class="noborder-table w-full">
                                    <tr><td class="w-5"></td><td class="w-28">Berangkat dari</td><td>: ${destCity?.name || '.............'}</td></tr>
                                    <tr><td></td><td>Ke</td><td>: ..........................</td></tr>
                                    <tr><td></td><td>Pada Tanggal</td><td>: ..........................</td></tr>
                                </table>
                                <div class="mt-8 text-center">
                                    <p class="mb-16">Kepala ....................................</p>
                                    <p class="font-bold underline">(..............................................)</p>
                                    <p>NIP.</p>
                                </div>
                            </td>
                        </tr>

                        <!-- Row 3: III (Left & Right) -->
                        <tr>
                            <td class="w-1/2 align-top">
                                <table class="noborder-table w-full">
                                    <tr><td class="w-5">III.</td><td class="w-24">Tiba di</td><td>:</td></tr>
                                    <tr><td></td><td>Pada Tanggal</td><td>:</td></tr>
                                </table>
                                <div class="mt-8 text-center">
                                    <p class="mb-16">Kepala ....................................</p>
                                    <p class="font-bold underline">(..............................................)</p>
                                    <p>NIP.</p>
                                </div>
                            </td>
                            <td class="w-1/2 align-top">
                                <table class="noborder-table w-full">
                                    <tr><td class="w-5"></td><td class="w-28">Berangkat dari</td><td>:</td></tr>
                                    <tr><td></td><td>Ke</td><td>:</td></tr>
                                    <tr><td></td><td>Pada Tanggal</td><td>:</td></tr>
                                </table>
                                <div class="mt-8 text-center">
                                    <p class="mb-16">Kepala ....................................</p>
                                    <p class="font-bold underline">(..............................................)</p>
                                    <p>NIP.</p>
                                </div>
                            </td>
                        </tr>

                        <!-- Row 4: IV (Left) & V (Right) -->
                        <tr>
                            <td class="w-1/2 align-top">
                                <table class="noborder-table w-full">
                                    <tr><td class="w-5">IV.</td><td class="w-24">Tiba di</td><td>: Demak</td></tr>
                                    <tr><td></td><td>(Tempat Kedudukan)</td><td></td></tr>
                                    <tr><td></td><td>Pada Tanggal</td><td>: ${fmtDate(sppd.endDate)}</td></tr>
                                </table>
                                <div class="mt-4 text-center">
                                    <p class="font-bold mb-16">Pejabat Berwenang,</p>
                                    <p class="font-bold underline">${signatoryEmp?.name || '(..................................)'}</p>
                                    <p>NIP. ${signatoryEmp?.nip || '...................'}</p>
                                </div>
                            </td>
                            <td class="w-1/2 align-top text-justify">
                                <div class="flex">
                                    <span class="w-6 font-bold">V.</span>
                                    <span>Telah diperiksa dengan keterangan bahwa perjalanan atas perintahnya dan semata-mata untuk kepentingan jabatan dalam waktu yang sesingkat-singkatnya.</span>
                                </div>
                                <div class="mt-4 mb-4">
                                    Demak,<br/>
                                    Pejabat Berwenang Lainnya,
                                </div>
                                <div class="mt-16 text-center">
                                    <p class="font-bold underline">(..............................................)</p>
                                    <p>NIP.</p>
                                </div>
                            </td>
                        </tr>

                        <!-- Row 5: VI & VII -->
                        <tr>
                            <td colspan="2" class="p-2">
                                <div class="font-bold mb-2">VI. Catatan Lain-lain:</div>
                            </td>
                        </tr>
                        <tr>
                            <td colspan="2" class="p-2">
                                <div class="font-bold mb-1">VII. PERHATIAN:</div>
                                <p class="text-justify leading-snug">Pejabat yang berwenang menerbitkan SPPD, pegawai yang melakukan perjalanan dinas, para pejabat yang mengesahkan tanggal berangkat/tiba, serta bendaharawan bertanggung jawab berdasarkan peraturan-peraturan Keuangan Negara apabila Negara menderita rugi akibat kesalahan, kelalaian, dan kealpaannya.</p>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </body>
        </html>
      `;

      const newWindow = window.open('', '_blank');
      if (newWindow) {
          newWindow.document.open();
          newWindow.document.write(printContent);
          newWindow.document.close();
      } else {
          alert("Pop-up diblokir. Izinkan pop-up untuk mencetak.");
      }
  };

  // --- RENDERERS (REPLACED GRID WITH TABLE) ---

  const renderReadyTable = () => (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
              <table className="w-full text-left">
                  <thead>
                      <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                          <th className="px-6 py-4">No. Surat Tugas</th>
                          <th className="px-6 py-4">Tgl Surat</th>
                          <th className="px-6 py-4">Perihal</th>
                          <th className="px-6 py-4">Pegawai</th>
                          <th className="px-6 py-4">Tujuan</th>
                          <th className="px-6 py-4 text-right">Aksi</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                      {readyList.map(task => {
                          const mainEmp = employees.find(e => e.id === task.employeeIds[0]);
                          const dest = cities.find(c => c.id === task.destinationId)?.name || '-';
                          return (
                              <tr key={task.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="px-6 py-4 font-bold text-indigo-600 font-mono">{task.number}</td>
                                  <td className="px-6 py-4 text-slate-500">{new Date(task.date).toLocaleDateString('id-ID')}</td>
                                  <td className="px-6 py-4 max-w-xs truncate" title={task.subject}>{task.subject}</td>
                                  <td className="px-6 py-4 font-medium text-slate-800">{mainEmp?.name || '-'}</td>
                                  <td className="px-6 py-4">
                                      <div className="flex items-center text-slate-600">
                                          {dest} <ArrowRight size={12} className="mx-1 text-slate-400"/> {task.duration} Hari
                                      </div>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                      <button 
                                        onClick={() => openCreateModal(task)} 
                                        className="inline-flex items-center px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow hover:bg-indigo-700 transition-all"
                                      >
                                          <FilePlus size={14} className="mr-1"/> Terbitkan
                                      </button>
                                  </td>
                              </tr>
                          );
                      })}
                      {readyList.length === 0 && (
                          <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">Tidak ada data Surat Tugas yang siap diterbitkan.</td></tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>
  );

  const renderIssuedTable = () => (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
              <table className="w-full text-left">
                  <thead>
                      <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                          <th className="px-6 py-4">No. SPPD</th>
                          <th className="px-6 py-4">Dasar Surat Tugas</th>
                          <th className="px-6 py-4">Pegawai</th>
                          <th className="px-6 py-4">Tujuan</th>
                          <th className="px-6 py-4">Tanggal</th>
                          <th className="px-6 py-4 text-center">Status</th>
                          <th className="px-6 py-4 text-right">Aksi</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                      {issuedList.map(s => {
                          const details = getHelperDetails(s.assignmentId);
                          return (
                              <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="px-6 py-4 font-bold text-slate-900 font-mono">{s.id}</td>
                                  <td className="px-6 py-4 text-xs font-mono text-slate-500">{details.refNumber}</td>
                                  <td className="px-6 py-4 font-medium text-slate-800">{details.empName}</td>
                                  <td className="px-6 py-4 text-slate-600">{details.dest}</td>
                                  <td className="px-6 py-4 text-slate-500 text-xs">
                                      {new Date(s.startDate).toLocaleDateString('id-ID')} s/d <br/> 
                                      {new Date(s.endDate).toLocaleDateString('id-ID')}
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                      <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-md ${s.status === 'Selesai' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                          {s.status}
                                      </span>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                      <div className="flex items-center justify-end space-x-1">
                                          <button onClick={() => openEditModal(s)} className="p-1.5 text-slate-500 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 rounded-md transition-colors" title="Edit"><Edit2 size={16}/></button>
                                          <button onClick={() => handlePrint(s)} className="p-1.5 text-slate-500 hover:text-emerald-600 bg-slate-50 hover:bg-emerald-50 rounded-md transition-colors" title="Cetak"><Printer size={16}/></button>
                                          <button onClick={() => { setItemToDelete(s.id); setIsDeleteModalOpen(true); }} className="p-1.5 text-slate-500 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-md transition-colors" title="Hapus"><Trash2 size={16}/></button>
                                      </div>
                                  </td>
                              </tr>
                          );
                      })}
                      {issuedList.length === 0 && (
                          <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">Belum ada SPPD yang diterbitkan.</td></tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
            <h1 className="text-2xl font-bold text-slate-900">Penerbitan SPPD</h1>
            <p className="text-slate-500">Kelola dan cetak Surat Perintah Perjalanan Dinas.</p>
        </div>
        <div className="flex items-center space-x-2">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Cari Nomor / Pegawai..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-64 shadow-sm"
                />
            </div>
            <button onClick={fetchData} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"><RefreshCw size={20} className={isLoading ? "animate-spin" : ""} /></button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl w-fit print:hidden">
          <button 
            onClick={() => setActiveTab('Ready')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center space-x-2 ${activeTab === 'Ready' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Clock size={16} /> <span>Siap Diterbitkan</span>
            {readyList.length > 0 && <span className="ml-2 bg-indigo-100 text-indigo-600 text-[10px] px-1.5 py-0.5 rounded-full">{readyList.length}</span>}
          </button>
          <button 
            onClick={() => setActiveTab('Issued')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center space-x-2 ${activeTab === 'Issued' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <CheckCircle2 size={16} /> <span>Sudah Diterbitkan</span>
          </button>
      </div>

      <div className="print:hidden">
          {activeTab === 'Ready' ? renderReadyTable() : renderIssuedTable()}
      </div>

      {/* EDIT / CREATE MODAL */}
      {isFormModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95">
                  <div className="p-5 border-b flex justify-between items-center">
                      <h3 className="font-bold text-slate-900">
                          {editingSppd ? 'Edit Data SPPD' : 'Terbitkan SPPD Baru'}
                      </h3>
                      <button onClick={() => setIsFormModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                  </div>
                  <form onSubmit={handleSave} className="p-6 space-y-4">
                      {selectedAssignment && (
                          <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100 mb-4">
                              <p className="text-xs text-indigo-500 font-bold uppercase mb-1">Referensi Surat Tugas</p>
                              <p className="text-sm font-bold text-indigo-900">{selectedAssignment.number}</p>
                              <p className="text-xs text-indigo-700 mt-1">{selectedAssignment.subject}</p>
                          </div>
                      )}
                      
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Moda Transportasi</label>
                          <select 
                            required
                            value={formData.transportId} 
                            onChange={(e) => setFormData({...formData,transportId: e.target.value})}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-black outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                              <option value="">-- Pilih Transportasi --</option>
                              {transportModes.map(t => <option key={t.id} value={t.id}>{t.type}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Sumber Anggaran</label>
                          <select 
                            required
                            value={formData.fundingId} 
                            onChange={(e) => setFormData({...formData, fundingId: e.target.value})}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-black outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                              <option value="">-- Pilih Anggaran --</option>
                              {fundingSources.map(f => <option key={f.id} value={f.id}>{f.name} ({f.code})</option>)}
                          </select>
                      </div>
                      <div className="pt-4 flex space-x-3">
                          <button type="button" onClick={() => setIsFormModalOpen(false)} className="flex-1 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl text-sm">Batal</button>
                          <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white font-bold rounded-xl text-sm shadow hover:bg-indigo-700 flex items-center justify-center space-x-2">
                              <Save size={16}/><span>{editingSppd ? 'Simpan Perubahan' : 'Terbitkan Sekarang'}</span>
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Hapus SPPD"
        message="Apakah Anda yakin ingin menghapus data SPPD ini? Data yang dihapus tidak dapat dikembalikan."
      />
    </div>
  );
};

export default SPPDManager;
