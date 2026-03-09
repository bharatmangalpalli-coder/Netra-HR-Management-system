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
  X
} from 'lucide-react';
import { collection, getDocs, addDoc, query, where, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Employee, SalaryRecord } from '../../types';
import { formatCurrency } from '../../lib/utils';
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
    let y = 115;
    
    // Earnings
    doc.text('Base Salary:', 20, y);
    doc.text(formatCurrency(record.baseSalary), 150, y);
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
          incentive: 0,
          pf: 0,
          esi: 0,
          professionalTax: 0,
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

  const handleEdit = (record: SalaryRecord) => {
    setEditingRecord(record);
    setEditFormData({
      bonus: record.bonus,
      incentive: record.incentive || 0,
      pf: record.pf || 0,
      esi: record.esi || 0,
      professionalTax: record.professionalTax || 0,
      deduction: record.deduction
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    setLoading(true);
    try {
      const totalEarnings = editingRecord.baseSalary + editFormData.bonus + editFormData.incentive;
      const totalDeductions = editFormData.pf + editFormData.esi + editFormData.professionalTax + editFormData.deduction;
      const netSalary = totalEarnings - totalDeductions;

      await updateDoc(doc(db, 'salary', editingRecord.id), {
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
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
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
                        <div className="text-[10px] space-y-0.5">
                          <p className="text-emerald-600">Bonus: +{formatCurrency(record.bonus)}</p>
                          <p className="text-emerald-600">Inc: +{formatCurrency(record.incentive || 0)}</p>
                          <p className="text-red-600">PF: -{formatCurrency(record.pf || 0)}</p>
                          <p className="text-red-600">ESI: -{formatCurrency(record.esi || 0)}</p>
                          <p className="text-red-600">PT: -{formatCurrency(record.professionalTax || 0)}</p>
                          <p className="text-red-600">Other: -{formatCurrency(record.deduction)}</p>
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
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-blue-600 text-white">
                <h3 className="text-xl font-bold">Edit Salary Record</h3>
                <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleUpdateRecord} className="p-8 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1">Bonus (INR)</label>
                    <input 
                      type="number" 
                      value={editFormData.bonus}
                      onChange={(e) => setEditFormData({...editFormData, bonus: Number(e.target.value)})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1">Incentive (INR)</label>
                    <input 
                      type="number" 
                      value={editFormData.incentive}
                      onChange={(e) => setEditFormData({...editFormData, incentive: Number(e.target.value)})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1">PF (INR)</label>
                    <input 
                      type="number" 
                      value={editFormData.pf}
                      onChange={(e) => setEditFormData({...editFormData, pf: Number(e.target.value)})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1">ESI (INR)</label>
                    <input 
                      type="number" 
                      value={editFormData.esi}
                      onChange={(e) => setEditFormData({...editFormData, esi: Number(e.target.value)})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1">Prof. Tax (INR)</label>
                    <input 
                      type="number" 
                      value={editFormData.professionalTax}
                      onChange={(e) => setEditFormData({...editFormData, professionalTax: Number(e.target.value)})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1">Other Deductions (INR)</label>
                    <input 
                      type="number" 
                      value={editFormData.deduction}
                      onChange={(e) => setEditFormData({...editFormData, deduction: Number(e.target.value)})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
                
                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600">Base Salary:</span>
                    <span className="font-semibold">{formatCurrency(editingRecord?.baseSalary || 0)}</span>
                  </div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-emerald-600">Total Earnings (+):</span>
                    <span className="font-semibold text-emerald-600">+{formatCurrency((editingRecord?.baseSalary || 0) + editFormData.bonus + editFormData.incentive)}</span>
                  </div>
                  <div className="flex justify-between text-xs mb-3 pb-3 border-b border-blue-200">
                    <span className="text-red-600">Total Deductions (-):</span>
                    <span className="font-semibold text-red-600">-{formatCurrency(editFormData.pf + editFormData.esi + editFormData.professionalTax + editFormData.deduction)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-blue-700">
                    <span>Net Payable:</span>
                    <span>{formatCurrency(((editingRecord?.baseSalary || 0) + editFormData.bonus + editFormData.incentive) - (editFormData.pf + editFormData.esi + editFormData.professionalTax + editFormData.deduction))}</span>
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
