import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  MapPin, 
  CheckCircle2, 
  AlertCircle,
  History,
  X,
  RefreshCw,
  UserCheck,
  UserMinus,
  UserPlus,
  Camera,
  Check
} from 'lucide-react';
import { Employee, Attendance } from '../../types';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, limit, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { getTodayDate } from '../../lib/utils';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  employee: Employee;
}

export default function AttendanceSection({ employee }: Props) {
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<Attendance[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [pendingAction, setPendingAction] = useState<'in' | 'out' | 'break-in' | 'break-out' | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  useEffect(() => {
    fetchTodayAttendance();
    fetchHistory();
  }, [employee.id]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' },
        audio: false 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      toast.error('Camera access denied');
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        setCapturedImage(dataUrl);
        stopCamera();
      }
    }
  };

  const handleActionClick = (action: 'in' | 'out' | 'break-in' | 'break-out') => {
    setPendingAction(action);
    setShowCamera(true);
    setCapturedImage(null);
    setTimeout(startCamera, 100);
  };

  const fetchTodayAttendance = async () => {
    setLoading(true);
    try {
      const today = getTodayDate();
      const empId = employee.employeeId || employee.id;
      const q = query(
        collection(db, 'attendance'), 
        where('employeeId', '==', empId),
        where('date', '==', today),
        limit(1)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        setTodayAttendance({ id: snap.docs[0].id, ...snap.docs[0].data() } as Attendance);
      }
    } catch (error) {
      console.error("Error fetching today attendance:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const empId = employee.employeeId || employee.id;
      const q = query(
        collection(db, 'attendance'), 
        where('employeeId', '==', empId)
      );
      const snap = await getDocs(q);
      const list = snap.docs
        .map(d => ({ id: d.id, ...(d.data() as any) } as Attendance))
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 10);
      setHistory(list);
    } catch (error) {
      console.error("Error fetching attendance history:", error);
    }
  };

  const updateAttendance = async (action: 'in' | 'out' | 'break-in' | 'break-out', selfie: string) => {
    setLoading(true);
    try {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const empId = employee.employeeId || employee.id;

      if (action === 'in') {
        // Get Location
        let location = { lat: 0, lng: 0 };
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 5000,
              maximumAge: 0
            });
          });
          location = { lat: position.coords.latitude, lng: position.coords.longitude };
        } catch (e) {
          console.warn("Location access denied or failed");
        }

        const newAttendance = {
          employeeId: empId,
          employeeName: employee.name,
          date: getTodayDate(),
          inTime: timeStr,
          outTime: null,
          breakInTime: null,
          breakOutTime: null,
          location,
          selfieUrl: selfie,
          status: 'present',
          markedAt: new Date().toISOString()
        };

        await addDoc(collection(db, 'attendance'), newAttendance);
        toast.success('Clocked in successfully');
      } else {
        if (!todayAttendance) return;

        const updates: any = {};
        if (action === 'out') {
          updates.outTime = timeStr;
          updates.outSelfieUrl = selfie;
        }
        if (action === 'break-in') {
          updates.breakInTime = timeStr;
          updates.breakInSelfieUrl = selfie;
        }
        if (action === 'break-out') {
          updates.breakOutTime = timeStr;
          updates.breakOutSelfieUrl = selfie;
        }

        await updateDoc(doc(db, 'attendance', todayAttendance.id), updates);
        toast.success(`${action.replace('-', ' ')} recorded`);
      }

      fetchTodayAttendance();
      fetchHistory();
      setShowCamera(false);
      setPendingAction(null);
      setCapturedImage(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update attendance');
    } finally {
      setLoading(false);
    }
  };

  const getStatusDisplay = () => {
    if (!todayAttendance) return 'Not Clocked In';
    if (todayAttendance.outTime) return 'Shift Completed';
    if (todayAttendance.breakInTime && !todayAttendance.breakOutTime) return 'On Break';
    return 'Currently Working';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xl font-bold text-slate-800">Attendance</h2>
        <button 
          onClick={() => setShowHistory(!showHistory)}
          className="p-2 bg-white rounded-xl border border-slate-100 text-slate-500 shadow-sm"
        >
          <History className="w-5 h-5" />
        </button>
      </div>

      {!showHistory ? (
        <div className="space-y-6">
          {/* Status Card */}
          <div className="card text-center py-8">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-blue-600">
              <Clock className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">
              {getStatusDisplay()}
            </h3>
            <p className="text-slate-500 text-xs mt-1">
              {todayAttendance?.date ? `Date: ${todayAttendance.date}` : 'Ready to start your shift?'}
            </p>

            <div className="mt-8 grid grid-cols-1 gap-4">
              {!todayAttendance && (
                <button 
                  onClick={() => handleActionClick('in')}
                  disabled={loading}
                  className="btn bg-emerald-600 text-white shadow-lg shadow-emerald-100 flex items-center justify-center gap-3 text-lg h-14"
                >
                  <UserCheck className="w-6 h-6" />
                  {loading ? 'Processing...' : 'Clock In'}
                </button>
              )}

              {todayAttendance && !todayAttendance.outTime && (
                <>
                  {(!todayAttendance.breakInTime || todayAttendance.breakOutTime) ? (
                    <button 
                      onClick={() => handleActionClick('break-in')}
                      disabled={loading}
                      className="btn bg-amber-500 text-white shadow-lg shadow-amber-100 flex items-center justify-center gap-3 text-lg h-14"
                    >
                      <RefreshCw className="w-6 h-6" />
                      {loading ? 'Processing...' : 'Start Break'}
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleActionClick('break-out')}
                      disabled={loading}
                      className="btn bg-blue-500 text-white shadow-lg shadow-blue-100 flex items-center justify-center gap-3 text-lg h-14"
                    >
                      <RefreshCw className="w-6 h-6" />
                      {loading ? 'Processing...' : 'End Break'}
                    </button>
                  )}
                  
                  <button 
                    onClick={() => handleActionClick('out')}
                    disabled={loading}
                    className="btn bg-red-500 text-white shadow-lg shadow-red-100 flex items-center justify-center gap-3 text-lg h-14"
                  >
                    <UserMinus className="w-6 h-6" />
                    {loading ? 'Processing...' : 'Clock Out'}
                  </button>
                </>
              )}

              {todayAttendance?.outTime && (
                <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl font-bold flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Shift Completed
                </div>
              )}
            </div>

            {todayAttendance && (
              <div className="mt-8 grid grid-cols-2 gap-4 border-t border-slate-50 pt-6">
                <div className="text-left">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">In</p>
                  <p className="text-sm font-bold text-slate-800">{todayAttendance.inTime || '--:--'}</p>
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Out</p>
                  <p className="text-sm font-bold text-slate-800">{todayAttendance.outTime || '--:--'}</p>
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Break In</p>
                  <p className="text-sm font-bold text-slate-800">{todayAttendance.breakInTime || '--:--'}</p>
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Break Out</p>
                  <p className="text-sm font-bold text-slate-800">{todayAttendance.breakOutTime || '--:--'}</p>
                </div>
              </div>
            )}
          </div>

          {/* Location Info */}
          <div className="card bg-slate-900 text-white flex items-center gap-4 border-none">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
              <MapPin className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Current Location</p>
              <p className="text-xs font-medium">Main Office, Sector 5</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((item) => (
            <div key={item.id} className="card flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800">{new Date(item.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Time: {item.inTime}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                item.status === 'present' ? 'bg-emerald-50 text-emerald-600' : 
                item.status === 'half-day' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
              }`}>
                {item.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Camera Modal */}
      <AnimatePresence>
        {showCamera && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-sm w-full bg-white rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 capitalize">
                  Selfie for {pendingAction?.replace('-', ' ')}
                </h3>
                <button 
                  onClick={() => {
                    stopCamera();
                    setShowCamera(false);
                  }}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="relative aspect-square bg-slate-900 overflow-hidden">
                {!capturedImage ? (
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                ) : (
                  <img 
                    src={capturedImage} 
                    alt="Captured" 
                    className="w-full h-full object-cover scale-x-[-1]" 
                  />
                )}
                
                {!capturedImage && (
                  <div className="absolute inset-0 border-2 border-white/20 pointer-events-none flex items-center justify-center">
                    <div className="w-48 h-48 border-2 border-dashed border-white/40 rounded-full"></div>
                  </div>
                )}
              </div>

              <div className="p-6">
                {!capturedImage ? (
                  <button 
                    onClick={capturePhoto}
                    className="w-full btn bg-blue-600 text-white h-12 flex items-center justify-center gap-2"
                  >
                    <Camera className="w-5 h-5" />
                    Capture Selfie
                  </button>
                ) : (
                  <div className="flex gap-3">
                    <button 
                      onClick={() => {
                        setCapturedImage(null);
                        startCamera();
                      }}
                      className="flex-1 btn bg-slate-100 text-slate-600 h-12"
                    >
                      Retake
                    </button>
                    <button 
                      onClick={() => pendingAction && updateAttendance(pendingAction, capturedImage)}
                      disabled={loading}
                      className="flex-1 btn bg-emerald-600 text-white h-12 flex items-center justify-center gap-2"
                    >
                      {loading ? 'Uploading...' : (
                        <>
                          <Check className="w-5 h-5" />
                          Confirm
                        </>
                      )}
                    </button>
                  </div>
                )}
                <p className="text-[10px] text-slate-400 text-center mt-4">
                  Please ensure your face is clearly visible in the frame.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
