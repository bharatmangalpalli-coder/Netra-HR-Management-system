import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  MapPin, 
  Camera as CameraIcon, 
  CheckCircle2, 
  AlertCircle,
  History,
  X,
  RefreshCw
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
  
  // Camera State
  const [showCamera, setShowCamera] = useState(false);
  const [cameraMode, setCameraMode] = useState<'in' | 'out'>('in');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  useEffect(() => {
    fetchTodayAttendance();
    fetchHistory();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [employee.id]);

  useEffect(() => {
    if (showCamera && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [showCamera, stream]);

  const startCamera = async (mode: 'in' | 'out' = 'in') => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast.error("Camera access is not supported by your browser or environment.");
      return;
    }

    setLoading(true);
    try {
      setCameraMode(mode);
      setShowCamera(true);
      setCapturedImage(null);
      
      // Small delay to ensure modal is rendered
      await new Promise(resolve => setTimeout(resolve, 500));

      let mediaStream: MediaStream;
      try {
        // Try with simple constraints first for better compatibility
        mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: false 
        });
      } catch (e) {
        console.warn("Simple video: true failed, trying with facingMode", e);
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'user' }, 
            audio: false 
          });
        } catch (e2) {
          console.warn("facingMode failed, trying with width/height", e2);
          mediaStream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: { ideal: 640 }, height: { ideal: 480 } }, 
            audio: false 
          });
        }
      }
      
      setStream(mediaStream);
    } catch (error: any) {
      console.error("Error accessing camera:", error);
      setShowCamera(false);
      
      let errorMsg = "Could not access camera.";
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMsg = "Camera permission denied. Please allow camera access in your browser settings.";
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError' || error.message?.includes('found')) {
        errorMsg = "No camera found on this device. Please ensure your camera is connected.";
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMsg = "Camera is already in use by another application.";
      } else {
        errorMsg = `Camera Error: ${error.message || 'Unknown error'}`;
      }
      
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(dataUrl);
        // Stop stream after capture to save battery/resources
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
          setStream(null);
        }
      }
    }
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

  const handleMarkIn = async () => {
    console.log("handleMarkIn clicked");
    if (!capturedImage) {
      return toast.error("Please capture a selfie first");
    }

    setLoading(true);
    try {
      console.log("Getting location...");
      // Get Location
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        });
      });
      console.log("Location obtained:", position.coords);

      const now = new Date();
      const inTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const status = now.getHours() >= 10 ? 'late' : 'present';

      const newAttendance = {
        employeeId: employee.employeeId || employee.id,
        employeeName: employee.name,
        date: getTodayDate(),
        inTime,
        outTime: null,
        location: {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        },
        status,
        selfieUrl: capturedImage
      };

      await addDoc(collection(db, 'attendance'), newAttendance);
      toast.success('Attendance marked successfully');
      setShowCamera(false);
      setCapturedImage(null);
      fetchTodayAttendance();
    } catch (error: any) {
      toast.error(error.message || 'Failed to mark attendance');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkOut = async () => {
    console.log("handleMarkOut clicked");
    if (!todayAttendance) return;
    if (!capturedImage) {
      return toast.error("Please capture a selfie first");
    }

    setLoading(true);
    try {
      const outTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      await updateDoc(doc(db, 'attendance', todayAttendance.id), { 
        outTime,
        outSelfieUrl: capturedImage 
      });
      toast.success('Checked out successfully');
      setShowCamera(false);
      setCapturedImage(null);
      fetchTodayAttendance();
    } catch (error) {
      toast.error('Failed to mark out');
    } finally {
      setLoading(false);
    }
  };

  const handleBreakIn = async () => {
    console.log("handleBreakIn clicked");
    if (!todayAttendance) return;
    setLoading(true);
    try {
      const breakInTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      await updateDoc(doc(db, 'attendance', todayAttendance.id), { breakInTime });
      toast.success('Break started');
      fetchTodayAttendance();
    } catch (error) {
      toast.error('Failed to start break');
    } finally {
      setLoading(false);
    }
  };

  const handleBreakOut = async () => {
    console.log("handleBreakOut clicked");
    if (!todayAttendance) return;
    setLoading(true);
    try {
      const breakOutTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      await updateDoc(doc(db, 'attendance', todayAttendance.id), { breakOutTime });
      toast.success('Break ended');
      fetchTodayAttendance();
    } catch (error) {
      toast.error('Failed to end break');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between px-2">
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
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 text-center">
            <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-blue-600">
              <Clock className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800">
              {todayAttendance ? (
                todayAttendance.outTime ? 'Shift Completed' : 
                (todayAttendance.breakInTime && !todayAttendance.breakOutTime) ? 'On Break' : 'You are IN'
              ) : 'Ready to Start?'}
            </h3>
            <p className="text-slate-500 text-sm mt-2">
              {todayAttendance 
                ? (todayAttendance.breakInTime && !todayAttendance.breakOutTime)
                  ? `Break started at ${todayAttendance.breakInTime}`
                  : `Clocked in at ${todayAttendance.inTime}` 
                : 'Please mark your attendance for today'}
            </p>

            <div className="mt-10 space-y-4">
              {!todayAttendance ? (
                <button 
                  onClick={() => startCamera('in')}
                  disabled={loading}
                  className="w-full py-4 bg-blue-600 text-white rounded-3xl font-bold text-lg shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <CameraIcon className="w-6 h-6" />
                  {loading ? 'Processing...' : 'Mark Attendance IN'}
                </button>
              ) : !todayAttendance.outTime ? (
                <div className="space-y-3">
                  {(!todayAttendance.breakInTime) ? (
                    <button 
                      onClick={handleBreakIn}
                      disabled={loading}
                      className="w-full py-4 bg-indigo-500 text-white rounded-3xl font-bold text-lg shadow-xl shadow-indigo-100 hover:bg-indigo-600 transition-all disabled:opacity-50"
                    >
                      {loading ? 'Processing...' : 'Start Break'}
                    </button>
                  ) : (!todayAttendance.breakOutTime) ? (
                    <button 
                      onClick={handleBreakOut}
                      disabled={loading}
                      className="w-full py-4 bg-emerald-500 text-white rounded-3xl font-bold text-lg shadow-xl shadow-emerald-100 hover:bg-emerald-600 transition-all disabled:opacity-50"
                    >
                      {loading ? 'Processing...' : 'End Break'}
                    </button>
                  ) : null}
                  
                  <button 
                    onClick={() => startCamera('out')}
                    disabled={loading || (todayAttendance.breakInTime && !todayAttendance.breakOutTime)}
                    className="w-full py-4 bg-amber-500 text-white rounded-3xl font-bold text-lg shadow-xl shadow-amber-100 hover:bg-amber-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <CameraIcon className="w-6 h-6" />
                    {loading ? 'Processing...' : 'Mark Attendance OUT'}
                  </button>
                </div>
              ) : (
                <div className="py-4 bg-emerald-50 text-emerald-600 rounded-3xl font-bold text-lg flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-6 h-6" />
                  Done for Today
                </div>
              )}
            </div>
          </div>

          {/* Location Info */}
          <div className="bg-slate-900 p-6 rounded-[2rem] text-white flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
              <MapPin className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Current Location</p>
              <p className="text-sm font-medium">Main Office, Sector 5</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-start gap-3 mb-2">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <p className="text-xs text-blue-700 leading-relaxed">
              <strong>Attendance Protection:</strong> Your attendance records are securely saved and protected for a minimum of 30 days for payroll accuracy.
            </p>
          </div>
          {history.map((item) => (
            <div key={item.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-800">{new Date(item.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">IN: {item.inTime}</span>
                  {item.breakInTime && (
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">B-IN: {item.breakInTime}</span>
                  )}
                  {item.breakOutTime && (
                    <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">B-OUT: {item.breakOutTime}</span>
                  )}
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">OUT: {item.outTime || '--:--'}</span>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                item.status === 'present' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
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
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-6"
          >
            <button 
              onClick={stopCamera}
              className="absolute top-6 right-6 p-3 bg-white/10 rounded-full text-white"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="w-full max-w-sm aspect-[3/4] bg-slate-900 rounded-[2.5rem] overflow-hidden relative border-2 border-white/20">
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
                <div className="absolute inset-0 border-[40px] border-black/20 pointer-events-none">
                  <div className="w-full h-full border-2 border-white/40 rounded-[1.5rem] border-dashed"></div>
                </div>
              )}
            </div>

            <div className="mt-12 w-full max-w-sm space-y-4">
              {!capturedImage ? (
                <button 
                  onClick={capturePhoto}
                  className="w-full py-4 bg-white text-black rounded-3xl font-bold text-lg flex items-center justify-center gap-2"
                >
                  <CameraIcon className="w-6 h-6" />
                  Capture Selfie
                </button>
              ) : (
                <>
                  <button 
                    onClick={cameraMode === 'in' ? handleMarkIn : handleMarkOut}
                    disabled={loading}
                    className="w-full py-4 bg-blue-600 text-white rounded-3xl font-bold text-lg shadow-xl shadow-blue-900/40 flex items-center justify-center gap-2"
                  >
                    {loading ? <RefreshCw className="w-6 h-6 animate-spin" /> : <CheckCircle2 className="w-6 h-6" />}
                    {loading ? 'Marking Attendance...' : cameraMode === 'in' ? 'Confirm & Mark IN' : 'Confirm & Mark OUT'}
                  </button>
                  <button 
                    onClick={() => {
                      setCapturedImage(null);
                      startCamera(cameraMode);
                    }}
                    className="w-full py-4 bg-white/10 text-white rounded-3xl font-bold text-lg"
                  >
                    Retake Photo
                  </button>
                </>
              )}
            </div>
            
            <p className="mt-6 text-white/40 text-xs text-center px-8">
              Position your face within the frame. Your location will be recorded automatically.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
