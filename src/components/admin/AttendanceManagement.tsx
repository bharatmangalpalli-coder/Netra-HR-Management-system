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
  X,
  Trash2
} from 'lucide-react';
import { collection, getDocs, query, where, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Attendance } from '../../types';
import { getTodayDate } from '../../lib/utils';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import EmployeeAttendanceCalendar from './EmployeeAttendanceCalendar';

export default function AttendanceManagement() {
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [searchTerm, setSearchTerm] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedEmployeeForCalendar, setSelectedEmployeeForCalendar] = useState<{id: string, name: string} | null>(null);

  useEffect(() => {
    fetchAttendance();
  }, [selectedDate]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'attendance'), 
        where('date', '==', selectedDate)
      );
      const querySnapshot = await getDocs(q);
      const list = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...(doc.data() as any) } as Attendance))
        .sort((a, b) => (b.inTime || '').localeCompare(a.inTime || ''));
      setAttendance(list);
    } catch (error) {
      console.error("Error fetching attendance:", error);
      // Fallback for demo if no data exists
      setAttendance([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    
    const recordToDelete = attendance.find(a => a.id === deletingId);
    if (recordToDelete) {
      const recordDate = new Date(recordToDelete.date);
      const now = new Date();
      
      // Calculate difference in days
      const diffTime = now.getTime() - recordDate.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      
      // Protection for at least 30 days
      if (diffDays <= 30) {
        toast.error('Attendance records less than 30 days old are protected and cannot be deleted.');
        setIsDeleteModalOpen(false);
        setDeletingId(null);
        return;
      }
    }

    setLoading(true);
    try {
      await deleteDoc(doc(db, 'attendance', deletingId));
      toast.success('Attendance record deleted');
      setIsDeleteModalOpen(false);
      setDeletingId(null);
      fetchAttendance();
    } catch (error) {
      toast.error('Failed to delete record');
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (id: string) => {
    setDeletingId(id);
    setIsDeleteModalOpen(true);
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
      <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
        <p className="text-[11px] lg:text-sm text-blue-700 leading-relaxed">
          <strong>Data Protection Policy:</strong> Attendance records less than 30 days old are protected and cannot be deleted to ensure payroll integrity and compliance.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          <div className="relative w-full sm:w-48">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none w-full text-sm"
            />
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search employee..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            />
          </div>
        </div>
        <button 
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-xl border border-slate-200 hover:bg-slate-100 transition-all font-bold text-sm w-full lg:w-auto justify-center active:scale-95"
        >
          <Download className="w-4 h-4" />
          Export Report
        </button>
      </div>

      {/* Attendance List/Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">Employee</th>
                <th className="px-6 py-4 font-semibold">In Time</th>
                <th className="px-6 py-4 font-semibold">Break</th>
                <th className="px-6 py-4 font-semibold">Out Time</th>
                <th className="px-6 py-4 font-semibold">Location</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Selfies</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">Loading attendance...</td>
                </tr>
              ) : filteredAttendance.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">No attendance records for this date</td>
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
                      <div className="grid grid-cols-2 gap-2 w-fit">
                        {/* Clock In Selfie */}
                        <div className="flex flex-col items-center gap-1">
                          {item.selfieUrl ? (
                            <button 
                              onClick={() => setPreviewImage(item.selfieUrl!)}
                              className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden border border-slate-200 hover:ring-2 hover:ring-blue-500 transition-all"
                              title="Clock In Selfie"
                            >
                              <img src={item.selfieUrl} alt="In" className="w-full h-full object-cover" />
                            </button>
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center">
                              <User className="w-4 h-4 text-slate-300" />
                            </div>
                          )}
                          <span className="text-[7px] font-bold text-slate-400 uppercase">In</span>
                        </div>

                        {/* Break In Selfie */}
                        <div className="flex flex-col items-center gap-1">
                          {item.breakInSelfieUrl ? (
                            <button 
                              onClick={() => setPreviewImage(item.breakInSelfieUrl!)}
                              className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden border border-slate-200 hover:ring-2 hover:ring-blue-500 transition-all"
                              title="Break In Selfie"
                            >
                              <img src={item.breakInSelfieUrl} alt="B-In" className="w-full h-full object-cover" />
                            </button>
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center">
                              <User className="w-4 h-4 text-slate-300" />
                            </div>
                          )}
                          <span className="text-[7px] font-bold text-slate-400 uppercase">B-In</span>
                        </div>

                        {/* Break Out Selfie */}
                        <div className="flex flex-col items-center gap-1">
                          {item.breakOutSelfieUrl ? (
                            <button 
                              onClick={() => setPreviewImage(item.breakOutSelfieUrl!)}
                              className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden border border-slate-200 hover:ring-2 hover:ring-blue-500 transition-all"
                              title="Break Out Selfie"
                            >
                              <img src={item.breakOutSelfieUrl} alt="B-Out" className="w-full h-full object-cover" />
                            </button>
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center">
                              <User className="w-4 h-4 text-slate-300" />
                            </div>
                          )}
                          <span className="text-[7px] font-bold text-slate-400 uppercase">B-Out</span>
                        </div>

                        {/* Clock Out Selfie */}
                        <div className="flex flex-col items-center gap-1">
                          {item.outSelfieUrl ? (
                            <button 
                              onClick={() => setPreviewImage(item.outSelfieUrl!)}
                              className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden border border-slate-200 hover:ring-2 hover:ring-blue-500 transition-all"
                              title="Clock Out Selfie"
                            >
                              <img src={item.outSelfieUrl} alt="Out" className="w-full h-full object-cover" />
                            </button>
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center">
                              <User className="w-4 h-4 text-slate-300" />
                            </div>
                          )}
                          <span className="text-[7px] font-bold text-slate-400 uppercase">Out</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => setSelectedEmployeeForCalendar({ id: item.employeeId, name: item.employeeName })}
                          className="p-2 hover:bg-emerald-50 text-emerald-600 rounded-lg transition-colors"
                          title="View Full Month Calendar"
                        >
                          <Calendar className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => confirmDelete(item.id)}
                          className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                          title="Delete record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading attendance...</div>
          ) : filteredAttendance.length === 0 ? (
            <div className="p-8 text-center text-slate-400">No records found</div>
          ) : (
            filteredAttendance.map((item) => (
              <div key={item.id} className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold border border-blue-100">
                      {item.employeeName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{item.employeeName}</p>
                      <p className="text-[10px] text-slate-500">{item.employeeId}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                    item.status === 'present' ? 'bg-emerald-50 text-emerald-600' :
                    item.status === 'late' ? 'bg-amber-50 text-amber-600' :
                    'bg-red-50 text-red-600'
                  }`}>
                    {item.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[10px]">
                  <div className="bg-slate-50 p-2 rounded-xl">
                    <p className="text-slate-400 uppercase tracking-tighter mb-0.5">In Time</p>
                    <p className="text-slate-800 font-bold">{item.inTime || '--:--'}</p>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl">
                    <p className="text-slate-400 uppercase tracking-tighter mb-0.5">Break</p>
                    <p className="text-slate-800 font-bold">{item.breakInTime || '--:--'} - {item.breakOutTime || '--:--'}</p>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl">
                    <p className="text-slate-400 uppercase tracking-tighter mb-0.5">Out Time</p>
                    <p className="text-slate-800 font-bold">{item.outTime || '--:--'}</p>
                  </div>
                </div>

                {/* Mobile Selfie Row */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {[
                    { url: item.selfieUrl, label: 'In' },
                    { url: item.breakInSelfieUrl, label: 'B-In' },
                    { url: item.breakOutSelfieUrl, label: 'B-Out' },
                    { url: item.outSelfieUrl, label: 'Out' }
                  ].map((s, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-1 shrink-0">
                      {s.url ? (
                        <button 
                          onClick={() => setPreviewImage(s.url!)}
                          className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 shadow-sm"
                        >
                          <img src={s.url} alt={s.label} className="w-full h-full object-cover" />
                        </button>
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center">
                          <User className="w-4 h-4 text-slate-300" />
                        </div>
                      )}
                      <span className="text-[7px] font-bold text-slate-400 uppercase">{s.label}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                  <div className="flex items-center gap-2">
                    {item.location && (
                      <button 
                        onClick={() => window.open(`https://www.google.com/maps?q=${item.location?.lat},${item.location?.lng}`, '_blank')}
                        className="flex items-center gap-1 text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded-lg"
                      >
                        <MapPin className="w-3 h-3" />
                        GPS
                      </button>
                    )}
                    <button 
                      onClick={() => setSelectedEmployeeForCalendar({ id: item.employeeId, name: item.employeeName })}
                      className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded-lg"
                    >
                      <Calendar className="w-3 h-3" />
                      Calendar
                    </button>
                  </div>
                  <button 
                    onClick={() => confirmDelete(item.id)}
                    className="p-2 bg-red-50 text-red-500 rounded-lg active:scale-90 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-8 text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Delete Record?</h3>
              <p className="text-slate-500 text-sm mb-8">Are you sure you want to delete this attendance record? This action cannot be undone.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 px-6 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDelete}
                  disabled={loading}
                  className="flex-1 px-6 py-2 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-100 disabled:opacity-50"
                >
                  {loading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

      {/* Attendance Calendar Modal */}
      <AnimatePresence>
        {selectedEmployeeForCalendar && (
          <EmployeeAttendanceCalendar 
            employeeId={selectedEmployeeForCalendar.id}
            employeeName={selectedEmployeeForCalendar.name}
            onClose={() => setSelectedEmployeeForCalendar(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
