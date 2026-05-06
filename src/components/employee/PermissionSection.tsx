import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Send, 
  History, 
  CheckCircle2, 
  XCircle, 
  Clock3,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { Employee, PermissionRequest } from '../../types';
import { collection, query, where, getDocs, addDoc, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { getTodayDate } from '../../lib/utils';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import PageHeader from '../ui/PageHeader';

interface Props {
  employee: Employee;
  onBack: () => void;
}

export default function PermissionSection({ employee, onBack }: Props) {
  const [requests, setRequests] = useState<PermissionRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [usageCount, setUsageCount] = useState(0);

  // Form states
  const [date, setDate] = useState(getTodayDate());
  const [timeFrom, setTimeFrom] = useState('');
  const [timeTo, setTimeTo] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    fetchRequests();
    checkMonthlyUsage();
  }, [employee.id]);

  const checkMonthlyUsage = async () => {
    try {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

      const empId = employee.employeeId || employee.id;
      const q = query(
        collection(db, 'permissions'), 
        where('employeeId', '==', empId),
        where('date', '>=', firstDay),
        where('date', '<=', lastDay),
        where('status', '==', 'approved')
      );
      
      const snap = await getDocs(q);
      setUsageCount(snap.size);
    } catch (error) {
      console.error("Error checking usage:", error);
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const empId = employee.employeeId || employee.id;
      const q = query(
        collection(db, 'permissions'), 
        where('employeeId', '==', empId),
        orderBy('appliedAt', 'desc'),
        limit(10)
      );
      const snap = await getDocs(q);
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() } as PermissionRequest)));
    } catch (error) {
      console.error("Error fetching permissions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (usageCount >= 2) {
      toast.error('Monthly permission limit (2) reached');
      return;
    }

    if (!timeFrom || !timeTo) {
      toast.error('Please select time slot');
      return;
    }

    setLoading(true);
    try {
      const empId = employee.employeeId || employee.id;
      const newRequest = {
        employeeId: empId,
        employeeName: employee.name,
        date,
        timeSlot: `${timeFrom} - ${timeTo}`,
        reason,
        status: 'pending',
        appliedAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'permissions'), newRequest);
      toast.success('Permission request sent for approval');
      setShowForm(false);
      fetchRequests();
      setReason('');
    } catch (error) {
      toast.error('Failed to send request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader 
          title="Permissions" 
          subtitle="Short Leave (Max 1 Hour)" 
          onBack={onBack} 
        />
        <button 
          onClick={() => setShowForm(!showForm)}
          className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-100 mb-6"
        >
          {showForm ? <Clock className="w-5 h-5" /> : <Send className="w-5 h-5" />}
        </button>
      </div>

      {/* Usage Counter */}
      <div className="card bg-slate-900 border-none flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
            <Clock3 className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Monthly Quota</p>
            <p className="text-sm font-bold text-white">{usageCount} / 2 Used</p>
          </div>
        </div>
        <div className="h-1.5 w-24 bg-white/10 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-500 transition-all duration-500" 
            style={{ width: `${(usageCount / 2) * 100}%` }}
          ></div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {showForm ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="card"
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Select Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="date" 
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">From</label>
                  <input 
                    type="time" 
                    value={timeFrom}
                    onChange={(e) => setTimeFrom(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">To</label>
                  <input 
                    type="time" 
                    value={timeTo}
                    onChange={(e) => setTimeTo(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Reason</label>
                <textarea 
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm min-h-[100px]"
                  placeholder="Why do you need permission?"
                  required
                />
              </div>

              <button 
                type="submit" 
                disabled={loading || usageCount >= 2}
                className="w-full btn bg-blue-600 text-white h-12 shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
              >
                {loading ? 'Submitting...' : 'Submit Request'}
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            {requests.length === 0 && !loading && (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">No permission requests yet</p>
              </div>
            )}

            {requests.map((req) => (
              <div key={req.id} className="card flex items-center justify-between py-4">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    req.status === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                    req.status === 'rejected' ? 'bg-red-50 text-red-600' :
                    'bg-amber-50 text-amber-600'
                  }`}>
                    {req.status === 'approved' ? <CheckCircle2 className="w-5 h-5" /> :
                     req.status === 'rejected' ? <XCircle className="w-5 h-5" /> :
                     <Clock3 className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">{req.timeSlot}</p>
                    <p className="text-[10px] text-slate-500">{new Date(req.date).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-0.5 rounded-lg text-[8px] font-bold uppercase tracking-wider ${
                    req.status === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                    req.status === 'rejected' ? 'bg-red-50 text-red-600' :
                    'bg-amber-50 text-amber-600'
                  }`}>
                    {req.status}
                  </span>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
