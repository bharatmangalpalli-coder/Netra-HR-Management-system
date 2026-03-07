import React, { useState, useEffect } from 'react';
import { 
  IndianRupee, 
  Download, 
  FileText, 
  TrendingUp, 
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { Employee, SalaryRecord } from '../../types';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { formatCurrency } from '../../lib/utils';
import { jsPDF } from 'jspdf';
import toast from 'react-hot-toast';

interface Props {
  employee: Employee;
}

export default function SalarySection({ employee }: Props) {
  const [records, setRecords] = useState<SalaryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecords();
  }, [employee.id]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const empId = employee.employeeId || employee.id;
      const q = query(
        collection(db, 'salary'), 
        where('employeeId', '==', empId)
      );
      const snap = await getDocs(q);
      const list = snap.docs
        .map(d => ({ id: d.id, ...(d.data() as any) } as SalaryRecord))
        .sort((a, b) => b.month.localeCompare(a.month));
      setRecords(list);
    } catch (error) {
      console.error("Error fetching salary records:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateSalarySlip = (record: SalaryRecord) => {
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
    doc.text(`Name: ${employee.name}`, 20, 60);
    doc.text(`Employee ID: ${employee.employeeId}`, 20, 70);
    doc.text(`Role: ${employee.role}`, 20, 80);
    
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
    
    doc.save(`${employee.name}_Salary_Slip_${record.month}.pdf`);
    toast.success('Salary slip downloaded');
  };

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-bold text-slate-800 px-2">Salary Slips</h2>

      {/* Latest Salary Card */}
      {records.length > 0 && (
        <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-slate-200 relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Latest Payout • {records[0].month}</p>
            <h3 className="text-3xl font-bold">{formatCurrency(records[0].netSalary)}</h3>
            
            <div className="mt-8 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-slate-300">Paid Successfully</span>
              </div>
              <button 
                onClick={() => generateSalarySlip(records[0])}
                className="flex items-center gap-2 px-4 py-2 bg-white text-slate-900 rounded-2xl font-bold text-xs hover:bg-slate-100 transition-all"
              >
                <Download className="w-4 h-4" />
                Download Slip
              </button>
            </div>
          </div>
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-600/20 rounded-full blur-3xl"></div>
        </div>
      )}

      {/* History */}
      <div className="space-y-4">
        <h3 className="font-bold text-slate-800 px-2">Payment History</h3>
        {loading ? (
          <div className="py-12 text-center text-slate-400">Loading records...</div>
        ) : records.length === 0 ? (
          <div className="py-12 text-center text-slate-400">No salary records found</div>
        ) : (
          records.map((record) => (
            <div key={record.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">{record.month}</p>
                  <p className="text-xs text-slate-500">{formatCurrency(record.netSalary)}</p>
                </div>
              </div>
              <button 
                onClick={() => generateSalarySlip(record)}
                className="p-2 bg-slate-50 rounded-xl text-slate-400 hover:text-blue-600 transition-colors"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
