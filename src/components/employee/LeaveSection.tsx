import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Calendar, 
  MessageSquare, 
  CheckCircle2, 
  XCircle, 
  Clock,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { Employee, LeaveRequest } from '../../types';
import { collection, query, where, getDocs, addDoc, orderBy } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import PageHeader from '../ui/PageHeader';

interface Props {
  employee: Employee;
  onBack: () => void;
}

export default function LeaveSection({ employee, onBack }: Props) {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [monthlyUsage, setMonthlyUsage] = useState(0);
  
  const [formData, setFormData] = useState({
    type: 'Casual' as any,
    startDate: '',
    endDate: '',
    reason: ''
  });

  useEffect(() => {
    fetchLeaves();
    fetchMonthlyUsage();
  }, [employee.id]);

  const fetchMonthlyUsage = async () => {
    try {
      const now = new Date();
      const first = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      const empId = employee.employeeId || employee.id;
      const q = query(
        collection(db, 'leaves'),
        where('employeeId', '==', empId),
        where('status', '==', 'approved'),
        where('startDate', '>=', first),
        where('startDate', '<=', last)
      );
      const snap = await getDocs(q);
      setMonthlyUsage(snap.size);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const empId = employee.employeeId || employee.id;
      const q = query(
        collection(db, 'leaves'), 
        where('employeeId', '==', empId)
      );
      const snap = await getDocs(q);
      const list = snap.docs
        .map(d => ({ id: d.id, ...(d.data() as any) } as LeaveRequest))
        .sort((a, b) => b.appliedAt.localeCompare(a.appliedAt));
      setLeaves(list);
    } catch (error) {
      console.error("Error fetching leaves:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Rule: Each employee is allowed 1 Full-Day Leave per month.
      // If they request more, it's marked as Unpaid (LWP).
      const isExtra = monthlyUsage >= 1;
      
      const newLeave = {
        ...formData,
        userId: auth?.currentUser?.uid, // Add UID for security rules
        type: isExtra ? 'LWP (Unpaid)' : formData.type,
        employeeId: employee.employeeId || employee.id,
        employeeName: employee.name,
        status: 'pending',
        appliedAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'leaves'), newLeave);
      toast.success(isExtra ? 'LWP Leave Applied (Limit Reached)' : 'Leave applied successfully');
      setIsModalOpen(false);
      fetchLeaves();
      fetchMonthlyUsage();
      setFormData({ type: 'Casual', startDate: '', endDate: '', reason: '' });
    } catch (error) {
      toast.error('Failed to apply for leave');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <PageHeader 
          title="Leave Requests" 
          subtitle="Time Off Management" 
          onBack={onBack} 
        />
        <button 
          onClick={() => setIsModalOpen(true)}
          className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-100 mb-6"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="py-12 text-center text-slate-400">Loading requests...</div>
        ) : leaves.length === 0 ? (
          <div className="py-12 text-center text-slate-400">No leave requests found</div>
        ) : (
          leaves.map((leave) => (
            <div key={leave.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                  leave.type === 'Sick' ? 'bg-red-50 text-red-600' :
                  leave.type === 'Casual' ? 'bg-blue-50 text-blue-600' :
                  'bg-amber-50 text-amber-600'
                }`}>
                  {leave.type}
                </span>
                <span className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest ${
                  leave.status === 'approved' ? 'text-emerald-600' :
                  leave.status === 'rejected' ? 'text-red-600' :
                  'text-amber-600'
                }`}>
                  {leave.status === 'approved' ? <CheckCircle2 className="w-3 h-3" /> :
                   leave.status === 'rejected' ? <XCircle className="w-3 h-3" /> :
                   <Clock className="w-3 h-3" />}
                  {leave.status}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-1">
                <Calendar className="w-4 h-4 text-slate-400" />
                {leave.startDate} <ChevronRight className="w-3 h-3 inline text-slate-300" /> {leave.endDate}
              </div>
              <p className="text-xs text-slate-500 line-clamp-1 italic">"{leave.reason}"</p>
            </div>
          ))
        )}
      </div>

      {/* Apply Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-bold text-slate-800">Apply Leave</h3>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-50 rounded-full text-slate-400">
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>
                <form onSubmit={handleApply} className="space-y-6">
                  {monthlyUsage >= 1 && (
                    <div className="bg-amber-50 border border-amber-100 p-3 rounded-2xl flex gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-amber-900">Monthly Limit Reached</p>
                        <p className="text-[10px] text-amber-700 font-medium">You have already used your 1-day paid leave for this month. This request will be marked as <span className="font-bold">LWP (Unpaid)</span>.</p>
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Leave Type</label>
                    <div className="grid grid-cols-3 gap-3">
                      {['Casual', 'Sick', 'Emergency'].map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setFormData({...formData, type: t as any})}
                          className={`py-3 rounded-2xl text-sm font-bold transition-all ${
                            formData.type === t ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-slate-50 text-slate-500'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Start Date</label>
                      <input 
                        required
                        type="date" 
                        value={formData.startDate}
                        onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">End Date</label>
                      <input 
                        required
                        type="date" 
                        value={formData.endDate}
                        onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Reason</label>
                    <textarea 
                      required
                      value={formData.reason}
                      onChange={(e) => setFormData({...formData, reason: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none h-24 font-medium"
                      placeholder="Brief reason for leave..."
                    />
                  </div>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-blue-600 text-white rounded-3xl font-bold text-lg shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50"
                  >
                    {loading ? 'Submitting...' : 'Submit Request'}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
