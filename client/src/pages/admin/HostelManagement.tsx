import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { Building2, Plus, UserMinus, Bed } from 'lucide-react';

const HostelManagement = () => {
  const [rooms, setRooms] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ roomNo: '', capacity: 4 });

  const fetch = async () => {
    setLoading(true);
    try {
      const [r, s] = await Promise.all([
        apiClient.get('/operations/hostel/rooms'),
        apiClient.get('/operations/hostel/stats'),
      ]);
      setRooms(r.data.data);
      setStats(s.data.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await apiClient.post('/operations/hostel/rooms', form); setShowModal(false); fetch(); } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-6">
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Rooms', value: stats.totalRooms, icon: <Building2 className="w-5 h-5 text-indigo-400" /> },
            { label: 'Total Beds', value: stats.totalBeds, icon: <Bed className="w-5 h-5 text-blue-400" /> },
            { label: 'Occupied', value: stats.occupiedBeds, icon: <Bed className="w-5 h-5 text-amber-400" /> },
            { label: 'Available', value: stats.availableBeds, icon: <Bed className="w-5 h-5 text-emerald-400" /> },
          ].map(s => (
            <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
              <div className="p-2.5 bg-slate-800 rounded-lg">{s.icon}</div>
              <div><p className="text-xs text-slate-500 uppercase tracking-wide">{s.label}</p><p className="text-xl font-bold">{s.value}</p></div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <h2 className="text-base font-semibold">Rooms</h2>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-all">
            <Plus className="w-4 h-4" /> Add Room
          </button>
        </div>
        {loading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-slate-700 border-t-indigo-500 rounded-full animate-spin" /></div> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {rooms.map(room => (
              <div key={room.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Room {room.roomNo}</h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${room.bedAllocations?.length >= room.capacity ? 'bg-red-500/15 text-red-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                    {room.bedAllocations?.length || 0}/{room.capacity}
                  </span>
                </div>
                <div className="space-y-2">
                  {room.bedAllocations?.map((b: any) => (
                    <div key={b.id} className="flex items-center justify-between text-sm bg-slate-900 rounded-lg px-3 py-2">
                      <span className="text-slate-300">{b.student?.firstName} {b.student?.lastName}</span>
                    </div>
                  ))}
                  {(!room.bedAllocations || room.bedAllocations.length === 0) && <p className="text-sm text-slate-500">No occupants</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm animate-slide-up">
            <h3 className="text-lg font-bold mb-5">Add Room</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Room Number</label>
                <input required value={form.roomNo} onChange={e => setForm({ ...form, roomNo: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Capacity</label>
                <input type="number" required value={form.capacity} onChange={e => setForm({ ...form, capacity: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white outline-none focus:border-indigo-500" />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HostelManagement;
