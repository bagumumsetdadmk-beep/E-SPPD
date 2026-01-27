
export enum TravelStatus {
  DRAFT = 'Draft',
  PENDING = 'Pending Approval',
  APPROVED = 'Approved',
  COMPLETED = 'Completed',
  CANCELLED = 'Cancelled'
}

export type UserRole = 'Admin' | 'Operator' | 'Verificator';

export interface User {
  id: string;
  name: string; // Now acts as Username
  role: UserRole;
  avatar?: string;
}

export interface AgencySettings {
  name: string;        // e.g., PEMERINTAH KABUPATEN DEMAK
  department: string;  // e.g., SEKRETARIAT DAERAH
  address: string;     // e.g., Jalan Kyai Singkil 7...
  contactInfo: string; // e.g., Telp: (0291) ...
  logoUrl?: string;    // Updated to optional: Used for App UI (Sidebar, Login)
  kopSuratUrl?: string; // Used for Printed Documents (Full Image)
}

export interface Employee {
  id: string;
  nip: string;
  name: string;
  position: string;
  rank?: string; // New Field: Pangkat (e.g., Penata)
  grade: string; // Golongan (e.g., III/c)
}

export interface Signatory {
  id: string;
  employeeId: string;
  role: string; // e.g., "Kepala Kantor", "PPK", "Atasan Langsung"
  isActive: boolean;
}

export interface City {
  id: string;
  name: string;
  province: string;
  dailyAllowance: number;
}

export interface TransportMode {
  id: string;
  type: string;
  description: string;
}

export interface FundingSource {
  id: string;
  code: string;
  name: string;
  budgetYear: string;
  amount: number;
}

export interface AssignmentLetter {
  id: string;
  number: string;
  date: string;
  basis: string;
  employeeIds: string[];
  subject: string;
  destinationId: string;
  destinationAddress?: string; // New field for specific address location
  startDate: string;
  endDate: string;
  duration: number;
  signatoryId: string;
  status: string;
  // New fields for Signature customization
  signatureType?: 'Direct' | 'AN' | 'UB'; // Langsung, a.n., u.b.
  upperTitle?: string; // e.g., "Sekretaris Daerah" (Used for AN/UB)
  intermediateTitle?: string; // e.g., "Asisten Administrasi Umum" (Used for UB)
}

export interface SPPD {
  id: string;
  assignmentId: string;
  startDate: string;
  endDate: string;
  status: 'Sedang Berjalan' | 'Selesai';
  transportId?: string; // Added for Print
  fundingId?: string;   // Added for Print
}

export interface CostItem {
  amount: number;
  description?: string;
  visible: boolean;
}

export interface Receipt {
  id: string;
  sppdId: string;
  date: string; // Tanggal Kwitansi
  
  // Cost Components
  dailyAllowance: {
    days: number;
    amountPerDay: number;
    total: number;
    visible: boolean;
  };
  transport: CostItem;
  accommodation: CostItem;
  fuel: CostItem; // Added: Biaya BBM
  toll: CostItem; // Added: Biaya Tol
  representation: CostItem;
  other: CostItem;
  
  totalAmount: number;
  status: 'Draft' | 'Verified' | 'Paid';
  treasurerId?: string; // Bendahara Pengeluaran
  pptkId?: string;      // Pejabat Pelaksana Teknis Kegiatan
  kpaId?: string;       // Kuasa Pengguna Anggaran
  
  // New: Proof Images
  attachments?: string[]; // Array of Base64 strings or URLs
}

export interface TravelReport {
  id: string;
  sppdId: string;
  summary: string;
  results: string;
  submissionDate: string;
}
