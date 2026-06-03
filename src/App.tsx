import React, { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, getDocFromServer } from 'firebase/firestore';
import { Employee, UserRole } from './types';
import { handleFirestoreError, OperationType } from './lib/firestore-errors';

// Components
import Login from './components/auth/Login';
import AdminDashboard from './components/admin/AdminDashboard';
import EmployeeDashboard from './components/employee/EmployeeDashboard';
import LoadingScreen from './components/ui/LoadingScreen';
import SetupFirebase from './components/ui/SetupFirebase';
import { LogOut } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [employeeData, setEmployeeData] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFirebaseConfigured, setIsFirebaseConfigured] = useState(true);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  useEffect(() => {
    const handleQuotaExceeded = () => {
      setQuotaExceeded(true);
    };
    window.addEventListener('firestore-quota-exceeded', handleQuotaExceeded);
    return () => {
      window.removeEventListener('firestore-quota-exceeded', handleQuotaExceeded);
    };
  }, []);

  useEffect(() => {
    if (!auth || !db) {
      setIsFirebaseConfigured(false);
      setLoading(false);
      return;
    }

    // Test connection to Firestore
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db!, 'settings', 'branding'));
      } catch (error: any) {
        const isQuota = error.message?.includes('Quota limit exceeded') || error.code === 'resource-exhausted' || error.message?.includes('quota metric');
        if (isQuota) {
          setQuotaExceeded(true);
        }
        if (error.message?.includes('the client is offline') || error.code === 'permission-denied') {
          console.error("Firebase Configuration/Permission Error: Please ensure your Security Rules are published in the Firebase Console.");
        }
      }
    };
    testConnection();

    let unsubAdmin: (() => void) | null = null;
    let unsubEmployee: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      // Cleanup previous listeners
      if (unsubAdmin) { unsubAdmin(); unsubAdmin = null; }
      if (unsubEmployee) { unsubEmployee(); unsubEmployee = null; }
      
      if (firebaseUser) {
        setUser(firebaseUser);
        setLoading(true); // Ensure loading is true while we check roles

        // Load cached role instantly for seamless, fast offline/quota loads
        const cachedRole = localStorage.getItem('cached_role') as UserRole | null;
        const cachedProfileRaw = localStorage.getItem(`cached_profile_${firebaseUser.uid}`);
        if (cachedRole) {
          setRole(cachedRole);
          if (cachedRole === 'EMPLOYEE' && cachedProfileRaw) {
            try {
              setEmployeeData(JSON.parse(cachedProfileRaw));
            } catch (e) {}
          }
          setLoading(false);
        }
        
        // 1. Immediate check for developer admin
        if (firebaseUser.email === 'netragroupofservices@gmail.com') {
          setRole('ADMIN');
          localStorage.setItem('cached_role', 'ADMIN');
          setLoading(false);
          
          try {
            const { getDoc, setDoc, doc } = await import('firebase/firestore');
            const adminRef = doc(db!, 'admins', firebaseUser.uid);
            getDoc(adminRef).then(async (adminSnap) => {
              if (!adminSnap.exists()) {
                await setDoc(adminRef, {
                  email: firebaseUser.email,
                  role: 'ADMIN',
                  name: 'Developer Admin',
                  createdAt: new Date().toISOString()
                });
              }
            }).catch(err => {
              console.warn("Could not check/bootstrap developer admin collection (possible quota limit):", err);
              const isQuota = err.message?.includes('Quota limit exceeded') || err.code === 'resource-exhausted';
              if (isQuota) setQuotaExceeded(true);
            });
          } catch (error) {
            console.error("Error bootstrapping developer admin:", error);
          }
          return;
        }

        // 2. Parallel Role Checks with snapshots
        let adminDocFound = false;
        let employeeDocFound = false;
        let checksCompleted = 0;

        const handleCheckCompletion = () => {
          checksCompleted++;
          // We wait for both checks to have at least attempted to load
          if (checksCompleted >= 2) {
            // Check if we already rendered via cache
            const hasLocalRole = localStorage.getItem('cached_role');
            if (hasLocalRole) {
              setLoading(false);
              return;
            }

            if (!adminDocFound && !employeeDocFound) {
              // Fallback: If not found in either system, grant employee access by default
              const fallbackEmployee: Employee = {
                id: firebaseUser.uid,
                employeeId: firebaseUser.uid,
                name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Employee',
                email: firebaseUser.email || '',
                designation: 'New Staff',
                joiningDate: new Date().toISOString().split('T')[0],
                status: 'active',
                role: 'EMPLOYEE',
                monthlySalary: 0
              };
              setRole('EMPLOYEE');
              setEmployeeData(fallbackEmployee);
            }
            setLoading(false);
          }
        };

        // Admin Listener
        unsubAdmin = onSnapshot(doc(db!, 'admins', firebaseUser.uid), (adminSnap) => {
          if (adminSnap.exists()) {
            adminDocFound = true;
            setRole('ADMIN');
            localStorage.setItem('cached_role', 'ADMIN');
            localStorage.setItem(`cached_profile_${firebaseUser.uid}`, JSON.stringify({
              id: firebaseUser.uid,
              name: 'Developer Admin',
              email: firebaseUser.email || '',
              role: 'ADMIN'
            }));
            setLoading(false);
          } else {
            adminDocFound = false;
            // If this was the first run, signal completion
            if (checksCompleted < 2 && !adminDocFound) {
              setTimeout(handleCheckCompletion, 500); 
            }
          }
        }, (error: any) => {
          console.warn("Admin role check listener encountered an error:", error);
          const isQuota = error.message?.includes('Quota limit exceeded') || error.code === 'resource-exhausted' || error.message?.includes('quota metric');
          if (isQuota) {
            setQuotaExceeded(true);
          }
          if (!isQuota && error.code !== 'permission-denied') {
            handleFirestoreError(error, OperationType.GET, `admins/${firebaseUser.uid}`);
          }
          handleCheckCompletion();
        });

        // Employee Listener
        unsubEmployee = onSnapshot(doc(db!, 'employees', firebaseUser.uid), async (empSnap) => {
          if (empSnap.exists()) {
            employeeDocFound = true;
            const empData = { id: empSnap.id, ...empSnap.data() } as Employee;
            setRole('EMPLOYEE');
            setEmployeeData(empData);
            localStorage.setItem('cached_role', 'EMPLOYEE');
            localStorage.setItem(`cached_profile_${firebaseUser.uid}`, JSON.stringify(empData));
            setLoading(false);
          } else {
            // Try searching by email if not found by UID
            try {
              const { query, collection, where, getDocs, limit } = await import('firebase/firestore');
              const q = query(collection(db!, 'employees'), where('email', '==', firebaseUser.email), limit(1));
              const emailSnap = await getDocs(q);
              
              if (!emailSnap.empty) {
                const empDoc = emailSnap.docs[0];
                employeeDocFound = true;
                const empData = { id: empDoc.id, ...empDoc.data() } as Employee;
                setRole('EMPLOYEE');
                setEmployeeData(empData);
                localStorage.setItem('cached_role', 'EMPLOYEE');
                localStorage.setItem(`cached_profile_${firebaseUser.uid}`, JSON.stringify(empData));
                
                // Link UID to employee record for future security rule checks
                try {
                  const { setDoc, deleteDoc, updateDoc, doc } = await import('firebase/firestore');
                  
                  if (empDoc.id !== firebaseUser.uid) {
                    await setDoc(doc(db!, 'employees', firebaseUser.uid), { 
                      ...empDoc.data(), 
                      userId: firebaseUser.uid 
                    });
                    await deleteDoc(doc(db!, 'employees', empDoc.id));
                    console.log("Migrated employee doc to UID-based ID");
                  } else {
                    await updateDoc(doc(db!, 'employees', empDoc.id), { userId: firebaseUser.uid });
                  }
                } catch (updateErr) {
                  console.error("Error linking UID to employee:", updateErr);
                }

                setLoading(false);
                return;
              }
            } catch (err) {
              console.error("Error searching employee by email:", err);
            }

            employeeDocFound = false;
            if (checksCompleted < 2 && !employeeDocFound) {
              setTimeout(handleCheckCompletion, 500);
            }
          }
        }, (error: any) => {
          console.warn("Employee check listener encountered an error:", error);
          const isQuota = error.message?.includes('Quota limit exceeded') || error.code === 'resource-exhausted' || error.message?.includes('quota metric');
          if (isQuota) {
            setQuotaExceeded(true);
          }
          if (!isQuota && error.code !== 'permission-denied') {
            handleFirestoreError(error, OperationType.GET, `employees/${firebaseUser.uid}`);
          }
          handleCheckCompletion();
        });

        // Safety timeout to prevent infinite loading
        setTimeout(() => {
          if (loading) {
            setLoading(false);
            if (!role) {
              // Read cache first if we haven't already
              const lastRole = localStorage.getItem('cached_role') as UserRole | null;
              if (lastRole) {
                setRole(lastRole);
                if (lastRole === 'EMPLOYEE') {
                  const lastProfileRaw = localStorage.getItem(`cached_profile_${firebaseUser.uid}`);
                  if (lastProfileRaw) {
                    try {
                      setEmployeeData(JSON.parse(lastProfileRaw));
                    } catch (e) {}
                  }
                }
              } else {
                // Forced default fallback if network is stuck and no cache is present
                const fallbackEmployee: Employee = {
                  id: firebaseUser.uid,
                  employeeId: firebaseUser.uid,
                  name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Employee',
                  email: firebaseUser.email || '',
                  designation: 'New Staff',
                  joiningDate: new Date().toISOString().split('T')[0],
                  status: 'active',
                  role: 'EMPLOYEE',
                  monthlySalary: 0
                };
                setRole('EMPLOYEE');
                setEmployeeData(fallbackEmployee);
              }
            }
          }
        }, 5000);

      } else {
        setUser(null);
        setRole(null);
        setEmployeeData(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubAdmin) unsubAdmin();
      if (unsubEmployee) unsubEmployee();
    };
  }, []);

  if (!isFirebaseConfigured || !auth || !db) {
    return <SetupFirebase />;
  }

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Toaster position="top-right" />
      
      {quotaExceeded && (
        <div className="bg-amber-500 text-white text-xs font-bold px-4 py-3 flex items-center justify-between shadow-md relative z-50">
          <div className="flex items-center gap-2 mx-auto text-center">
            <span>⚠️ Daily free-tier usage quota has been exceeded for Firestore. The app is running smoothly in resilient offline/caching fallback mode.</span>
          </div>
          <button 
            type="button" 
            onClick={() => setQuotaExceeded(false)}
            className="text-white hover:text-slate-100 font-bold ml-2 bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded-md text-[10px] uppercase transition-all"
          >
            Dismiss
          </button>
        </div>
      )}

      <main className="w-full">
        {!user ? (
          <Login />
        ) : (
          <>
            {role === 'ADMIN' && <AdminDashboard />}
            {role === 'EMPLOYEE' && employeeData && (
              <div className="max-w-md mx-auto">
                <EmployeeDashboard employee={employeeData} />
              </div>
            )}
            {role === null && (
              <div className="max-w-md mx-auto flex flex-col items-center justify-center min-h-[80vh] p-8 text-center">
                <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-6">
                  <LogOut className="w-10 h-10" />
                </div>
                <h1 className="text-2xl font-bold text-slate-800 mb-3">Access Denied</h1>
                <p className="text-xs text-slate-400 mb-4 bg-slate-100 py-1 px-3 rounded-full">
                  Logged in as: <span className="font-semibold">{user?.email}</span>
                </p>
                {user?.email === 'netragroupofservices@gmail.com' && !user?.emailVerified ? (
                  <div className="space-y-4">
                    <p className="text-slate-500 leading-relaxed">
                      Developer account detected, but your email is not verified. Please check your inbox and verify your email to gain admin access.
                    </p>
                    <button 
                      onClick={async () => {
                        try {
                          const { sendEmailVerification } = await import('firebase/auth');
                          await sendEmailVerification(user!);
                          toast.success('Verification email sent!');
                        } catch (error) {
                          toast.error('Failed to send verification email');
                        }
                      }}
                      className="w-full btn btn-secondary"
                    >
                      Resend Verification Email
                    </button>
                    <button 
                      onClick={async () => {
                        await user?.reload();
                        window.location.reload();
                      }}
                      className="w-full text-xs text-blue-600 hover:underline mt-2"
                    >
                      I have verified my email - Refresh Status
                    </button>
                  </div>
                ) : (
                  <p className="text-slate-500 mb-8 leading-relaxed">
                    Your account is not registered in the HR system. Please contact your administrator.
                  </p>
                )}
                <button 
                  onClick={() => auth?.signOut()}
                  className="w-full btn btn-primary mt-4"
                >
                  Sign Out
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
