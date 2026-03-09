import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, 
  Clock, 
  Flag, 
  MessageSquare, 
  CheckCircle2, 
  ChevronRight,
  Send
} from 'lucide-react';
import { Employee, Task, TaskComment } from '../../types';
import { collection, query, where, getDocs, updateDoc, doc, arrayUnion, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  employee: Employee;
}

export default function TaskSection({ employee }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [comment, setComment] = useState('');

  useEffect(() => {
    fetchTasks();
  }, [employee.id]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const empId = employee.employeeId || employee.id;
      const q = query(
        collection(db, 'tasks'), 
        where('assignedTo', '==', empId)
      );
      const snap = await getDocs(q);
      const list = snap.docs
        .map(d => ({ id: d.id, ...(d.data() as any) } as Task))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setTasks(list);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await updateDoc(doc(db, 'tasks', id), { status: 'completed' });
      toast.success('Task marked as completed!');
      fetchTasks();
      if (selectedTask?.id === id) setSelectedTask(null);
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment || !selectedTask) return;
    
    try {
      const newComment: TaskComment = {
        id: Date.now().toString(),
        userId: employee.employeeId || employee.id,
        userName: employee.name,
        text: comment,
        timestamp: new Date().toISOString()
      };

      await updateDoc(doc(db, 'tasks', selectedTask.id), {
        comments: arrayUnion(newComment)
      });

      setComment('');
      fetchTasks();
      // Update local selected task
      setSelectedTask({...selectedTask, comments: [...selectedTask.comments, newComment]});
    } catch (error) {
      toast.error('Failed to add comment');
    }
  };

  const currentUserId = employee.employeeId || employee.id;

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-bold text-slate-800 px-2">Assigned Tasks</h2>

      <div className="space-y-4">
        {loading ? (
          <div className="py-12 text-center text-slate-400">Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="py-12 text-center text-slate-400">No tasks assigned</div>
        ) : (
          tasks.map((task) => (
            <div 
              key={task.id} 
              onClick={() => setSelectedTask(task)}
              className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm active:scale-95 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                  task.priority === 'high' ? 'bg-red-50 text-red-600' :
                  task.priority === 'medium' ? 'bg-amber-50 text-amber-600' :
                  'bg-blue-50 text-blue-600'
                }`}>
                  {task.priority}
                </span>
                <span className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest ${
                  task.status === 'completed' ? 'text-emerald-600' : 'text-amber-600'
                }`}>
                  {task.status === 'completed' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                  {task.status}
                </span>
              </div>
              <h4 className="font-bold text-slate-800 mb-1">{task.title}</h4>
              <p className="text-xs text-slate-500 line-clamp-1 mb-4">{task.description}</p>
              
              <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                    <MessageSquare className="w-3 h-3" />
                    {task.comments.length}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                  <Clock className="w-3 h-3" />
                  Due {task.deadline}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Task Detail Modal */}
      <AnimatePresence>
        {selectedTask && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl w-full max-w-md h-[80vh] flex flex-col overflow-hidden"
            >
              <div className="p-8 border-b border-slate-50 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">{selectedTask.title}</h3>
                  <p className="text-xs text-slate-500 mt-1">Due on {selectedTask.deadline}</p>
                </div>
                <button onClick={() => setSelectedTask(null)} className="p-2 bg-slate-50 rounded-full text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Description</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">{selectedTask.description}</p>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Comments ({selectedTask.comments.length})</h4>
                  <div className="space-y-4">
                    {selectedTask.comments.map((c) => (
                      <div key={c.id} className={`flex flex-col ${c.userId === currentUserId ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[80%] p-4 rounded-2xl text-sm ${
                          c.userId === currentUserId ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-100 text-slate-800 rounded-tl-none'
                        }`}>
                          {c.text}
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1">{c.userName} • {new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-50 bg-slate-50/50 space-y-4 shrink-0">
                {selectedTask.status === 'pending' && (
                  <button 
                    onClick={() => handleComplete(selectedTask.id)}
                    className="w-full py-4 bg-emerald-600 text-white rounded-3xl font-bold text-lg shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all"
                  >
                    Mark as Completed
                  </button>
                )}
                <form onSubmit={handleAddComment} className="relative">
                  <input 
                    type="text" 
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="w-full pl-6 pr-14 py-4 bg-white border border-slate-200 rounded-3xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                  />
                  <button 
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-100"
                  >
                    <Send className="w-4 h-4" />
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
