
import React, { useState } from 'react';
import { UserCog, LogIn, User as UserIcon } from 'lucide-react';
import { UserRole } from '../types';

interface LoginProps {
  onLogin: (role: UserRole, name: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Username wajib diisi');
      return;
    }

    // Auto-determine role based on username keyword, default to Admin for convenience
    let role: UserRole = 'Admin';
    const lowerName = username.toLowerCase();
    
    if (lowerName.includes('operator')) {
      role = 'Operator';
    } else if (lowerName.includes('verif')) {
      role = 'Verificator';
    }

    onLogin(role, username);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex flex-col justify-center items-center p-6 font-sans">
      <div className="max-w-md w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
        
        <div className="text-center mb-8">
           <div className="inline-flex items-center justify-center p-4 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-200 mb-6">
              <UserCog size={40} className="text-white" />
           </div>
           <h1 className="text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">E-SPPD System</h1>
           <p className="text-slate-500 text-sm">Sistem Informasi Manajemen Perjalanan Dinas</p>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-xl border border-white/50 backdrop-blur-sm">
           <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="space-y-2">
                 <label className="block text-sm font-semibold text-slate-700">Username</label>
                 <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                      type="text" 
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        setError('');
                      }}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none text-slate-900"
                      placeholder="Masukkan nama pengguna..."
                      autoFocus
                    />
                 </div>
              </div>

              {error && (
                <div className="p-3 bg-rose-50 text-rose-600 text-sm rounded-lg font-medium text-center animate-pulse">
                  {error}
                </div>
              )}

              <button 
                type="submit"
                className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 flex items-center justify-center space-x-2 transition-transform active:scale-95"
              >
                 <span>Masuk Aplikasi</span>
                 <LogIn size={20} />
              </button>

           </form>

           <div className="mt-8 pt-6 border-t text-center">
              <p className="text-xs text-slate-400">
                &copy; {new Date().getFullYear()} Pemerintah Kabupaten Demak.<br/>
                Sistem Login Internal Tanpa Password
              </p>
           </div>
        </div>

      </div>
    </div>
  );
};

export default Login;
