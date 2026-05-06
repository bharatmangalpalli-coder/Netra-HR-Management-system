import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface Props {
  title: string;
  subtitle?: string;
  onBack: () => void;
}

export default function PageHeader({ title, subtitle, onBack }: Props) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <button 
        onClick={onBack}
        className="p-2 sm:p-2.5 bg-white border border-slate-100 rounded-xl shadow-sm text-slate-600 hover:bg-slate-50 active:scale-90 transition-all"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-800 leading-tight">{title}</h2>
        {subtitle && (
          <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
