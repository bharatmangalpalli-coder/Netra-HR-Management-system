import React, { useState, useEffect } from 'react';
import { 
  Home, 
  CalendarCheck, 
  FileText, 
  CheckSquare, 
  IndianRupee, 
  LogOut,
  Bell,
  User
} from 'lucide-react';
import { auth, db } from '../../lib/firebase';
import { Employee } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import Logo from '../ui/Logo';

// Employee Sections
import HomeSection from './HomeSection';
import AttendanceSection from './AttendanceSection';
import LeaveSection from './LeaveSection';
import TaskSection from './TaskSection';
import SalarySection from './SalarySection';

type Section = 'home' | 'attendance' | 'leaves' | 'tasks' | 'salary';

interface Props {
  employee: Employee;
}

export default function EmployeeDashboard({ employee }: Props) {
  const [activeSection, setActiveSection] = useState<Section>('home');

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'leaves', label: 'Leaves', icon: FileText },
    { id: 'salary', label: 'Salary', icon: IndianRupee },
  ];

  const renderSection = () => {
    switch (activeSection) {
      case 'home': return <HomeSection employee={employee} onNavigate={setActiveSection} />;
      case 'attendance': return <AttendanceSection employee={employee} />;
      case 'leaves': return <LeaveSection employee={employee} />;
      case 'tasks': return <TaskSection employee={employee} />;
      case 'salary': return <SalarySection employee={employee} />;
      default: return <HomeSection employee={employee} onNavigate={setActiveSection} />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden max-w-md mx-auto border-x border-slate-200 shadow-2xl relative">
      {/* Header */}
      <header className="bg-white px-6 py-4 flex items-center justify-between border-b border-slate-100 shrink-0 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Logo size="sm" />
          <div>
            <h2 className="text-sm font-bold text-slate-800 line-clamp-1">{employee.name}</h2>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{employee.employeeId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 text-slate-400 hover:text-slate-600 relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
          <button 
            onClick={() => auth.signOut()}
            className="p-2 text-red-400 hover:text-red-600"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="p-6"
          >
            {renderSection()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-white border-t border-slate-100 px-4 py-3 flex items-center justify-between sticky bottom-0 z-10 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveSection(item.id as Section)}
            className={`flex flex-col items-center gap-1 transition-all ${
              activeSection === item.id ? 'text-blue-600' : 'text-slate-400'
            }`}
          >
            <div className={`p-2 rounded-xl transition-all ${
              activeSection === item.id ? 'bg-blue-50' : 'bg-transparent'
            }`}>
              <item.icon className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
