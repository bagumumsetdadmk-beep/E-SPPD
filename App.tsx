
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  MapPin, 
  Bus, 
  Wallet, 
  FileText, 
  ClipboardList, 
  Receipt as ReceiptIcon, 
  BarChart3, 
  Menu, 
  X,
  Bell,
  Search,
  LogOut,
  UserCheck,
  Settings
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

import Dashboard from './components/Dashboard';
import EmployeeManager from './components/EmployeeManager';
import SignatoryManager from './components/SignatoryManager';
import CityManager from './components/CityManager';
import TransportManager from './components/TransportManager';
import FundingManager from './components/FundingManager';
import AssignmentManager from './components/AssignmentManager';
import SPPDManager from './components/SPPDManager';
import ReceiptManager from './components/ReceiptManager';
import RecapManager from './components/RecapManager';
import SettingsManager from './components/SettingsManager';
import Login from './components/Login';
import { User, UserRole, AgencySettings } from './types';

const SidebarItem: React.FC<{ to: string, icon: any, label: string, active: boolean }> = ({ to, icon: Icon, label, active }) => (
  <Link 
    to={to} 
    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
      active ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }`}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </Link>
);

const App: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [agencyLogo, setAgencyLogo] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Failed to parse saved user from localStorage:", e);
        localStorage.removeItem('currentUser'); // Clear invalid data
      }
    }
    
    const savedSettings = localStorage.getItem('agency_settings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        if (parsedSettings && parsedSettings.logoUrl) { // Safely access logoUrl
          setAgencyLogo(parsedSettings.logoUrl);
        }
      } catch (e) {
        console.error("Failed to parse agency settings from localStorage:", e);
        localStorage.removeItem('agency_settings'); // Clear invalid data
      }
    }
  }, []);

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
    navigate('/');
  };

  const menuItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['Admin', 'Operator', 'Verificator'] },
    { to: '/pegawai', icon: Users, label: 'Data Pegawai', roles: ['Admin'] },
    { to: '/penandatangan', icon: UserCheck, label: 'Pejabat Penandatangan', roles: ['Admin'] },
    { to: '/kota', icon: MapPin, label: 'Kota Tujuan', roles: ['Admin'] },
    { to: '/transportasi', icon: Bus, label: 'Moda Transportasi', roles: ['Admin'] },
    { to: '/dana', icon: Wallet, label: 'Sumber Dana', roles: ['Admin'] },
    { to: '/surat-tugas', icon: FileText, label: 'Surat Tugas', roles: ['Admin', 'Operator', 'Verificator'] },
    { to: '/sppd', icon: ClipboardList, label: 'SPPD', roles: ['Admin', 'Operator', 'Verificator'] },
    { to: '/kwitansi', icon: ReceiptIcon, label: 'Rincian Biaya', roles: ['Admin', 'Operator', 'Verificator'] },
    { to: '/rekap', icon: BarChart3, label: 'Rekap Data', roles: ['Admin', 'Operator', 'Verificator'] },
    { to: '/pengaturan', icon: Settings, label: 'Pengaturan', roles: ['Admin'] },
  ];

  if (!user) return <Login onLogin={(role, name) => { const u = { id: '1', name, role }; setUser(u); localStorage.setItem('currentUser', JSON.stringify(u)); }} />;

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-black transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="p-6 flex items-center justify-between">
            <h1 className="text-xl font-bold text-white tracking-tight">E-SPPD</h1>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-white"><X size={24} /></button>
          </div>
          <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
            {menuItems.filter(i => i.roles.includes(user.role)).map(item => <SidebarItem key={item.to} {...item} active={location.pathname === item.to} />)}
          </nav>
          <div className="p-4 bg-slate-900 m-4 rounded-xl">
            <p className="text-sm font-bold text-white mb-1 truncate">{user.name}</p>
            <p className="text-xs text-slate-400 mb-3">{user.role}</p>
            <button onClick={handleLogout} className="text-rose-400 text-sm flex items-center space-x-2"><LogOut size={16} /><span>Keluar</span></button>
          </div>
        </div>
      </aside>
      <main className={`flex-1 overflow-auto transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'ml-0'}`}>
        <header className="h-16 bg-white border-b flex items-center justify-between px-8 sticky top-0 z-30 shadow-sm print:hidden">
            <button onClick={() => setSidebarOpen(true)} className={`${sidebarOpen ? 'hidden' : 'block'} p-2`}><Menu size={20}/></button>
            <div className="flex items-center space-x-4"><p className="text-sm font-bold text-slate-700">{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p></div>
        </header>
        <div className="p-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/pegawai" element={<EmployeeManager />} />
            <Route path="/penandatangan" element={<SignatoryManager />} />
            <Route path="/kota" element={<CityManager />} />
            <Route path="/transportasi" element={<TransportManager />} />
            <Route path="/dana" element={<FundingManager />} />
            <Route path="/surat-tugas" element={<AssignmentManager />} />
            <Route path="/sppd" element={<SPPDManager />} />
            <Route path="/kwitansi" element={<ReceiptManager />} />
            <Route path="/rekap" element={<RecapManager />} />
            <Route path="/pengaturan" element={<SettingsManager />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default function AppWithRouter() { return <HashRouter><App /></HashRouter>; }
