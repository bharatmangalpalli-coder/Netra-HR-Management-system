import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Employee, UserRole } from './types';

// Components
import Login from './components/auth/Login';
import AdminDashboard from './components/admin/AdminDashboard';
import EmployeeDashboard from './components/employee/EmployeeDashboard';
import LoadingScreen from './components/ui/LoadingScreen';
import SetupFirebase from './components/ui/SetupFirebase';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [employeeData, setEmployeeData] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFirebaseConfigured, setIsFirebaseConfigured] = useState(true);

  useEffect(() => {
    // Check if Firebase is configured
    if (!auth || !db) {
      setIsFirebaseConfigured(false);
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          // Check if user is admin or employee
          const adminDoc = await getDoc(doc(db!, 'admins', firebaseUser.uid));
          if (adminDoc.exists()) {
            setRole('ADMIN');
          } else {
            const employeeDoc = await getDoc(doc(db!, 'employees', firebaseUser.uid));
            if (employeeDoc.exists()) {
              setRole('EMPLOYEE');
              setEmployeeData({ id: employeeDoc.id, ...employeeDoc.data() } as Employee);
            } else {
              // Handle case where user exists in Auth but not in Firestore
              setRole(null);
            }
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
        }
      } else {
        setUser(null);
        setRole(null);
        setEmployeeData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
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
      
      {!user ? (
        <Login />
      ) : (
        <>
          {role === 'ADMIN' && <AdminDashboard />}
          {role === 'EMPLOYEE' && employeeData && (
            <EmployeeDashboard employee={employeeData} />
          )}
          {role === null && (
            <div className="flex flex-col items-center justify-center h-screen p-4 text-center">
              <h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
              <p className="text-slate-600 mb-4">Your account is not registered in the HR system.</p>
              <button 
                onClick={() => auth?.signOut()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Sign Out
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
