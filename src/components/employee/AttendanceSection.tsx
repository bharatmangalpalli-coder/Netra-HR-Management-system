import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  MapPin, 
  Camera, 
  CheckCircle2, 
  AlertCircle,
  History
} from 'lucide-react';
import { Employee, Attendance } from '../../types';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, limit, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { getTodayDate } from '../../lib/utils';
import toast from 'react-hot-toast';
import { motion } from 'motion/react';

interface Props {
  employee: Employee;
}

export default function AttendanceSection({ employee }: Props) {
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<Attendance[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    fetchTodayAttendance();
    fetchHistory();
  }, [employee.id]);

  const fetchTodayAttendance = async () => {
    try {
      const today = getTodayDate();
      const empId = employee.employeeId || employee.id;
      const q = query(
        collection(db, 'attendance'), 
        where('employeeId', '==', empId),
        where('date', '==', today),
        limit(1)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        setTodayAttendance({ id: snap.docs[0].id, ...snap.docs[0].data() } as Attendance);
      }
    } catch (error) {
      console.error("Error fetching today attendance:", error);
    }
  };

  const fetchHistory = async () => {
    try {
      const empId = employee.employeeId || employee.id;
      const q = query(
        collection(db, 'attendance'), 
        where('employeeId', '==', empId)
      );
      const snap = await getDocs(q);
      const list = snap.docs
        .map(d => ({ id: d.id, ...(d.data() as any) } as Attendance))
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 10);
      setHistory(list);
    } catch (error) {
      console.error("Error fetching attendance history:", error);
    }
  };

  const handleMarkIn = async () => {
    setLoading(true);
    try {
      // Get Location
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      const now = new Date();
      const inTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const status = now.getHours() >= 10 ? 'late' : 'present';

      const newAttendance = {
        employeeId: employee.employeeId || employee.id,
        employeeName: employee.name,
        date: getTodayDate(),
        inTime,
        outTime: null,
        location: {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        },
        status,
        selfieUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${employee.name}` // Mock selfie
      };

      await addDoc(collection(db, 'attendance'), newAttendance);
      toast.success('Attendance marked successfully');
      fetchTodayAttendance();
    } catch (error: any) {
      toast.error(error.message || 'Failed to mark attendance');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkOut = async () => {
    if (!todayAttendance) return;
    setLoading(true);
    try {
      const outTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      await updateDoc(doc(db, 'attendance', todayAttendance.id), { outTime });
      toast.success('Checked out successfully');
      fetchTodayAttendance();
    } catch (error) {
      toast.error('Failed to mark out');
    } finally {
      setLoading(false);
    }
  };

  const handleBreakIn = async () => {
    if (!todayAttendance) return;
    setLoading(true);
    try {
      const breakInTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      await updateDoc(doc(db, 'attendance', todayAttendance.id), { breakInTime });
      toast.success('Break started');
      fetchTodayAttendance();
    } catch (error) {
      toast.error('Failed to start break');
    } finally {
      setLoading(false);
    }
  };

  const handleBreakOut = async () => {
    if (!todayAttendance) return;
    setLoading(true);
    try {
      const breakOutTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      await updateDoc(doc(db, 'attendance', todayAttendance.id), { breakOutTime });
      toast.success('Break ended');
      fetchTodayAttendance();
    } catch (error) {
      toast.error('Failed to end break');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-xl font-bold text-slate-800">Attendance</h2>
        <button 
          onClick={() => setShowHistory(!showHistory)}
          className="p-2 bg-white rounded-xl border border-slate-100 text-slate-500 shadow-sm"
        >
          <History className="w-5 h-5" />
        </button>
      </div>

      {!showHistory ? (
        <div className="space-y-6">
          {/* Status Card */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 text-center">
            <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-blue-600">
              <Clock className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800">
              {todayAttendance ? (
                todayAttendance.outTime ? 'Shift Completed' : 
                (todayAttendance.breakInTime && !todayAttendance.breakOutTime) ? 'On Break' : 'You are IN'
              ) : 'Ready to Start?'}
            </h3>
            <p className="text-slate-500 text-sm mt-2">
              {todayAttendance 
                ? (todayAttendance.breakInTime && !todayAttendance.breakOutTime)
                  ? `Break started at ${todayAttendance.breakInTime}`
                  : `Clocked in at ${todayAttendance.inTime}` 
                : 'Please mark your attendance for today'}
            </p>

            <div className="mt-10 space-y-4">
              {!todayAttendance ? (
                <button 
                  onClick={handleMarkIn}
                  disabled={loading}
                  className="w-full py-4 bg-blue-600 text-white rounded-3xl font-bold text-lg shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Mark Attendance IN'}
                </button>
              ) : !todayAttendance.outTime ? (
                <div className="space-y-3">
                  {(!todayAttendance.breakInTime) ? (
                    <button 
                      onClick={handleBreakIn}
                      disabled={loading}
                      className="w-full py-4 bg-indigo-500 text-white rounded-3xl font-bold text-lg shadow-xl shadow-indigo-100 hover:bg-indigo-600 transition-all disabled:opacity-50"
                    >
                      {loading ? 'Processing...' : 'Start Break'}
                    </button>
                  ) : (!todayAttendance.breakOutTime) ? (
                    <button 
                      onClick={handleBreakOut}
                      disabled={loading}
                      className="w-full py-4 bg-emerald-500 text-white rounded-3xl font-bold text-lg shadow-xl shadow-emerald-100 hover:bg-emerald-600 transition-all disabled:opacity-50"
                    >
                      {loading ? 'Processing...' : 'End Break'}
                    </button>
                  ) : null}
                  
                  <button 
                    onClick={handleMarkOut}
                    disabled={loading || (todayAttendance.breakInTime && !todayAttendance.breakOutTime)}
                    className="w-full py-4 bg-amber-500 text-white rounded-3xl font-bold text-lg shadow-xl shadow-amber-100 hover:bg-amber-600 transition-all disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : 'Mark Attendance OUT'}
                  </button>
                </div>
              ) : (
                <div className="py-4 bg-emerald-50 text-emerald-600 rounded-3xl font-bold text-lg flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-6 h-6" />
                  Done for Today
                </div>
              )}
            </div>
          </div>

          {/* Location Info */}
          <div className="bg-slate-900 p-6 rounded-[2rem] text-white flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
              <MapPin className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Current Location</p>
              <p className="text-sm font-medium">Main Office, Sector 5</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((item) => (
            <div key={item.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-800">{new Date(item.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">IN: {item.inTime}</span>
                  {item.breakInTime && (
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">B-IN: {item.breakInTime}</span>
                  )}
                  {item.breakOutTime && (
                    <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">B-OUT: {item.breakOutTime}</span>
                  )}
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">OUT: {item.outTime || '--:--'}</span>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                item.status === 'present' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
              }`}>
                {item.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
