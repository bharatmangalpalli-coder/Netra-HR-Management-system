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
import { collection, query, where, getDocs, addDoc, updateDoc, doc, limit, orderBy, serverTimestamp } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../../lib/firebase';

// Helper to check for manual time adjustment
const checkTimeDrift = async (): Promise<number> => {
  try {
    const start = Date.now();
    const response = await fetch('https://worldtimeapi.org/api/timezone/Etc/UTC', { cache: 'no-store' });
    const data = await response.json();
    const serverTime = new Date(data.datetime).getTime();
    const end = Date.now();
    
    // Average client time during request
    const clientTime = (start + end) / 2;
    const drift = Math.abs(serverTime - clientTime);
    
    return drift; // returns drift in milliseconds
  } catch (error) {
    console.error("Failed to fetch server time:", error);
    return 0; // Fallback to 0 if API is down
  }
};
import { getTodayDate } from '../../lib/utils';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import PageHeader from '../ui/PageHeader';

interface Props {
  employee: Employee;
  onBack: () => void;
}

export default function AttendanceSection({ employee, onBack }: Props) {
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<Attendance[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [pendingAction, setPendingAction] = useState<'in' | 'out' | 'lunch-in' | 'lunch-out' | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  useEffect(() => {
    fetchTodayAttendance();
    fetchHistory();
  }, [employee.id]);

  useEffect(() => {
    const isActive = { current: true };
    if (showCamera && !capturedImage) {
      // Small delay to ensure the video ref is available after modal animation starts
      const timer = setTimeout(() => startCamera(isActive), 300);
      return () => {
        isActive.current = false;
        clearTimeout(timer);
        stopCamera();
      };
    }
  }, [showCamera, capturedImage]);

  const startCamera = async (isActive?: { current: boolean }) => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported in this browser');
      }

      let stream: MediaStream;
      try {
        // Try with front camera first
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user' },
          audio: false 
        });
      } catch (firstErr: any) {
        console.warn('Initial camera access failed, trying fallback:', firstErr);
        // Fallback: Try any available camera if 'user' facing mode fails
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: true,
          audio: false 
        });
      }

      if (isActive && !isActive.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      } else {
        setTimeout(() => {
          if (videoRef.current && (!isActive || isActive.current)) {
            videoRef.current.srcObject = stream;
          } else {
            stream.getTracks().forEach(track => track.stop());
          }
        }, 150);
      }
    } catch (err: any) {
      console.error('Camera Error:', err);
      let message = 'Camera access denied. Please allow permissions and refresh.';
      if (err.name === 'NotFoundError' || err.message?.includes('Found')) message = 'No camera found';
      if (err.name === 'NotAllowedError' || err.message?.includes('Permission')) message = 'Camera permission denied';
      if (err.name === 'NotReadableError' || err.message?.includes('readable')) message = 'Camera is already in use';
      
      toast.error(message);
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
    if (videoRef.current && videoRef.current.videoWidth > 0) {
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
    } else {
      toast.error('Camera not ready. Please wait a moment.');
      if (!capturedImage) startCamera();
    }
  };

  const handleActionClick = (action: 'in' | 'out' | 'lunch-in' | 'lunch-out') => {
    setPendingAction(action);
    setCapturedImage(null);
    setShowCamera(true);
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

  const calculateWorkingMinutes = (inTime: string, outTime: string, lOut?: string | null, lIn?: string | null) => {
    const getMinutes = (timeStr: string) => {
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m;
    };

    const inMin = getMinutes(inTime);
    const outMin = getMinutes(outTime);
    let total = outMin - inMin;

    if (lOut && lIn) {
      const lOutMin = getMinutes(lOut);
      const lInMin = getMinutes(lIn);
      const lunchDuration = lInMin - lOutMin;
      if (lunchDuration > 0) {
        total -= lunchDuration;
      }
    }

    return total;
  };

  const updateAttendance = async (action: 'in' | 'out' | 'lunch-in' | 'lunch-out', selfie: string) => {
    setLoading(true);
    try {
      // Check for manual time setting
      const drift = await checkTimeDrift();
      const isTimeSpoofed = drift > 5 * 60 * 1000; // 5 minutes threshold
      
      if (isTimeSpoofed) {
        console.warn("Time spoofing detected. Drift:", drift);
        toast.error("Manual time adjustment detected. Please sync your clock with the internet.");
      }

      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      const empId = employee.employeeId || employee.id;

      if (action === 'in') {
        const shiftStart = employee.shiftStart || '09:00';
        const [targetH, targetM] = shiftStart.split(':').map(Number);
        const shiftStartDate = new Date();
        shiftStartDate.setHours(targetH, targetM, 0);
        
        let status: 'present' | 'half-day' | 'late' = 'present';

        if (employee.isFlexibleShift) {
          status = 'present';
        } else {
          // No grace period: anytime after shiftStart is late.
          if (now > shiftStartDate) {
            status = 'late';
          }
        }

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
          userId: auth?.currentUser?.uid,
          employeeName: employee.name,
          date: getTodayDate(),
          inTime: timeStr,
          outTime: null,
          lunchOutTime: null,
          lunchInTime: null,
          location,
          selfieUrl: selfie,
          status,
          totalHours: 0,
          markedAt: serverTimestamp(),
          clientDrift: drift,
          isManualTime: isTimeSpoofed
        };

        await addDoc(collection(db, 'attendance'), newAttendance);
        toast.success(`Clocked in successfully as ${status.replace('-', ' ')}`);
      } else {
        if (!todayAttendance) return;

        const updates: any = {
          userId: auth?.currentUser?.uid,
          updatedAt: serverTimestamp(),
          isManualTime: isTimeSpoofed || todayAttendance.isManualTime
        };
        if (action === 'out') {
          updates.outTime = timeStr;
          updates.outSelfieUrl = selfie;

          // Calculate total hours excluding lunch
          if (todayAttendance.inTime) {
            const totalMinutes = calculateWorkingMinutes(
              todayAttendance.inTime,
              timeStr,
              todayAttendance.lunchOutTime,
              todayAttendance.lunchInTime
            );
            
            updates.totalHours = parseFloat((totalMinutes / 60).toFixed(2));

            // If total hours >= 9, consider it a full day (present)
            // Even if they were marked "late" on check-in, completing 9 hours compensates.
            if (totalMinutes >= 540) { // 9 hours * 60 minutes
              updates.status = 'present';
            } else if (totalMinutes < 540 && totalMinutes >= 240) {
              // Usually if it's less than 9 but more than 4, it's half day.
              // We'll keep the existing status unless it should be upgraded to present.
              if (todayAttendance.status !== 'late') {
                updates.status = 'half-day';
              }
            } else if (totalMinutes < 240) {
               updates.status = 'absent';
            }
          }
        }
        if (action === 'lunch-out') {
          updates.lunchOutTime = timeStr;
          updates.lunchOutSelfieUrl = selfie;
        }
        if (action === 'lunch-in') {
          updates.lunchInTime = timeStr;
          updates.lunchInSelfieUrl = selfie;
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
      const path = todayAttendance ? `attendance/${todayAttendance.id}` : 'attendance';
      handleFirestoreError(error, OperationType.UPDATE, path);
    } finally {
      setLoading(false);
    }
  };

  const getStatusDisplay = () => {
    if (!todayAttendance) return 'Not Clocked In';
    if (todayAttendance.outTime) return 'Shift Completed';
    if (todayAttendance.lunchOutTime && !todayAttendance.lunchInTime) return 'On Lunch Break';
    return 'Currently Working';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader 
          title="Attendance" 
          subtitle="Daily Tracking" 
          onBack={onBack} 
        />
        <button 
          onClick={() => setShowHistory(!showHistory)}
          className="p-2.5 bg-white rounded-xl border border-slate-100 text-slate-500 shadow-sm active:scale-95 transition-all mb-6"
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
                  {(!todayAttendance.lunchOutTime || todayAttendance.lunchInTime) ? (
                    <button 
                      onClick={() => handleActionClick('lunch-out')}
                      disabled={loading}
                      className="btn bg-amber-500 text-white shadow-lg shadow-amber-100 flex items-center justify-center gap-3 text-lg h-14"
                    >
                      <RefreshCw className="w-6 h-6" />
                      {loading ? 'Processing...' : 'Lunch OUT'}
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleActionClick('lunch-in')}
                      disabled={loading}
                      className="btn bg-blue-500 text-white shadow-lg shadow-blue-100 flex items-center justify-center gap-3 text-lg h-14"
                    >
                      <RefreshCw className="w-6 h-6" />
                      {loading ? 'Processing...' : 'Lunch IN'}
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
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lunch Out</p>
                  <p className="text-sm font-bold text-slate-800">{todayAttendance.lunchOutTime || '--:--'}</p>
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lunch In</p>
                  <p className="text-sm font-bold text-slate-800">{todayAttendance.lunchInTime || '--:--'}</p>
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
                    muted
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
