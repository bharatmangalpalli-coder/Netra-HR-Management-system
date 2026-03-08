import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Search, 
  MapPin, 
  Clock, 
  User,
  Filter,
  Download,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X
} from 'lucide-react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Attendance } from '../../types';
import { getTodayDate } from '../../lib/utils';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';

export default function AttendanceManagement() {
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [searchTerm, setSearchTerm] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    fetchAttendance();
  }, [selectedDate]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'attendance'), 
        where('date', '==', selectedDate),
        orderBy('inTime', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const list = querySnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Attendance));
      setAttendance(list);
    } catch (error) {
      console.error("Error fetching attendance:", error);
      // Fallback for demo if no data exists
      setAttendance([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredAttendance = attendance.filter(item => 
    item.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExport = () => {
    if (attendance.length === 0) {
      return toast.error("No data to export");
    }
    
    const headers = ['Employee Name', 'Employee ID', 'Date', 'In Time', 'Break In', 'Break Out', 'Out Time', 'Status'];
    const csvContent = [
      headers.join(','),
      ...attendance.map(item => [
        item.employeeName,
        item.employeeId,
        item.date,
        item.inTime || '',
        item.breakInTime || '',
        item.breakOutTime || '',
        item.outTime || '',
        item.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_${selectedDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Report exported successfully");
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none w-full"
            />
          </div>
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search employee..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>
        <button 
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-xl border border-slate-200 hover:bg-slate-100 transition-all font-medium w-full md:w-auto justify-center"
        >
          <Download className="w-4 h-4" />
          Export Report
        </button>
      </div>

      {/* Attendance Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">Employee</th>
                <th className="px-6 py-4 font-semibold">In Time</th>
                <th className="px-6 py-4 font-semibold">Break</th>
                <th className="px-6 py-4 font-semibold">Out Time</th>
                <th className="px-6 py-4 font-semibold">Location</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Selfie</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">Loading attendance...</td>
                </tr>
              ) : filteredAttendance.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">No attendance records for this date</td>
                </tr>
              ) : (
                filteredAttendance.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-xs">
                          {item.employeeName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{item.employeeName}</p>
                          <p className="text-xs text-slate-500">{item.employeeId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Clock className="w-4 h-4 text-emerald-500" />
                        {item.inTime || '--:--'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 text-[10px] text-slate-500">
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-indigo-600">IN:</span> {item.breakInTime || '--:--'}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-purple-600">OUT:</span> {item.breakOutTime || '--:--'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Clock className="w-4 h-4 text-amber-500" />
                        {item.outTime || '--:--'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {item.location ? (
                        <button 
                          onClick={() => window.open(`https://www.google.com/maps?q=${item.location?.lat},${item.location?.lng}`, '_blank')}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                        >
                          <MapPin className="w-3 h-3" />
                          View Map
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">No GPS</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${
                        item.status === 'present' ? 'bg-emerald-50 text-emerald-600' :
                        item.status === 'late' ? 'bg-amber-50 text-amber-600' :
                        'bg-red-50 text-red-600'
                      }`}>
                        {item.status === 'present' ? <CheckCircle2 className="w-3 h-3" /> :
                         item.status === 'late' ? <AlertCircle className="w-3 h-3" /> :
                         <XCircle className="w-3 h-3" />}
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {item.selfieUrl ? (
                        <button 
                          onClick={() => setPreviewImage(item.selfieUrl!)}
                          className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden border border-slate-200 hover:ring-2 hover:ring-blue-500 transition-all"
                        >
                          <img src={item.selfieUrl} alt="Selfie" className="w-full h-full object-cover" />
                        </button>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center">
                          <User className="w-4 h-4 text-slate-300" />
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selfie Preview Modal */}
      <AnimatePresence>
        {previewImage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-lg w-full bg-white rounded-3xl overflow-hidden shadow-2xl"
            >
              <button 
                onClick={() => setPreviewImage(null)}
                className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md transition-all z-10"
              >
                <X className="w-5 h-5" />
              </button>
              <img src={previewImage} alt="Selfie Preview" className="w-full h-auto scale-x-[-1]" />
              <div className="p-6 bg-white">
                <h3 className="text-lg font-bold text-slate-800">Attendance Selfie</h3>
                <p className="text-sm text-slate-500">Captured during check-in for verification.</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
