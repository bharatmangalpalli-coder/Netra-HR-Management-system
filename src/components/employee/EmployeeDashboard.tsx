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
import PermissionSection from './PermissionSection';

type Section = 'home' | 'attendance' | 'salary' | 'leave' | 'tasks' | 'profile' | 'permission';

interface Props {
  employee: Employee;
}

export default function EmployeeDashboard({ employee }: Props) {
  const [activeSection, setActiveSection] = useState<Section>('home');

  const renderSection = () => {
    const onBack = () => setActiveSection('home');
    
    switch (activeSection) {
      case 'home': return <HomeSection employee={employee} onNavigate={(s: any) => setActiveSection(s)} />;
      case 'attendance': return <AttendanceSection employee={employee} onBack={onBack} />;
      case 'salary': return <SalarySection employee={employee} onBack={onBack} />;
      case 'leave': return <LeaveSection employee={employee} onBack={onBack} />;
      case 'tasks': return <TaskSection employee={employee} onBack={onBack} />;
      case 'profile': return <ProfileSection employee={employee} onBack={onBack} />;
      case 'permission': return <PermissionSection employee={employee} onBack={onBack} />;
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
