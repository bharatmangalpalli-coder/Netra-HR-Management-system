import React from 'react';
import { AlertCircle, ExternalLink } from 'lucide-react';

export default function SetupFirebase() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 text-center">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-slate-200">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-8 h-8 text-amber-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-4">Firebase Configuration Required</h1>
        <p className="text-slate-600 mb-6 leading-relaxed">
          To start using the HR Management System, you need to configure your Firebase project.
        </p>
        
        <div className="space-y-4 text-left mb-8">
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-left">
            <h3 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
              <span className="w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">1</span>
              Firebase Project & Plan
            </h3>
            <p className="text-sm text-slate-500">Create a project and upgrade to the <b>Blaze Plan</b> (required for Phone Auth).</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-left">
            <h3 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
              <span className="w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">2</span>
              Authorize Domains
            </h3>
            <p className="text-sm text-slate-500 mb-2">Add these to <b>Authentication &gt; Settings &gt; Authorized Domains</b>:</p>
            <div className="space-y-1">
              <code className="block bg-slate-200 p-1 text-[10px] rounded break-all">ais-dev-2cdiyvdvghnkpsjuizmrcv-102289886875.asia-southeast1.run.app</code>
              <code className="block bg-slate-200 p-1 text-[10px] rounded break-all">ais-pre-2cdiyvdvghnkpsjuizmrcv-102289886875.asia-southeast1.run.app</code>
            </div>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-left">
            <h3 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
              <span className="w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">4</span>
              Create Firestore Indexes
            </h3>
            <p className="text-sm text-slate-500 mb-2">Firestore requires composite indexes for sorted queries. Check the console for links or create them for:</p>
            <ul className="text-[10px] text-slate-600 list-disc ml-4 space-y-1">
              <li><b>attendance</b>: date (Asc) + inTime (Desc)</li>
              <li><b>attendance</b>: employeeId (Asc) + date (Desc)</li>
              <li><b>leaves</b>: status (Asc) + appliedAt (Desc)</li>
              <li><b>leaves</b>: employeeId (Asc) + appliedAt (Desc)</li>
              <li><b>tasks</b>: assignedTo (Asc) + createdAt (Desc)</li>
            </ul>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-left">
            <h3 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
              <span className="w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">5</span>
              Add Environment Variables
            </h3>
            <p className="text-sm text-slate-500">Add your Firebase config to the <code className="bg-slate-200 px-1 rounded">.env</code> file.</p>
          </div>
        </div>

        <a 
          href="https://console.firebase.google.com/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
        >
          Open Firebase Console
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
