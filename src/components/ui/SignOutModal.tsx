import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, X, AlertCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function SignOutModal({ isOpen, onClose, onConfirm }: Props) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden relative z-10 p-8"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 mb-6">
                <LogOut className="w-8 h-8" />
              </div>
              
              <h3 className="text-xl font-bold text-slate-800 mb-2">Sign Out?</h3>
              <p className="text-sm text-slate-500 mb-8 px-4">
                Are you sure you want to log out of your HRMS account?
              </p>

              <div className="grid grid-cols-2 gap-3 w-full">
                <button
                  onClick={onClose}
                  className="px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  className="px-6 py-3 bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-100 hover:bg-red-700 transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
