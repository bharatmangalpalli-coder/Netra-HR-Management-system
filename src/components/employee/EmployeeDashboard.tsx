import React, { useState } from 'react';
import { Employee } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import BottomNav from '../ui/BottomNav';

// Employee Sections
import HomeSection from './HomeSection';
import AttendanceSection from './AttendanceSection';
import SalarySection from './SalarySection';
import LeaveSection from './LeaveSection';
import TaskSection from './TaskSection';
import ProfileSection from './ProfileSection';

type Section = 'home' | 'attendance' | 'salary' | 'leave' | 'tasks' | 'profile';

interface Props {
  employee: Employee;
}

export default function EmployeeDashboard({ employee }: Props) {
  const [activeSection, setActiveSection] = useState<Section>('home');

  const renderSection = () => {
    switch (activeSection) {
      case 'home': return <HomeSection employee={employee} onNavigate={(s: any) => setActiveSection(s)} />;
      case 'attendance': return <AttendanceSection employee={employee} />;
      case 'salary': return <SalarySection employee={employee} />;
      case 'leave': return <LeaveSection employee={employee} />;
      case 'tasks': return <TaskSection employee={employee} />;
      case 'profile': return <ProfileSection employee={employee} />;
      default: return <HomeSection employee={employee} onNavigate={(s: any) => setActiveSection(s)} />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Main Content */}
      <main className="flex-1 pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="p-6"
          >
            {renderSection()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeSection} onTabChange={(tab) => setActiveSection(tab as Section)} />
    </div>
  );
}
