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
        
        // 1. Immediate check for developer admin
        if (firebaseUser.email === 'netragroupofservices@gmail.com') {
          try {
            const { getDoc, setDoc, doc } = await import('firebase/firestore');
            const adminRef = doc(db!, 'admins', firebaseUser.uid);
            const adminSnap = await getDoc(adminRef);
            if (!adminSnap.exists()) {
              await setDoc(adminRef, {
                email: firebaseUser.email,
                role: 'ADMIN',
                name: 'Developer Admin',
                createdAt: new Date().toISOString()
              });
            }
            setRole('ADMIN');
            setLoading(false);
            return;
          } catch (error) {
            console.error("Error bootstrapping developer admin:", error);
            // Fall back to standard checks if bootstrapping fails
          }
        }

        // 2. Parallel Role Checks
        // We'll use snapshots to keep the data updated
        let adminDocFound = false;
        let employeeDocFound = false;
        let checksCompleted = 0;

        const handleCheckCompletion = () => {
          checksCompleted++;
          // We wait for both checks to have at least attempted to load or timeout
          if (checksCompleted >= 2) {
            if (!adminDocFound && !employeeDocFound) {
              // Fallback: If not found in either system, grant employee access by default
              const fallbackEmployee: Employee = {
                id: firebaseUser.uid,
                employeeId: `E-${firebaseUser.uid.slice(0, 5).toUpperCase()}`,
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
            setLoading(false);
          } else {
            adminDocFound = false;
            // If this was the first run, signal completion
            if (checksCompleted < 2 && !adminDocFound) {
              // Wait a bit to see if Employee fires
              setTimeout(handleCheckCompletion, 500); 
            }
          }
        }, (error) => {
          if (error.code !== 'permission-denied') {
            handleFirestoreError(error, OperationType.GET, `admins/${firebaseUser.uid}`);
          }
          handleCheckCompletion();
        });

        // Employee Listener
        unsubEmployee = onSnapshot(doc(db!, 'employees', firebaseUser.uid), (empSnap) => {
          if (empSnap.exists()) {
            employeeDocFound = true;
            setRole('EMPLOYEE');
            setEmployeeData({ id: empSnap.id, ...empSnap.data() } as Employee);
            setLoading(false);
          } else {
            employeeDocFound = false;
            if (checksCompleted < 2 && !employeeDocFound) {
              setTimeout(handleCheckCompletion, 500);
            }
          }
        }, (error) => {
          if (error.code !== 'permission-denied') {
            handleFirestoreError(error, OperationType.GET, `employees/${firebaseUser.uid}`);
          }
          handleCheckCompletion();
        });

        // Safety timeout to prevent infinite loading
        setTimeout(() => {
          if (loading) {
            setLoading(false);
            if (!role) {
              // Forced fallback if network is stuck
              const fallbackEmployee: Employee = {
                id: firebaseUser.uid,
                employeeId: `E-${firebaseUser.uid.slice(0, 5).toUpperCase()}`,
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
