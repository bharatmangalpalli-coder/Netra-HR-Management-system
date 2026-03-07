import React, { useState, useEffect } from 'react';
import { 
  IndianRupee, 
  Download, 
  Plus, 
  Search, 
  Calendar,
  FileText,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { collection, getDocs, addDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Employee, SalaryRecord } from '../../types';
import { formatCurrency } from '../../lib/utils';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';

export default function SalaryManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const empSnap = await getDocs(collection(db, 'employees'));
      const empList = empSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Employee));
      setEmployees(empList);

      const salarySnap = await getDocs(query(collection(db, 'salary'), where('month', '==', selectedMonth)));
      const salaryList = salarySnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as SalaryRecord));
      setSalaryRecords(salaryList);
    } catch (error) {
      console.error("Error fetching salary data:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateSalarySlip = (emp: Employee, record: SalaryRecord) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(37, 99, 235);
    doc.text('HR Pro - Salary Slip', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Month: ${record.month}`, 105, 30, { align: 'center' });
    
    // Employee Info
    doc.line(20, 40, 190, 40);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text('Employee Details', 20, 50);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${emp.name}`, 20, 60);
    doc.text(`Employee ID: ${emp.employeeId}`, 20, 70);
    doc.text(`Role: ${emp.role}`, 20, 80);
    
    // Salary Details
    doc.setFont('helvetica', 'bold');
    doc.text('Earnings & Deductions', 20, 100);
    doc.line(20, 105, 190, 105);
    
    doc.setFont('helvetica', 'normal');
    doc.text('Base Salary:', 20, 115);
    doc.text(formatCurrency(record.baseSalary), 150, 115);
    
    doc.text('Bonus:', 20, 125);
    doc.text(formatCurrency(record.bonus), 150, 125);
    
    doc.setTextColor(220, 38, 38);
    doc.text('Deductions:', 20, 135);
    doc.text(`- ${formatCurrency(record.deduction)}`, 150, 135);
    
    doc.line(20, 145, 190, 145);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text('Net Salary Payable:', 20, 155);
    doc.text(formatCurrency(record.netSalary), 150, 155);
    
    // Footer
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('This is a computer generated document and does not require a signature.', 105, 200, { align: 'center' });
    
    doc.save(`${emp.name}_Salary_Slip_${record.month}.pdf`);
    toast.success('Salary slip generated');
  };

  const handleGenerateAll = async () => {
    toast.loading('Generating records...');
    try {
      for (const emp of employees) {
        // Check if already generated
        if (salaryRecords.some(r => r.employeeId === emp.employeeId)) continue;
        
        const record = {
          employeeId: emp.employeeId,
          month: selectedMonth,
          workingDays: 22, // Mock logic
          leaveDays: 0,
          baseSalary: emp.monthlySalary,
          bonus: 0,
          deduction: 0,
          netSalary: emp.monthlySalary,
          generatedAt: new Date().toISOString()
        };
        await addDoc(collection(db, 'salary'), record);
      }
      toast.dismiss();
      toast.success('Salary records generated for all employees');
      fetchData();
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to generate records');
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-slate-500 text-sm font-medium">Total Payroll</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">
            {formatCurrency(salaryRecords.reduce((acc, r) => acc + r.netSalary, 0))}
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-slate-500 text-sm font-medium">Processed Employees</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{salaryRecords.length} / {employees.length}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-slate-500 text-sm font-medium">Pending Processing</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{employees.length - salaryRecords.length}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-48">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="month" 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>
        <button 
          onClick={handleGenerateAll}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 w-full md:w-auto justify-center"
        >
          <Plus className="w-5 h-5" />
          Generate All Records
        </button>
      </div>

      {/* Salary List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">Employee</th>
                <th className="px-6 py-4 font-semibold">Base Salary</th>
                <th className="px-6 py-4 font-semibold">Bonus/Deduct</th>
                <th className="px-6 py-4 font-semibold">Net Salary</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Slip</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employees.map((emp) => {
                const record = salaryRecords.find(r => r.employeeId === emp.employeeId);
                return (
                  <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs">
                          {emp.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{emp.name}</p>
                          <p className="text-xs text-slate-500">{emp.employeeId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{formatCurrency(emp.monthlySalary)}</td>
                    <td className="px-6 py-4">
                      {record ? (
                        <div className="text-xs">
                          <p className="text-emerald-600">+{formatCurrency(record.bonus)}</p>
                          <p className="text-red-600">-{formatCurrency(record.deduction)}</p>
                        </div>
                      ) : '--'}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-800">
                      {record ? formatCurrency(record.netSalary) : '--'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        record ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {record ? 'Processed' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {record && (
                        <button 
                          onClick={() => generateSalarySlip(emp, record)}
                          className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
