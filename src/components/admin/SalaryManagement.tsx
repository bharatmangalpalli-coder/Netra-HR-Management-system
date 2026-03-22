import React, { useState, useEffect } from 'react';
import { 
  IndianRupee, 
  Download, 
  Plus, 
  Search, 
  Calendar,
  FileText,
  TrendingUp,
  AlertCircle,
  Edit2,
  Trash2,
  X,
  Calculator,
  UserCheck,
  UserX,
  Clock
} from 'lucide-react';
import { collection, getDocs, addDoc, query, where, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Employee, SalaryRecord, Attendance } from '../../types';
import { formatCurrency, getMonthWorkingDays } from '../../lib/utils';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import { motion, AnimatePresence } from 'motion/react';

export default function SalaryManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<SalaryRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({
    workingDays: 22,
    presentDays: 22,
    overtimeHours: 0,
    overtimePay: 0,
    bonus: 0,
    incentive: 0,
    pf: 0,
    esi: 0,
    professionalTax: 0,
    deduction: 0
  });

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
    doc.text(`Name: ${emp.name}`, 20, 60);
    doc.text(`Employee ID: ${emp.employeeId}`, 20, 70);
    doc.text(`Designation: ${emp.designation || 'N/A'}`, 20, 80);
    
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
    doc.text(formatCurrency(record.overtimePay), 150, y);
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
    
    doc.save(`${emp.name}_Salary_Slip_${record.month}.pdf`);
    toast.success('Salary slip generated');
  };

  const handleGenerateAll = async () => {
    toast.loading('Processing attendance and generating records...');
    try {
      const [year, month] = selectedMonth.split('-').map(Number);
      const totalWorkingDays = getMonthWorkingDays(year, month);

      // Fetch all attendance for this month
      const attendanceSnap = await getDocs(query(
        collection(db, 'attendance'),
        where('date', '>=', `${selectedMonth}-01`),
        where('date', '<=', `${selectedMonth}-31`)
      ));
      const allAttendance = attendanceSnap.docs.map(doc => doc.data() as Attendance);

      for (const emp of employees) {
        const empId = emp.employeeId || emp.id;
        if (!empId) continue;

        // Check if already generated
        if (salaryRecords.some(r => r.employeeId === empId)) continue;
        
        // Count present days for this employee
        const empAttendance = allAttendance.filter(a => a.employeeId === empId);
        const presentDays = empAttendance.filter(a => a.status === 'present' || a.status === 'late').length;
        const absentDays = totalWorkingDays - presentDays;

        // Formula: Per Day Salary = Monthly Salary / Total Working Days
        const monthlySalary = emp.monthlySalary || 0;
        const perDaySalary = monthlySalary / totalWorkingDays;
        
        // Formula: Calculated Salary = Per Day Salary * Present Days
        const calculatedSalary = presentDays === 0 ? 0 : perDaySalary * presentDays;

        const record = {
          employeeId: empId,
          month: selectedMonth,
          workingDays: totalWorkingDays,
          presentDays: presentDays,
          absentDays: absentDays < 0 ? 0 : absentDays,
          perDaySalary: perDaySalary,
          baseSalary: monthlySalary,
          calculatedSalary: calculatedSalary,
          overtimeHours: 0,
          overtimePay: 0,
          bonus: 0,
          incentive: 0,
          pf: 0,
          esi: 0,
          professionalTax: 0,
          deduction: 0,
          netSalary: calculatedSalary,
          generatedAt: new Date().toISOString()
        };
        await addDoc(collection(db, 'salary'), record);
      }
      toast.dismiss();
      toast.success('Salary records generated based on attendance');
      fetchData();
    } catch (error) {
      toast.dismiss();
      console.error(error);
      toast.error('Failed to generate records');
    }
  };

  const handleEdit = (record: SalaryRecord) => {
    setEditingRecord(record);
    setEditFormData({
      workingDays: record.workingDays || 22,
      presentDays: record.presentDays || 0,
      overtimeHours: record.overtimeHours || 0,
      overtimePay: record.overtimePay || 0,
      bonus: record.bonus || 0,
      incentive: record.incentive || 0,
      pf: record.pf || 0,
      esi: record.esi || 0,
      professionalTax: record.professionalTax || 0,
      deduction: record.deduction || 0
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    setLoading(true);
    try {
      const perDaySalary = editingRecord.baseSalary / editFormData.workingDays;
      const calculatedSalary = editFormData.presentDays === 0 ? 0 : perDaySalary * editFormData.presentDays;
      const absentDays = editFormData.workingDays - editFormData.presentDays;

      const totalEarnings = calculatedSalary + editFormData.overtimePay + editFormData.bonus + editFormData.incentive;
      const totalDeductions = editFormData.pf + editFormData.esi + editFormData.professionalTax + editFormData.deduction;
      const netSalary = totalEarnings - totalDeductions;

      await updateDoc(doc(db, 'salary', editingRecord.id), {
        workingDays: editFormData.workingDays,
        presentDays: editFormData.presentDays,
        absentDays: absentDays < 0 ? 0 : absentDays,
        perDaySalary,
        calculatedSalary,
        overtimeHours: editFormData.overtimeHours,
        overtimePay: editFormData.overtimePay,
        bonus: editFormData.bonus,
        incentive: editFormData.incentive,
        pf: editFormData.pf,
        esi: editFormData.esi,
        professionalTax: editFormData.professionalTax,
        deduction: editFormData.deduction,
        netSalary
      });
      toast.success('Salary record updated');
      setIsEditModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to update record');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'salary', deletingId));
      toast.success('Salary record deleted');
      setIsDeleteModalOpen(false);
      setDeletingId(null);
      fetchData();
    } catch (error) {
      toast.error('Failed to delete record');
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (id: string) => {
    setDeletingId(id);
    setIsDeleteModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
        <div className="bg-white p-4 lg:p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 lg:gap-3 mb-1 lg:mb-2">
            <div className="p-1.5 lg:p-2 bg-blue-50 rounded-lg">
              <IndianRupee className="w-4 h-4 lg:w-5 lg:h-5 text-blue-600" />
            </div>
            <p className="text-slate-500 text-[10px] lg:text-sm font-medium">Total Payroll</p>
          </div>
          <p className="text-sm lg:text-2xl font-bold text-slate-800 truncate">
            {formatCurrency(salaryRecords.reduce((acc, r) => acc + r.netSalary, 0))}
          </p>
        </div>
        <div className="bg-white p-4 lg:p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 lg:gap-3 mb-1 lg:mb-2">
            <div className="p-1.5 lg:p-2 bg-emerald-50 rounded-lg">
              <UserCheck className="w-4 h-4 lg:w-5 lg:h-5 text-emerald-600" />
            </div>
            <p className="text-slate-500 text-[10px] lg:text-sm font-medium">Processed</p>
          </div>
          <p className="text-sm lg:text-2xl font-bold text-slate-800">{salaryRecords.length} / {employees.length}</p>
        </div>
        <div className="bg-white p-4 lg:p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 lg:gap-3 mb-1 lg:mb-2">
            <div className="p-1.5 lg:p-2 bg-amber-50 rounded-lg">
              <AlertCircle className="w-4 h-4 lg:w-5 lg:h-5 text-amber-600" />
            </div>
            <p className="text-slate-500 text-[10px] lg:text-sm font-medium">Pending</p>
          </div>
          <p className="text-sm lg:text-2xl font-bold text-amber-600">{employees.length - salaryRecords.length}</p>
        </div>
        <div className="bg-white p-4 lg:p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 lg:gap-3 mb-1 lg:mb-2">
            <div className="p-1.5 lg:p-2 bg-indigo-50 rounded-lg">
              <Clock className="w-4 h-4 lg:w-5 lg:h-5 text-indigo-600" />
            </div>
            <p className="text-slate-500 text-[10px] lg:text-sm font-medium">Avg. Attendance</p>
          </div>
          <p className="text-sm lg:text-2xl font-bold text-slate-800">
            {salaryRecords.length > 0 
              ? Math.round((salaryRecords.reduce((acc, r) => acc + r.presentDays, 0) / (salaryRecords.length * (salaryRecords[0]?.workingDays || 22))) * 100)
              : 0}%
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-48">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="month" 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            />
          </div>
        </div>
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <button 
            onClick={handleGenerateAll}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 w-full lg:w-auto justify-center active:scale-95"
          >
            <Calculator className="w-5 h-5" />
            Calculate Salaries
          </button>
        </div>
      </div>

      {/* Salary List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">Employee</th>
                <th className="px-6 py-4 font-semibold">Attendance</th>
                <th className="px-6 py-4 font-semibold">Base Salary</th>
                <th className="px-6 py-4 font-semibold">Calculated</th>
                <th className="px-6 py-4 font-semibold">Net Payable</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employees.map((emp) => {
                const empId = emp.employeeId || emp.id;
                const record = salaryRecords.find(r => r.employeeId === empId);
                return (
                  <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs">
                          {emp.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{emp.name}</p>
                          <p className="text-xs text-slate-500">{empId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {record ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-emerald-600 font-bold">P: {record.presentDays}</span>
                            <span className="text-red-500 font-bold">A: {record.absentDays}</span>
                          </div>
                          <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-emerald-500" 
                              style={{ width: `${(record.presentDays / record.workingDays) * 100}%` }}
                            />
                          </div>
                        </div>
                      ) : '--'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{formatCurrency(emp.monthlySalary)}</td>
                    <td className="px-6 py-4">
                      {record ? (
                        <div className="text-xs space-y-0.5">
                          <p className="text-slate-500">Per Day: {formatCurrency(record.perDaySalary)}</p>
                          <p className="font-semibold text-slate-700">{formatCurrency(record.calculatedSalary)}</p>
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
                      <div className="flex items-center justify-end gap-2">
                        {record && (
                          <>
                            <button 
                              onClick={() => handleEdit(record)}
                              className="p-2 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors"
                              title="Edit Record"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => confirmDelete(record.id)}
                              className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                              title="Delete Record"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => generateSalarySlip(emp, record)}
                              className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                              title="Download Slip"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden divide-y divide-slate-100">
          {employees.map((emp) => {
            const empId = emp.employeeId || emp.id;
            const record = salaryRecords.find(r => r.employeeId === empId);
            return (
              <div key={emp.id} className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold border border-slate-200">
                      {emp.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{emp.name}</p>
                      <p className="text-[10px] text-slate-500">{empId}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    record ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                  }`}>
                    {record ? 'Processed' : 'Pending'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-50 p-2 rounded-xl">
                    <p className="text-[10px] text-slate-400 uppercase tracking-tighter mb-0.5">Base Salary</p>
                    <p className="text-xs text-slate-800 font-bold">{formatCurrency(emp.monthlySalary)}</p>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl">
                    <p className="text-[10px] text-slate-400 uppercase tracking-tighter mb-0.5">Net Payable</p>
                    <p className="text-xs text-slate-800 font-bold">{record ? formatCurrency(record.netSalary) : '--'}</p>
                  </div>
                </div>

                {record && (
                  <div className="bg-slate-50 p-3 rounded-xl space-y-2">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-500">Attendance</span>
                      <span className="font-bold text-slate-700">P: {record.presentDays} | A: {record.absentDays}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500" 
                        style={{ width: `${(record.presentDays / record.workingDays) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-50">
                  {record && (
                    <>
                      <button 
                        onClick={() => handleEdit(record)}
                        className="p-2 bg-slate-50 text-slate-600 rounded-lg active:scale-90 transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => confirmDelete(record.id)}
                        className="p-2 bg-red-50 text-red-500 rounded-lg active:scale-90 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => generateSalarySlip(emp, record)}
                        className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg font-bold text-[10px] active:scale-95 transition-all"
                      >
                        <Download className="w-3 h-3" />
                        Slip
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-8 text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Delete Record?</h3>
              <p className="text-slate-500 text-sm mb-8">Are you sure you want to delete this salary record? This action cannot be undone.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 px-6 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDelete}
                  disabled={loading}
                  className="flex-1 px-6 py-2 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-100 disabled:opacity-50"
                >
                  {loading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Salary Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-blue-600 text-white">
                <h3 className="text-xl font-bold">Edit Salary Record</h3>
                <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleUpdateRecord} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Attendance Section */}
                  <div className="space-y-4">
                    <h4 className="font-bold text-slate-800 flex items-center gap-2">
                      <UserCheck className="w-5 h-5 text-blue-600" />
                      Attendance Details
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-slate-700 block mb-1">Working Days</label>
                        <input 
                          type="number" 
                          value={editFormData.workingDays || 0}
                          onChange={(e) => setEditFormData({...editFormData, workingDays: Number(e.target.value)})}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 block mb-1">Present Days</label>
                        <input 
                          type="number" 
                          value={editFormData.presentDays || 0}
                          onChange={(e) => setEditFormData({...editFormData, presentDays: Number(e.target.value)})}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Overtime Section */}
                  <div className="space-y-4">
                    <h4 className="font-bold text-slate-800 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-indigo-600" />
                      Overtime & Bonus
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-slate-700 block mb-1">OT Hours</label>
                        <input 
                          type="number" 
                          value={editFormData.overtimeHours || 0}
                          onChange={(e) => setEditFormData({...editFormData, overtimeHours: Number(e.target.value)})}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 block mb-1">OT Pay (INR)</label>
                        <input 
                          type="number" 
                          value={editFormData.overtimePay || 0}
                          onChange={(e) => setEditFormData({...editFormData, overtimePay: Number(e.target.value)})}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Earnings Section */}
                  <div className="space-y-4">
                    <h4 className="font-bold text-slate-800 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-emerald-600" />
                      Additional Earnings
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-slate-700 block mb-1">Bonus (INR)</label>
                        <input 
                          type="number" 
                          value={editFormData.bonus || 0}
                          onChange={(e) => setEditFormData({...editFormData, bonus: Number(e.target.value)})}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 block mb-1">Incentive (INR)</label>
                        <input 
                          type="number" 
                          value={editFormData.incentive || 0}
                          onChange={(e) => setEditFormData({...editFormData, incentive: Number(e.target.value)})}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Deductions Section */}
                  <div className="space-y-4">
                    <h4 className="font-bold text-slate-800 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      Deductions
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-slate-700 block mb-1">PF (INR)</label>
                        <input 
                          type="number" 
                          value={editFormData.pf || 0}
                          onChange={(e) => setEditFormData({...editFormData, pf: Number(e.target.value)})}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 block mb-1">ESI (INR)</label>
                        <input 
                          type="number" 
                          value={editFormData.esi || 0}
                          onChange={(e) => setEditFormData({...editFormData, esi: Number(e.target.value)})}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1">Prof. Tax (INR)</label>
                    <input 
                      type="number" 
                      value={editFormData.professionalTax || 0}
                      onChange={(e) => setEditFormData({...editFormData, professionalTax: Number(e.target.value)})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1">Other Deductions (INR)</label>
                    <input 
                      type="number" 
                      value={editFormData.deduction || 0}
                      onChange={(e) => setEditFormData({...editFormData, deduction: Number(e.target.value)})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
                
                {/* Breakdown Summary */}
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                  <h4 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Salary Breakdown</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Fixed Monthly Salary:</span>
                      <span className="font-semibold">{formatCurrency(editingRecord?.baseSalary || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Per Day Salary ({formatCurrency(editingRecord?.baseSalary || 0)} / {editFormData.workingDays}):</span>
                      <span className="font-semibold">{formatCurrency((editingRecord?.baseSalary || 0) / editFormData.workingDays)}</span>
                    </div>
                    <div className="flex justify-between text-sm p-2 bg-blue-50 rounded-lg border border-blue-100">
                      <span className="text-blue-700 font-bold">Calculated Salary ({editFormData.presentDays} days):</span>
                      <span className="font-bold text-blue-700">{formatCurrency(((editingRecord?.baseSalary || 0) / editFormData.workingDays) * editFormData.presentDays)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-emerald-600">Additional Earnings (+):</span>
                      <span className="font-semibold text-emerald-600">+{formatCurrency(editFormData.overtimePay + editFormData.bonus + editFormData.incentive)}</span>
                    </div>
                    <div className="flex justify-between text-sm pb-3 border-b border-slate-200">
                      <span className="text-red-600">Total Deductions (-):</span>
                      <span className="font-semibold text-red-600">-{formatCurrency(editFormData.pf + editFormData.esi + editFormData.professionalTax + editFormData.deduction)}</span>
                    </div>
                    <div className="flex justify-between text-xl font-bold text-slate-900 pt-2">
                      <span>Net Payable:</span>
                      <span>{formatCurrency((((editingRecord?.baseSalary || 0) / editFormData.workingDays) * editFormData.presentDays) + editFormData.overtimePay + editFormData.bonus + editFormData.incentive - (editFormData.pf + editFormData.esi + editFormData.professionalTax + editFormData.deduction))}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button 
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-6 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="px-8 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50"
                  >
                    {loading ? 'Updating...' : 'Update Record'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
