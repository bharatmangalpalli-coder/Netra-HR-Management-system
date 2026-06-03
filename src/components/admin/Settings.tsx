import React, { useState, useEffect } from 'react';
import { Upload, Save, Image as ImageIcon, Trash2 } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import toast from 'react-hot-toast';

export default function Settings() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('Netra Consultancy & E-Services');
  const [tagline, setTagline] = useState('Vision for Your Success');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    if (!db) return;
    setLoading(true);
    try {
      const settingsDoc = await getDoc(doc(db, 'settings', 'branding'));
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        setLogoUrl(data.logoUrl || null);
        setCompanyName(data.companyName || 'Netra Consultancy & E-Services');
        setTagline(data.tagline || 'Vision for Your Success');
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        return toast.error("Logo must be less than 1MB");
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!db) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'branding'), {
        logoUrl,
        companyName,
        tagline,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      toast.success("Branding settings saved successfully");
      // Trigger a reload of the logo throughout the app
      window.dispatchEvent(new Event('logoUpdated'));
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const removeLogo = () => {
    setLogoUrl(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100">
          <h3 className="text-xl font-bold text-slate-800">Branding Settings</h3>
          <p className="text-slate-500 text-sm mt-1">Customize your organization's visual identity.</p>
        </div>
        
        <div className="p-8 space-y-8">
          {/* Company Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">Company Name</label>
              <input 
                type="text" 
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Enter company name"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">Tagline</label>
              <input 
                type="text" 
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Enter tagline"
              />
            </div>
          </div>

          {/* Logo Upload */}
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-slate-700">Organization Logo</label>
            <div className="flex flex-col md:flex-row items-start gap-8">
              <div className="w-48 h-48 rounded-3xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center overflow-hidden relative group">
                {logoUrl ? (
                  <>
                    <img src={logoUrl} alt="Logo Preview" className="w-full h-full object-contain p-4" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button 
                        onClick={removeLogo}
                        className="p-2 bg-white text-red-600 rounded-full hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-4">
                    <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-400">No logo uploaded</p>
                  </div>
                )}
              </div>
              
              <div className="flex-1 space-y-4">
                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                  <p className="text-xs text-blue-700 leading-relaxed">
                    <strong>Tip:</strong> Use a high-resolution PNG or SVG with a transparent background for the best results. Recommended size: 512x512px.
                  </p>
                </div>
                
                <div className="flex items-center gap-4">
                  <label className="cursor-pointer px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm">
                    <Upload className="w-5 h-5" />
                    Upload New Logo
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={handleLogoUpload}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-100 flex justify-end">
            <button 
              onClick={handleSave}
              disabled={saving}
              className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Branding Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
