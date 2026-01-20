
import React, { useState, useEffect } from 'react';
import { Save, Upload, Building2, MapPin, Phone, Image as ImageIcon, Database, Check, ShieldCheck, Unplug, Globe, FileCode, Loader2, AlertCircle, RefreshCw, FileImage } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { AgencySettings } from '../types';

const INITIAL_SETTINGS: AgencySettings = {
  name: 'PEMERINTAH KABUPATEN DEMAK',
  department: 'SEKRETARIAT DAERAH',
  address: 'Jalan Kyai Singkil 7, Demak, Jawa Tengah 59511',
  contactInfo: 'Telepon (0291) 685877, Faksimile (0291) 685625, Laman setda.demakkab.go.id, Pos-el setda@demakkab.go.id',
  logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/Lambang_Kabupaten_Demak.png/486px-Lambang_Kabupaten_Demak.png',
  kopSuratUrl: ''
};

const SettingsManager: React.FC = () => {
  const getInitialDbConfig = () => {
    const env = (import.meta as any).env;
    const envUrl = env?.VITE_SUPABASE_URL;
    const envKey = env?.VITE_SUPABASE_KEY;

    if (envUrl && envKey) {
      return { url: envUrl, key: envKey, source: 'env' };
    }

    const savedDb = localStorage.getItem('supabase_config');
    if (savedDb) {
      try {
        const parsed = JSON.parse(savedDb);
        if (parsed.url && parsed.key) return { ...parsed, source: 'local' };
      } catch (e) {
        console.error("Invalid config in localstorage");
      }
    }

    return { url: '', key: '', source: 'none' };
  };

  const initialConfig = getInitialDbConfig();
  const [dbConfig, setDbConfig] = useState<{url: string, key: string}>(initialConfig);
  const [isDbConnected, setIsDbConnected] = useState<boolean>(!!(initialConfig.url && initialConfig.key));
  const [configSource, setConfigSource] = useState<string>(initialConfig.source);

  const [settings, setSettings] = useState<AgencySettings>(() => {
    const saved = localStorage.getItem('agency_settings');
    return saved ? JSON.parse(saved) : INITIAL_SETTINGS;
  });

  const [previewLogo, setPreviewLogo] = useState<string>(settings.logoUrl);
  const [previewKop, setPreviewKop] = useState<string>(settings.kopSuratUrl || '');
  
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingKop, setIsUploadingKop] = useState(false);
  
  const [isLoadingData, setIsLoadingData] = useState(false);
  
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [showStorageModal, setShowStorageModal] = useState(false);

  useEffect(() => {
    if (dbConfig.url && dbConfig.key) {
      fetchSettingsFromDb(dbConfig);
    }
  }, []); 

  const fetchSettingsFromDb = async (config: { url: string; key: string }) => {
      if (!config.url || !config.key) return;
      
      setIsLoadingData(true);
      try {
          const supabase = createClient(config.url, config.key);
          
          const { data, error } = await supabase
            .from('agency_settings')
            .select('*')
            .limit(1)
            .maybeSingle();

          if (error && error.code !== 'PGRST116') throw error; 

          if (data) {
              const newSettings: AgencySettings = {
                  name: data.name,
                  department: data.department,
                  address: data.address,
                  contactInfo: data.contact_info,
                  logoUrl: data.logo_url || INITIAL_SETTINGS.logoUrl,
                  kopSuratUrl: data.kop_surat_url || ''
              };
              setSettings(newSettings);
              setPreviewLogo(newSettings.logoUrl);
              setPreviewKop(newSettings.kopSuratUrl || '');
              localStorage.setItem('agency_settings', JSON.stringify(newSettings));
          }
      } catch (err: any) {
          console.error("Gagal mengambil data pengaturan:", err.message);
      } finally {
          setIsLoadingData(false);
      }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    localStorage.setItem('agency_settings', JSON.stringify(settings));

    if (isDbConnected && dbConfig.url && dbConfig.key) {
        try {
            const supabase = createClient(dbConfig.url, dbConfig.key);

            const { data: existing } = await supabase
                .from('agency_settings')
                .select('id')
                .limit(1)
                .maybeSingle();

            const payload = {
                name: settings.name,
                department: settings.department,
                address: settings.address,
                contact_info: settings.contactInfo,
                logo_url: settings.logoUrl,
                kop_surat_url: settings.kopSuratUrl, // Save new field
                updated_at: new Date()
            };

            if (existing) {
                const { error } = await supabase.from('agency_settings').update(payload).eq('id', existing.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('agency_settings').insert([payload]);
                if (error) throw error;
            }

        } catch (error: any) {
            alert(`Gagal menyimpan ke Database: ${error.message}`);
            setIsSaving(false);
            return;
        }
    }

    setIsSaving(false);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleSaveDbConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (dbConfig.url && dbConfig.key) {
        try {
            new URL(dbConfig.url);
            localStorage.setItem('supabase_config', JSON.stringify(dbConfig));
            setIsDbConnected(true);
            setConfigSource('local');
            fetchSettingsFromDb(dbConfig);
        } catch (error) {
            alert("Format URL Supabase tidak valid.");
        }
    }
  };

  const handleDisconnectDb = () => {
      if(confirm('Putuskan koneksi? Aplikasi akan kembali ke mode Offline.')) {
          localStorage.removeItem('supabase_config');
          setDbConfig({ url: '', key: '' });
          setIsDbConnected(false);
          setConfigSource('none');
      }
  };

  // Generic function to handle uploads
  const processUpload = async (
      file: File, 
      stateUpdater: (url: string) => void, 
      loadingUpdater: (loading: boolean) => void,
      previewUpdater: (url: string) => void,
      filePrefix: string
  ) => {
    if (!file) return;

    const useLocalFallback = () => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            stateUpdater(base64String);
            previewUpdater(base64String);
        };
        reader.readAsDataURL(file);
    };

    if (file.size > 2 * 1024 * 1024) {
        alert("Ukuran file terlalu besar. Maksimal 2MB.");
        return;
    }

    if (isDbConnected && dbConfig.url && dbConfig.key) {
        loadingUpdater(true);
        try {
            const supabase = createClient(dbConfig.url, dbConfig.key);
            const fileExt = file.name.split('.').pop();
            const fileName = `${filePrefix}-${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('images')
                .upload(filePath, file, { cacheControl: '3600', upsert: true });

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('images').getPublicUrl(filePath);

            if (data.publicUrl) {
                stateUpdater(data.publicUrl);
                previewUpdater(data.publicUrl);
            }
        } catch (error: any) {
            console.error("Upload Error:", error);
            alert(`Gagal upload ke Cloud: ${error.message}. Menggunakan mode offline.`);
            useLocalFallback();
        } finally {
            loadingUpdater(false);
        }
    } else {
        useLocalFallback();
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if(file) {
          processUpload(
              file, 
              (url) => setSettings(prev => ({ ...prev, logoUrl: url })),
              setIsUploadingLogo,
              setPreviewLogo,
              'logo'
          );
      }
  };

  const handleKopUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if(file) {
          processUpload(
              file, 
              (url) => setSettings(prev => ({ ...prev, kopSuratUrl: url })),
              setIsUploadingKop,
              setPreviewKop,
              'kop'
          );
      }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pengaturan Instansi</h1>
          <p className="text-slate-500">Konfigurasi identitas, logo, kop surat, dan koneksi database.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 overflow-hidden relative">
             <div className="absolute top-0 right-0 p-4 opacity-5">
                <Database size={100} />
             </div>
             
             <div className="flex justify-between items-center border-b pb-2 mb-4">
                 <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-widest flex items-center">
                    <Globe size={16} className="mr-2" /> Sinkronisasi Database (Cloud)
                 </h3>
                 <div className="flex space-x-2 relative z-20">
                     <button onClick={() => setShowStorageModal(true)} className="text-[10px] font-bold px-2 py-1 bg-amber-50 text-amber-600 rounded border border-amber-100 hover:bg-amber-100 flex items-center">
                        <Upload size={10} className="mr-1" /> Fix Storage
                     </button>
                     <button onClick={() => setShowSqlModal(true)} className="text-[10px] font-bold px-2 py-1 bg-slate-100 text-slate-600 rounded border border-slate-200 hover:bg-slate-200 flex items-center">
                        <FileCode size={10} className="mr-1" /> SQL Schema
                     </button>
                 </div>
             </div>

             {!isDbConnected ? (
               <form onSubmit={handleSaveDbConfig} className="space-y-4 relative z-10">
                  <p className="text-sm text-slate-500 mb-4">
                     Hubungkan aplikasi dengan database Supabase untuk sinkronisasi data real-time.
                  </p>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Vite Supabase URL</label>
                    <input 
                        type="text" required
                        value={dbConfig.url}
                        onChange={(e) => setDbConfig({...dbConfig, url: e.target.value})}
                        placeholder="https://xyzcompany.supabase.co"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Vite Supabase Key</label>
                    <input 
                        type="password" required
                        value={dbConfig.key}
                        onChange={(e) => setDbConfig({...dbConfig, key: e.target.value})}
                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                    />
                  </div>
                  <div className="pt-2">
                     <button type="submit" className="px-6 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 shadow-lg flex items-center space-x-2 transition-all w-full justify-center">
                        <Database size={18} /><span>Simpan Koneksi</span>
                     </button>
                  </div>
               </form>
             ) : (
                <div className="flex flex-col items-center justify-center py-6 relative z-10 animate-in zoom-in-95 duration-300">
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4 shadow-sm">
                       <ShieldCheck size={32} />
                    </div>
                    <h4 className="text-xl font-bold text-emerald-700">Koneksi Database Online</h4>
                    <p className="text-emerald-600 text-sm font-medium mb-6">
                        {configSource === 'env' ? 'Terhubung via Environment Variables (Auto)' : 'Terhubung via Konfigurasi Manual'}
                    </p>
                    
                    <div className="w-full bg-slate-50 rounded-lg p-4 mb-6 border border-slate-200">
                       <div className="flex justify-between items-center text-xs text-slate-500 mb-1">
                          <span className="uppercase font-bold tracking-wider">URL Endpoint</span>
                          <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">Active</span>
                       </div>
                       <p className="font-mono text-slate-700 truncate">{dbConfig.url}</p>
                    </div>

                    <div className="flex space-x-3">
                        <button 
                            onClick={() => fetchSettingsFromDb(dbConfig)}
                            disabled={isLoadingData}
                            className="px-4 py-2 bg-indigo-50 text-indigo-600 font-bold rounded-xl hover:bg-indigo-100 flex items-center space-x-2 transition-all text-sm"
                        >
                            <RefreshCw size={16} className={isLoadingData ? "animate-spin" : ""} />
                            <span>Sync Data</span>
                        </button>
                        {configSource !== 'env' && (
                            <button onClick={handleDisconnectDb} className="px-4 py-2 bg-white border border-rose-200 text-rose-600 font-bold rounded-xl hover:bg-rose-50 flex items-center space-x-2 transition-all text-sm">
                                <Unplug size={16} /><span>Putus Koneksi</span>
                            </button>
                        )}
                    </div>
                </div>
             )}
          </div>

          <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-6 relative">
            {isLoadingData && (
                <div className="absolute inset-0 bg-white/80 z-20 flex items-center justify-center backdrop-blur-sm rounded-2xl">
                    <div className="flex flex-col items-center">
                        <Loader2 className="animate-spin text-indigo-600 mb-2" size={32} />
                        <span className="text-sm font-semibold text-slate-600">Sinkronisasi data Cloud...</span>
                    </div>
                </div>
            )}
            
            <div className="space-y-4">
               <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-widest border-b pb-2 mb-4">Identitas Instansi</h3>
               <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Nama Pemerintahan / Instansi Induk</label>
                  <div className="flex items-center bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:bg-white transition-all">
                     <Building2 className="text-slate-400 mr-3" size={18} />
                     <input type="text" value={settings.name} onChange={(e) => setSettings({...settings, name: e.target.value})} className="bg-transparent w-full text-sm outline-none text-slate-900 font-medium" placeholder="Contoh: PEMERINTAH KABUPATEN DEMAK" />
                  </div>
               </div>
               <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Nama Unit Kerja / OPD</label>
                  <div className="flex items-center bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:bg-white transition-all">
                     <Building2 className="text-slate-400 mr-3" size={18} />
                     <input type="text" value={settings.department} onChange={(e) => setSettings({...settings, department: e.target.value})} className="bg-transparent w-full text-sm outline-none text-slate-900 font-medium" placeholder="Contoh: SEKRETARIAT DAERAH" />
                  </div>
               </div>
               <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Alamat Lengkap</label>
                  <div className="flex items-start bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:bg-white transition-all">
                     <MapPin className="text-slate-400 mr-3 mt-0.5" size={18} />
                     <textarea value={settings.address} onChange={(e) => setSettings({...settings, address: e.target.value})} className="bg-transparent w-full text-sm outline-none text-slate-900 font-medium resize-none" rows={2} placeholder="Alamat kantor..." />
                  </div>
               </div>
               <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Kontak (Telp/Fax/Email/Web)</label>
                  <div className="flex items-start bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:bg-white transition-all">
                     <Phone className="text-slate-400 mr-3 mt-0.5" size={18} />
                     <textarea value={settings.contactInfo} onChange={(e) => setSettings({...settings, contactInfo: e.target.value})} className="bg-transparent w-full text-sm outline-none text-slate-900 font-medium resize-none" rows={3} placeholder="Informasi kontak..." />
                  </div>
               </div>
            </div>

            {/* LOGO UPLOAD SECTION */}
            <div className="space-y-4 pt-4 border-t">
               <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-widest mb-4 flex items-center">
                   <ImageIcon size={16} className="mr-2"/> Logo Aplikasi
               </h3>
               <div className="flex items-start space-x-6">
                  <div className="w-24 h-24 bg-slate-100 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden relative flex-shrink-0">
                     {isUploadingLogo ? (
                        <div className="flex flex-col items-center justify-center text-indigo-600">
                            <Loader2 size={24} className="animate-spin mb-1" />
                        </div>
                     ) : (
                        previewLogo ? <img src={previewLogo} alt="Logo" className="w-full h-full object-contain p-2" /> : <ImageIcon className="text-slate-300" size={24} />
                     )}
                  </div>
                  <div className="flex-1">
                     <label className="block text-sm font-semibold text-slate-700 mb-2">Upload Logo (Square/Persegi)</label>
                     <p className="text-xs text-slate-500 mb-2">Digunakan untuk tampilan Login dan Sidebar Menu.</p>
                     <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" id="logo-upload" disabled={isUploadingLogo} />
                     <label htmlFor="logo-upload" className={`inline-flex items-center px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 cursor-pointer ${isUploadingLogo ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <Upload size={16} className="mr-2" /> {isUploadingLogo ? 'Uploading...' : 'Pilih Logo...'}
                     </label>
                  </div>
               </div>
            </div>

            {/* KOP SURAT UPLOAD SECTION */}
            <div className="space-y-4 pt-4 border-t">
               <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-widest mb-4 flex items-center">
                   <FileImage size={16} className="mr-2"/> Kop Surat (Full Image)
               </h3>
               <div className="flex flex-col space-y-4">
                  <div className="w-full h-32 bg-slate-100 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden relative">
                     {isUploadingKop ? (
                        <div className="flex flex-col items-center justify-center text-indigo-600">
                            <Loader2 size={24} className="animate-spin mb-2" />
                            <span className="text-xs">Uploading Header...</span>
                        </div>
                     ) : (
                        previewKop ? <img src={previewKop} alt="Kop Surat" className="w-full h-full object-contain p-2" /> : <span className="text-slate-400 text-xs">Preview Kop Surat</span>
                     )}
                  </div>
                  <div>
                     <label className="block text-sm font-semibold text-slate-700 mb-2">Upload Kop Surat Lengkap</label>
                     <p className="text-xs text-slate-500 mb-2">Upload gambar Kop Surat lengkap (Logo + Nama Instansi + Alamat + Garis). Digunakan untuk <b>Cetak Surat Tugas & SPPD</b>.</p>
                     <input type="file" accept="image/*" onChange={handleKopUpload} className="hidden" id="kop-upload" disabled={isUploadingKop} />
                     <label htmlFor="kop-upload" className={`inline-flex items-center px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 cursor-pointer ${isUploadingKop ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <Upload size={16} className="mr-2" /> {isUploadingKop ? 'Uploading...' : 'Pilih Gambar Kop Surat...'}
                     </label>
                  </div>
               </div>
            </div>

            <div className="pt-6 border-t flex items-center justify-end space-x-4">
               {isSaved && <span className="text-emerald-600 text-sm font-bold animate-pulse">Pengaturan berhasil disimpan!</span>}
               <button type="submit" disabled={isSaving} className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 flex items-center space-x-2 transition-all disabled:opacity-70 disabled:cursor-wait">
                  {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  <span>{isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
               </button>
            </div>
          </form>
        </div>

        <div>
           <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Preview</h3>
           <div className="space-y-6">
                {/* Preview Kop Surat (Priority for printing) */}
                <div className="bg-white p-4 rounded-2xl shadow-lg border border-slate-200">
                    <p className="text-xs font-bold text-slate-400 mb-2">Tampilan Cetak (Kop Surat)</p>
                    <div className="border bg-white p-2" style={{ minHeight: '80px' }}>
                        {previewKop ? (
                            <img src={previewKop} alt="Preview Kop" className="w-full h-auto object-contain" />
                        ) : (
                            <div className="h-20 flex items-center justify-center text-slate-300 text-xs italic">Belum ada gambar kop surat</div>
                        )}
                    </div>
                </div>

                {/* Preview Logo (UI) */}
                <div className="bg-white p-4 rounded-2xl shadow-lg border border-slate-200">
                    <p className="text-xs font-bold text-slate-400 mb-2">Tampilan UI (Logo)</p>
                    <div className="flex items-center space-x-3 p-3 bg-slate-900 rounded-lg">
                        <div className="w-10 h-10 bg-white rounded flex items-center justify-center overflow-hidden">
                            {previewLogo ? <img src={previewLogo} className="w-full h-full object-contain" /> : <div className="w-full h-full bg-indigo-500"/>}
                        </div>
                        <span className="text-white font-bold">E-SPPD</span>
                    </div>
                </div>
           </div>
        </div>
      </div>

      {showSqlModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
                  <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                      <h3 className="font-bold text-slate-800">Setup Database Schema (SQL)</h3>
                      <button onClick={() => setShowSqlModal(false)}><Unplug size={20} className="text-slate-400 hover:text-slate-600"/></button>
                  </div>
                  <div className="p-6 bg-slate-900 text-slate-300 font-mono text-xs overflow-auto max-h-[60vh]">
<pre>{`-- Update Struktur Table agency_settings
CREATE TABLE IF NOT EXISTS public.agency_settings (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL,
    department TEXT NOT NULL,
    address TEXT,
    contact_info TEXT,
    logo_url TEXT,
    kop_surat_url TEXT, -- Kolom Baru untuk Kop Surat
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Pastikan kolom ada jika tabel sudah ada
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agency_settings' AND column_name='kop_surat_url') THEN
        ALTER TABLE public.agency_settings ADD COLUMN kop_surat_url TEXT;
    END IF;
END $$;
`}</pre>
                  </div>
                  <div className="p-4 border-t text-right">
                      <button onClick={() => setShowSqlModal(false)} className="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-300">Tutup</button>
                  </div>
              </div>
          </div>
      )}

      {showStorageModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
                  <div className="p-4 border-b bg-amber-50 flex justify-between items-center">
                      <h3 className="font-bold text-amber-800 flex items-center"><AlertCircle size={20} className="mr-2"/> Setup Storage Policy (Wajib)</h3>
                      <button onClick={() => setShowStorageModal(false)}><Unplug size={20} className="text-slate-400 hover:text-slate-600"/></button>
                  </div>
                  <div className="p-6 space-y-4">
                      <p className="text-sm text-slate-600">
                          Jalankan perintah SQL berikut di SQL Editor Supabase Anda untuk membuat Bucket dan mengizinkan akses upload/download.
                      </p>

                      <div className="bg-slate-900 p-4 rounded-lg text-slate-300 font-mono text-xs overflow-auto">
<pre>{`-- Salin semua kode di bawah ini ke SQL Editor Supabase Anda:
INSERT INTO storage.buckets (id, name, public) VALUES ('images', 'images', true) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "Allow Public Upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow Public Select" ON storage.objects;
CREATE POLICY "Allow Public Upload" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'images' );
CREATE POLICY "Allow Public Select" ON storage.objects FOR SELECT USING ( bucket_id = 'images' );`}</pre>
                      </div>
                  </div>
                  <div className="p-4 border-t text-right">
                      <button onClick={() => setShowStorageModal(false)} className="px-4 py-2 bg-amber-100 text-amber-700 font-bold rounded-lg hover:bg-amber-200">Mengerti, Tutup</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default SettingsManager;
