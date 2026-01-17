
import React, { useState, useEffect } from 'react';
import { Plus, Search, Map, Trash2, Edit2, X, Wallet } from 'lucide-react';
import { City } from '../types';

const INITIAL_CITIES: City[] = [
  { id: '1', name: 'Jakarta', province: 'DKI Jakarta', dailyAllowance: 530000 },
  { id: '2', name: 'Surabaya', province: 'Jawa Timur', dailyAllowance: 410000 },
  { id: '3', name: 'Bandung', province: 'Jawa Barat', dailyAllowance: 430000 },
  { id: '4', name: 'Medan', province: 'Sumatera Utara', dailyAllowance: 370000 },
  { id: '5', name: 'Makassar', province: 'Sulawesi Selatan', dailyAllowance: 430000 },
];

const CityManager: React.FC = () => {
  const [cities, setCities] = useState<City[]>(() => {
    const saved = localStorage.getItem('cities');
    return saved ? JSON.parse(saved) : INITIAL_CITIES;
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCity, setEditingCity] = useState<City | null>(null);
  const [formData, setFormData] = useState({ name: '', province: '', dailyAllowance: 0 });

  useEffect(() => {
    localStorage.setItem('cities', JSON.stringify(cities));
  }, [cities]);

  const handleOpenModal = (city?: City) => {
    if (city) {
      setEditingCity(city);
      setFormData({ name: city.name, province: city.province, dailyAllowance: city.dailyAllowance });
    } else {
      setEditingCity(null);
      setFormData({ name: '', province: '', dailyAllowance: 0 });
    }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCity) {
      setCities(cities.map(c => c.id === editingCity.id ? { ...formData, id: c.id } : c));
    } else {
      setCities([...cities, { ...formData, id: Date.now().toString() }]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus kota tujuan ini?')) {
      setCities(cities.filter(c => c.id !== id));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kota Tujuan</h1>
          <p className="text-slate-500">Daftar kota tujuan resmi beserta besaran uang harian.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
        >
          <Plus size={18} />
          <span className="font-medium text-sm">Tambah Kota</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cities.map((city) => (
          <div key={city.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 group hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <Map size={24} />
              </div>
              <div className="flex space-x-1">
                <button 
                  onClick={() => handleOpenModal(city)}
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => handleDelete(city.id)}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">{city.name}</h3>
              <p className="text-slate-500 text-sm mt-1">{city.province}</p>
            </div>
            <div className="mt-6 pt-4 border-t flex items-center justify-between text-indigo-600">
              <div className="flex items-center space-x-2">
                <Wallet size={16} className="text-slate-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Uang Harian</span>
              </div>
              <span className="font-bold text-lg">Rp {city.dailyAllowance.toLocaleString('id-ID')}</span>
            </div>
          </div>
        ))}
        {cities.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200">
            <Map className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-slate-500 font-medium">Belum ada data kota tujuan.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900">{editingCity ? 'Edit' : 'Tambah'} Kota Tujuan</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Nama Kota</label>
                <input 
                  type="text" 
                  required 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Contoh: Jakarta"
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Provinsi</label>
                <input 
                  type="text" 
                  required 
                  value={formData.province}
                  onChange={(e) => setFormData({...formData, province: e.target.value})}
                  placeholder="Contoh: DKI Jakarta"
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Uang Harian (Rp)</label>
                <input 
                  type="number" 
                  required 
                  value={formData.dailyAllowance}
                  onChange={(e) => setFormData({...formData, dailyAllowance: Number(e.target.value)})}
                  placeholder="0"
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-black text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                />
              </div>
              <div className="pt-4 flex space-x-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CityManager;
