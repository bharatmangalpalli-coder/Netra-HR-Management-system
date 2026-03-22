import React, { useState, useEffect } from 'react';
import { 
  CalendarCheck, 
  CheckSquare, 
  FileText, 
  ArrowRight,
  Clock,
  MapPin,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  IndianRupee
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
  const [stats, setStats] = useState({
    presentDays: 0,
    absentDays: 0,
    salary: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const empId = employee.employeeId || employee.id;
        const today = getTodayDate();
        
        // Fetch today's attendance
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

        // Fetch Stats (Present/Absent/Salary)
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        const allAttSnap = await getDocs(query(
          collection(db, 'attendance'),
          where('employeeId', '==', empId)
        ));
        
        let present = 0;
        allAttSnap.docs.forEach(doc => {
          const data = doc.data();
          const date = new Date(data.date);
          if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
            if (data.status === 'present' || data.status === 'late') present++;
          }
        });

        // Fetch latest salary
        const salarySnap = await getDocs(query(
          collection(db, 'salary'),
          where('employeeId', '==', empId)
        ));
        
        let latestSalary = employee.monthlySalary || 0;
        if (!salarySnap.empty) {
          const sortedSalaries = salarySnap.docs
            .map(d => d.data() as any)
            .sort((a, b) => b.month.localeCompare(a.month));
          latestSalary = sortedSalaries[0].calculatedSalary ?? employee.monthlySalary ?? 0;
        }

        setStats({
          presentDays: present,
          absentDays: 0, // Simplified for now, could be calculated based on working days
          salary: latestSalary
        });

      } catch (error) {
        console.error("Error fetching employee home data:", error);
      }
    };

    fetchData();
  }, [employee.id, employee.monthlySalary]);

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <div className="bg-blue-600 p-6 rounded-3xl text-white shadow-xl shadow-blue-100 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-xl font-bold">Hello, {employee.name.split(' ')[0]}!</h1>
              <p className="text-blue-100 text-xs mt-1">{employee.designation || 'Team Member'}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-blue-100" />
              <span className="text-[10px] font-bold tracking-wider text-blue-100 uppercase">
                {employee.isFlexibleShift ? 'Flexible' : `${employee.shiftStart || '09:00'} - ${employee.shiftEnd || '18:00'}`}
              </span>
            </div>
          </div>
          
          <div className="mt-6 grid grid-cols-2 gap-2">
            <div className="bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/10">
              <p className="text-[7px] font-bold uppercase tracking-widest text-blue-100 mb-0.5 opacity-60">In</p>
              <p className="text-sm font-bold">{todayAttendance?.inTime || '--:--'}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/10">
              <p className="text-[7px] font-bold uppercase tracking-widest text-blue-100 mb-0.5 opacity-60">Out</p>
              <p className="text-sm font-bold">{todayAttendance?.outTime || '--:--'}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/10">
              <p className="text-[7px] font-bold uppercase tracking-widest text-blue-100 mb-0.5 opacity-60">Break In</p>
              <p className="text-sm font-bold">{todayAttendance?.breakInTime || '--:--'}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/10">
              <p className="text-[7px] font-bold uppercase tracking-widest text-blue-100 mb-0.5 opacity-60">Break Out</p>
              <p className="text-sm font-bold">{todayAttendance?.breakOutTime || '--:--'}</p>
            </div>
          </div>
        </div>
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card flex flex-col items-center justify-center text-center p-3">
          <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 mb-2">
            <TrendingUp className="w-4 h-4" />
          </div>
          <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-1">Present</p>
          <p className="text-lg font-bold text-slate-800">{stats.presentDays}</p>
        </div>
        <div className="card flex flex-col items-center justify-center text-center p-3">
          <div className="w-8 h-8 bg-red-50 rounded-xl flex items-center justify-center text-red-600 mb-2">
            <AlertCircle className="w-4 h-4" />
          </div>
          <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-1">Absent</p>
          <p className="text-lg font-bold text-slate-800">{stats.absentDays}</p>
        </div>
        <div className="card flex flex-col items-center justify-center text-center p-3">
          <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-2">
            <IndianRupee className="w-4 h-4" />
          </div>
          <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-1">Salary</p>
          <p className="text-lg font-bold text-slate-800">₹{(stats.salary || 0).toLocaleString()}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={() => onNavigate('attendance')}
          className="card flex flex-col items-start gap-4 active:scale-95 transition-all"
        >
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Attendance</h3>
            <p className="text-[10px] text-slate-500 font-medium">Mark daily presence</p>
          </div>
        </button>
        <button 
          onClick={() => onNavigate('salary')}
          className="card flex flex-col items-start gap-4 active:scale-95 transition-all"
        >
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
            <IndianRupee className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Salary</h3>
            <p className="text-[10px] text-slate-500 font-medium">View pay slips</p>
          </div>
        </button>
      </div>

      {/* Status Overview */}
      <div className="space-y-3">
        <h3 className="font-bold text-slate-800 text-sm px-1">Recent Activity</h3>
        
        <button 
          onClick={() => onNavigate('leave')}
          className="card flex items-center justify-between w-full text-left active:scale-95 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">Leave Request</p>
              <p className="text-[10px] text-slate-500">Status: <span className="capitalize font-semibold text-amber-600">{leaveStatus || 'None'}</span></p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-300" />
        </button>

        <button 
          onClick={() => onNavigate('tasks')}
          className="card flex items-center justify-between w-full text-left active:scale-95 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">Pending Tasks</p>
              <p className="text-[10px] text-slate-500">{pendingTasks} tasks assigned</p>
            </div>
          </div>
          <div className="px-2 py-0.5 bg-purple-50 text-purple-600 text-[10px] font-bold rounded-lg">
            {pendingTasks}
          </div>
        </button>
      </div>
    </div>
  );
}
