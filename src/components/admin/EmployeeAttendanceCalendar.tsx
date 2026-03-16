import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  X,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Attendance } from '../../types';
import { motion } from 'motion/react';

interface Props {
  employeeId: string;
  employeeName: string;
  onClose: () => void;
}

export default function EmployeeAttendanceCalendar({ employeeId, employeeName, onClose }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [attendanceData, setAttendanceData] = useState<Record<string, Attendance>>({});
  const [loading, setLoading] = useState(true);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  useEffect(() => {
    fetchMonthAttendance();
  }, [currentDate, employeeId]);

  const fetchMonthAttendance = async () => {
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const startOfMonth = `${year}-${month}-01`;
      const endOfMonth = `${year}-${month}-31`; // Firestore will handle the range

      const q = query(
        collection(db, 'attendance'),
        where('employeeId', '==', employeeId),
        where('date', '>=', startOfMonth),
        where('date', '<=', endOfMonth)
      );

      const querySnapshot = await getDocs(q);
      const data: Record<string, Attendance> = {};
      querySnapshot.docs.forEach(doc => {
        const att = { id: doc.id, ...doc.data() } as Attendance;
        data[att.date] = att;
      });
      setAttendanceData(data);
    } catch (error) {
      console.error("Error fetching calendar attendance:", error);
    } finally {
      setLoading(false);
    }
  };

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const renderDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const totalDays = daysInMonth(year, month);
    const firstDay = firstDayOfMonth(year, month);
    const days = [];

    // Empty slots for previous month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 bg-slate-50/50 border border-slate-100"></div>);
    }

    // Days of the month
    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const att = attendanceData[dateStr];
      const isToday = new Date().toISOString().split('T')[0] === dateStr;

      days.push(
        <div key={day} className={`h-24 p-2 border border-slate-100 transition-colors hover:bg-slate-50 relative ${isToday ? 'bg-blue-50/30' : 'bg-white'}`}>
          <span className={`text-xs font-bold ${isToday ? 'text-blue-600' : 'text-slate-400'}`}>{day}</span>
          
          {att ? (
            <div className="mt-1 space-y-1">
              <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${
                att.status === 'present' ? 'bg-emerald-50 text-emerald-600' :
                att.status === 'late' ? 'bg-amber-50 text-amber-600' :
                'bg-red-50 text-red-600'
              }`}>
                {att.status === 'present' ? <CheckCircle2 className="w-2.5 h-2.5" /> :
                 att.status === 'late' ? <AlertCircle className="w-2.5 h-2.5" /> :
                 <XCircle className="w-2.5 h-2.5" />}
                {att.status.toUpperCase()}
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1 text-[9px] text-slate-500">
                  <Clock className="w-2 h-2 text-emerald-500" />
                  {att.inTime}
                </div>
                {att.outTime && (
                  <div className="flex items-center gap-1 text-[9px] text-slate-500">
                    <Clock className="w-2 h-2 text-amber-500" />
                    {att.outTime}
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Check if it's a past day and no attendance
            new Date(dateStr) < new Date(new Date().toISOString().split('T')[0]) && (
               <div className="mt-1 text-[10px] text-slate-300 italic">No Record</div>
            )
          )}
        </div>
      );
    }

    return days;
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-blue-600 text-white">
          <div>
            <h3 className="text-xl font-bold">Attendance Calendar</h3>
            <p className="text-blue-100 text-sm">{employeeName} ({employeeId})</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Calendar Controls */}
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h4 className="text-lg font-bold text-slate-800">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h4>
            <div className="flex items-center bg-white rounded-xl border border-slate-200 p-1">
              <button onClick={prevMonth} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-600 transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={nextMonth} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-600 transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className="text-slate-600">Present</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <span className="text-slate-600">Late</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-slate-600">Absent</span>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="h-64 flex items-center justify-center text-slate-400">
              Loading calendar data...
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-xl overflow-hidden">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="bg-slate-50 py-2 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {day}
                </div>
              ))}
              {renderDays()}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-white text-slate-600 font-bold rounded-xl border border-slate-200 hover:bg-slate-100 transition-all shadow-sm"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}
