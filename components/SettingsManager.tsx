
import React, { useState, useEffect } from 'react';
import { Save, Upload, Building2, MapPin, Phone, Image as ImageIcon, Database, Check, ShieldCheck, Unplug, Globe } from 'lucide-react';
import { AgencySettings } from '../types';

const INITIAL_SETTINGS: AgencySettings = {
  name: 'PEMERINTAH KABUPATEN DEMAK',
  department: 'SEKRETARIAT DAERAH',
  address: 'Jalan Kyai Singkil 7, Demak, Jawa Tengah 59511',
  contactInfo: 'Telepon (0291) 685877, Faksimile (0291) 685625, Laman setda.demakkab.go.id, Pos-el setda@demakkab.go.id',
  logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/Lambang_Kabupaten_Demak.png/486px-Lambang_Kabupaten_Demak.png'
};

const SettingsManager: React.FC = () => {
  // Agency Settings State
  const [settings, setSettings] = useState<AgencySettings>(() => {
    const saved = localStorage.getItem('agency_settings');
    return saved ? JSON.parse(saved) : INITIAL_SETTINGS;
  });

  // DB Config State
  const [dbConfig, setDbConfig] = useState({ url: '', key: '' });
  const [isDbConnected, setIsDbConnected] = useState(false);

  const [previewLogo, setPreviewLogo] = useState<string>(settings.logoUrl);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    // Load DB Config on mount
    const savedDb = localStorage.getItem('supabase_config');
    if (savedDb) {
      setDbConfig(JSON.parse(savedDb));
      setIsDbConnected(true);
    }
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('agency_settings', JSON.stringify(settings));
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleSaveDb = (e: React.FormEvent) => {
    e.preventDefault();
    if (dbConfig.url && dbConfig.key) {
        localStorage.setItem('supabase_config', JSON.stringify(dbConfig));
        setIsDbConnected(true);
    }
  };

  const handleDisconnectDb = () => {
      if(confirm('Apakah Anda yakin ingin memutuskan koneksi? Data akan kembali disimpan secara lokal (offline) di browser.')) {
          localStorage.removeItem('supabase_config');
          setDbConfig({ url: '', key: '' });
          setIsDbConnected(false);
      }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setSettings({ ...settings, logoUrl: base64String });
        setPreviewLogo(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pengaturan Instansi</h1>
          <p className="text-slate-500">Konfigurasi identitas, logo, dan koneksi database.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* DATABASE CONFIG SECTION */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 overflow-hidden relative">
             <div className="absolute top-0 right-0 p-4 opacity-5">
                <Database size={100} />
             </div>
             
             <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-widest border-b pb-2 mb-4 flex items-center">
                <Globe size={16} className="mr-2" /> Sinkronisasi Database (Cloud)
             </h3>

             {!isDbConnected ? (
               <form onSubmit={handleSaveDb} className="space-y-4 relative z-10">
                  <p className="text-sm text-slate-500 mb-4">
                     Hubungkan aplikasi dengan database Supabase untuk sinkronisasi data real-time antar pengguna.
                  </p>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Vite Supabase URL</label>
                    <input 
                        type="text" 
                        required
                        value={dbConfig.url}
                        onChange={(e) => setDbConfig({...dbConfig, url: e.target.value})}
                        placeholder="https://xyzcompany.supabase.co"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Vite Supabase Key (Anon/Public)</label>
                    <input 
                        type="password" 
                        required
                        value={dbConfig.key}
                        onChange={(e) => setDbConfig({...dbConfig, key: e.target.value})}
                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                    />
                  </div>
                  <div className="pt-2">
                     <button 
                        type="submit"
                        className="px-6 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 shadow-lg flex items-center space-x-2 transition-all w-full justify-center"
                     >
                        <Database size={18} />
                        <span>Simpan Koneksi</span>
                     </button>
                  </div>
               </form>
             ) : (
                <div className="flex flex-col items-center justify-center py-6 relative z-10 animate-in zoom-in-95 duration-300">
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4 shadow-sm">
                       <ShieldCheck size={32} />
                    </div>
                    <h4 className="text-xl font-bold text-emerald-700">Koneksi Database Online</h4>
                    <p className="text-emerald-600 text-sm font-medium mb-6">Aplikasi terhubung ke Supabase Cloud</p>
                    
                    <div className="w-full bg-slate-50 rounded-lg p-4 mb-6 border border-slate-200">
                       <div className="flex justify-between items-center text-xs text-slate-500 mb-1">
                          <span className="uppercase font-bold tracking-wider">URL Endpoint</span>
                          <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">Active</span>
                       </div>
                       <p className="font-mono text-slate-700 truncate">{dbConfig.url}</p>
                    </div>

                    <button 
                        onClick={handleDisconnectDb}
                        className="px-6 py-2 bg-white border border-rose-200 text-rose-600 font-bold rounded-xl hover:bg-rose-50 flex items-center space-x-2 transition-all text-sm"
                     >
                        <Unplug size={16} />
                        <span>Putus Koneksi / Reset</span>
                     </button>
                </div>
             )}
          </div>

          {/* AGENCY SETTINGS FORM */}
          <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-6">
            <div className="space-y-4">
               <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-widest border-b pb-2 mb-4">Identitas Kop Surat</h3>
               
               <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Nama Pemerintahan / Instansi Induk</label>
                  <div className="flex items-center bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:bg-white transition-all">
                     <Building2 className="text-slate-400 mr-3" size={18} />
                     <input 
                        type="text" 
                        value={settings.name}
                        onChange={(e) => setSettings({...settings, name: e.target.value})}
                        className="bg-transparent w-full text-sm outline-none text-slate-900 font-medium"
                        placeholder="Contoh: PEMERINTAH KABUPATEN DEMAK"
                     />
                  </div>
               </div>

               <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Nama Unit Kerja / OPD</label>
                  <div className="flex items-center bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:bg-white transition-all">
                     <Building2 className="text-slate-400 mr-3" size={18} />
                     <input 
                        type="text" 
                        value={settings.department}
                        onChange={(e) => setSettings({...settings, department: e.target.value})}
                        className="bg-transparent w-full text-sm outline-none text-slate-900 font-medium"
                        placeholder="Contoh: SEKRETARIAT DAERAH"
                     />
                  </div>
               </div>

               <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Alamat Lengkap</label>
                  <div className="flex items-start bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:bg-white transition-all">
                     <MapPin className="text-slate-400 mr-3 mt-0.5" size={18} />
                     <textarea 
                        value={settings.address}
                        onChange={(e) => setSettings({...settings, address: e.target.value})}
                        className="bg-transparent w-full text-sm outline-none text-slate-900 font-medium resize-none"
                        rows={2}
                        placeholder="Alamat kantor..."
                     />
                  </div>
               </div>

               <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Kontak (Telp/Fax/Email/Web)</label>
                  <div className="flex items-start bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:bg-white transition-all">
                     <Phone className="text-slate-400 mr-3 mt-0.5" size={18} />
                     <textarea 
                        value={settings.contactInfo}
                        onChange={(e) => setSettings({...settings, contactInfo: e.target.value})}
                        className="bg-transparent w-full text-sm outline-none text-slate-900 font-medium resize-none"
                        rows={3}
                        placeholder="Informasi kontak..."
                     />
                  </div>
               </div>
            </div>

            <div className="space-y-4 pt-4">
               <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-widest border-b pb-2 mb-4">Logo Instansi</h3>
               
               <div className="flex items-start space-x-6">
                  <div className="w-32 h-32 bg-slate-100 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden relative">
                     {previewLogo ? (
                        <img src={previewLogo} alt="Logo Preview" className="w-full h-full object-contain p-2" />
                     ) : (
                        <ImageIcon className="text-slate-300" size={32} />
                     )}
                  </div>
                  <div className="flex-1">
                     <label className="block text-sm font-semibold text-slate-700 mb-2">Upload Logo Baru</label>
                     <div className="relative">
                        <input 
                           type="file" 
                           accept="image/*"
                           onChange={handleLogoUpload}
                           className="hidden" 
                           id="logo-upload"
                        />
                        <label 
                           htmlFor="logo-upload"
                           className="inline-flex items-center px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 cursor-pointer"
                        >
                           <Upload size={16} className="mr-2" />
                           Pilih Gambar...
                        </label>
                        <p className="text-xs text-slate-400 mt-2">Format: PNG, JPG (Transparan direkomendasikan). Max 1MB.</p>
                     </div>
                  </div>
               </div>
            </div>

            <div className="pt-6 border-t flex items-center justify-end space-x-4">
               {isSaved && <span className="text-emerald-600 text-sm font-bold animate-pulse">Pengaturan berhasil disimpan!</span>}
               <button 
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 flex items-center space-x-2 transition-all"
               >
                  <Save size={18} />
                  <span>Simpan Perubahan</span>
               </button>
            </div>
          </form>
        </div>

        {/* PREVIEW SECTION */}
        <div>
           <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Preview Kop Surat</h3>
           <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200" style={{ fontFamily: 'Times New Roman, serif' }}>
              <div className="flex items-center border-b-[3px] border-black pb-4 mb-4 relative">
                 <div className="w-20 flex-shrink-0 flex items-center justify-center">
                    <img 
                       src={previewLogo} 
                       alt="Logo" 
                       className="h-20 w-auto object-contain"
                    />
                 </div>
                 <div className="text-center w-full pl-2">
                    <h3 className="text-md font-medium tracking-wide uppercase leading-tight">{settings.name}</h3>
                    <h1 className="text-xl font-bold tracking-wider uppercase leading-tight">{settings.department}</h1>
                    <p className="text-[10px] leading-tight mt-1">{settings.address}</p>
                    <p className="text-[10px] leading-tight">{settings.contactInfo}</p>
                 </div>
              </div>
              <div className="space-y-4 opacity-50 blur-[1px]">
                 <div className="h-4 bg-slate-200 w-1/3 mx-auto rounded"></div>
                 <div className="h-2 bg-slate-200 w-full rounded"></div>
                 <div className="h-2 bg-slate-200 w-full rounded"></div>
                 <div className="h-2 bg-slate-200 w-3/4 rounded"></div>
                 <br/>
                 <div className="h-2 bg-slate-200 w-full rounded"></div>
                 <div className="h-2 bg-slate-200 w-full rounded"></div>
              </div>
           </div>
           <p className="text-xs text-slate-400 mt-4 text-center">Tampilan ini akan digunakan pada semua dokumen cetak (Surat Tugas & SPPD).</p>
        </div>
      </div>
    </div>
  );
};

export default SettingsManager;
