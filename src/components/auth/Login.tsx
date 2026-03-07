import React, { useState } from 'react';
import { auth, db } from '../../lib/firebase';
import { 
  signInWithEmailAndPassword, 
  RecaptchaVerifier, 
  signInWithPhoneNumber,
  ConfirmationResult
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { Phone, Mail, Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import Logo from '../ui/Logo';

export default function Login() {
  const [method, setMethod] = useState<'phone' | 'email'>('email'); // Default to email for easier demo setup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [verificationId, setVerificationId] = useState<ConfirmationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const recaptchaRef = React.useRef<any>(null);

  React.useEffect(() => {
    return () => {
      if (recaptchaRef.current) {
        recaptchaRef.current.clear();
      }
    };
  }, []);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return toast.error('Firebase not configured');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Logged in successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  const setupRecaptcha = () => {
    if (!auth) return;
    try {
      if (!recaptchaRef.current) {
        recaptchaRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
        });
      }
    } catch (error) {
      console.error("Recaptcha init error:", error);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return toast.error('Firebase not configured');
    if (!phoneNumber) return toast.error('Please enter phone number');
    
    setLoading(true);
    try {
      setupRecaptcha();
      const appVerifier = recaptchaRef.current;
      const confirmation = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      setVerificationId(confirmation);
      toast.success('OTP sent successfully');
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/billing-not-enabled') {
        toast.error('Phone Auth requires Firebase Blaze Plan. Please use Email login or upgrade Firebase.');
      } else {
        toast.error(error.message || 'Failed to send OTP');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || !verificationId) return;
    
    setLoading(true);
    try {
      await verificationId.confirm(otp);
      toast.success('Logged in successfully');
    } catch (error: any) {
      toast.error('Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  // For demo purposes: Admin Quick Login & Setup
  const handleAdminQuickLogin = async () => {
    if (!auth) return toast.error('Firebase not configured');
    const demoEmail = 'admin@hrpro.com';
    const demoPassword = 'admin123';
    
    setEmail(demoEmail);
    setPassword(demoPassword);
    
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, demoEmail, demoPassword);
      toast.success('Logged in as Admin');
    } catch (error: any) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        toast.error('Demo user not found. Click "Create Demo Admin" first.');
      } else {
        toast.error(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDemoAdmin = async () => {
    if (!auth || !db) return toast.error('Firebase not configured');
    const demoEmail = 'admin@hrpro.com';
    const demoPassword = 'admin123';

    setLoading(true);
    try {
      const { createUserWithEmailAndPassword } = await import('firebase/auth');
      const userCredential = await createUserWithEmailAndPassword(auth, demoEmail, demoPassword);
      
      // Create admin document in Firestore
      await setDoc(doc(db, 'admins', userCredential.user.uid), {
        email: demoEmail,
        role: 'ADMIN',
        createdAt: new Date().toISOString()
      });

      toast.success('Demo Admin created! Now you can login.');
      setEmail(demoEmail);
      setPassword(demoPassword);
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        toast.error('Demo account already exists. Just click Login.');
      } else {
        toast.error(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDemoEmployee = async () => {
    if (!auth || !db) return toast.error('Firebase not configured');
    const demoEmail = 'employee@hrpro.com';
    const demoPassword = 'password123';

    setLoading(true);
    try {
      const { createUserWithEmailAndPassword } = await import('firebase/auth');
      const userCredential = await createUserWithEmailAndPassword(auth, demoEmail, demoPassword);
      
      // Create employee document in Firestore
      await setDoc(doc(db, 'employees', userCredential.user.uid), {
        employeeId: 'EMP001',
        name: 'Demo Employee',
        email: demoEmail,
        role: 'EMPLOYEE',
        department: 'Engineering',
        designation: 'Software Engineer',
        baseSalary: 50000,
        joinedAt: new Date().toISOString(),
        status: 'ACTIVE'
      });

      toast.success('Demo Employee created! Now you can login.');
      setEmail(demoEmail);
      setPassword(demoPassword);
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        toast.error('Demo account already exists. Just click Login.');
      } else {
        toast.error(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeQuickLogin = async () => {
    if (!auth) return toast.error('Firebase not configured');
    const demoEmail = 'employee@hrpro.com';
    const demoPassword = 'password123';
    
    setEmail(demoEmail);
    setPassword(demoPassword);
    
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, demoEmail, demoPassword);
      toast.success('Logged in as Employee');
    } catch (error: any) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        toast.error('Demo employee not found. Click "Create Demo Employee" first.');
      } else {
        toast.error(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div id="recaptcha-container"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-2xl shadow-slate-200 overflow-hidden"
      >
        <div className="bg-blue-600 p-8 text-white text-center">
          <div className="mb-4 flex justify-center">
            <Logo size="lg" className="shadow-lg shadow-blue-900/20" />
          </div>
          <h1 className="text-2xl font-bold">Welcome to HR Pro</h1>
          <p className="text-blue-100 mt-1">Sign in to your workspace</p>
        </div>

        <div className="p-8">
          <div className="flex bg-slate-100 p-1 rounded-xl mb-8">
            <button 
              onClick={() => setMethod('email')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${method === 'email' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
            >
              Email
            </button>
            <button 
              onClick={() => setMethod('phone')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${method === 'phone' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
            >
              Phone OTP
            </button>
          </div>

          {method === 'email' ? (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="name@company.com"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
              <button 
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Signing in...' : 'Sign In'}
                <ArrowRight className="w-4 h-4" />
              </button>
              
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    type="button"
                    disabled={loading}
                    onClick={handleAdminQuickLogin}
                    className="py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-100"
                  >
                    Demo Admin
                  </button>
                  <button 
                    type="button"
                    disabled={loading}
                    onClick={handleEmployeeQuickLogin}
                    className="py-2 text-sm font-semibold text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-emerald-100"
                  >
                    Demo Employee
                  </button>
                </div>
                
                <div className="flex flex-col items-center gap-1">
                  <button 
                    type="button"
                    disabled={loading}
                    onClick={handleCreateDemoAdmin}
                    className="text-[10px] text-slate-400 hover:text-blue-500 transition-colors"
                  >
                    Setup Admin Account
                  </button>
                  <button 
                    type="button"
                    disabled={loading}
                    onClick={handleCreateDemoEmployee}
                    className="text-[10px] text-slate-400 hover:text-emerald-500 transition-colors"
                  >
                    Setup Employee Account
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={!verificationId ? handleSendOtp : handleVerifyOtp} className="space-y-4">
              {!verificationId ? (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                      type="tel" 
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="+91 98765 43210"
                      required
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Enter OTP</label>
                  <input 
                    type="text" 
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-center text-2xl tracking-widest"
                    placeholder="000000"
                    maxLength={6}
                    required
                  />
                </div>
              )}
              <button 
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Processing...' : !verificationId ? 'Send OTP' : 'Verify & Login'}
                <ArrowRight className="w-4 h-4" />
              </button>
              {verificationId && (
                <button 
                  type="button"
                  onClick={() => setVerificationId(null)}
                  className="w-full py-2 text-sm text-slate-500 hover:text-slate-700"
                >
                  Change Phone Number
                </button>
              )}
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
