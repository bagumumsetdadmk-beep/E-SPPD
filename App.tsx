
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
  ChevronRight,
  LogOut,
  UserCheck,
  Settings
} from 'lucide-react';

import Dashboard from './components/Dashboard';
import EmployeeManager from './components/EmployeeManager';
import SignatoryManager from './components/SignatoryManager';
import CityManager from './components/CityManager';
import TransportManager from './components/TransportManager';
import FundingManager from './components/FundingManager';
import AssignmentManager from './components/AssignmentManager';
import SPPDManager from './components/SPPDManager';
import ReceiptManager from './components/ReceiptManager';
// ReportManager removed
import RecapManager from './components/RecapManager';
import SettingsManager from './components/SettingsManager';
import Login from './components/Login';
import { User, UserRole } from './types';

// Fixed SidebarItem typing by using React.FC which includes standard React attributes like 'key'
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
  const location = useLocation();
  const navigate = useNavigate();

  // Check login status on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (role: UserRole, name: string) => {
    const newUser: User = {
      id: Date.now().toString(),
      name: name,
      role: role
    };
    setUser(newUser);
    localStorage.setItem('currentUser', JSON.stringify(newUser));
    navigate('/');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
    navigate('/');
  };

  const menuItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/pegawai', icon: Users, label: 'Data Pegawai' },
    { to: '/penandatangan', icon: UserCheck, label: 'Pejabat Penandatangan' },
    { to: '/kota', icon: MapPin, label: 'Kota Tujuan' },
    { to: '/transportasi', icon: Bus, label: 'Moda Transportasi' },
    { to: '/dana', icon: Wallet, label: 'Sumber Dana' },
    { to: '/surat-tugas', icon: FileText, label: 'Surat Tugas' },
    { to: '/sppd', icon: ClipboardList, label: 'SPPD' },
    { to: '/kwitansi', icon: ReceiptIcon, label: 'Rincian Biaya' }, // Changed Label
    // Laporan Perjalanan removed
    { to: '/rekap', icon: BarChart3, label: 'Rekap Data' },
    { to: '/pengaturan', icon: Settings, label: 'Pengaturan' },
  ];

  // If not logged in, show Login Screen
  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  // Get Role Badge Color
  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'Admin': return 'bg-indigo-500 text-white';
      case 'Operator': return 'bg-emerald-500 text-white';
      case 'Verificator': return 'bg-amber-500 text-white';
      default: return 'bg-slate-500 text-white';
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      {/* Mobile Sidebar Overlay */}
      {!sidebarOpen && (
        <button 
          onClick={() => setSidebarOpen(true)}
          className="fixed top-4 left-4 z-50 p-2 bg-indigo-600 text-white rounded-md lg:hidden shadow-md"
        >
          <Menu size={20} />
        </button>
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 transition-transform duration-300 transform lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-6">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                <FileText className="text-white" size={20} />
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight">E-SPPD</h1>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400">
              <X size={24} />
            </button>
          </div>

          <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-4 mt-4">Menu Utama</p>
            {menuItems.slice(0, 6).map((item) => (
              <SidebarItem 
                key={item.to} 
                {...item} 
                active={location.pathname === item.to} 
              />
            ))}
            
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-4 mt-6">Administrasi SPPD</p>
            {menuItems.slice(6, 9).map((item) => (
              <SidebarItem 
                key={item.to} 
                {...item} 
                active={location.pathname === item.to} 
              />
            ))}

            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-4 mt-6">Sistem</p>
            {menuItems.slice(9).map((item) => (
              <SidebarItem 
                key={item.to} 
                {...item} 
                active={location.pathname === item.to} 
              />
            ))}
          </nav>

          <div className="p-4 bg-slate-800 m-4 rounded-xl">
            <div className="flex items-center space-x-3 mb-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${getRoleBadgeColor(user.role)}`}>
                {getInitials(user.name)}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                <p className="text-xs text-slate-400">{user.role}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="flex items-center space-x-2 text-rose-400 text-sm font-medium hover:text-rose-300 w-full px-2 py-1.5 rounded transition-colors hover:bg-slate-700/50"
            >
              <LogOut size={16} />
              <span>Keluar Sesi</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'ml-0'}`}>
        <header className="h-16 bg-white border-b flex items-center justify-between px-8 sticky top-0 z-30 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="relative group hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500" size={18} />
              <input 
                type="text" 
                placeholder="Cari data..." 
                className="pl-10 pr-4 py-2 bg-slate-100 rounded-full text-sm border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none w-64 transition-all"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full relative transition-all">
              <Bell size={20} />
              <span className="absolute top-1.5 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="h-8 w-px bg-slate-200"></div>
            <div className="flex items-center space-x-2 cursor-pointer group">
              <div className="text-right">
                <p className="text-sm font-semibold group-hover:text-indigo-600">
                  {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
                <p className="text-xs text-slate-500">Selamat Datang, {user.role}</p>
              </div>
            </div>
          </div>
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

export default function AppWithRouter() {
  return (
    <HashRouter>
      <App />
    </HashRouter>
  );
}
