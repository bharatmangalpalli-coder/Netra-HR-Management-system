import React from 'react';
import { Employee } from '../../types';
import { User, Mail, Phone, MapPin, Briefcase, Calendar, Shield } from 'lucide-react';

interface Props {
  employee: Employee;
}

export default function ProfileSection({ employee }: Props) {
  const infoItems = [
    { icon: User, label: 'Full Name', value: employee.name },
    { icon: Briefcase, label: 'Designation', value: employee.designation || 'Not Set' },
    { icon: Shield, label: 'Employee ID', value: employee.employeeId || employee.id },
    { icon: Mail, label: 'Email', value: employee.email },
    { icon: Phone, label: 'Mobile', value: employee.mobile || 'Not Set' },
    { icon: MapPin, label: 'Address', value: employee.address || 'Not Set' },
    { icon: Calendar, label: 'Joining Date', value: employee.joiningDate || 'Not Set' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center py-6">
        <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-4">
          <User className="w-12 h-12" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">{employee.name}</h2>
        <p className="text-slate-500 font-medium">{employee.designation || 'Employee'}</p>
      </div>

      <div className="grid gap-4">
        {infoItems.map((item, index) => (
          <div key={index} className="card flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
              <item.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{item.label}</p>
              <p className="text-sm font-semibold text-slate-700">{item.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
