import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Calendar, 
  User,
  MessageSquare,
  Filter,
  Search
} from 'lucide-react';
import { collection, getDocs, query, where, doc, updateDoc, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { LeaveRequest } from '../../types';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';

export default function LeaveManagement() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  useEffect(() => {
    fetchLeaves();
  }, [filter]);

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      let q;
      if (filter === 'all') {
        q = query(collection(db, 'leaves'));
      } else {
        q = query(collection(db, 'leaves'), where('status', '==', filter));
      }
      const querySnapshot = await getDocs(q);
      const list = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...(doc.data() as any) } as LeaveRequest))
        .sort((a, b) => b.appliedAt.localeCompare(a.appliedAt));
      setLeaves(list);
    } catch (error) {
      console.error("Error fetching leaves:", error);
      setLeaves([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'leaves', id), { status });
      toast.success(`Leave request ${status}`);
      fetchLeaves();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm w-fit">
        {['pending', 'approved', 'rejected', 'all'].map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t as any)}
            className={`px-6 py-2 rounded-xl text-sm font-medium transition-all capitalize ${
              filter === t ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Leave Requests List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-2 py-12 text-center text-slate-400">Loading requests...</div>
        ) : leaves.length === 0 ? (
          <div className="col-span-2 py-12 text-center text-slate-400">No leave requests found</div>
        ) : (
          leaves.map((leave) => (
            <motion.div 
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              key={leave.id} 
              className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold">
                    {leave.employeeName.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">{leave.employeeName}</h4>
                    <p className="text-xs text-slate-500">Applied on {new Date(leave.appliedAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  leave.type === 'Sick' ? 'bg-red-50 text-red-600' :
                  leave.type === 'Casual' ? 'bg-blue-50 text-blue-600' :
                  'bg-amber-50 text-amber-600'
                }`}>
                  {leave.type}
                </span>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="font-medium">{leave.startDate}</span>
                  <span className="text-slate-300">to</span>
                  <span className="font-medium">{leave.endDate}</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-slate-600">
                  <MessageSquare className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <p className="italic">"{leave.reason}"</p>
                </div>
              </div>

              {leave.status === 'pending' ? (
                <div className="flex gap-3">
                  <button 
                    onClick={() => handleAction(leave.id, 'approved')}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Approve
                  </button>
                  <button 
                    onClick={() => handleAction(leave.id, 'rejected')}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-all"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                </div>
              ) : (
                <div className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold ${
                  leave.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                }`}>
                  {leave.status === 'approved' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  {leave.status === 'approved' ? 'Approved' : 'Rejected'}
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
