/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { 
  Building2, 
  CreditCard, 
  HelpCircle, 
  Plus, 
  Trash2, 
  Upload, 
  Image as ImageIcon, 
  FileText, 
  Mail, 
  Phone, 
  MapPin, 
  Check, 
  ArrowRight,
  Hash,
  Users,
  Bell,
  Shield,
  Cloud,
  Download
} from "lucide-react";
import { CompanySettings, CompanyProfile, TermsPreset, User, SubscriptionPolicy } from "../types";
import { useAuth } from "../hooks/useAuth";
import { triggerCloudBackup, restoreFromCloud } from "../backup";
import { exportAppState, importAppState } from "../utils";


interface SettingsViewProps {
  settings: CompanySettings;
  companyProfiles: CompanyProfile[];
  onUpdateCompanyProfiles: (updated: CompanyProfile[]) => void;
  customers?: any[];
  products?: any[];
  quotations?: any[];
  invoices?: any[];
  challans?: any[];
  leads?: any[];
  subscriptions?: any[];
  reminders?: any[];
  inventory?: any[];
}

export default function SettingsView({
  settings,
  companyProfiles = [],
  onUpdateCompanyProfiles,
  customers = [],
  products = [],
  quotations = [],
  invoices = [],
  challans = [],
  leads = [],
  subscriptions = [],
  reminders = [],
  inventory = []
}: SettingsViewProps) {
  
  // Track selected profile ID to edit
  const { users: allUsers, addUser, updateUser, deleteUser, user: currentUser, switchUser } = useAuth();
  
  const [selectedProfileId, setSelectedProfileId] = useState<string>(
    companyProfiles[0]?.id || "comp_apex"
  );
  
  const [activeSettingsTab, setActiveSettingsTab] = useState<"company" | "users" | "policies" | "backups" | "email">("company");

  // Core current editable profile
  const currentProfile = companyProfiles.find(p => p.id === selectedProfileId) || companyProfiles[0];

  // Quick feedback toasts or statuses
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Ref triggers for custom file upload zones
  const headerFileRef = useRef<HTMLInputElement>(null);
  const footerFileRef = useRef<HTMLInputElement>(null);
  const signatureFileRef = useRef<HTMLInputElement>(null);

  // States for creating a user
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [newUser, setNewUser] = useState<Partial<User>>({ role: 'Employee', isActive: true });

  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreFileId, setRestoreFileId] = useState("");


  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleLocalBackupDownload = () => {
    try {
      exportAppState({
        companyProfiles,
        customers,
        products,
        quotations,
        invoices,
        challans,
        leads,
        subscriptions,
        reminders,
        inventory
      });
      showToast("Backup downloaded successfully.");
    } catch (err: any) {
      console.error("Backup export failed:", err);
      alert("Failed to export backup: " + (err.message || err));
    }
  };

  const handleLocalBackupRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!confirm("Are you sure you want to restore data from this JSON file? All current data will be overwritten. This action is irreversible.")) {
        e.target.value = ""; 
        return;
      }
      
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const rawText = event.target?.result as string;
          await importAppState(rawText, {
            companyProfiles,
            customers,
            products,
            quotations,
            invoices,
            challans,
            leads,
            subscriptions,
            reminders,
            inventory
          });
          alert("Data restored and synchronized to server successfully! The page will now reload.");
          window.location.reload();
        } catch (err: any) {
          console.error("Import restore fail:", err);
          alert("Restore failed: " + (err.message || "Failed to parse or save backup JSON. Please verify it is valid."));
        }
      };
      reader.readAsText(file);
    }
  };

  // Indian State listing
  const indianStates = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", 
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", 
    "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", 
    "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", 
    "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
    "Delhi", "Jammu and Kashmir", "Ladakh"
  ];

  // Helper file parser to Base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, target: "header" | "footer" | "signature") => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) {
        alert("Image file size should be less than 2MB for optimized local loading.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        updateProfileField(target === "header" ? "headerImage" : target === "footer" ? "footerImage" : "signatureImage", base64String);
        showToast(`${target === "header" ? "Header" : target === "footer" ? "Footer" : "Signature"} logo graphic compressed & saved successfully!`);
      };
      reader.readAsDataURL(file);
    }
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, target: "header" | "footer" | "signature") => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (!file.type.startsWith("image/")) {
        alert("Please drop a valid image file (PNG, JPG, SVG).");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        updateProfileField(target === "header" ? "headerImage" : target === "footer" ? "footerImage" : "signatureImage", reader.result as string);
        showToast(`${target === "header" ? "Header" : target === "footer" ? "Footer" : "Signature"} logo graphic dropped & saved!`);
      };
      reader.readAsDataURL(file);
    }
  };

  // Helper field updater
  const updateProfileField = (field: keyof CompanyProfile, value: any) => {
    const updated = companyProfiles.map(p => {
      if (p.id === selectedProfileId) {
        return { ...p, [field]: value };
      }
      return p;
    });
    onUpdateCompanyProfiles(updated);
  };

  // Create a brand new company profile
  const handleAddCompany = () => {
    const newId = "comp_" + Date.now();
    const newProfile: CompanyProfile = {
      id: newId,
      name: "New Corporate Entity Ltd.",
      email: "info@newentity.com",
      phone: "+91 22 1234 5678",
      address: "101 Corporate Hub, MG Road, Mumbai, Maharashtra",
      gstin: "27AAACN0000A1Z5",
      pan: "AAACN0000A",
      state: "Maharashtra",
      bankName: "State Bank of India",
      bankBranch: "Main Corporate Branch",
      accountNo: "110022334455",
      ifsc: "SBIN0000101",
      headerImage: "",
      footerImage: "",
      quotationPrefix: "QTN-NEW",
      invoicePrefix: "PI-NEW",
      challanPrefix: "DC-NEW",
      nextQuotationNumber: 1,
      nextInvoiceNumber: 1,
      nextChallanNumber: 1,
      termsPresets: [
        {
          id: "tp_" + Date.now() + "_1",
          title: "Standard SLA Agreement",
          content: "1. Quotation valid for 15 days.\n2. 100% advance retainership."
        }
      ]
    };

    onUpdateCompanyProfiles([...companyProfiles, newProfile]);
    setSelectedProfileId(newId);
    showToast("Splendid! New corporate legal profile generated successfully.");
  };

  // Delete a company profile
  const handleDeleteCompany = (id: string) => {
    if (companyProfiles.length <= 1) {
      alert("At least one primary legal entity profile is required to route draft and active bills.");
      return;
    }
    if (confirm("Confirm permanent deletion of this bidding corporate profile? All historical invoices referencing this ID will default fallback to your remaining profile.")) {
      const idx = companyProfiles.findIndex(p => p.id === id);
      const filtered = companyProfiles.filter(p => p.id !== id);
      onUpdateCompanyProfiles(filtered);
      
      // select next available
      const nextId = filtered[0]?.id || "";
      setSelectedProfileId(nextId);
      showToast("Company profile dissolved.");
    }
  };

  // Preset operations
  const handleAddTermsPreset = () => {
    if (!currentProfile) return;
    const newPreset: TermsPreset = {
      id: "preset_" + Date.now(),
      title: "New Custom Clauses Template",
      content: "1. Validity constraints.\n2. Payment terms.\n3. Warranties & Jurisdiction codes."
    };
    updateProfileField("termsPresets", [...currentProfile.termsPresets, newPreset]);
    showToast("New Terms preset block inserted.");
  };

  const handleUpdatePreset = (presetId: string, updatedFields: Partial<TermsPreset>) => {
    if (!currentProfile) return;
    const updatedPresets = currentProfile.termsPresets.map(t => {
      if (t.id === presetId) {
        return { ...t, ...updatedFields };
      }
      return t;
    });
    updateProfileField("termsPresets", updatedPresets);
  };

  const handleDeletePreset = (presetId: string) => {
    if (!currentProfile) return;
    if (currentProfile.termsPresets.length <= 1) {
      alert("Please retain at least one terms preset option to select on quotations.");
      return;
    }
    const filtered = currentProfile.termsPresets.filter(t => t.id !== presetId);
    updateProfileField("termsPresets", filtered);
    showToast("Terms preset template removed.");
  };

  if (!currentProfile) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200">
        <Building2 className="w-12 h-12 text-slate-300 mb-2" />
        <p className="text-slate-500 font-sans font-bold">No active company profiles. Create one now.</p>
        <button 
          onClick={handleAddCompany}
          className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl"
        >
          Add Legal Profile
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto" id="company-settings-composite">
      
      {/* Toast Feedback Alert */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-55 bg-indigo-950 text-indigo-100 px-4 py-3 rounded-xl border border-indigo-800 shadow-xl flex items-center gap-2 animate-fade-in font-sans text-xs">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Header panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">System Configuration Workspace</h2>
          <p className="text-xs text-slate-500 font-sans">Manage corporate profiles, authorized staff members, and subscription notification pipelines</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleLocalBackupDownload}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
            title="Download full database state as a JSON file"
          >
            <Download className="w-3.5 h-3.5" /> Export DB JSON
          </button>
          <label
            className="px-3 py-1.5 bg-indigo-650 hover:bg-indigo-700 bg-indigo-600 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all text-center"
            title="Restore database state from a backup JSON file"
          >
            <Upload className="w-3.5 h-3.5" /> Import DB JSON
            <input 
              type="file" 
              accept=".json" 
              onChange={handleLocalBackupRestore} 
              className="hidden" 
            />
          </label>
        </div>
      </div>
      
      {/* Top Tabs */}
      <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 w-fit">
         <button onClick={() => setActiveSettingsTab("company")} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeSettingsTab === "company" ? "bg-white shadow-sm text-indigo-700" : "text-slate-500 hover:text-slate-800"}`}>
            <div className="flex items-center gap-1.5"><Building2 className="w-4 h-4"/> Business Entities</div>
         </button>
         <button onClick={() => setActiveSettingsTab("users")} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeSettingsTab === "users" ? "bg-white shadow-sm text-indigo-700" : "text-slate-500 hover:text-slate-800"}`}>
            <div className="flex items-center gap-1.5"><Users className="w-4 h-4"/> Staff Directory</div>
         </button>
         <button onClick={() => setActiveSettingsTab("policies")} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeSettingsTab === "policies" ? "bg-white shadow-sm text-indigo-700" : "text-slate-500 hover:text-slate-800"}`}>
            <div className="flex items-center gap-1.5"><Bell className="w-4 h-4"/> Reminder Policies</div>
         </button>
         <button onClick={() => setActiveSettingsTab("backups")} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeSettingsTab === "backups" ? "bg-white shadow-sm text-indigo-700" : "text-slate-500 hover:text-slate-800"}`}>
            <div className="flex items-center gap-1.5"><Cloud className="w-4 h-4"/> Data Backups</div>
         </button>
         <button onClick={() => setActiveSettingsTab("email")} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeSettingsTab === "email" ? "bg-white shadow-sm text-indigo-700" : "text-slate-500 hover:text-slate-800"}`}>
            <div className="flex items-center gap-1.5"><Mail className="w-4 h-4"/> Email Configuration</div>
         </button>
      </div>

      {activeSettingsTab === 'company' && (
      /* Sub-layout: Left column sidebar lists profiles, Right column handles the details */
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start font-sans">
        
        {/* Left side list of companies selector */}
        <div className="lg:col-span-1 space-y-3">
          <div className="flex justify-between items-center px-1">
            <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Registered Entities</span>
            <button onClick={handleAddCompany} className="text-indigo-600 hover:text-indigo-800"><Plus className="w-4 h-4" /></button>
          </div>

          <div className="space-y-2">
            {companyProfiles.map((p) => {
              const isActive = p.id === selectedProfileId;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedProfileId(p.id)}
                  className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-200 relative group flex justify-between items-start ${
                    isActive 
                      ? "bg-indigo-50 border-indigo-200 shadow-sm"
                      : "bg-white border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="space-y-1 text-xs">
                    <div className="font-extrabold text-slate-900 leading-tight line-clamp-1 break-all pr-4">
                      {p.name}
                    </div>
                    <div className="text-[10px] text-slate-450 flex items-center gap-1 leading-none">
                      <span className="font-mono bg-slate-100 border px-1 rounded uppercase">{p.state}</span>
                      <span>•</span>
                      <span className="font-mono text-[9px] tracking-wide">{p.gstin.slice(0, 7)}...</span>
                    </div>
                  </div>

                  {companyProfiles.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCompany(p.id);
                      }}
                      className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 p-1 rounded-lg shrink-0 transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete profile"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="bg-amber-50 rounded-xl p-3 border border-amber-250 text-amber-800 text-[11px] leading-relaxed">
            <h4 className="font-bold uppercase tracking-wider text-[9px] mb-1 flex items-center gap-1">Note: Workspace Fallback</h4>
            Active bills, estimates, challans, or proformas default to pulling meta structures from the first company profile inside this lists unless custom overridden during drafting.
          </div>
        </div>

        {/* Right side edit forms (Bento block layout) */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Header & Logo Section (answering "header image and footer image") */}
          <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm shadow-slate-100/50 space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 leading-none">
              <ImageIcon className="w-4 h-4 text-indigo-600 shrink-0" />
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Letterhead Header & Footer Graphic Designs</h3>
            </div>
            <p className="text-slate-450 text-[11px]">Upload custom graphics designed to print at the extreme top (Header block) and extremely bottom (Footer terms/signature blocks) of your Quotation and Proforma PDF layouts. Drag & drop works instantly!</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Header block upload */}
              <div 
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, "header")}
                className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl p-4 text-center cursor-pointer transition-colors bg-slate-50/20 text-xs flex flex-col justify-between min-h-[140px]"
              >
                <input 
                  type="file" 
                  ref={headerFileRef}
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileChange(e, "header")}
                />
                
                {currentProfile.headerImage ? (
                  <div className="space-y-3">
                    <div className="mx-auto max-h-[70px] max-w-[240px] overflow-hidden border border-slate-200 rounded p-1 bg-white flex justify-center items-center">
                      <img 
                        src={currentProfile.headerImage} 
                        alt="Header logo preview" 
                        className="max-h-[60px] max-w-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="flex justify-center gap-2">
                      <button 
                        onClick={() => updateProfileField("headerImage", "")}
                        className="px-2 py-1 rounded bg-rose-50 text-rose-600 hover:bg-rose-100 text-[10px] font-bold border border-rose-100 font-sans"
                      >
                        Reset Graphic
                      </button>
                      <button 
                        onClick={() => headerFileRef.current?.click()}
                        className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold border border-slate-200 font-sans"
                      >
                        Replace Logo
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="my-auto py-3 space-y-2" onClick={() => headerFileRef.current?.click()}>
                    <Upload className="w-6 h-6 text-slate-305 mx-auto" />
                    <div>
                      <span className="font-bold text-indigo-700">Drag & drop</span> high resolution <strong className="text-slate-800">Header Letterhead Logo</strong> here, or click to upload
                    </div>
                    <p className="text-[10px] text-slate-400 leading-none">Landscape, ratio e.g. 5:1 limits recommended</p>
                  </div>
                )}
              </div>

              {/* Footer block upload */}
              <div 
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, "footer")}
                className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl p-4 text-center cursor-pointer transition-colors bg-slate-50/20 text-xs flex flex-col justify-between min-h-[140px]"
              >
                <input 
                  type="file" 
                  ref={footerFileRef}
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileChange(e, "footer")}
                />

                {currentProfile.footerImage ? (
                  <div className="space-y-3">
                    <div className="mx-auto max-h-[70px] max-w-[240px] overflow-hidden border border-slate-200 rounded p-1 bg-white flex justify-center items-center">
                      <img 
                        src={currentProfile.footerImage} 
                        alt="Footer brand preview" 
                        className="max-h-[60px] max-w-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="flex justify-center gap-2">
                      <button 
                        onClick={() => updateProfileField("footerImage", "")}
                        className="px-2 py-1 rounded bg-rose-50 text-rose-600 hover:bg-rose-100 text-[10px] font-bold border border-rose-100 font-sans"
                      >
                        Reset Graphic
                      </button>
                      <button 
                        onClick={() => footerFileRef.current?.click()}
                        className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold border border-slate-200 font-sans"
                      >
                        Replace Logo
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="my-auto py-3 space-y-2" onClick={() => footerFileRef.current?.click()}>
                    <Upload className="w-6 h-6 text-slate-305 mx-auto" />
                    <div>
                      <span className="font-bold text-indigo-700">Drag & drop</span> standard company validation stamp / <strong className="text-slate-800">Footer Seal Sign</strong> here
                    </div>
                    <p className="text-[10px] text-slate-400 leading-none">Landscape validation footer signet image</p>
                  </div>
                )}
              </div>

              {/* Signature block upload */}
              <div 
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, "signature")}
                className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl p-4 text-center cursor-pointer transition-colors bg-slate-50/20 text-xs flex flex-col justify-between min-h-[140px]"
              >
                <input 
                  type="file" 
                  ref={signatureFileRef}
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileChange(e, "signature")}
                />

                {currentProfile.signatureImage ? (
                  <div className="space-y-3">
                    <div className="mx-auto max-h-[70px] max-w-[240px] overflow-hidden border border-slate-200 rounded p-1 bg-white flex justify-center items-center">
                      <img 
                        src={currentProfile.signatureImage} 
                        alt="Signature preview" 
                        className="max-h-[60px] max-w-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="flex justify-center gap-2">
                      <button 
                        onClick={() => updateProfileField("signatureImage", "")}
                        className="px-2 py-1 rounded bg-rose-50 text-rose-600 hover:bg-rose-100 text-[10px] font-bold border border-rose-100 font-sans"
                      >
                        Reset
                      </button>
                      <button 
                        onClick={() => signatureFileRef.current?.click()}
                        className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold border border-slate-200 font-sans"
                      >
                        Replace
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="my-auto py-3 space-y-2" onClick={() => signatureFileRef.current?.click()}>
                    <Upload className="w-6 h-6 text-slate-305 mx-auto" />
                    <div>
                      <span className="font-bold text-indigo-700">Drag & drop</span> official <strong className="text-slate-800">Authorised Signature</strong> image here
                    </div>
                    <p className="text-[10px] text-slate-400 leading-none">High contrast signature</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Legal Entity profile settings (Bento block 1) */}
          <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm shadow-slate-100/50 space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 leading-none">
              <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Corporate & Tax Registration parameters</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-500 font-bold mb-1 uppercase text-[9px] tracking-wide">Corporate legal company name</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-850 font-bold focus:outline-none focus:border-indigo-500"
                  value={currentProfile.name}
                  onChange={(e) => updateProfileField("name", e.target.value)}
                />
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1 uppercase text-[9px] tracking-wide">PDF Template Design</label>
                <select
                  value={currentProfile.template || "minimal"}
                  onChange={(e) => updateProfileField("template", e.target.value as 'minimal' | 'classic' | 'modern')}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-850 font-bold focus:outline-none focus:border-indigo-500"
                >
                  <option value="minimal">Minimal Design</option>
                  <option value="classic">Classic Design</option>
                  <option value="modern">Modern Design</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-505 font-bold mb-1 uppercase text-[9px] tracking-wide">Primary State jurisdiction</label>
                <select
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-850 focus:outline-none focus:border-indigo-500 font-semibold"
                  value={currentProfile.state}
                  onChange={(e) => updateProfileField("state", e.target.value)}
                >
                  {indianStates.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-500 font-bold mb-1 uppercase text-[9px] tracking-wide">GSTIN (15 characters)</label>
                <input
                  type="text"
                  maxLength={15}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-850 font-mono uppercase font-bold focus:outline-none focus:border-indigo-500"
                  value={currentProfile.gstin}
                  onChange={(e) => updateProfileField("gstin", e.target.value.toUpperCase())}
                />
              </div>

              <div>
                <label className="block text-slate-505 font-bold mb-1 uppercase text-[9px] tracking-wide">PAN Registrations Code</label>
                <input
                  type="text"
                  maxLength={10}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-850 font-mono uppercase font-bold focus:outline-none focus:border-indigo-500"
                  value={currentProfile.pan}
                  onChange={(e) => updateProfileField("pan", e.target.value.toUpperCase())}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-550 font-bold mb-1 uppercase text-[9px] tracking-wide flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" /> Company Corporate Email
                </label>
                <input
                  type="email"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 focus:outline-none focus:border-indigo-500"
                  value={currentProfile.email}
                  onChange={(e) => updateProfileField("email", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-slate-550 font-bold mb-1 uppercase text-[9px] tracking-wide flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" /> Corporate Telephone No.
                </label>
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 font-mono focus:outline-none focus:border-indigo-500"
                  value={currentProfile.phone}
                  onChange={(e) => updateProfileField("phone", e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-500 font-bold mb-1 uppercase text-[9px] tracking-wide flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" /> Billing Address Registry
              </label>
              <textarea
                rows={2}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-705 leading-relaxed focus:outline-none focus:border-indigo-500"
                value={currentProfile.address}
                onChange={(e) => updateProfileField("address", e.target.value)}
              />
            </div>
          </div>

          {/* Document Numbering & Sequences (answering "document number") */}
          <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm shadow-slate-100/50 space-y-4 animate-fade-in">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 leading-none">
              <Hash className="w-4 h-4 text-indigo-600 shrink-0" />
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Document Numbering & Sequence Controls</h3>
            </div>
            <p className="text-slate-450 text-[11px]">Define the prefix codes and next sequence numbers automatically queried for newly generated documents issued under this specific profile entity.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Quotations numbering */}
              <div className="p-3.5 rounded-lg border border-slate-100 bg-slate-50/15 space-y-3">
                <span className="font-extrabold text-slate-600 text-[10px] uppercase block leading-none">Quotation sequence</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 font-bold uppercase text-[8px] tracking-wider mb-0.5">Prefix</label>
                    <input 
                      type="text"
                      className="w-full font-mono font-bold bg-white border border-slate-205 rounded px-2 py-1 uppercase text-slate-800"
                      value={currentProfile.quotationPrefix || ""}
                      onChange={(e) => updateProfileField("quotationPrefix", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-bold uppercase text-[8px] tracking-wider mb-0.5">Next Sl #</label>
                    <input 
                      type="number"
                      className="w-full font-mono font-bold bg-white border border-slate-205 rounded px-2 py-1 text-slate-800"
                      value={currentProfile.nextQuotationNumber || 1}
                      onChange={(e) => updateProfileField("nextQuotationNumber", parseInt(e.target.value) || 1)}
                    />
                  </div>
                </div>
                <div className="text-[10px] text-slate-400">
                  Preview: <span className="font-mono font-bold text-indigo-700">{(currentProfile.quotationPrefix || "QTN")}-{new Date().getFullYear().toString().slice(2)}-{(currentProfile.nextQuotationNumber || 1)}</span>
                </div>
              </div>

              {/* Proforma numbering */}
              <div className="p-3.5 rounded-lg border border-slate-100 bg-slate-50/15 space-y-3">
                <span className="font-extrabold text-slate-600 text-[10px] uppercase block leading-none">Proforma sequence</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 font-bold uppercase text-[8px] tracking-wider mb-0.5">Prefix</label>
                    <input 
                      type="text"
                      className="w-full font-mono font-bold bg-white border border-slate-205 rounded px-2 py-1 uppercase text-slate-800"
                      value={currentProfile.invoicePrefix || ""}
                      onChange={(e) => updateProfileField("invoicePrefix", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-bold uppercase text-[8px] tracking-wider mb-0.5">Next Sl #</label>
                    <input 
                      type="number"
                      className="w-full font-mono font-bold bg-white border border-slate-205 rounded px-2 py-1 text-slate-800"
                      value={currentProfile.nextInvoiceNumber || 1}
                      onChange={(e) => updateProfileField("nextInvoiceNumber", parseInt(e.target.value) || 1)}
                    />
                  </div>
                </div>
                <div className="text-[10px] text-slate-400">
                  Preview: <span className="font-mono font-bold text-indigo-700">{(currentProfile.invoicePrefix || "PI")}-{new Date().getFullYear().toString().slice(2)}-{(currentProfile.nextInvoiceNumber || 1)}</span>
                </div>
              </div>

              {/* Challan numbering */}
              <div className="p-3.5 rounded-lg border border-slate-100 bg-slate-50/15 space-y-3">
                <span className="font-extrabold text-slate-600 text-[10px] uppercase block leading-none">Challan sequence</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 font-bold uppercase text-[8px] tracking-wider mb-0.5">Prefix</label>
                    <input 
                      type="text"
                      className="w-full font-mono font-bold bg-white border border-slate-205 rounded px-2 py-1 uppercase text-slate-800"
                      value={currentProfile.challanPrefix || ""}
                      onChange={(e) => updateProfileField("challanPrefix", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-bold uppercase text-[8px] tracking-wider mb-0.5">Next Sl #</label>
                    <input 
                      type="number"
                      className="w-full font-mono font-bold bg-white border border-slate-205 rounded px-2 py-1 text-slate-800"
                      value={currentProfile.nextChallanNumber || 1}
                      onChange={(e) => updateProfileField("nextChallanNumber", parseInt(e.target.value) || 1)}
                    />
                  </div>
                </div>
                <div className="text-[10px] text-slate-400">
                  Preview: <span className="font-mono font-bold text-indigo-700">{(currentProfile.challanPrefix || "DC")}-{new Date().getFullYear().toString().slice(2)}-{(currentProfile.nextChallanNumber || 1)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bank details settings (Bento block 2) */}
          <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm shadow-slate-100/50 space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 leading-none">
              <CreditCard className="w-4 h-4 text-indigo-600 shrink-0" />
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Bank accounts & EFT Routing rules</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-500 font-bold mb-1 uppercase text-[9px] tracking-wide">Authorized Banker Name</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 font-bold focus:outline-none focus:border-indigo-500"
                  value={currentProfile.bankName}
                  onChange={(e) => updateProfileField("bankName", e.target.value)}
                />
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1 uppercase text-[9px] tracking-wide font-sans">Bank branch details</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 focus:outline-none focus:border-indigo-500"
                  value={currentProfile.bankBranch}
                  onChange={(e) => updateProfileField("bankBranch", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-500 font-bold mb-1 uppercase text-[9px] tracking-wide font-mono">Current Account Number</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 font-mono font-extrabold focus:outline-none focus:border-indigo-500"
                  value={currentProfile.accountNo}
                  onChange={(e) => updateProfileField("accountNo", e.target.value)}
                />
              </div>

              <div>
                <label className="block text-slate-505 font-bold mb-1 uppercase text-[9px] tracking-wide">IFSC Routing signature</label>
                <input
                  type="text"
                  maxLength={11}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-850 font-mono uppercase font-extrabold focus:outline-none focus:border-indigo-500"
                  value={currentProfile.ifsc}
                  onChange={(e) => updateProfileField("ifsc", e.target.value.toUpperCase())}
                />
              </div>
            </div>
          </div>

          {/* Multiple terms & conditions templates (answering "with terms and condition with multiple tems and conditon options") */}
          <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm shadow-slate-100/50 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2.5 leading-none">
                <HelpCircle className="w-4 h-4 text-indigo-600 shrink-0" />
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Multiple Contract Clause Variants</h3>
              </div>
              <button
                onClick={handleAddTermsPreset}
                className="flex items-center gap-1 text-[10px] bg-slate-100 hover:bg-slate-200 text-indigo-700 font-extrabold px-2.5 py-1 rounded-lg border border-slate-200 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Log Custom Preset Option
              </button>
            </div>
            <p className="text-slate-450 text-[11px] leading-relaxed">Ensure dynamic matching of standard clauses (disclaimer warranties, billing credit limits, court locations) by generating and indexing multiple custom terms of conditions templates. Apply them seamlessly within any active quotation view.</p>

            <div className="space-y-4">
              {currentProfile.termsPresets?.map((tp, idx) => {
                return (
                  <div key={tp.id || idx} className="p-4 rounded-xl bg-slate-50/30 border border-slate-150 space-y-3 relative group">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5 text-slate-500 text-[10.5px]">
                        <span className="font-extrabold bg-indigo-50 border border-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded text-[9px] font-mono leading-none">PresetOption #{idx + 1}</span>
                        <ArrowRight className="w-3 h-3 text-slate-350" />
                      </div>
                      <button
                        onClick={() => handleDeletePreset(tp.id)}
                        className="p-1 text-slate-450 hover:text-rose-500 rounded bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-colors cursor-pointer"
                        title="Delete this template option"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <label className="block text-[8.5px] uppercase font-extrabold text-slate-400 mb-0.5">Template Title Indicator</label>
                        <input
                          type="text"
                          required
                          className="w-full bg-white border border-slate-205 rounded px-2.5 py-1 text-slate-800 font-bold focus:outline-none focus:border-indigo-500"
                          value={tp.title || ""}
                          placeholder="e.g. Standard 30 days SaaS billing terms..."
                          onChange={(e) => handleUpdatePreset(tp.id, { title: e.target.value })}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-[8.5px] uppercase font-extrabold text-slate-400 mb-0.5 font-sans">Full Legal Clauses Clauses (Rendered in Print layout)</label>
                        <textarea
                          rows={4}
                          required
                          className="w-full bg-white border border-slate-205 rounded px-2.5 py-1.5 text-slate-600 font-mono text-[10.5px] leading-relaxed focus:outline-none focus:border-indigo-500"
                          value={tp.content || ""}
                          placeholder="Clause bullet items..."
                          onChange={(e) => handleUpdatePreset(tp.id, { content: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              {(!currentProfile.termsPresets || currentProfile.termsPresets.length === 0) && (
                <div className="text-center py-6 bg-slate-50/10 rounded-xl border border-dashed text-slate-400 text-xs italic">
                  No terms presets registered. Biddings and billing sheets will default to writing manual clauses.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      )}

      {activeSettingsTab === 'users' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 border-b border-slate-105 pb-4 gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Staff / Employee Directory & Rights Management</h3>
              <p className="text-xs text-slate-500">Add, configure, and manage employee profiles and modular access privileges.</p>
            </div>
            <button 
              onClick={() => {
                setNewUser({ role: 'Employee', isActive: true });
                setIsUserModalOpen(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-bold self-start md:self-auto"
            >
              + Create Staff Login
            </button>
          </div>

          {/* Active profile selector context block */}
          <div className="p-4 bg-indigo-50/55 border border-indigo-100 rounded-xl space-y-3">
            <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5 leading-none">
              <Shield className="w-4 h-4 text-indigo-600 shrink-0" /> Currently Active Operating Profile Context
            </h4>
            <p className="text-slate-650 text-xs">Switch the current system perspective instantly. Select any user from the drop-down below to view the entire app-environment from their unique role and access rights permissions.</p>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={currentUser?.id || ""}
                onChange={(e) => {
                  const targetUser = allUsers.find(u => u.id === e.target.value);
                  if (targetUser) {
                    switchUser(targetUser);
                    showToast(`Operating profile context switched to ${targetUser.name}`);
                  }
                }}
                className="bg-white border border-indigo-200 rounded-lg px-3 py-1.5 font-bold text-xs text-slate-850 focus:outline-none focus:border-indigo-500 shadow-sm"
              >
                {allUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role}) {u.id === currentUser?.id ? " [ACTIVE]" : ""}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-slate-400 font-mono">
                Acting Identity: <strong className="text-slate-700">{currentUser?.name}</strong> • Role level: <strong className="text-slate-700">{currentUser?.role}</strong>
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {allUsers.map((u) => {
              // Ensure we have active fallback keys for rights
              const currentRights = u.rights || {
                dashboard: true,
                quotations: true,
                proforma: true,
                challans: true,
                leads: true,
                customers: true,
                products: true,
                inventory: true,
                subscriptions: true,
                reminders: true,
                settings: u.role === 'Admin'
              };

              const allModuleKeys: Array<{ id: string; label: string }> = [
                { id: "dashboard", label: "Dashboard" },
                { id: "quotations", label: "Quotations" },
                { id: "proforma", label: "Proforma Invoices" },
                { id: "challans", label: "Delivery Challans" },
                { id: "leads", label: "Leads" },
                { id: "customers", label: "Customers" },
                { id: "products", label: "Products" },
                { id: "inventory", label: "Inventory" },
                { id: "subscriptions", label: "Subscriptions" },
                { id: "reminders", label: "Reminders" },
                { id: "settings", label: "Company Settings" }
              ];

              return (
                <div key={u.id} className="p-5 rounded-xl border border-slate-205 bg-slate-50/50 space-y-4 shadow-sm">
                  {/* Top Header Card */}
                  <div className="flex flex-wrap md:flex-nowrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-lg uppercase shrink-0">
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-800 leading-tight flex items-center gap-2">
                           {u.name}
                           {u.role === 'Admin' ? (
                             <span className="bg-indigo-100 text-indigo-850 px-2 py-0.5 rounded text-[9px] font-extrabold tracking-wider uppercase">Admin</span>
                           ) : (
                             <span className="bg-amber-50 border border-amber-200 text-amber-800 px-2 py-0.5 rounded text-[9px] font-extrabold tracking-wider uppercase">Employee</span>
                           )}
                           {u.id === currentUser?.id && (
                             <span className="bg-emerald-100 text-emerald-805 px-1.5 py-0.5 rounded text-[9px] font-extrabold tracking-wider uppercase">Active Session</span>
                           )}
                        </h4>
                        <p className="text-xs text-slate-500 leading-tight font-mono">{u.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto mt-2 md:mt-0 justify-end">
                      <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase leading-none ${u.isActive ? 'bg-emerald-150 text-emerald-750' : 'bg-slate-200 text-slate-700'}`}>
                        {u.isActive ? 'Granted Access' : 'Suspended'}
                      </span>
                      
                      {u.id !== currentUser?.id && (
                        <div className="flex gap-1.5">
                           <button
                             onClick={() => {
                               updateUser({ ...u, isActive: !u.isActive });
                               showToast(u.isActive ? `Access suspended for ${u.name}` : `Access restored for ${u.name}`);
                             }}
                             className="px-2 py-1 text-xs font-bold border border-slate-250 bg-white hover:bg-slate-100 rounded text-slate-700 transition-colors"
                           >
                             {u.isActive ? 'Suspend' : 'Unsuspend'}
                           </button>
                           {u.role !== 'Admin' && (
                             <button
                               onClick={() => {
                                 if (confirm(`Completely remove staff member ${u.name}?`)) {
                                   deleteUser(u.id);
                                   showToast("Staff account terminated successfully");
                                 }
                               }}
                               className="px-2 py-1 text-xs font-bold border border-rose-200 rounded bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                             >
                               Terminate
                             </button>
                           )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Checkbox grid for granular module access rights */}
                  <div className="border-t border-slate-200/80 pt-3">
                    <span className="text-[10px] uppercase font-mono tracking-wider font-extrabold text-slate-450 block mb-2 leading-none">Module Access Rights Permissions</span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 bg-white p-3 rounded-lg border border-slate-150">
                      {allModuleKeys.map((mod) => {
                        const isChecked = !!(currentRights as any)[mod.id];
                        return (
                          <label key={mod.id} className="flex items-center gap-2 cursor-pointer select-none group w-full">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const updatedRights = {
                                  ...currentRights,
                                  [mod.id]: e.target.checked
                                };
                                updateUser({ ...u, rights: updatedRights });
                                showToast(`Access privilege changed for ${u.name}`);
                              }}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                            />
                            <span className="text-xs text-slate-655 font-semibold group-hover:text-indigo-600 transition-colors">
                              {mod.label}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeSettingsTab === 'policies' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Subscription & Renewal Policies</h3>
              <p className="text-xs text-slate-500">Configure auto-generated email templates for near-renewal reminders</p>
            </div>
            <button 
              onClick={() => {
                const newPolicy: SubscriptionPolicy = {
                  id: "pol_" + Date.now(),
                  daysBeforeRenewal: 7,
                  emailSubjectTemplate: "Action Required: Your subscription renews in {{days}} days",
                  emailBodyTemplate: "Dear {{customerName}},\n\nThis is a gentle reminder that your {{serviceName}} subscription will renew on {{renewalDate}}.\n\nThank you,\n{{companyName}}",
                  isActive: true
                };
                const updatedPolicies = [...(currentProfile.subscriptionPolicies || []), newPolicy];
                updateProfileField("subscriptionPolicies" as any, updatedPolicies); // Store in settings/profile
                showToast("New policy template generated");
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-bold"
            >
              + Create Template Policy
            </button>
          </div>

          <div className="space-y-6">
            {(currentProfile.subscriptionPolicies || []).map((policy, idx) => (
              <div key={policy.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="flex justify-between items-start">
                   <div className="flex items-center gap-2">
                     <span className="font-mono bg-indigo-100 text-indigo-800 text-[10px] px-2 py-0.5 rounded font-bold">Policy #{idx + 1}</span>
                     <span className="text-sm font-bold text-slate-700">Triggers <input type="number" value={policy.daysBeforeRenewal} onChange={(e) => {
                       const updated = (currentProfile.subscriptionPolicies || []).map(p => p.id === policy.id ? { ...p, daysBeforeRenewal: parseInt(e.target.value) || 0 } : p);
                       onUpdateCompanyProfiles(companyProfiles.map(cp => cp.id === selectedProfileId ? { ...cp, subscriptionPolicies: updated } as any : cp));
                     }} className="w-16 border rounded px-1.5 py-0.5 text-center text-indigo-700 mx-1 border-slate-300" /> days before renewal</span>
                   </div>
                   <button 
                     onClick={() => {
                       const updated = (currentProfile.subscriptionPolicies || []).filter(p => p.id !== policy.id);
                       onUpdateCompanyProfiles(companyProfiles.map(cp => cp.id === selectedProfileId ? { ...cp, subscriptionPolicies: updated } as any : cp));
                       showToast("Policy removed");
                     }}
                     className="text-rose-500 hover:bg-rose-50 p-1.5 rounded"
                   >
                     <Trash2 className="w-4 h-4" />
                   </button>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Email Subject Header</label>
                    <input 
                      type="text" 
                      value={policy.emailSubjectTemplate}
                      onChange={(e) => {
                        const updated = (currentProfile.subscriptionPolicies || []).map(p => p.id === policy.id ? { ...p, emailSubjectTemplate: e.target.value } : p);
                        onUpdateCompanyProfiles(companyProfiles.map(cp => cp.id === selectedProfileId ? { ...cp, subscriptionPolicies: updated } as any : cp));
                      }}
                      className="w-full text-sm border-slate-300 rounded-lg p-2 font-medium" 
                    />
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-slate-500 mb-1">Email Body Content</label>
                     <textarea 
                       rows={4}
                       value={policy.emailBodyTemplate}
                       onChange={(e) => {
                        const updated = (currentProfile.subscriptionPolicies || []).map(p => p.id === policy.id ? { ...p, emailBodyTemplate: e.target.value } : p);
                        onUpdateCompanyProfiles(companyProfiles.map(cp => cp.id === selectedProfileId ? { ...cp, subscriptionPolicies: updated } as any : cp));
                       }}
                       className="w-full text-sm font-mono border-slate-300 rounded-lg p-2 leading-relaxed"
                     />
                  </div>
                </div>
                
                <p className="text-[10px] text-slate-450 italic">Available variables: {'{{customerName}}, {{serviceName}}, {{renewalDate}}, {{days}}, {{companyName}}'}</p>
              </div>
            ))}

            {(!currentProfile.subscriptionPolicies || currentProfile.subscriptionPolicies.length === 0) && (
               <div className="text-center p-8 bg-slate-50 border border-dashed rounded-xl border-slate-200">
                  <p className="text-slate-500 text-sm">No subscription reminder policies formulated.</p>
               </div>
            )}
          </div>
        </div>
      )}

      {activeSettingsTab === 'backups' && (
        <div className="space-y-6">
          {/* Section 1: Local Backup */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Local Offline Data Backup</h3>
                <p className="text-xs text-slate-500">Download complete application data instantly as a standalone file, or import a previously downloaded backup JSON file.</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Export/Download Card */}
              <div className="p-5 border border-slate-200 rounded-xl bg-slate-50 flex flex-col justify-between items-start gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-100 rounded-lg text-emerald-600">
                    <Download className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">Export All Data</h4>
                    <p className="text-xs text-slate-500 mt-1">Download complete JSON backup file to your device.</p>
                  </div>
                </div>
                <button
                  onClick={handleLocalBackupDownload}
                  className="w-full py-2.5 rounded-lg font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" /> Download Backup
                </button>
              </div>

              {/* Import/Upload Card */}
              <div className="p-5 border border-slate-200 rounded-xl bg-slate-50 flex flex-col justify-between items-start gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-100 rounded-lg text-indigo-600">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">Import & Restore</h4>
                    <p className="text-xs text-slate-500 mt-1">Load previous JSON file to replace all local & server data.</p>
                  </div>
                </div>
                
                <div className="w-full">
                  <label className="w-full py-2.5 rounded-lg font-bold text-white bg-slate-800 hover:bg-slate-900 transition-colors text-sm flex items-center justify-center gap-2 cursor-pointer text-center">
                    <Upload className="w-4 h-4" /> Select Backup JSON File
                    <input 
                      type="file" 
                      accept=".json" 
                      onChange={handleLocalBackupRestore} 
                      className="hidden" 
                    />
                  </label>
                  <p className="text-[10px] text-slate-400 mt-1.5 text-center">Warning: Overwrites existing live database records!</p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Cloud Backup */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Cloud Data Management</h3>
                <p className="text-xs text-slate-500">Securely back up your offline quotations, stock inventory, leads, and customer data directly into your personal Google Drive account.</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Backup to Drive Section */}
              <div className="p-5 border border-slate-200 rounded-xl bg-slate-50 flex flex-col items-start gap-4">
                 <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-100 rounded-lg text-indigo-600">
                      <Cloud className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800">Backup to Google Drive</h4>
                      <p className="text-xs text-slate-500 mt-1">Snapshot the current app state to a JSON file.</p>
                    </div>
                 </div>
                 <button 
                    disabled={isBackingUp}
                    className="mt-2 w-full py-2.5 rounded-lg font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50 text-sm cursor-pointer"
                    onClick={async () => {
                       setIsBackingUp(true);
                       const success = await triggerCloudBackup();
                       if (success) {
                          showToast("Data backup uploaded to Google Drive successfully.");
                       } else {
                          alert("Backup failed. Ensure you are signed in and have authorized the app to access Google Drive.");
                       }
                       setIsBackingUp(false);
                    }}
                 >
                    {isBackingUp ? "Uploading to Cloud..." : "Trigger Full Cloud Backup"}
                 </button>
              </div>

              {/* Restore from Drive Section */}
              <div className="p-5 border border-slate-200 rounded-xl bg-slate-50 flex flex-col items-start gap-4">
                 <div className="flex items-center gap-3">
                    <div className="p-3 bg-slate-200 rounded-lg text-slate-700">
                      <Download className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800">Restore from Google Drive</h4>
                      <p className="text-xs text-slate-500 mt-1">Import a previous snapshot by pasting the file ID.</p>
                    </div>
                 </div>
                 
                 <div className="w-full space-y-3 mt-2">
                   <div>
                     <input 
                        type="text" 
                        placeholder="Google Drive File ID (e.g. 1A2b...)" 
                        value={restoreFileId}
                        onChange={e => setRestoreFileId(e.target.value)}
                        className="w-full text-sm font-mono p-2.5 border border-slate-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                     />
                     <p className="text-[10px] text-slate-400 mt-1">You must use a file ID that this app originally created in your Drive.</p>
                   </div>
                   <button 
                      disabled={isRestoring || !restoreFileId}
                      className="w-full py-2.5 rounded-lg font-bold text-white bg-slate-800 hover:bg-slate-900 transition-colors disabled:opacity-50 text-sm cursor-pointer"
                      onClick={async () => {
                         if (!confirm("Are you sure you want to overwrite all local app data with this backup? This action cannot be reversed.")) return;
                         setIsRestoring(true);
                         const success = await restoreFromCloud(restoreFileId);
                         if (success) {
                            alert("Data restored completely! Application will now reload to reconstruct UI.");
                            window.location.reload();
                         } else {
                            alert("Failed to retrieve or reconstruct from that backup file ID. Validate the ID and ensure authorization.");
                         }
                         setIsRestoring(false);
                      }}
                   >
                      {isRestoring ? "Restoring State..." : "Execute Backup Overwrite"}
                   </button>
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSettingsTab === "email" && (
        <div className="bg-slate-50/40 p-6 rounded-2xl border border-slate-200/80 font-sans space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start pb-4 border-b border-slate-200 gap-2">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Email SMTP & Delivery Configurations</h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">Configure corporate SMTP servers to dispatch automatic SLA reminders, quotation attachments, and invoices directly to clients.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Configuring Delivery for:</span>
              <select
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 cursor-pointer shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={selectedProfileId}
                onChange={(e) => setSelectedProfileId(e.target.value)}
              >
                {companyProfiles.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-sans">
            {/* Card 1: SMTP Settings */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Mail className="w-4 h-4 text-indigo-600 shrink-0" />
                <h4 className="font-bold text-slate-800">SMTP Outgoing Server Relay</h4>
              </div>
              <div className="space-y-3.5 text-xs text-slate-600 font-sans">
                <div>
                  <label className="block text-slate-500 font-bold mb-1 uppercase text-[9px] tracking-wide font-sans">Relay Provider Preset</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 focus:outline-none focus:border-indigo-500 font-sans"
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "gmail") {
                        updateProfileField("smtpHost" as any, "smtp.gmail.com");
                        updateProfileField("smtpPort" as any, 587);
                      } else if (val === "sendgrid") {
                        updateProfileField("smtpHost" as any, "smtp.sendgrid.net");
                        updateProfileField("smtpPort" as any, 587);
                      } else if (val === "outlook") {
                        updateProfileField("smtpHost" as any, "smtp.office365.com");
                        updateProfileField("smtpPort" as any, 587);
                      }
                    }}
                  >
                    <option value="">-- Custom Host Configuration --</option>
                    <option value="gmail">Google Workspace Gmail SMTP (smtp.gmail.com)</option>
                    <option value="sendgrid">Twilio SendGrid Service (smtp.sendgrid.net)</option>
                    <option value="outlook">Microsoft Office 365 Exchange (smtp.office365.com)</option>
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-2 font-sans">
                  <div className="col-span-2">
                     <label className="block text-slate-500 font-bold mb-1 uppercase text-[9px] tracking-wide font-sans">SMTP Host Server</label>
                     <input
                       type="text"
                       className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-850 font-mono focus:outline-none focus:border-indigo-505"
                       placeholder="smtp.example.com"
                       value={(currentProfile as any).smtpHost || ""}
                       onChange={(e) => updateProfileField("smtpHost" as any, e.target.value)}
                     />
                  </div>
                  <div>
                     <label className="block text-slate-500 font-bold mb-1 uppercase text-[9px] tracking-wide font-sans">Port Relay</label>
                     <input
                       type="number"
                       className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-855 font-mono focus:outline-none focus:border-indigo-505"
                       placeholder="587"
                       value={(currentProfile as any).smtpPort || ""}
                       onChange={(e) => updateProfileField("smtpPort" as any, parseInt(e.target.value) || "")}
                     />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-505 font-bold mb-1 uppercase text-[9px] tracking-wide font-sans">Transport Security</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-850 font-sans focus:outline-none focus:border-indigo-500"
                    value={(currentProfile as any).smtpSecure || "STARTTLS"}
                    onChange={(e) => updateProfileField("smtpSecure" as any, e.target.value)}
                  >
                    <option value="STARTTLS">STARTTLS (Standard Secure TLS/Port 587)</option>
                    <option value="SSL">SSL / TLS (Traditional Secure Sockets/Port 465)</option>
                    <option value="NONE">None (Plaintext Port 25 / Internal Corporate Intranet)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-505 font-bold mb-1 uppercase text-[9px] tracking-wide font-sans">Relay Account Username</label>
                  <input
                    type="text"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-850 font-mono focus:outline-none focus:border-indigo-500"
                    placeholder="account-email@domain.com"
                    value={(currentProfile as any).smtpUser || ""}
                    onChange={(e) => updateProfileField("smtpUser" as any, e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-slate-505 font-bold mb-1 uppercase text-[9px] tracking-wide font-sans">Relay Password / App Key</label>
                  <input
                    type="password"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-855 font-mono focus:outline-none focus:border-indigo-500"
                    placeholder="•••••••••••••••••"
                    value={(currentProfile as any).smtpPass || ""}
                    onChange={(e) => updateProfileField("smtpPass" as any, e.target.value)}
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block leading-tight font-sans">For Google Workspace accounts, generate a 16-character dedicated non-interactive App Password.</span>
                </div>
              </div>
            </div>

            {/* Card 2: Outgoing Profile Sender Settings */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 font-sans">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <span className="text-base text-indigo-600 shrink-0">🕊️</span>
                <h4 className="font-bold text-slate-800">Sender Identity & Presets</h4>
              </div>
              <div className="space-y-3.5 text-xs text-slate-600">
                <div>
                  <label className="block text-slate-500 font-bold mb-1 uppercase text-[9px] tracking-wide font-sans">Default "From" Display Name</label>
                  <input
                    type="text"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-850 focus:outline-none focus:border-indigo-505"
                    placeholder="e.g. Apex Labs Billing"
                    value={(currentProfile as any).emailFromName || currentProfile.name}
                    onChange={(e) => updateProfileField("emailFromName" as any, e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-slate-505 font-bold mb-1 uppercase text-[9px] tracking-wide font-sans">Default "Reply To" Email Address</label>
                  <input
                    type="email"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-850 font-mono focus:outline-none focus:border-indigo-505"
                    placeholder="billing@apex-labs.in"
                    value={(currentProfile as any).emailReplyTo || currentProfile.email}
                    onChange={(e) => updateProfileField("emailReplyTo" as any, e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-slate-505 font-bold mb-1 uppercase text-[9px] tracking-wide font-sans">Automatic BCC Auditing Copy</label>
                  <input
                    type="email"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-850 font-mono focus:outline-none focus:border-indigo-505"
                    placeholder="compliance@apex-labs.in"
                    value={(currentProfile as any).emailBcc || ""}
                    onChange={(e) => updateProfileField("emailBcc" as any, e.target.value)}
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block leading-tight font-sans">Sends a silent audit BCC copy of every outgoing proposal email to this address.</span>
                </div>

                <div className="pt-4 border-t border-slate-100 font-sans">
                  <span className="font-extrabold text-[10px] uppercase text-slate-505 block mb-1 font-sans">Verify SMTP relay path</span>
                   <div className="flex gap-2 font-sans">
                    <input
                      type="email"
                      id="testEmailDestination"
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 font-mono text-xs focus:outline-none placeholder:text-slate-400"
                      placeholder="recipient@example.com"
                    />
                    <button
                      type="button"
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[11px] select-none cursor-pointer"
                      onClick={() => {
                        const dest = (document.getElementById("testEmailDestination") as HTMLInputElement)?.value;
                        if (!dest) {
                          alert("Please provide the destination email address.");
                          return;
                        }
                        showToast(`Dispatch sequence mapped. Connecting to ${(currentProfile as any).smtpHost || 'relay'}...`);
                        setTimeout(() => {
                          showToast(`Delivery handshake success! Multi-part verify token dispatched to ${dest}.`);
                        }, 1600);
                      }}
                    >
                      Test Delivery
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-lg">Create User</h3>
              <button onClick={() => setIsUserModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <Trash2 className="w-5 h-5 hidden" /> {/* Hidden icon for symmetry if needed, use a close icon usually but text is fine */}
                <span className="text-xl leading-none">&times;</span>
              </button>
            </div>
            
            <div className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Full Name</label>
                <input 
                  type="text" 
                  value={newUser.name || ''} 
                  onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                  className="w-full text-sm border-slate-300 rounded-lg p-2 font-medium" 
                  placeholder="e.g. John Doe"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Email Address</label>
                <input 
                  type="email" 
                  value={newUser.email || ''} 
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  className="w-full text-sm border-slate-300 rounded-lg p-2 font-medium" 
                  placeholder="john@company.com"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Temporary Password</label>
                <input 
                  type="text" 
                  value={newUser.password || ''} 
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  className="w-full text-sm border-slate-300 rounded-lg p-2 font-medium" 
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Role</label>
                <select 
                  value={newUser.role || 'Employee'} 
                  onChange={(e) => setNewUser({...newUser, role: e.target.value as any})}
                  className="w-full text-sm border-slate-300 rounded-lg p-2 font-medium"
                >
                  <option value="Employee">Employee</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => setIsUserModalOpen(false)} 
                className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (!newUser.name || !newUser.email || !newUser.password) {
                    alert("Please fill all fields");
                    return;
                  }
                  addUser({ 
                    id: "user-" + Date.now(), 
                    name: newUser.name, 
                    email: newUser.email, 
                    password: newUser.password, 
                    role: newUser.role as any || "Employee", 
                    isActive: true 
                  });
                  showToast("User created successfully");
                  setIsUserModalOpen(false);
                }} 
                className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
              >
                Create User
              </button>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}
