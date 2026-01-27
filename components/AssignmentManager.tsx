
import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  X, 
  Trash2, 
  Edit2, 
  UserPlus, 
  MapPin, 
  UserMinus, 
  Printer, 
  RefreshCw,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  AlertCircle,
  Clock,
  FileDown,
  Search,
  ChevronDown,
  Check
} from 'lucide-react';
import { getSupabase } from '../supabaseClient';
import { AssignmentLetter, Employee, Signatory, City, AgencySettings, User } from '../types';
import ConfirmationModal from './ConfirmationModal';
import * as docx from 'docx';
import saveAs from 'file-saver';

// --- CUSTOM SEARCHABLE SELECT COMPONENT ---
interface Option {
  value: string;
  label: string;
  subLabel?: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({ options, value, onChange, placeholder, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const filteredOptions = options.filter(option => 
    option.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (option.subLabel && option.subLabel.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const selectedOption = options.find(o => o.value === value);

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      <div 
        className="w-full px-4 py-2 border border-slate-300 rounded-xl bg-white flex justify-between items-center cursor-pointer hover:border-indigo-500 transition-colors"
        onClick={() => {
          setIsOpen(!isOpen);
          // Focus search input when opening
          if (!isOpen) setSearchTerm(''); 
        }}
      >
        <div className="truncate">
          {selectedOption ? (
            <div className="flex flex-col text-left">
              <span className="text-sm font-medium text-black">{selectedOption.label}</span>
              {selectedOption.subLabel && <span className="text-[10px] text-slate-500">{selectedOption.subLabel}</span>}
            </div>
          ) : (
            <span className="text-black text-sm">{placeholder}</span>
          )}
        </div>
        <ChevronDown size={16} className="text-slate-400 flex-shrink-0 ml-2" />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="p-2 border-b border-slate-100 bg-slate-50">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-indigo-500 bg-white text-black"
                placeholder="Cari..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <div 
                  key={option.value}
                  className={`px-4 py-2 text-sm cursor-pointer hover:bg-indigo-50 flex justify-between items-center ${option.value === value ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700'}`}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{option.label}</span>
                    {option.subLabel && <span className="text-xs opacity-70">{option.subLabel}</span>}
                  </div>
                  {option.value === value && <Check size={14} className="text-indigo-600" />}
                </div>
              ))
            ) : (
              <div className="px-4 py-3 text-sm text-slate-400 text-center">Tidak ditemukan.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const INITIAL_SETTINGS: AgencySettings = {
  name: 'PEMERINTAH KABUPATEN DEMAK',
  department: 'SEKRETARIAT DAERAH',
  address: 'Jalan Kyai Singkil 7, Demak, Jawa Tengah 59511',
  contactInfo: 'Telepon (0291) 685877, Faksimile (0291) 685625, Laman setda.demakkab.go.id, Pos-el setda@demakkab.go.id',
  logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/Lambang_Kabupaten_Demak.png/486px-Lambang_Kabupaten_Demak.png',
  kopSuratUrl: undefined
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
  
  // Removed isPrintModalOpen state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  const [editingTask, setEditingTask] = useState<AssignmentLetter | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
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

  const fetchEverythingFromDb = async () => {
      const client = getSupabase();
      setIsLoading(true);

      let fetchedEmployees: Employee[] = [];
      let fetchedCities: City[] = [];
      let fetchedSignatories: Signatory[] = [];
      let fetchedAgencySettings: AgencySettings = INITIAL_SETTINGS;
      let fetchedTasks: AssignmentLetter[] = [];

      if (client) {
          try {
              const { data: sData } = await client.from('agency_settings').select('*').limit(1).maybeSingle();
              if (sData) {
                  fetchedAgencySettings = { 
                      name: sData.name, department: sData.department, address: sData.address, 
                      contactInfo: sData.contact_info, logoUrl: sData.logo_url, kopSuratUrl: sData.kop_surat_url 
                  };
              }

              const { data: eData } = await client.from('employees').select('*').order('name');
              if (eData) {
                  fetchedEmployees = eData.map((d: any) => ({
                     id: d.id, nip: d.nip, name: d.name, position: d.position, rank: d.rank, grade: d.grade
                  }));
              }

              const { data: cData } = await client.from('cities').select('*').order('name');
              if (cData) fetchedCities = cData.map(c => ({
                  id: c.id, name: c.name, province: c.province, dailyAllowance: c.daily_allowance
              }));

              const { data: sigData } = await client.from('signatories').select('*');
              if (sigData) fetchedSignatories = sigData.map(s => ({
                  id: s.id, employeeId: s.employee_id, role: s.role, isActive: s.is_active
              }));

              const { data: tData } = await client.from('assignment_letters').select('*').order('created_at', { ascending: false });
              if (tData) fetchedTasks = tData.map((item: any) => ({
                  id: item.id, number: item.number, date: item.date, basis: item.basis, employeeIds: item.employee_ids || [], subject: item.subject, destinationId: item.destination_id, destinationAddress: item.destination_address, startDate: item.start_date, endDate: item.end_date, duration: item.duration, signatoryId: item.signatory_id, status: item.status, signatureType: item.signature_type, upperTitle: item.upper_title, intermediateTitle: item.intermediate_title
              }));

          } catch (e: any) {
              console.error("General DB Fetch Error:", e.message);
          }
      }

      if (fetchedEmployees.length === 0) {
          const savedEmployees = localStorage.getItem('employees');
          if (savedEmployees) fetchedEmployees = JSON.parse(savedEmployees);
      }
      if (fetchedCities.length === 0) {
          const savedCities = localStorage.getItem('cities');
          if (savedCities) fetchedCities = JSON.parse(savedCities);
      }
      if (fetchedSignatories.length === 0) {
          const savedSignatories = localStorage.getItem('signatories');
          if (savedSignatories) fetchedSignatories = JSON.parse(savedSignatories);
      }
      if (fetchedAgencySettings.name === INITIAL_SETTINGS.name && !fetchedAgencySettings.kopSuratUrl) {
          const savedSettings = localStorage.getItem('agency_settings');
          if (savedSettings) fetchedAgencySettings = JSON.parse(savedSettings);
      }
      if (fetchedTasks.length === 0) {
        const savedTasks = localStorage.getItem('assignment_tasks_v2');
        if (savedTasks) fetchedTasks = JSON.parse(savedTasks);
      }

      setEmployees(fetchedEmployees);
      setCities(fetchedCities);
      setSignatories(fetchedSignatories);
      setAgencySettings(fetchedAgencySettings);
      setTasks(fetchedTasks);
      setIsLoading(false);
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) setUser(JSON.parse(savedUser));
    fetchEverythingFromDb();
  }, []);

  const calculateDuration = (start: string, end: string): number => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    return diffDays + 1;
  };

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      duration: calculateDuration(prev.startDate, prev.endDate)
    }));
  }, [formData.startDate, formData.endDate]);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
      const client = getSupabase();
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
      localStorage.setItem('assignment_tasks_v2', JSON.stringify(tasks.map(t => t.id === id ? { ...t, status: newStatus } : t)));
      if (client) {
        try { await client.from('assignment_letters').update({ status: newStatus }).eq('id', id); } catch(e) { console.error("Failed to update status in DB:", e); }
      }
  };

  const requestDelete = (id: string) => {
    setItemToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
      if (!itemToDelete) return;
      const client = getSupabase();
      const updatedList = tasks.filter(t => t.id !== itemToDelete);
      setTasks(updatedList);
      setIsDeleteModalOpen(false);
      if (client) await client.from('assignment_letters').delete().eq('id', itemToDelete);
      localStorage.setItem('assignment_tasks_v2', JSON.stringify(updatedList));
      setItemToDelete(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.employeeIds.length === 0) return alert("Pilih minimal satu pegawai!");
    const client = getSupabase();
    const newId = editingTask ? editingTask.id : Date.now().toString();
    const currentStatus = editingTask ? editingTask.status : 'Pending';
    const newTask = { ...formData, id: newId, status: currentStatus };
    const dbPayload = {
        id: newId, number: formData.number, date: formData.date, basis: formData.basis, employee_ids: formData.employeeIds, subject: formData.subject, destination_id: formData.destinationId, destination_address: formData.destinationAddress, start_date: formData.startDate, end_date: formData.endDate, duration: formData.duration, signatory_id: formData.signatoryId, status: currentStatus, signature_type: formData.signatureType, upper_title: formData.upperTitle, intermediate_title: formData.intermediateTitle
    };
    setTasks(prev => editingTask ? prev.map(t => t.id === newId ? newTask : t) : [newTask, ...prev]);
    setIsModalOpen(false);
    if (client) await client.from('assignment_letters').upsert(dbPayload);
    localStorage.setItem('assignment_tasks_v2', JSON.stringify(editingTask ? tasks.map(t => t.id === newId ? newTask : t) : [newTask, ...tasks]));
  };

  const addEmployee = () => {
    if (selectedEmpId && !formData.employeeIds.includes(selectedEmpId)) {
      setFormData(prev => ({ ...prev, employeeIds: [...prev.employeeIds, selectedEmpId] }));
      setSelectedEmpId('');
    } else if (selectedEmpId && formData.employeeIds.includes(selectedEmpId)) {
        alert('Pegawai sudah ada dalam daftar.');
    }
  };

  const openForm = (task: AssignmentLetter | null) => {
      fetchEverythingFromDb();
      if (task) {
          setEditingTask(task);
          setFormData({
              number: task.number, date: task.date, basis: task.basis, employeeIds: task.employeeIds,
              subject: task.subject, destinationId: task.destinationId, destinationAddress: task.destinationAddress || '', 
              startDate: task.startDate, endDate: task.endDate, duration: task.duration, signatoryId: task.signatoryId,
              signatureType: task.signatureType || 'Direct', upperTitle: task.upperTitle || '', intermediateTitle: task.intermediateTitle || ''
          });
      } else {
          setEditingTask(null);
          setFormData({
              number: '', date: new Date().toISOString().split('T')[0], basis: '', employeeIds: [], subject: '', 
              destinationId: '', destinationAddress: '', startDate: '', endDate: '', duration: 0, 
              signatoryId: '', signatureType: 'Direct', upperTitle: '', intermediateTitle: ''
          });
      }
      setIsModalOpen(true);
  };

  const formatDateIndo = (dateStr: string) => {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
  };

  // --- PREPARE SEARCHABLE DATA ---
  const employeeOptions = employees.map(e => ({
      value: e.id,
      label: e.name,
      subLabel: `${e.nip} - ${e.position}`
  }));

  const cityOptions = cities.map(c => ({
      value: c.id,
      label: c.name,
      subLabel: c.province
  }));

  // --- DOCX GENERATION ---
  const handleDownloadWord = async (task: AssignmentLetter) => {
    const destCity = cities.find(c => c.id === task.destinationId);
    const signatory = signatories.find(s => s.id === task.signatoryId);
    const signatoryEmp = employees.find(e => e.id === signatory?.employeeId);

    // Font Configuration (12pt = 24 half-points)
    const FONT_FAMILY = "Arial";
    const FONT_SIZE = 24; 

    // 1. Fetch Kop Image or Use Text Fallback
    let headerElements: docx.Paragraph[] = [];
    
    if (agencySettings.kopSuratUrl) {
        try {
            const response = await fetch(agencySettings.kopSuratUrl);
            const blob = await response.blob();
            const buffer = await blob.arrayBuffer();
            
            // Get Image Dimensions for aspect ratio
            const dimensions = await new Promise<{width: number, height: number}>((resolve, reject) => {
               const img = new Image();
               img.onload = () => resolve({ width: img.width, height: img.height });
               img.onerror = reject;
               img.src = URL.createObjectURL(blob);
            });

            // Scale to fit page (approx 700px width for A4)
            const maxWidth = 700; 
            const ratio = maxWidth / dimensions.width;
            const width = maxWidth;
            const height = dimensions.height * ratio;

            headerElements.push(
                new docx.Paragraph({
                    children: [
                        new docx.ImageRun({
                            data: buffer,
                            transformation: { width, height }
                        })
                    ],
                    alignment: docx.AlignmentType.CENTER,
                    spacing: { after: 200 }
                })
            );
        } catch (e) {
            console.error("Failed to load kop surat image for docx", e);
            // Fallback to text if image fails
             headerElements.push(
                new docx.Paragraph({ text: agencySettings.name, font: FONT_FAMILY, size: 28, alignment: docx.AlignmentType.CENTER, spacing: { after: 50 } }),
                new docx.Paragraph({ children: [new docx.TextRun({ text: agencySettings.department, bold: true })], font: FONT_FAMILY, size: 32, alignment: docx.AlignmentType.CENTER, spacing: { after: 50 } }),
                new docx.Paragraph({ text: agencySettings.address, font: FONT_FAMILY, size: 20, alignment: docx.AlignmentType.CENTER }),
                new docx.Paragraph({ text: agencySettings.contactInfo, font: FONT_FAMILY, size: 20, alignment: docx.AlignmentType.CENTER, border: { bottom: { color: "000000", space: 5, style: docx.BorderStyle.SINGLE, size: 6 } }, spacing: { after: 200 } })
             );
        }
    } else {
        // Default text header if no URL
        headerElements.push(
            new docx.Paragraph({ text: agencySettings.name, font: FONT_FAMILY, size: 28, alignment: docx.AlignmentType.CENTER, spacing: { after: 50 } }),
            new docx.Paragraph({ children: [new docx.TextRun({ text: agencySettings.department, bold: true })], font: FONT_FAMILY, size: 32, alignment: docx.AlignmentType.CENTER, spacing: { after: 50 } }),
            new docx.Paragraph({ text: agencySettings.address, font: FONT_FAMILY, size: 20, alignment: docx.AlignmentType.CENTER }),
            new docx.Paragraph({ text: agencySettings.contactInfo, font: FONT_FAMILY, size: 20, alignment: docx.AlignmentType.CENTER, border: { bottom: { color: "000000", space: 5, style: docx.BorderStyle.SINGLE, size: 6 } }, spacing: { after: 200 } })
        );
    }

    // Prepare Employee Rows for Table
    const employeeRows = task.employeeIds.map((empId, idx) => {
      const emp = employees.find(e => e.id === empId);
      const rankGrade = `${emp?.rank || '-'} / ${emp?.grade || '-'}`;
      
      return [
        new docx.TableRow({
          children: [
            new docx.TableCell({
              children: [new docx.Paragraph({ text: `${idx + 1}.`, font: FONT_FAMILY, size: FONT_SIZE })],
              width: { size: 5, type: docx.WidthType.PERCENTAGE },
              borders: { top: { style: docx.BorderStyle.NONE }, bottom: { style: docx.BorderStyle.NONE }, left: { style: docx.BorderStyle.NONE }, right: { style: docx.BorderStyle.NONE } },
            }),
            new docx.TableCell({
              children: [
                 new docx.Paragraph({ text: "Nama", font: FONT_FAMILY, size: FONT_SIZE }),
                 new docx.Paragraph({ text: "NIP", font: FONT_FAMILY, size: FONT_SIZE }),
                 new docx.Paragraph({ text: "Pangkat/Gol", font: FONT_FAMILY, size: FONT_SIZE }),
                 new docx.Paragraph({ text: "Jabatan", font: FONT_FAMILY, size: FONT_SIZE }),
              ],
              width: { size: 20, type: docx.WidthType.PERCENTAGE },
              borders: { top: { style: docx.BorderStyle.NONE }, bottom: { style: docx.BorderStyle.NONE }, left: { style: docx.BorderStyle.NONE }, right: { style: docx.BorderStyle.NONE } },
            }),
            new docx.TableCell({
              children: [
                 new docx.Paragraph({ text: ":", font: FONT_FAMILY, size: FONT_SIZE }),
                 new docx.Paragraph({ text: ":", font: FONT_FAMILY, size: FONT_SIZE }),
                 new docx.Paragraph({ text: ":", font: FONT_FAMILY, size: FONT_SIZE }),
                 new docx.Paragraph({ text: ":", font: FONT_FAMILY, size: FONT_SIZE }),
              ],
              width: { size: 3, type: docx.WidthType.PERCENTAGE },
              borders: { top: { style: docx.BorderStyle.NONE }, bottom: { style: docx.BorderStyle.NONE }, left: { style: docx.BorderStyle.NONE }, right: { style: docx.BorderStyle.NONE } },
            }),
            new docx.TableCell({
              children: [
                 new docx.Paragraph({ children: [new docx.TextRun({ text: emp?.name || "-", bold: true })], font: FONT_FAMILY, size: FONT_SIZE }),
                 new docx.Paragraph({ text: emp?.nip || "-", font: FONT_FAMILY, size: FONT_SIZE }),
                 new docx.Paragraph({ text: rankGrade, font: FONT_FAMILY, size: FONT_SIZE }),
                 new docx.Paragraph({ text: emp?.position || "-", font: FONT_FAMILY, size: FONT_SIZE }),
                 new docx.Paragraph({ text: "", font: FONT_FAMILY, size: FONT_SIZE }), // Spacer
              ],
              width: { size: 72, type: docx.WidthType.PERCENTAGE },
              borders: { top: { style: docx.BorderStyle.NONE }, bottom: { style: docx.BorderStyle.NONE }, left: { style: docx.BorderStyle.NONE }, right: { style: docx.BorderStyle.NONE } },
            }),
          ],
        })
      ];
    }).flat();

    // Prepare Signature Block Logic
    let signatureContent: docx.Paragraph[] = [];
    
    // Base Signatory Info
    const sigRole = (signatory?.role || '').toUpperCase();
    const sigName = signatoryEmp?.name || '';
    const sigNip = `NIP ${signatoryEmp?.nip || ''}`;
    const sigRank = signatoryEmp?.rank || '';

    // "Dikeluarkan di" Block
    const dateBlock = [
        new docx.Paragraph({ text: "Dikeluarkan di Demak", font: FONT_FAMILY, size: FONT_SIZE }),
        new docx.Paragraph({ text: `Pada tanggal ${formatDateIndo(task.date)}`, font: FONT_FAMILY, size: FONT_SIZE, spacing: { after: 200 } }),
    ];

    if (task.signatureType === 'AN') {
        signatureContent = [
            ...dateBlock,
            new docx.Paragraph({ text: "a.n.", font: FONT_FAMILY, size: FONT_SIZE }),
            new docx.Paragraph({ text: task.upperTitle || "", font: FONT_FAMILY, size: FONT_SIZE, indent: { left: 450 } }), // Indent manually for hanging effect
            new docx.Paragraph({ children: [new docx.TextRun({ text: `${sigRole},`, bold: true })], font: FONT_FAMILY, size: FONT_SIZE, indent: { left: 450 } }),
            new docx.Paragraph({ text: "", spacing: { before: 800 } }), // Space for signature
            new docx.Paragraph({ children: [new docx.TextRun({ text: sigName, bold: true, underline: { type: docx.UnderlineType.SINGLE } })], font: FONT_FAMILY, size: FONT_SIZE, indent: { left: 450 } }),
            new docx.Paragraph({ text: sigRank, font: FONT_FAMILY, size: FONT_SIZE, indent: { left: 450 }, style: "Capitalize" }),
            new docx.Paragraph({ text: sigNip, font: FONT_FAMILY, size: FONT_SIZE, indent: { left: 450 } }),
        ];
    } else if (task.signatureType === 'UB') {
        signatureContent = [
            ...dateBlock,
            new docx.Paragraph({ text: "a.n.", font: FONT_FAMILY, size: FONT_SIZE }),
            new docx.Paragraph({ text: task.upperTitle || "", font: FONT_FAMILY, size: FONT_SIZE, indent: { left: 450 } }),
            new docx.Paragraph({ text: `${task.intermediateTitle || ""},`, font: FONT_FAMILY, size: FONT_SIZE, indent: { left: 450 } }),
            new docx.Paragraph({ text: "u.b.", font: FONT_FAMILY, size: FONT_SIZE, indent: { left: 450 } }),
            new docx.Paragraph({ children: [new docx.TextRun({ text: `${sigRole},`, bold: true })], font: FONT_FAMILY, size: FONT_SIZE, indent: { left: 450 } }),
            new docx.Paragraph({ text: "", spacing: { before: 800 } }),
            new docx.Paragraph({ children: [new docx.TextRun({ text: sigName, bold: true, underline: { type: docx.UnderlineType.SINGLE } })], font: FONT_FAMILY, size: FONT_SIZE, indent: { left: 450 } }),
            new docx.Paragraph({ text: sigRank, font: FONT_FAMILY, size: FONT_SIZE, indent: { left: 450 }, style: "Capitalize" }),
            new docx.Paragraph({ text: sigNip, font: FONT_FAMILY, size: FONT_SIZE, indent: { left: 450 } }),
        ];
    } else {
        signatureContent = [
            ...dateBlock,
            new docx.Paragraph({ children: [new docx.TextRun({ text: `${sigRole},`, bold: true })], font: FONT_FAMILY, size: FONT_SIZE }),
            new docx.Paragraph({ text: "", spacing: { before: 800 } }),
            new docx.Paragraph({ children: [new docx.TextRun({ text: sigName, bold: true, underline: { type: docx.UnderlineType.SINGLE } })], font: FONT_FAMILY, size: FONT_SIZE }),
            new docx.Paragraph({ text: sigRank, font: FONT_FAMILY, size: FONT_SIZE, style: "Capitalize" }),
            new docx.Paragraph({ text: sigNip, font: FONT_FAMILY, size: FONT_SIZE }),
        ];
    }

    const doc = new docx.Document({
        sections: [{
            properties: {
                page: {
                    margin: { top: 720, right: 720, bottom: 720, left: 1440 }, // Twips (1440 = 1 inch)
                    size: { width: 11906, height: 16838 } // A4
                }
            },
            children: [
                ...headerElements,

                // JUDUL
                new docx.Paragraph({ 
                    children: [new docx.TextRun({ text: "SURAT PERINTAH TUGAS", bold: true, underline: { type: docx.UnderlineType.SINGLE } })], 
                    font: FONT_FAMILY, size: FONT_SIZE, alignment: docx.AlignmentType.CENTER, spacing: { before: 200 }
                }),
                new docx.Paragraph({ 
                    children: [new docx.TextRun({ text: `NOMOR : ${task.number}`, bold: true })], 
                    font: FONT_FAMILY, size: FONT_SIZE, alignment: docx.AlignmentType.CENTER, spacing: { after: 200 }
                }),

                // DASAR
                new docx.Table({
                    width: { size: 100, type: docx.WidthType.PERCENTAGE },
                    rows: [
                        new docx.TableRow({
                            children: [
                                new docx.TableCell({ children: [new docx.Paragraph({ children: [new docx.TextRun({text:"Dasar", bold:true})], font: FONT_FAMILY, size: FONT_SIZE })], width: { size: 15, type: docx.WidthType.PERCENTAGE }, borders: { top: { style: docx.BorderStyle.NONE }, bottom: { style: docx.BorderStyle.NONE }, left: { style: docx.BorderStyle.NONE }, right: { style: docx.BorderStyle.NONE } } }),
                                new docx.TableCell({ children: [new docx.Paragraph({ text: ":", font: FONT_FAMILY, size: FONT_SIZE, alignment: docx.AlignmentType.CENTER })], width: { size: 2, type: docx.WidthType.PERCENTAGE }, borders: { top: { style: docx.BorderStyle.NONE }, bottom: { style: docx.BorderStyle.NONE }, left: { style: docx.BorderStyle.NONE }, right: { style: docx.BorderStyle.NONE } } }),
                                new docx.TableCell({ children: [new docx.Paragraph({ text: task.basis, font: FONT_FAMILY, size: FONT_SIZE, alignment: docx.AlignmentType.JUSTIFIED })], width: { size: 83, type: docx.WidthType.PERCENTAGE }, borders: { top: { style: docx.BorderStyle.NONE }, bottom: { style: docx.BorderStyle.NONE }, left: { style: docx.BorderStyle.NONE }, right: { style: docx.BorderStyle.NONE } } }),
                            ]
                        })
                    ]
                }),

                // MEMERINTAHKAN
                new docx.Paragraph({ 
                    children: [new docx.TextRun({ text: "MEMERINTAHKAN", bold: true })], 
                    font: FONT_FAMILY, size: FONT_SIZE, alignment: docx.AlignmentType.CENTER, spacing: { before: 200, after: 200, line: 300 } // Expanded spacing
                }),

                // KEPADA
                new docx.Table({
                    width: { size: 100, type: docx.WidthType.PERCENTAGE },
                    rows: [
                        new docx.TableRow({
                            children: [
                                new docx.TableCell({ children: [new docx.Paragraph({ children: [new docx.TextRun({text:"Kepada", bold:true})], font: FONT_FAMILY, size: FONT_SIZE })], width: { size: 15, type: docx.WidthType.PERCENTAGE }, borders: { top: { style: docx.BorderStyle.NONE }, bottom: { style: docx.BorderStyle.NONE }, left: { style: docx.BorderStyle.NONE }, right: { style: docx.BorderStyle.NONE } } }),
                                new docx.TableCell({ children: [new docx.Paragraph({ text: ":", font: FONT_FAMILY, size: FONT_SIZE, alignment: docx.AlignmentType.CENTER })], width: { size: 2, type: docx.WidthType.PERCENTAGE }, borders: { top: { style: docx.BorderStyle.NONE }, bottom: { style: docx.BorderStyle.NONE }, left: { style: docx.BorderStyle.NONE }, right: { style: docx.BorderStyle.NONE } } }),
                                new docx.TableCell({ 
                                    children: [
                                        new docx.Table({
                                            width: { size: 100, type: docx.WidthType.PERCENTAGE },
                                            rows: employeeRows
                                        })
                                    ], 
                                    width: { size: 83, type: docx.WidthType.PERCENTAGE }, 
                                    borders: { top: { style: docx.BorderStyle.NONE }, bottom: { style: docx.BorderStyle.NONE }, left: { style: docx.BorderStyle.NONE }, right: { style: docx.BorderStyle.NONE } } 
                                }),
                            ]
                        })
                    ]
                }),

                // UNTUK
                new docx.Paragraph({ text: "", spacing: { after: 100 } }), // Spacer
                new docx.Table({
                    width: { size: 100, type: docx.WidthType.PERCENTAGE },
                    rows: [
                        new docx.TableRow({
                            children: [
                                new docx.TableCell({ children: [new docx.Paragraph({ children: [new docx.TextRun({text:"Untuk", bold:true})], font: FONT_FAMILY, size: FONT_SIZE })], width: { size: 15, type: docx.WidthType.PERCENTAGE }, borders: { top: { style: docx.BorderStyle.NONE }, bottom: { style: docx.BorderStyle.NONE }, left: { style: docx.BorderStyle.NONE }, right: { style: docx.BorderStyle.NONE } } }),
                                new docx.TableCell({ children: [new docx.Paragraph({ text: ":", font: FONT_FAMILY, size: FONT_SIZE, alignment: docx.AlignmentType.CENTER })], width: { size: 2, type: docx.WidthType.PERCENTAGE }, borders: { top: { style: docx.BorderStyle.NONE }, bottom: { style: docx.BorderStyle.NONE }, left: { style: docx.BorderStyle.NONE }, right: { style: docx.BorderStyle.NONE } } }),
                                new docx.TableCell({ 
                                    children: [
                                        new docx.Paragraph({ text: `1.  ${task.subject}`, font: FONT_FAMILY, size: FONT_SIZE, alignment: docx.AlignmentType.JUSTIFIED }),
                                        new docx.Paragraph({ text: `2.  Tempat ${task.destinationAddress ? `${task.destinationAddress}, ` : ''}${destCity?.name || '-'};`, font: FONT_FAMILY, size: FONT_SIZE }),
                                        new docx.Paragraph({ text: `3.  Waktu Pelaksanaan ${formatDateIndo(task.startDate)} s.d ${formatDateIndo(task.endDate)} (${task.duration} hari);`, font: FONT_FAMILY, size: FONT_SIZE }),
                                        new docx.Paragraph({ text: `4.  Melaporkan hasil pelaksanaan tugas kepada pimpinan.`, font: FONT_FAMILY, size: FONT_SIZE }),
                                    ], 
                                    width: { size: 83, type: docx.WidthType.PERCENTAGE }, 
                                    borders: { top: { style: docx.BorderStyle.NONE }, bottom: { style: docx.BorderStyle.NONE }, left: { style: docx.BorderStyle.NONE }, right: { style: docx.BorderStyle.NONE } } 
                                }),
                            ]
                        })
                    ]
                }),

                // TANDA TANGAN SECTION
                new docx.Paragraph({ text: "", spacing: { after: 300 } }),
                new docx.Table({
                    width: { size: 100, type: docx.WidthType.PERCENTAGE },
                    rows: [
                        new docx.TableRow({
                           children: [
                               new docx.TableCell({ children: [], width: { size: 50, type: docx.WidthType.PERCENTAGE }, borders: { top: { style: docx.BorderStyle.NONE }, bottom: { style: docx.BorderStyle.NONE }, left: { style: docx.BorderStyle.NONE }, right: { style: docx.BorderStyle.NONE } } }),
                               new docx.TableCell({ 
                                   children: signatureContent, 
                                   width: { size: 50, type: docx.WidthType.PERCENTAGE }, 
                                   borders: { top: { style: docx.BorderStyle.NONE }, bottom: { style: docx.BorderStyle.NONE }, left: { style: docx.BorderStyle.NONE }, right: { style: docx.BorderStyle.NONE } } 
                               }),
                           ]
                        })
                    ]
                })
            ]
        }]
    });

    const blob = await docx.Packer.toBlob(doc);
    saveAs(blob, `Surat_Tugas_${task.number.replace(/\//g, '-')}.docx`);
  };

  // --- PRINT LOGIC (NEW TAB) ---
  const handlePrint = (task: AssignmentLetter) => {
      const destCity = cities.find(c => c.id === task.destinationId);
      const signatory = signatories.find(s => s.id === task.signatoryId);
      const signatoryEmp = employees.find(e => e.id === signatory?.employeeId);

      const formatDateIndo = (dateStr: string) => {
          const date = new Date(dateStr);
          return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
      };

      // HTML String
      const printContent = `
        <!DOCTYPE html>
        <html lang="id">
        <head>
            <meta charset="UTF-8">
            <title>Cetak Surat Tugas - ${task.number}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
                @media print {
                    /* Mengatur margin kertas A4 di browser: Kiri 2.5cm, Atas 2cm, Kanan 2cm, Bawah 2cm */
                    @page { size: A4; margin: 2cm 2cm 2cm 2.5cm; }
                    body { margin: 0; background: white; -webkit-print-color-adjust: exact; }
                    .no-print { display: none !important; }
                    /* Menghilangkan batasan width container saat print agar mengikuti @page margin */
                    .print-container { width: 100% !important; margin: 0 !important; padding: 0 !important; box-shadow: none !important; border: none !important; }
                    /* Prevent signature separation */
                    .avoid-break { page-break-inside: avoid; break-inside: avoid; }
                }
                /* Font dinaikkan ke 12pt */
                body { font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.5; color: black; background: #f1f5f9; }
                .print-container { 
                    margin: 20px auto; 
                    background: white; 
                    padding: 15mm 20mm; 
                    width: 210mm; /* Tampilan di layar tetap A4 */
                    min-height: 297mm; 
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                }
            </style>
        </head>
        <body>
            <!-- Toolbar -->
            <div class="no-print fixed top-0 left-0 right-0 bg-slate-800 text-white p-4 flex justify-between items-center shadow-lg z-50">
                <div class="font-bold">Pratinjau Cetak Surat Tugas: ${task.number}</div>
                <div class="flex space-x-3">
                    <button onclick="window.close()" class="px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded font-bold">Tutup</button>
                    <button onclick="window.print()" class="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded font-bold flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2-2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                        Cetak Sekarang
                    </button>
                </div>
            </div>
            <div class="h-16 no-print"></div>

            <div class="print-container">
                <!-- KOP -->
                <div class="mb-4 w-full">
                    ${agencySettings.kopSuratUrl ? 
                        `<img src="${agencySettings.kopSuratUrl}" alt="Kop Surat" class="w-full h-auto object-contain max-h-[150px] mx-auto" />` : 
                        `<div class="text-center pb-2 mb-4 border-b-[3px] border-black">
                            <h3 class="text-[14pt] font-medium tracking-wide">${agencySettings.name}</h3>
                            <h1 class="text-[16pt] font-bold tracking-wider">${agencySettings.department}</h1>
                            <p class="text-[10pt]">${agencySettings.address}</p>
                            <p class="text-[10pt]">${agencySettings.contactInfo}</p>
                        </div>`
                    }
                </div>

                <div class="text-center mb-6">
                    <h2 class="text-[12pt] font-bold underline uppercase m-0 text-black">SURAT PERINTAH TUGAS</h2>
                    <p class="m-0 text-black font-bold">NOMOR : ${task.number}</p>
                </div>

                <!-- DASAR -->
                <div class="grid grid-cols-[80px_10px_1fr] mb-4 text-black">
                    <div class="font-bold">Dasar</div>
                    <div class="text-center">:</div>
                    <div class="text-justify whitespace-pre-wrap">${task.basis}</div>
                </div>

                <div class="text-center font-bold mb-4 tracking-[0.1em] uppercase text-black">MEMERINTAHKAN</div>

                <!-- KEPADA -->
                <div class="grid grid-cols-[80px_10px_1fr] mb-4 text-black">
                    <div class="font-bold">Kepada</div>
                    <div class="text-center">:</div>
                    <div class="space-y-3">
                        ${task.employeeIds.map((empId, idx) => {
                            const emp = employees.find(e => e.id === empId);
                            // Format Rank / Grade
                            const rankGrade = `${emp?.rank || '-'} / ${emp?.grade || '-'}`;
                            return `
                                <div class="flex">
                                    <span class="w-5 flex-shrink-0">${idx + 1}.</span>
                                    <div class="flex-1">
                                        <table class="w-full text-black">
                                            <tbody class="align-top">
                                                <tr><td class="w-28">Nama</td><td class="w-3 text-center">:</td><td class="font-bold">${emp?.name || '-'}</td></tr>
                                                <tr><td>NIP</td><td class="text-center">:</td><td>${emp?.nip || '-'}</td></tr>
                                                <tr><td>Pangkat/Gol</td><td class="text-center">:</td><td>${rankGrade}</td></tr>
                                                <tr><td>Jabatan</td><td class="text-center">:</td><td>${emp?.position || '-'}</td></tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>

                <!-- UNTUK -->
                <div class="grid grid-cols-[80px_10px_1fr] mb-6 text-black">
                    <div class="font-bold">Untuk</div>
                    <div class="text-center">:</div>
                    <div class="flex-1">
                        <div class="flex mb-1">
                            <span class="mr-2">1.</span>
                            <span class="text-justify">${task.subject};</span>
                        </div>
                        <div class="flex mb-1">
                            <span class="mr-2">2.</span>
                            <span>Tempat ${task.destinationAddress ? `${task.destinationAddress}, ` : ''}${destCity?.name || '-'};</span>
                        </div>
                        <div class="flex mb-1">
                            <span class="mr-2">3.</span>
                            <span>Waktu Pelaksanaan ${formatDateIndo(task.startDate)} s.d ${formatDateIndo(task.endDate)} (${task.duration} hari);</span>
                        </div>
                        <div class="flex mb-1">
                            <span class="mr-2">4.</span>
                            <span>Melaporkan hasil pelaksanaan tugas kepada pimpinan.</span>
                        </div>
                    </div>
                </div>

                <!-- TANDA TANGAN (WRAPPER with avoid-break) -->
                <div class="mt-8 flex justify-end avoid-break">
                    <div class="w-[340px] text-left text-black text-[12pt]">
                        <p class="m-0">Dikeluarkan di Demak</p>
                        <p class="m-0 mb-4">Pada tanggal ${formatDateIndo(task.date)}</p>
                        ${(() => {
                            if (task.signatureType === 'AN') {
                                return `
                                    <table class="w-full text-[12pt] border-none" style="border-spacing: 0;">
                                        <tr>
                                            <td style="vertical-align: top; width: 35px; padding: 0;">a.n.</td>
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
                                    <table class="w-full text-[12pt] border-none" style="border-spacing: 0;">
                                        <tr>
                                            <td style="vertical-align: top; width: 35px; padding: 0;">a.n.</td>
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

  const currentUserRole = user?.role;
  const canAdmin = currentUserRole === 'Admin';
  const canOperator = currentUserRole === 'Operator';
  const canVerificator = currentUserRole === 'Verificator';

  const canInitiateStatusChange = (status: string) => {
    if (canAdmin) return true;
    if (canVerificator && (status === 'Pending' || status === 'Rejected' || status === 'Verified')) {
      return true; 
    }
    return false;
  };

  const canRevertToPending = (status: string) => {
    if (canAdmin) return status !== 'Pending';
    if (canVerificator && (status === 'Rejected' || status === 'Verified')) {
      return true;
    }
    return false;
  };

  const canPrintDocument = (status: string) => {
    if (canAdmin) return true;
    if (canOperator && status === 'Approved') return true;
    return false;
  };

  const canEditOrDeleteDocument = (status: string) => {
    if (canAdmin) return true;
    if (canOperator && (status === 'Pending' || status === 'Rejected')) return true;
    return false;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Verified':
        return <span className="flex items-center px-2 py-1 bg-blue-50 text-blue-600 rounded-md text-[10px] font-bold uppercase"><ShieldCheck size={12} className="mr-1" /> Terverifikasi</span>;
      case 'Approved':
        return <span className="flex items-center px-2 py-1 bg-emerald-50 text-emerald-600 rounded-md text-[10px] font-bold uppercase"><CheckCircle2 size={12} className="mr-1" /> Disetujui</span>;
      case 'Rejected':
        return <span className="flex items-center px-2 py-1 bg-rose-50 text-rose-600 rounded-md text-[10px] font-bold uppercase"><AlertCircle size={12} className="mr-1" /> Ditolak</span>;
      default:
        return <span className="flex items-center px-2 py-1 bg-amber-50 text-amber-600 rounded-md text-[10px] font-bold uppercase"><Clock size={12} className="mr-1" /> Menunggu</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Surat Tugas</h1>
          <p className="text-slate-500">Penerbitan, Verifikasi, dan Pencetakan Surat Tugas resmi.</p>
        </div>
        <div className="flex items-center space-x-2">
            <button onClick={fetchEverythingFromDb} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"><RefreshCw size={18} className={isLoading ? "animate-spin" : ""} /></button>
            {(canAdmin || canOperator) && (
                <button onClick={() => openForm(null)} className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold shadow-lg hover:bg-indigo-700 transition-all"><Plus size={18} /><span>Buat Surat Tugas</span></button>
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
                <th className="px-6 py-4 text-right">Aksi & Persetujuan</th>
              </tr>
            </thead>
            <tbody className="divide-y text-sm divide-slate-100">
              {tasks.map((task) => {
                const dest = cities.find(c => c.id === task.destinationId);
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
                        <span>{task.destinationAddress ? `${task.destinationAddress}, ` : ''}{dest?.name || '-'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(task.status)}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-700 font-medium">{task.duration} Hari</p>
                      <p className="text-[10px] text-slate-400">{formatDateIndo(task.startDate)}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end items-center space-x-1">
                        <div className="flex border-r pr-2 mr-1 space-x-1">
                          {canInitiateStatusChange(task.status) && (
                              <>
                                  {task.status !== 'Approved' && (
                                      <>
                                          <button onClick={() => handleUpdateStatus(task.id, 'Verified')} className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors" title="Verifikasi"><ShieldCheck size={16} /></button>
                                          <button onClick={() => handleUpdateStatus(task.id, 'Approved')} className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors" title="Setujui (Final)"><CheckCircle2 size={16} /></button>
                                          <button onClick={() => handleUpdateStatus(task.id, 'Rejected')} className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors" title="Tolak"><XCircle size={16} /></button>
                                      </>
                                  )}
                                  {canRevertToPending(task.status) && (
                                      <button onClick={() => handleUpdateStatus(task.id, 'Pending')} className="p-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors" title="Kembalikan ke Pending"><RefreshCw size={16} /></button>
                                  )}
                              </>
                          )}
                        </div>
                        
                        {canPrintDocument(task.status) && (
                          <>
                            <button 
                                onClick={() => handleDownloadWord(task)} 
                                className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" 
                                title="Download Word (.docx)"
                            >
                                <FileDown size={16} />
                            </button>
                            <button 
                                onClick={() => handlePrint(task)} 
                                className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" 
                                title="Cetak"
                            >
                                <Printer size={16} />
                            </button>
                          </>
                        )}

                        {canEditOrDeleteDocument(task.status) && (
                          <>
                            <button onClick={() => openForm(task)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Edit"><Edit2 size={16} /></button>
                            <button onClick={() => requestDelete(task.id)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Hapus"><Trash2 size={16} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {tasks.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-slate-500">Belum ada data.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL FORM (CRUD) */}
      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
             <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                 <div className="p-6 border-b flex justify-between items-center bg-white rounded-t-2xl">
                     <h3 className="text-xl font-bold text-black">{editingTask ? 'Edit' : 'Buat'} Surat Tugas</h3>
                     <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-black"><X size={24} /></button>
                 </div>
                 <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4 bg-white text-black">
                     <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-bold text-black mb-1">Nomor Surat</label>
                            <input type="text" required value={formData.number} onChange={(e) => setFormData({...formData, number: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-xl text-black bg-white outline-none focus:border-indigo-500" placeholder="094 / 0007" />
                         </div>
                         <div>
                            <label className="block text-sm font-bold text-black mb-1">Tanggal Surat</label>
                            <input type="date" required value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-xl text-black bg-white outline-none focus:border-indigo-500" />
                         </div>
                     </div>
                     <div>
                        <label className="block text-sm font-bold text-black mb-1">Dasar Pelaksanaan</label>
                        <textarea required rows={3} value={formData.basis} onChange={(e) => setFormData({...formData, basis: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-xl text-black text-sm bg-white outline-none focus:border-indigo-500" placeholder="Isikan dasar penugasan..." />
                     </div>
                     <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <label className="block text-sm font-bold mb-2 text-black">Pegawai yang Ditugaskan</label>
                        <div className="flex gap-2 mb-3">
                           <div className="flex-1">
                               <SearchableSelect 
                                 options={employeeOptions} 
                                 value={selectedEmpId} 
                                 onChange={setSelectedEmpId} 
                                 placeholder="-- Cari Pegawai --" 
                               />
                           </div>
                           <button type="button" onClick={addEmployee} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 shadow-sm"><UserPlus size={16}/></button>
                        </div>
                        <div className="space-y-2">
                            {formData.employeeIds.length === 0 && <p className="text-xs text-slate-400 italic text-center py-2">Belum ada pegawai dipilih.</p>}
                            {formData.employeeIds.map((empId, idx) => {
                                const emp = employees.find(e => e.id === empId);
                                return (
                                    <div key={empId} className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                        <div className="flex items-center space-x-3 text-sm text-black"><span className="font-bold text-indigo-600">{idx + 1}.</span><div><p className="font-bold">{emp?.name}</p><p className="text-xs text-slate-500">{emp?.nip}</p></div></div>
                                        <button type="button" onClick={() => setFormData({...formData, employeeIds: formData.employeeIds.filter(id => id !== empId)})} className="text-rose-500 hover:bg-rose-50 p-1 rounded transition-colors"><UserMinus size={16}/></button>
                                    </div>
                                );
                            })}
                        </div>
                     </div>
                     <div>
                        <label className="block text-sm font-bold text-black mb-1">Maksud / Perihal Penugasan</label>
                        <textarea required rows={2} value={formData.subject} onChange={(e) => setFormData({...formData, subject: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-xl text-black text-sm bg-white outline-none focus:border-indigo-500" />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-black mb-1">Kota Tujuan</label>
                            <SearchableSelect 
                                options={cityOptions} 
                                value={formData.destinationId} 
                                onChange={(value) => setFormData({...formData, destinationId: value})} 
                                placeholder="-- Cari Kota --" 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-black mb-1">Alamat Spesifik</label>
                            <input type="text" value={formData.destinationAddress} onChange={(e) => setFormData({...formData, destinationAddress: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-xl text-black bg-white outline-none focus:border-indigo-500" />
                        </div>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-sm font-bold text-black mb-1">Tgl Mulai</label><input type="date" required value={formData.startDate} onChange={(e) => setFormData({...formData, startDate: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-xl text-black bg-white outline-none focus:border-indigo-500" /></div>
                        <div><label className="block text-sm font-bold text-black mb-1">Tgl Selesai</label><input type="date" required value={formData.endDate} onChange={(e) => setFormData({...formData, endDate: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-xl text-black bg-white outline-none focus:border-indigo-500" /></div>
                     </div>
                     {formData.startDate && formData.endDate && (
                       <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 flex justify-between items-center">
                         <span>Durasi Perjalanan:</span>
                         <span className="font-bold text-indigo-600">{formData.duration} Hari</span>
                       </div>
                     )}
                     <div className="pt-4 border-t">
                        <label className="block text-sm font-bold text-black mb-2">Pejabat Penandatangan</label>
                        <select required value={formData.signatoryId} onChange={(e) => setFormData({...formData, signatoryId: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-xl text-black bg-white outline-none focus:border-indigo-500 mb-4">
                            <option value="">-- Pilih Pejabat --</option>
                            {signatories.map(sig => {
                                const emp = employees.find(e => e.id === sig.employeeId);
                                return <option key={sig.id} value={sig.id} className="text-black">{emp?.name} ({sig.role})</option>
                            })}
                        </select>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tipe Tanda Tangan</label>
                                <select value={formData.signatureType} onChange={(e) => setFormData({...formData, signatureType: e.target.value as any})} className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-black bg-white outline-none focus:border-indigo-500">
                                    <option value="Direct">Langsung</option>
                                    <option value="AN">a.n.</option>
                                    <option value="UB">u.b.</option>
                                </select>
                            </div>
                            {(formData.signatureType === 'AN' || formData.signatureType === 'UB') && (
                                <div className="col-span-1"><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Pejabat Atas (a.n.)</label><input type="text" value={formData.upperTitle} onChange={(e) => setFormData({...formData, upperTitle: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-black bg-white outline-none focus:border-indigo-500" /></div>
                            )}
                            {formData.signatureType === 'UB' && (
                                <div className="col-span-1"><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Pejabat Tengah (u.b.)</label><input type="text" value={formData.intermediateTitle} onChange={(e) => setFormData({...formData, intermediateTitle: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-black bg-white outline-none focus:border-indigo-500" /></div>
                            )}
                        </div>
                     </div>
                 </form>
                 <div className="p-6 border-t bg-white rounded-b-2xl flex justify-end space-x-3">
                     <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 bg-slate-100 text-slate-700 border rounded-xl font-bold">Batal</button>
                     <button type="button" onClick={handleSave} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold shadow-md hover:bg-indigo-700">Simpan</button>
                 </div>
             </div>
          </div>
      )}

      <ConfirmationModal 
          isOpen={isDeleteModalOpen} 
          onClose={() => setIsDeleteModalOpen(false)} 
          onConfirm={confirmDelete} 
          title="Hapus Surat Tugas" 
          message="Yakin ingin menghapus dokumen ini? Tindakan ini tidak dapat dibatalkan." 
          isDanger={true} 
      />
    </div>
  );
};

export default AssignmentManager;
