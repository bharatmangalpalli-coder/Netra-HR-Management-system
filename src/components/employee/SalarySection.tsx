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
    doc.text('SalaryCalc - Salary Slip', 105, 20, { align: 'center' });
    
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
    doc.text(`Designation: ${employee.designation || 'N/A'}`, 20, 80);
    
    // Attendance Info
    doc.setFont('helvetica', 'bold');
    doc.text('Attendance Summary', 120, 50);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Working Days: ${record.workingDays}`, 120, 60);
    doc.text(`Present Days: ${record.presentDays}`, 120, 70);
    doc.text(`Absent Days: ${record.absentDays}`, 120, 80);

    // Salary Details
    doc.setFont('helvetica', 'bold');
    doc.text('Earnings & Deductions', 20, 100);
    doc.line(20, 105, 190, 105);
    
    doc.setFont('helvetica', 'normal');
    let y = 115;
    
    // Earnings
    doc.text('Monthly Fixed Salary:', 20, y);
    doc.text(formatCurrency(record.baseSalary), 150, y);
    y += 10;

    doc.setFont('helvetica', 'bold');
    doc.text('Calculated Salary (Attendance Based):', 20, y);
    doc.text(formatCurrency(record.calculatedSalary), 150, y);
    doc.setFont('helvetica', 'normal');
    y += 10;
    
    doc.text('Overtime Pay:', 20, y);
    doc.text(formatCurrency(record.overtimePay || 0), 150, y);
    y += 10;

    doc.text('Bonus:', 20, y);
    doc.text(formatCurrency(record.bonus), 150, y);
    y += 10;

    doc.text('Incentive:', 20, y);
    doc.text(formatCurrency(record.incentive || 0), 150, y);
    y += 10;
    
    // Deductions
    doc.setTextColor(220, 38, 38);
    doc.text('PF Deduction:', 20, y);
    doc.text(`- ${formatCurrency(record.pf || 0)}`, 150, y);
    y += 10;

    doc.text('ESI Deduction:', 20, y);
    doc.text(`- ${formatCurrency(record.esi || 0)}`, 150, y);
    y += 10;

    doc.text('Professional Tax:', 20, y);
    doc.text(`- ${formatCurrency(record.professionalTax || 0)}`, 150, y);
    y += 10;
    
    doc.text('Other Deductions:', 20, y);
    doc.text(`- ${formatCurrency(record.deduction)}`, 150, y);
    y += 10;
    
    doc.line(20, y, 190, y);
    y += 10;
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text('Net Salary Payable:', 20, y);
    doc.text(formatCurrency(record.netSalary), 150, y);
    
    // Breakdown info
    y += 20;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text(`Calculation Breakdown:`, 20, y);
    y += 5;
    doc.text(`Per Day Salary = ${formatCurrency(record.baseSalary)} / ${record.workingDays} = ${formatCurrency(record.perDaySalary)}`, 20, y);
    y += 5;
    doc.text(`Calculated Salary = ${formatCurrency(record.perDaySalary)} x ${record.presentDays} = ${formatCurrency(record.calculatedSalary)}`, 20, y);

    // Footer
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('This is a computer generated document and does not require a signature.', 105, 280, { align: 'center' });
    
    doc.save(`${employee.name}_Salary_Slip_${record.month}.pdf`);
    toast.success('Salary slip downloaded');
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-800 px-1">Salary Slips</h2>

      {/* Latest Salary Card */}
      {records.length > 0 && (
        <div className="bg-slate-900 p-6 rounded-3xl text-white shadow-xl shadow-slate-200 relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400 mb-1">Latest Payout • {records[0].month}</p>
            <h3 className="text-2xl font-bold">{formatCurrency(records[0].netSalary)}</h3>
            
            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-emerald-500/20 rounded-lg flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-medium text-slate-300">Paid Successfully</span>
              </div>
              <button 
                onClick={() => generateSalarySlip(records[0])}
                className="flex items-center gap-2 px-3 py-1.5 bg-white text-slate-900 rounded-xl font-bold text-[10px] hover:bg-slate-100 transition-all active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                Download Slip
              </button>
            </div>
          </div>
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-600/20 rounded-full blur-3xl"></div>
        </div>
      )}

      {/* History */}
      <div className="space-y-3">
        <h3 className="font-bold text-slate-800 text-sm px-1">Payment History</h3>
        {loading ? (
          <div className="py-12 text-center text-slate-400">Loading records...</div>
        ) : records.length === 0 ? (
          <div className="py-12 text-center text-slate-400">No salary records found</div>
        ) : (
          records.map((record) => (
            <div key={record.id} className="card flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">{record.month}</p>
                  <p className="text-[10px] text-slate-500">{formatCurrency(record.netSalary)}</p>
                </div>
              </div>
              <button 
                onClick={() => generateSalarySlip(record)}
                className="p-2 bg-slate-50 rounded-lg text-slate-400 hover:text-blue-600 transition-colors active:scale-90"
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
