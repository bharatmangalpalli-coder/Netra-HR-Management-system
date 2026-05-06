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
  const [monthlyLeaveStats, setMonthlyLeaveStats] = useState({ used: 0, available: 1 });
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
        
        // ... existing attendance and task fetching ...
        const attSnap = await getDocs(query(
          collection(db, 'attendance'), 
          where('employeeId', '==', empId),
          where('date', '==', today),
          limit(1)
        ));
        if (!attSnap.empty) {
          setTodayAttendance({ id: attSnap.docs[0].id, ...attSnap.docs[0].data() } as Attendance);
        }

        const tasksSnap = await getDocs(query(
          collection(db, 'tasks'),
          where('assignedTo', '==', empId),
          where('status', '==', 'pending')
        ));
        setPendingTasks(tasksSnap.size);

        // Leave stats for current month
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const firstDay = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
        const lastDay = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0];

        const leaveSnap = await getDocs(query(
          collection(db, 'leaves'),
          where('employeeId', '==', empId),
          where('status', '==', 'approved'),
          where('startDate', '>=', firstDay),
          where('startDate', '<=', lastDay)
        ));
        
        const usedLeaves = leaveSnap.size;
        setMonthlyLeaveStats({ used: usedLeaves, available: Math.max(0, 1 - usedLeaves) });

        // Latest leave status for UI
        const allLeavesSnap = await getDocs(query(
          collection(db, 'leaves'),
          where('employeeId', '==', empId)
        ));
        if (!allLeavesSnap.empty) {
          const sortedLeaves = allLeavesSnap.docs
            .map(d => d.data())
            .sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime());
          setLeaveStatus(sortedLeaves[0].status);
        }

        // Attendance stats
        const allAttSnap = await getDocs(query(
          collection(db, 'attendance'),
          where('employeeId', '==', empId)
        ));
        
        let present = 0;
        allAttSnap.docs.forEach(doc => {
          const data = doc.data();
          const date = new Date(data.date);
          if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
            if (data.status === 'present' || data.status === 'late') present += 1;
            else if (data.status === 'half-day') present += 0.5;
          }
        });

        // Salary
        const salarySnap = await getDocs(query(
          collection(db, 'salary'),
          where('employeeId', '==', empId)
        ));
        
        let latestSalary = employee.monthlySalary || 0;
        if (!salarySnap.empty) {
          const sortedSalaries = salarySnap.docs
            .map(d => d.data() as any)
            .sort((a, b) => b.month.localeCompare(a.month));
          latestSalary = sortedSalaries[0].netSalary ?? employee.monthlySalary ?? 0;
        }

        setStats({
          presentDays: present,
          absentDays: 0,
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
        {/* ... welcome card content ... */}
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
              <p className="text-[7px] font-bold uppercase tracking-widest text-blue-100 mb-0.5 opacity-60">Lunch Out</p>
              <p className="text-sm font-bold">{todayAttendance?.lunchOutTime || '--:--'}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/10">
              <p className="text-[7px] font-bold uppercase tracking-widest text-blue-100 mb-0.5 opacity-60">Lunch In</p>
              <p className="text-sm font-bold">{todayAttendance?.lunchInTime || '--:--'}</p>
            </div>
          </div>
        </div>
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
      </div>

      {/* Leave Balance Card */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-emerald-500/10 transition-all duration-500"></div>
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Leave Balance</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-bold text-slate-800 leading-none">{monthlyLeaveStats.available}</h3>
                <span className="text-xs text-slate-500 font-medium tracking-tight">/ 1 Day Available</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Monthly Policy</p>
            <p className="text-[10px] text-slate-400 font-medium whitespace-nowrap">1 Full Day Allowed</p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 transition-all duration-500" 
              style={{ width: `${(monthlyLeaveStats.available / 1) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="card flex flex-col items-center justify-center text-center p-3">
          <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 mb-2">
            <TrendingUp className="w-4 h-4" />
          </div>
          <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-1">Present</p>
          <p className="text-base sm:text-lg font-bold text-slate-800">{stats.presentDays}d</p>
        </div>
        <div className="card flex flex-col items-center justify-center text-center p-3">
          <div className="w-8 h-8 bg-red-50 rounded-xl flex items-center justify-center text-red-600 mb-2">
            <AlertCircle className="w-4 h-4" />
          </div>
          <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-1">Absent</p>
          <p className="text-base sm:text-lg font-bold text-slate-800">{stats.absentDays}d</p>
        </div>
        <div className="card flex flex-col items-center justify-center text-center p-3 col-span-2 sm:col-span-1">
          <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-2">
            <IndianRupee className="w-4 h-4" />
          </div>
          <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-1">Salary Estimate</p>
          <p className="text-base sm:text-lg font-bold text-slate-800">₹{(stats.salary || 0).toLocaleString()}</p>
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
        <button 
          onClick={() => onNavigate('permission')}
          className="card flex flex-col items-start gap-4 active:scale-95 transition-all"
        >
          <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Permission</h3>
            <p className="text-[10px] text-slate-500 font-medium">Request short leave</p>
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
