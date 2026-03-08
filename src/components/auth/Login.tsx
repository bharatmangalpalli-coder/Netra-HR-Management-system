import React, { useState } from 'react';
import { auth, db } from '../../lib/firebase';
import { 
  signInWithEmailAndPassword, 
  RecaptchaVerifier, 
  signInWithPhoneNumber,
  ConfirmationResult,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { Phone, Mail, Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import Logo from '../ui/Logo';

export default function Login() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [method, setMethod] = useState<'phone' | 'email'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'EMPLOYEE'>('ADMIN');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [verificationId, setVerificationId] = useState<ConfirmationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const recaptchaRef = React.useRef<any>(null);

  React.useEffect(() => {
    return () => {
      if (recaptchaRef.current) {
        recaptchaRef.current.clear();
      }
    };
  }, []);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !db) return toast.error('Firebase not configured');
    setLoading(true);
    try {
      if (isForgotPassword) {
        await sendPasswordResetEmail(auth, email);
        toast.success('Password reset link sent to your email');
        setIsForgotPassword(false);
      } else if (isRegistering) {
        const { createUserWithEmailAndPassword } = await import('firebase/auth');
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        const collectionName = role === 'ADMIN' ? 'admins' : 'employees';
        const userData: any = {
          email,
          role,
          createdAt: new Date().toISOString(),
        };

        if (role === 'EMPLOYEE') {
          userData.name = name;
          userData.employeeId = `EMP${Math.floor(1000 + Math.random() * 9000)}`;
          userData.status = 'active';
          userData.joiningDate = new Date().toISOString().split('T')[0];
          userData.monthlySalary = 0;
        } else {
          userData.name = name;
        }

        await setDoc(doc(db, collectionName, userCredential.user.uid), userData);
        toast.success('Account created successfully');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success('Logged in successfully');
      }
    } catch (error: any) {
      toast.error(error.message || 'Authentication failed');
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
          <h1 className="text-2xl font-bold">HR Pro</h1>
          <p className="text-blue-100 mt-1">
            {isForgotPassword ? 'Reset your password' : isRegistering ? 'Create your account' : 'Sign in to your workspace'}
          </p>
        </div>

        <div className="p-8">
          {!isRegistering && !isForgotPassword && (
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
          )}

          {method === 'email' || isRegistering ? (
            <form onSubmit={handleEmailAuth} className="space-y-4">
              {isRegistering && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input 
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="John Doe"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">I am an</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setRole('ADMIN')}
                        className={`py-2 rounded-xl text-sm font-bold border transition-all ${role === 'ADMIN' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-500'}`}
                      >
                        Admin
                      </button>
                      <button
                        type="button"
                        onClick={() => setRole('EMPLOYEE')}
                        className={`py-2 rounded-xl text-sm font-bold border transition-all ${role === 'EMPLOYEE' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-white border-slate-200 text-slate-500'}`}
                      >
                        Employee
                      </button>
                    </div>
                  </div>
                </>
              )}
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
              {!isForgotPassword && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-slate-700">Password</label>
                    {!isRegistering && (
                      <button 
                        type="button"
                        onClick={() => setIsForgotPassword(true)}
                        className="text-xs font-medium text-blue-600 hover:underline"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="••••••••"
                      required={!isForgotPassword}
                    />
                  </div>
                </div>
              )}
              <button 
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Processing...' : isForgotPassword ? 'Send Reset Link' : isRegistering ? 'Create Account' : 'Sign In'}
                <ArrowRight className="w-4 h-4" />
              </button>
              
              <div className="pt-4 text-center space-y-2">
                {isForgotPassword ? (
                  <button 
                    type="button"
                    onClick={() => setIsForgotPassword(false)}
                    className="text-sm font-medium text-blue-600 hover:underline"
                  >
                    Back to Sign In
                  </button>
                ) : (
                  <button 
                    type="button"
                    onClick={() => setIsRegistering(!isRegistering)}
                    className="text-sm font-medium text-blue-600 hover:underline block w-full"
                  >
                    {isRegistering ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                  </button>
                )}
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
              <div className="pt-4 text-center">
                <button 
                  type="button"
                  onClick={() => setIsRegistering(true)}
                  className="text-sm font-medium text-blue-600 hover:underline"
                >
                  Don't have an account? Sign Up
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
