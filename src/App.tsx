import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { Employee, UserRole } from './types';

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

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        
        // Use onSnapshot to listen for user document creation (fixes access denied on registration)
        const unsubAdmin = onSnapshot(doc(db!, 'admins', firebaseUser.uid), (adminDoc) => {
          if (adminDoc.exists()) {
            setRole('ADMIN');
            setLoading(false);
          } else {
            const unsubEmployee = onSnapshot(doc(db!, 'employees', firebaseUser.uid), (empDoc) => {
              if (empDoc.exists()) {
                setRole('EMPLOYEE');
                setEmployeeData({ id: empDoc.id, ...empDoc.data() } as Employee);
                setLoading(false);
              } else {
                // Still not found, could be a delay or truly access denied
                // We'll wait a bit before giving up
                setTimeout(() => {
                  if (!role) {
                    setRole(null);
                    setLoading(false);
                  }
                }, 3000);
              }
            });
            return () => unsubEmployee();
          }
        });
        return () => unsubAdmin();
      } else {
        setUser(null);
        setRole(null);
        setEmployeeData(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  if (!isFirebaseConfigured || !auth || !db) {
    return <SetupFirebase />;
  }

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      <Toaster position="top-right" />
      
      {user && (
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">N</div>
            <h1 className="text-lg font-bold tracking-tight text-slate-800">Netra HRMS</h1>
          </div>
          <button 
            onClick={() => auth?.signOut()}
            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </header>
      )}

      <main className="max-w-md mx-auto">
        {!user ? (
          <Login />
        ) : (
          <>
            {role === 'ADMIN' && <AdminDashboard />}
            {role === 'EMPLOYEE' && employeeData && (
              <EmployeeDashboard employee={employeeData} />
            )}
            {role === null && (
              <div className="flex flex-col items-center justify-center min-h-[80vh] p-8 text-center">
                <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-6">
                  <LogOut className="w-10 h-10" />
                </div>
                <h1 className="text-2xl font-bold text-slate-800 mb-3">Access Denied</h1>
                <p className="text-slate-500 mb-8 leading-relaxed">
                  Your account is not registered in the HR system. Please contact your administrator.
                </p>
                <button 
                  onClick={() => auth?.signOut()}
                  className="w-full btn btn-primary"
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
