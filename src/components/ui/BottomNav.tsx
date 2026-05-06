import React from 'react';
import { Home, Calendar, CreditCard, User, FileText } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'attendance', label: 'Attendance', icon: Calendar },
    { id: 'leave', label: 'Leave', icon: FileText },
    { id: 'salary', label: 'Salary', icon: CreditCard },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-2 sm:px-6 py-2 flex justify-around items-center z-50 pb-safe shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.05)]">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center gap-1 transition-all flex-1 min-w-0 ${
              isActive ? 'text-blue-600' : 'text-slate-400'
            }`}
          >
            <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-blue-50' : ''}`}>
              <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-tighter truncate w-full text-center px-1 font-sans">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
