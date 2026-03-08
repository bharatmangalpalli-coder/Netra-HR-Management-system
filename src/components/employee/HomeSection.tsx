import React, { useState, useEffect } from 'react';
import { 
  CalendarCheck, 
  CheckSquare, 
  FileText, 
  ArrowRight,
  Clock,
  MapPin,
  CheckCircle2
} from 'lucide-react';
import { Employee, Attendance } from '../../types';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { getTodayDate } from '../../lib/utils';
import { motion } from 'motion/react';

interface Props {
  employee: Employee;
  onNavigate: (section: any) => void;
}

export default function HomeSection({ employee, onNavigate }: Props) {
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [pendingTasks, setPendingTasks] = useState(0);
  const [leaveStatus, setLeaveStatus] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch today's attendance
        const today = getTodayDate();
        const empId = employee.employeeId || employee.id;
        const attSnap = await getDocs(query(
          collection(db, 'attendance'), 
          where('employeeId', '==', empId),
          where('date', '==', today),
          limit(1)
        ));
        if (!attSnap.empty) {
          setTodayAttendance({ id: attSnap.docs[0].id, ...attSnap.docs[0].data() } as Attendance);
        }

        // Fetch pending tasks
        const tasksSnap = await getDocs(query(
          collection(db, 'tasks'),
          where('assignedTo', '==', empId),
          where('status', '==', 'pending')
        ));
        setPendingTasks(tasksSnap.size);

        // Fetch latest leave status
        const leaveSnap = await getDocs(query(
          collection(db, 'leaves'),
          where('employeeId', '==', empId)
        ));
        if (!leaveSnap.empty) {
          const sortedLeaves = leaveSnap.docs
            .map(d => d.data())
            .sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime());
          setLeaveStatus(sortedLeaves[0].status);
        }
      } catch (error) {
        console.error("Error fetching employee home data:", error);
      }
    };

    fetchData();
  }, [employee.id]);

  return (
    <div className="space-y-8">
      {/* Welcome Card */}
      <div className="bg-blue-600 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-blue-200 relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-2xl font-bold">Hello, {employee.name.split(' ')[0]}!</h1>
          <p className="text-blue-100 text-sm mt-1">{employee.designation || 'Team Member'}</p>
          <p className="text-blue-100/60 text-[10px] mt-0.5">Have a productive day at work.</p>
          
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white/20 backdrop-blur-md p-3 rounded-2xl">
              <p className="text-[8px] font-bold uppercase tracking-widest text-blue-100 mb-0.5">In Time</p>
              <p className="text-lg font-bold">{todayAttendance?.inTime || '--:--'}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-md p-3 rounded-2xl">
              <p className="text-[8px] font-bold uppercase tracking-widest text-blue-100 mb-0.5">Break In</p>
              <p className="text-lg font-bold">{todayAttendance?.breakInTime || '--:--'}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-md p-3 rounded-2xl">
              <p className="text-[8px] font-bold uppercase tracking-widest text-blue-100 mb-0.5">Break Out</p>
              <p className="text-lg font-bold">{todayAttendance?.breakOutTime || '--:--'}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-md p-3 rounded-2xl">
              <p className="text-[8px] font-bold uppercase tracking-widest text-blue-100 mb-0.5">Out Time</p>
              <p className="text-lg font-bold">{todayAttendance?.outTime || '--:--'}</p>
            </div>
          </div>
        </div>
        {/* Decorative Circles */}
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-blue-400/20 rounded-full blur-3xl"></div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={() => onNavigate('attendance')}
          className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all text-left group"
        >
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mb-4 group-hover:scale-110 transition-transform">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800">Attendance</h3>
          <p className="text-[10px] text-slate-500 font-medium mt-1">Mark your daily presence</p>
        </button>
        <button 
          onClick={() => onNavigate('tasks')}
          className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all text-left group"
        >
          <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 mb-4 group-hover:scale-110 transition-transform">
            <CheckSquare className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800">Tasks</h3>
          <p className="text-[10px] text-slate-500 font-medium mt-1">{pendingTasks} pending tasks</p>
        </button>
      </div>

      {/* Status Overview */}
      <div className="space-y-4">
        <h3 className="font-bold text-slate-800 px-2">Current Status</h3>
        
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Leave Request</p>
              <p className="text-xs text-slate-500">Latest status: <span className="capitalize font-semibold text-amber-600">{leaveStatus || 'No requests'}</span></p>
            </div>
          </div>
          <button onClick={() => onNavigate('leaves')} className="p-2 bg-slate-50 rounded-xl text-slate-400">
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Office Location</p>
              <p className="text-xs text-slate-500">Main Office, Sector 5</p>
            </div>
          </div>
          <div className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-full">
            IN RANGE
          </div>
        </div>
      </div>
    </div>
  );
}
