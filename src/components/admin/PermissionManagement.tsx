import React, { useState, useEffect } from 'react';
import { 
  Check, 
  X, 
  Clock, 
  Search,
  CheckCircle2,
  XCircle,
  Clock3,
  Calendar
} from 'lucide-react';
import { PermissionRequest } from '../../types';
import { collection, query, getDocs, updateDoc, doc, orderBy, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import toast from 'react-hot-toast';

export default function PermissionManagement() {
  const [requests, setRequests] = useState<PermissionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'permissions'), 
        orderBy('appliedAt', 'desc'),
        limit(50)
      );
      const snap = await getDocs(q);
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() } as PermissionRequest)));
    } catch (error) {
      console.error("Error fetching permissions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'permissions', id), { status });
      toast.success(`Request ${status}`);
      fetchRequests();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const filteredRequests = requests.filter(req => 
    req.employeeName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Permission Requests</h2>
          <p className="text-sm text-slate-500">Manage short-leave permissions (1 hour limit)</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text"
            placeholder="Search employee..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date & Time</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Reason</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <Clock className="w-8 h-8 animate-spin mx-auto mb-2 opacity-20" />
                    Loading requests...
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    No requests found
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                          {req.employeeName[0]}
                        </div>
                        <span className="font-semibold text-slate-800">{req.employeeName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                          <Calendar className="w-3.5 h-3.5" />
                          {req.date}
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500 text-xs mt-1">
                          <Clock className="w-3.5 h-3.5" />
                          {req.timeSlot}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-600 max-w-xs truncate" title={req.reason}>
                        {req.reason}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                        req.status === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                        req.status === 'rejected' ? 'bg-red-50 text-red-600' :
                        'bg-amber-50 text-amber-600'
                      }`}>
                        {req.status === 'approved' ? <CheckCircle2 className="w-3.5 h-3.5" /> :
                         req.status === 'rejected' ? <XCircle className="w-3.5 h-3.5" /> :
                         <Clock3 className="w-3.5 h-3.5" />}
                        <span className="capitalize">{req.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {req.status === 'pending' ? (
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleAction(req.id, 'approved')}
                            className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"
                            title="Approve"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleAction(req.id, 'rejected')}
                            className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                            title="Reject"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium italic">Handled</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
