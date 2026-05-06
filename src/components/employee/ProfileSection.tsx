import React, { useState } from 'react';
import { Employee } from '../../types';
import { User, Mail, Phone, MapPin, Briefcase, Calendar, Shield, LogOut, Edit2, Save, X, Building, CreditCard } from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import PageHeader from '../ui/PageHeader';
import SignOutModal from '../ui/SignOutModal';

interface Props {
  employee: Employee;
  onBack: () => void;
}

export default function ProfileSection({ employee, onBack }: Props) {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    mobile: employee.mobile || '',
    address: employee.address || '',
    bankName: employee.bankName || '',
    accountNumber: employee.accountNumber || '',
    ifscCode: employee.ifscCode || '',
  });

  const handleLogout = async () => {
    try {
      await auth.signOut();
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  const handleSave = async () => {
    setLoading(true);
    const path = `employees/${employee.id}`;
    try {
      if (!db) throw new Error('Database not initialized');
      const docRef = doc(db, 'employees', employee.id);
      // Use setDoc with merge: true to handle cases where the document might not exist yet (fallback employees)
      await setDoc(docRef, {
        ...employee,
        ...formData
      }, { merge: true });
      
      toast.success('Profile updated successfully');
      setIsEditing(false);
      // Note: Ideally, the parent should refresh the data or we should update local state
      // For now, we rely on the next visit or parent update
      Object.assign(employee, formData); // Optimistic update
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    } finally {
      setLoading(false);
    }
  };

  const infoItems = [
    { icon: User, label: 'Full Name', value: employee.name, immutable: true },
    { icon: Briefcase, label: 'Designation', value: employee.designation || 'Not Set', immutable: true },
    { icon: Shield, label: 'Employee ID', value: employee.employeeId || employee.id, immutable: true },
    { icon: Mail, label: 'Email', value: employee.email, immutable: true },
    { icon: Phone, label: 'Mobile', value: employee.mobile || 'Not Set', key: 'mobile' },
    { icon: MapPin, label: 'Address', value: employee.address || 'Not Set', key: 'address' },
  ];

  const bankItems = [
    { icon: Building, label: 'Bank Name', value: employee.bankName || 'Not Set', key: 'bankName' },
    { icon: CreditCard, label: 'Account Number', value: employee.accountNumber || 'Not Set', key: 'accountNumber' },
    { icon: Shield, label: 'IFSC Code', value: employee.ifscCode || 'Not Set', key: 'ifscCode' },
  ];

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <PageHeader 
          title="My Profile" 
          subtitle="Account Details" 
          onBack={onBack} 
        />
        <button
          onClick={() => isEditing ? setIsEditing(false) : setIsEditing(true)}
          className={`p-2.5 rounded-xl border transition-all active:scale-95 shadow-sm mb-6 ${
            isEditing ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-blue-50 border-blue-100 text-blue-600'
          }`}
        >
          {isEditing ? <X className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
        </button>
      </div>

      <div className="flex flex-col items-center py-6">
        <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-4 shadow-inner">
          <User className="w-12 h-12" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">{employee.name}</h2>
        <p className="text-slate-500 font-medium">{employee.designation || 'Employee'}</p>
      </div>

      <div className="space-y-6">
        <section>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 px-1">Personal Information</h3>
          <div className="grid gap-3">
            {infoItems.map((item, index) => (
              <div key={index} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                  <item.icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">{item.label}</p>
                  {isEditing && !item.immutable ? (
                    <input
                      type="text"
                      value={(formData as any)[item.key!]}
                      onChange={(e) => setFormData({ ...formData, [item.key!]: e.target.value })}
                      className="w-full text-sm font-semibold text-slate-700 bg-slate-50 border-none rounded-lg p-1 px-2 focus:ring-1 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-sm font-semibold text-slate-700">{item.value}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 px-1">Bank Details</h3>
          <div className="grid gap-3">
            {bankItems.map((item, index) => (
              <div key={index} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                  <item.icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">{item.label}</p>
                  {isEditing ? (
                    <input
                      type="text"
                      value={(formData as any)[item.key!]}
                      onChange={(e) => setFormData({ ...formData, [item.key!]: e.target.value })}
                      className="w-full text-sm font-semibold text-slate-700 bg-slate-50 border-none rounded-lg p-1 px-2 focus:ring-1 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-sm font-semibold text-slate-700">{item.value}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {isEditing && (
          <div className="fixed bottom-24 left-6 right-6 z-40">
            <button
              onClick={handleSave}
              disabled={loading}
              className="w-full bg-blue-600 text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-blue-100 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save Profile Changes
                </>
              )}
            </button>
          </div>
        )}

        <div className={`pt-6 ${isEditing ? 'opacity-50 pointer-events-none' : ''}`}>
          <button 
            onClick={() => setShowLogoutModal(true)}
            className="w-full flex items-center justify-center gap-3 p-4 bg-red-50 text-red-600 rounded-2xl font-bold hover:bg-red-100 transition-all border border-red-100 shadow-sm"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </div>

      <SignOutModal 
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
      />
    </div>
  );
}
