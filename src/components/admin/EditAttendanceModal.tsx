import React, { useState } from 'react';
import { X, Clock, Save, User } from 'lucide-react';
import { Attendance } from '../../types';
import { motion } from 'motion/react';

interface Props {
  record: Attendance;
  onClose: () => void;
  onSave: (updates: Partial<Attendance>) => void;
}

export default function EditAttendanceModal({ record, onClose, onSave }: Props) {
  const [formData, setFormData] = useState({
    inTime: record.inTime || '',
    outTime: record.outTime || '',
    lunchOutTime: record.lunchOutTime || '',
    lunchInTime: record.lunchInTime || '',
    status: record.status || 'present'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Recalculate working minutes if times are present
    let updates: Partial<Attendance> = { ...formData };
    
    if (formData.inTime && formData.outTime) {
      const getMinutes = (timeStr: string) => {
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
      };

      const inMin = getMinutes(formData.inTime);
      const outMin = getMinutes(formData.outTime);
      let total = outMin - inMin;

      if (formData.lunchOutTime && formData.lunchInTime) {
        const lOutMin = getMinutes(formData.lunchOutTime);
        const lInMin = getMinutes(formData.lunchInTime);
        const lunchDuration = lInMin - lOutMin;
        if (lunchDuration > 0) {
          total -= lunchDuration;
        }
      }
      
      updates.totalHours = parseFloat((total / 60).toFixed(2));
      
      // Auto-update status if it completes 9 hours
      if (total >= 540) {
        updates.status = 'present';
      }
    }

    onSave(updates);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Edit Attendance</h3>
              <p className="text-xs text-slate-500">{record.employeeName} - {record.date}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">In Time</label>
              <input 
                type="time" 
                value={formData.inTime}
                onChange={(e) => setFormData({ ...formData, inTime: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Out Time</label>
              <input 
                type="time" 
                value={formData.outTime}
                onChange={(e) => setFormData({ ...formData, outTime: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lunch Break (Admin Authorized)</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tight ml-1">Lunch Out</label>
                <input 
                  type="time" 
                  value={formData.lunchOutTime}
                  onChange={(e) => setFormData({ ...formData, lunchOutTime: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tight ml-1">Lunch In</label>
                <input 
                  type="time" 
                  value={formData.lunchInTime}
                  onChange={(e) => setFormData({ ...formData, lunchInTime: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Overall Status</label>
            <select 
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            >
              <option value="present">Present</option>
              <option value="half-day">Half Day</option>
              <option value="late">Late</option>
              <option value="absent">Absent</option>
            </select>
          </div>

          <div className="pt-4 flex gap-3 sticky bottom-0 bg-white">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-all active:scale-95"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="flex-1 px-6 py-3 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <Save className="w-5 h-5" />
              Save Changes
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
