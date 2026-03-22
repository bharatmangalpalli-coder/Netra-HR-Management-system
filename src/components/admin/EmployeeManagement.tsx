import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  MoreVertical,
  UserPlus,
  Filter,
  Download,
  Calendar
} from 'lucide-react';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '../../lib/firebase';
import { Employee } from '../../types';
import { formatCurrency } from '../../lib/utils';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import EmployeeAttendanceCalendar from './EmployeeAttendanceCalendar';

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployeeForCalendar, setSelectedEmployeeForCalendar] = useState<{id: string, name: string} | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '', // Added for auth
    password: 'password123', // Default password
    mobile: '',
    address: '',
    aadhaar: '',
    joiningDate: new Date().toISOString().split('T')[0],
    exitDate: '',
    designation: '',
    monthlySalary: 0,
    role: 'EMPLOYEE' as any,
    shiftStart: '09:00',
    shiftEnd: '18:00',
    isFlexibleShift: false
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'employees'), orderBy('employeeId', 'asc'));
      const querySnapshot = await getDocs(q);
      const empList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
      setEmployees(empList);
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast.error("Failed to load employees");
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEditMode && editingId) {
        const empRef = doc(db, 'employees', editingId);
        await updateDoc(empRef, {
          name: formData.name,
          mobile: formData.mobile,
          address: formData.address,
          aadhaar: formData.aadhaar,
          joiningDate: formData.joiningDate,
          exitDate: formData.exitDate || null,
          designation: formData.designation,
          monthlySalary: formData.monthlySalary,
          email: formData.email,
          shiftStart: formData.shiftStart,
          shiftEnd: formData.shiftEnd,
          isFlexibleShift: formData.isFlexibleShift
        });
        toast.success('Employee updated successfully');
      } else {
        const employeeId = `EMP${String(employees.length + 1).padStart(3, '0')}`;
        const newEmployee = {
          employeeId,
          name: formData.name,
          mobile: formData.mobile,
          address: formData.address,
          aadhaar: formData.aadhaar,
          joiningDate: formData.joiningDate,
          exitDate: formData.exitDate || null,
          designation: formData.designation,
          monthlySalary: formData.monthlySalary,
          role: formData.role,
          status: 'active',
          email: formData.email,
          shiftStart: formData.shiftStart,
          shiftEnd: formData.shiftEnd,
          isFlexibleShift: formData.isFlexibleShift
        };
        await addDoc(collection(db, 'employees'), newEmployee);
        toast.success('Employee added successfully');
      }
      
      setIsModalOpen(false);
      fetchEmployees();
      resetForm();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save employee');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '', email: '', password: 'password123', mobile: '', address: '', aadhaar: '',
      joiningDate: new Date().toISOString().split('T')[0], exitDate: '', designation: '', monthlySalary: 0, role: 'EMPLOYEE',
      shiftStart: '09:00', shiftEnd: '18:00', isFlexibleShift: false
    });
    setIsEditMode(false);
    setEditingId(null);
  };

  const handleEdit = (emp: Employee) => {
    setFormData({
      name: emp.name || '',
      email: (emp as any).email || '',
      password: 'password123',
      mobile: emp.mobile || '',
      address: emp.address || '',
      aadhaar: emp.aadhaar || '',
      joiningDate: emp.joiningDate || new Date().toISOString().split('T')[0],
      exitDate: emp.exitDate || '',
      designation: emp.designation || '',
      monthlySalary: emp.monthlySalary || 0,
      role: emp.role || 'EMPLOYEE',
      shiftStart: emp.shiftStart || '09:00',
      shiftEnd: emp.shiftEnd || '18:00',
      isFlexibleShift: emp.isFlexibleShift || false
    });
    setEditingId(emp.id);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'employees', deletingId));
      toast.success('Employee deleted');
      setIsDeleteModalOpen(false);
      setDeletingId(null);
      fetchEmployees();
    } catch (error) {
      toast.error('Failed to delete');
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (id: string) => {
    setDeletingId(id);
    setIsDeleteModalOpen(true);
  };

  const filteredEmployees = employees.filter(emp => {
    const empId = emp.employeeId || emp.id;
    return emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           empId.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleExport = () => {
    if (employees.length === 0) {
      return toast.error("No employees to export");
    }
    
    const headers = ['Employee ID', 'Name', 'Email', 'Mobile', 'Designation', 'Joining Date', 'Monthly Salary', 'Status'];
    const csvContent = [
      headers.join(','),
      ...employees.map(emp => [
        emp.employeeId,
        emp.name,
        (emp as any).email || '',
        emp.mobile || '',
        emp.designation || '',
        emp.joiningDate,
        emp.monthlySalary,
        emp.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `employees_list.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Employee list exported successfully");
  };

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button 
            onClick={handleExport}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-xl border border-slate-200 hover:bg-slate-100 transition-all font-medium"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button 
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 font-medium"
          >
            <UserPlus className="w-4 h-4" />
            Add Employee
          </button>
        </div>
      </div>

      {/* Employee List/Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">Employee</th>
                <th className="px-6 py-4 font-semibold">Designation</th>
                <th className="px-6 py-4 font-semibold">Shift</th>
                <th className="px-6 py-4 font-semibold">Contact</th>
                <th className="px-6 py-4 font-semibold">Joining Date</th>
                <th className="px-6 py-4 font-semibold">Salary</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">Loading employees...</td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">No employees found</td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold border border-blue-100">
                          {emp.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{emp.name}</p>
                          <p className="text-xs text-slate-500">{emp.employeeId || emp.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-600">{emp.designation || 'N/A'}</p>
                    </td>
                    <td className="px-6 py-4">
                      {emp.isFlexibleShift ? (
                        <span className="px-2 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-lg uppercase tracking-wider">Flexible</span>
                      ) : (
                        <div className="flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded-lg w-fit">
                          <span>{emp.shiftStart || '09:00'}</span>
                          <span className="text-slate-400">-</span>
                          <span>{emp.shiftEnd || '18:00'}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-600">{emp.mobile}</p>
                      <p className="text-xs text-slate-400">Aadhaar: {emp.aadhaar}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-600">{emp.joiningDate}</p>
                      {emp.exitDate && <p className="text-[10px] text-red-500 font-medium">Exit: {emp.exitDate}</p>}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-800">{formatCurrency(emp.monthlySalary)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        emp.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {emp.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => setSelectedEmployeeForCalendar({ id: emp.employeeId || emp.id, name: emp.name })}
                          className="p-2 hover:bg-emerald-50 text-emerald-600 rounded-lg transition-colors"
                          title="View Attendance Calendar"
                        >
                          <Calendar className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleEdit(emp)}
                          className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => confirmDelete(emp.id)}
                          className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading employees...</div>
          ) : filteredEmployees.length === 0 ? (
            <div className="p-8 text-center text-slate-400">No employees found</div>
          ) : (
            filteredEmployees.map((emp) => (
              <div key={emp.id} className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold border border-blue-100">
                      {emp.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{emp.name}</p>
                      <p className="text-[10px] text-slate-500">{emp.employeeId || emp.id}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    emp.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {emp.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-[11px]">
                  <div>
                    <p className="text-slate-400 uppercase tracking-tighter mb-0.5">Designation</p>
                    <p className="text-slate-700 font-medium">{emp.designation || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 uppercase tracking-tighter mb-0.5">Salary</p>
                    <p className="text-slate-700 font-medium">{formatCurrency(emp.monthlySalary)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 uppercase tracking-tighter mb-0.5">Contact</p>
                    <p className="text-slate-700 font-medium">{emp.mobile}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 uppercase tracking-tighter mb-0.5">Shift</p>
                    {emp.isFlexibleShift ? (
                      <span className="text-indigo-600 font-bold">Flexible</span>
                    ) : (
                      <p className="text-slate-700 font-medium">{emp.shiftStart} - {emp.shiftEnd}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-50">
                  <button 
                    onClick={() => setSelectedEmployeeForCalendar({ id: emp.employeeId || emp.id, name: emp.name })}
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold active:scale-95 transition-all"
                  >
                    <Calendar className="w-4 h-4" />
                    Calendar
                  </button>
                  <button 
                    onClick={() => handleEdit(emp)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold active:scale-95 transition-all"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                  <button 
                    onClick={() => confirmDelete(emp.id)}
                    className="p-2 bg-red-50 text-red-600 rounded-xl active:scale-95 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center"
            >
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Delete Employee?</h3>
              <p className="text-slate-500 text-xs mb-6 px-4">This action cannot be undone. All data will be permanently removed.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-2xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDelete}
                  disabled={loading}
                  className="flex-1 py-3 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 transition-all shadow-lg shadow-red-100 disabled:opacity-50"
                >
                  {loading ? '...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Employee Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-end lg:items-center justify-center bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-white rounded-t-[2.5rem] lg:rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 p-6 border-b border-slate-100 flex items-center justify-between bg-white z-10">
                <h3 className="text-xl font-bold text-slate-800">{isEditMode ? 'Edit Employee' : 'Add New Employee'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>
              <form onSubmit={handleAddEmployee} className="p-6 lg:p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Full Name</label>
                    <input 
                      required
                      type="text" 
                      value={formData.name || ''}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="input-field"
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Email Address</label>
                    <input 
                      required
                      type="email" 
                      value={formData.email || ''}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="input-field"
                      placeholder="john@company.com"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Mobile Number</label>
                    <input 
                      required
                      type="tel" 
                      value={formData.mobile || ''}
                      onChange={(e) => setFormData({...formData, mobile: e.target.value})}
                      className="input-field"
                      placeholder="+91 98765 43210"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Aadhaar Number</label>
                    <input 
                      required
                      type="text" 
                      value={formData.aadhaar || ''}
                      onChange={(e) => setFormData({...formData, aadhaar: e.target.value})}
                      className="input-field"
                      placeholder="0000 0000 0000"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Designation</label>
                    <input 
                      type="text" 
                      value={formData.designation || ''}
                      onChange={(e) => setFormData({...formData, designation: e.target.value})}
                      className="input-field"
                      placeholder="Software Engineer"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Monthly Salary (INR)</label>
                    <input 
                      required
                      type="number" 
                      value={formData.monthlySalary || 0}
                      onChange={(e) => setFormData({...formData, monthlySalary: Number(e.target.value)})}
                      className="input-field"
                      placeholder="45000"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Joining Date</label>
                    <input 
                      required
                      type="date" 
                      value={formData.joiningDate || ''}
                      onChange={(e) => setFormData({...formData, joiningDate: e.target.value})}
                      className="input-field"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Exit Date (Optional)</label>
                    <input 
                      type="date" 
                      value={formData.exitDate || ''}
                      onChange={(e) => setFormData({...formData, exitDate: e.target.value})}
                      className="input-field"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <input 
                      type="checkbox" 
                      id="isFlexibleShift"
                      checked={formData.isFlexibleShift}
                      onChange={(e) => setFormData({...formData, isFlexibleShift: e.target.checked})}
                      className="w-5 h-5 text-blue-600 rounded-lg focus:ring-blue-500 border-slate-300"
                    />
                    <label htmlFor="isFlexibleShift" className="text-sm font-bold text-slate-700">Flexible Shift (No fixed timings)</label>
                  </div>

                  {!formData.isFlexibleShift && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Start Time</label>
                        <input 
                          required
                          type="time" 
                          value={formData.shiftStart || '09:00'}
                          onChange={(e) => setFormData({...formData, shiftStart: e.target.value})}
                          className="input-field"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">End Time</label>
                        <input 
                          required
                          type="time" 
                          value={formData.shiftEnd || '18:00'}
                          onChange={(e) => setFormData({...formData, shiftEnd: e.target.value})}
                          className="input-field"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Address</label>
                  <textarea 
                    required
                    value={formData.address || ''}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    className="input-field h-24 resize-none"
                    placeholder="Full residential address..."
                  />
                </div>

                <div className="flex flex-col lg:flex-row justify-end gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="w-full lg:w-auto px-8 py-4 text-slate-600 font-bold hover:bg-slate-50 rounded-2xl transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary w-full lg:w-auto"
                  >
                    {loading ? 'Saving...' : (isEditMode ? 'Update Employee' : 'Save Employee')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {selectedEmployeeForCalendar && (
          <EmployeeAttendanceCalendar 
            employeeId={selectedEmployeeForCalendar.id}
            employeeName={selectedEmployeeForCalendar.name}
            onClose={() => setSelectedEmployeeForCalendar(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function X({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
  );
}
