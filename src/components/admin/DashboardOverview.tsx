import React, { useState, useEffect } from 'react';
import { 
  Users, 
  CalendarCheck, 
  FileText, 
  CheckSquare, 
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { formatCurrency } from '../../lib/utils';

const attendanceData = [
  { name: 'Mon', present: 8, late: 1 },
  { name: 'Tue', present: 9, late: 0 },
  { name: 'Wed', present: 7, late: 2 },
  { name: 'Thu', present: 10, late: 0 },
  { name: 'Fri', present: 9, late: 1 },
  { name: 'Sat', present: 6, late: 0 },
];

const performanceData = [
  { month: 'Jan', tasks: 45 },
  { month: 'Feb', tasks: 52 },
  { month: 'Mar', tasks: 48 },
  { month: 'Apr', tasks: 61 },
  { month: 'May', tasks: 55 },
  { month: 'Jun', tasks: 67 },
];

export default function DashboardOverview() {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    todayAttendance: 0,
    pendingLeaves: 0,
    pendingTasks: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const employeesSnap = await getDocs(collection(db, 'employees'));
        const leavesSnap = await getDocs(query(collection(db, 'leaves'), where('status', '==', 'pending')));
        const tasksSnap = await getDocs(query(collection(db, 'tasks'), where('status', '==', 'pending')));
        
        // For today's attendance, we'd query by date
        const today = new Date().toISOString().split('T')[0];
        const attendanceSnap = await getDocs(query(collection(db, 'attendance'), where('date', '==', today)));

        setStats({
          totalEmployees: employeesSnap.size,
          todayAttendance: attendanceSnap.size,
          pendingLeaves: leavesSnap.size,
          pendingTasks: tasksSnap.size
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    { label: 'Total Employees', value: stats.totalEmployees, icon: Users, color: 'blue', trend: '+2 this month' },
    { label: 'Today Attendance', value: stats.todayAttendance, icon: CalendarCheck, color: 'emerald', trend: '90% present' },
    { label: 'Pending Leaves', value: stats.pendingLeaves, icon: FileText, color: 'amber', trend: '3 urgent' },
    { label: 'Pending Tasks', value: stats.pendingTasks, icon: CheckSquare, color: 'purple', trend: '12 due today' },
  ];

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-xl bg-${card.color}-50 text-${card.color}-600`}>
                <card.icon className="w-6 h-6" />
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded-full bg-${card.color === 'emerald' ? 'emerald' : 'blue'}-50 text-${card.color === 'emerald' ? 'emerald' : 'blue'}-600 flex items-center gap-1`}>
                <TrendingUp className="w-3 h-3" />
                {card.trend}
              </span>
            </div>
            <h3 className="text-slate-500 text-sm font-medium">{card.label}</h3>
            <p className="text-2xl font-bold text-slate-800 mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Attendance Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800">Weekly Attendance</h3>
            <select className="text-sm border-none bg-slate-50 rounded-lg px-2 py-1 focus:ring-0">
              <option>This Week</option>
              <option>Last Week</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="present" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={30} />
                <Bar dataKey="late" fill="#fbbf24" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Performance Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800">Employee Performance</h3>
            <select className="text-sm border-none bg-slate-50 rounded-lg px-2 py-1 focus:ring-0">
              <option>Last 6 Months</option>
              <option>Last Year</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData}>
                <defs>
                  <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="tasks" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorTasks)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Activity / Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800">Recent Employee Onboarding</h3>
          <button className="text-sm text-blue-600 font-medium hover:underline">View All</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">Employee</th>
                <th className="px-6 py-4 font-semibold">Role</th>
                <th className="px-6 py-4 font-semibold">Joining Date</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Salary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[1, 2, 3].map((_, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden">
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`} alt="Avatar" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">Employee {i + 1}</p>
                        <p className="text-xs text-slate-500">EMP00{i + 1}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">Software Engineer</td>
                  <td className="px-6 py-4 text-sm text-slate-600">Jan 12, 2024</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-medium">Active</span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-800">{formatCurrency(45000)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
