/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Search, Plus, Trash2, CheckCircle2, Circle, Bell, Calendar, Mail, MessageSquare } from "lucide-react";
import { Reminder, Subscription, CompanySettings, Customer } from "../types";
import { formatDate, toInputDate } from "../utils";
import { EmailModal } from "./EmailModal";

interface ReminderViewProps {
  reminders: Reminder[];
  subscriptions: Subscription[];
  settings: CompanySettings;
  customers: Customer[];
  onUpdateReminders: (updated: Reminder[]) => void;
}

export default function ReminderView({
  reminders,
  subscriptions,
  settings,
  customers,
  onUpdateReminders
}: ReminderViewProps) {
  
  const [searchTerm, setSearchTerm] = useState("");

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailModalData, setEmailModalData] = useState<{customerEmail: string, subject: string, body: string, customerId: string}>({ customerEmail: "", subject: "", body: "", customerId: "" });
  
  // Custom reminder field states
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formDueDate, setFormDueDate] = useState("");
  const [formPriority, setFormPriority] = useState<Reminder["priority"]>("Medium");
  const [formRelated, setFormRelated] = useState("");
  const [formCustomerId, setFormCustomerId] = useState("");

  const saveReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle) {
      alert("Please provide a title for the reminder.");
      return;
    }

    const newReminder: Reminder = {
      id: "rem_" + Date.now(),
      title: formTitle,
      description: formDesc,
      dueDate: formDueDate || new Date().toISOString().split("T")[0],
      status: "Pending",
      priority: formPriority,
      relatedTo: formRelated || undefined,
      customerId: formCustomerId || undefined
    };

    onUpdateReminders([newReminder, ...reminders]);
    setFormTitle("");
    setFormDesc("");
    setFormDueDate("");
    setFormPriority("Medium");
    setFormRelated("");
    setFormCustomerId("");
    setIsFormOpen(false);
  };

  const toggleReminderStatus = (id: string) => {
    const updated = reminders.map(r => {
      if (r.id === id) {
        return { ...r, status: (r.status === "Pending" ? "Completed" : "Pending") as Reminder["status"] };
      }
      return r;
    });
    onUpdateReminders(updated);
  };

  const deleteReminder = (id: string) => {
    if (confirm("Are you sure you want to delete this reminder?")) {
      const updated = reminders.filter(r => r.id !== id);
      onUpdateReminders(updated);
    }
  };

  const getPolicyDays = () => {
    if (!settings.subscriptionPolicies || settings.subscriptionPolicies.length === 0) return 30; // default 30 days
    return Math.max(...settings.subscriptionPolicies.filter(p => p.isActive).map(p => p.daysBeforeRenewal));
  };

  const isSubscriptionNearRenewal = (renewalDate: string) => {
    const dStr = toInputDate(renewalDate);
    if (!dStr) return false;
    const nowStr = new Date().toISOString().split("T")[0];
    if (dStr < nowStr) return false; // if expired, hide/remove it

    const d = new Date(dStr);
    const now = new Date();
    const diffTime = d.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const policyDays = getPolicyDays();
    return diffDays <= policyDays && diffDays >= 0;
  };

  const subReminders: Reminder[] = subscriptions
    .filter(s => s.status === "Active" && isSubscriptionNearRenewal(s.nextRenewalDate))
    .map(s => ({
      id: "sub_rem_" + s.id,
      title: `Renewal Soon: ${s.serviceName}`,
      description: `Renewal scheduled for ${formatDate(s.nextRenewalDate)}`,
      dueDate: s.nextRenewalDate,
      status: "Pending",
      priority: "High" as const,
      relatedTo: s.serviceName,
      subscriptionId: s.id,
      customerId: s.customerId // mapped client ID
    }));

  const todayStr = new Date().toISOString().split("T")[0];
  const allItems = [...reminders, ...subReminders].filter(r => {
    if (r.subscriptionId) {
      const sub = subscriptions.find(s => s.id === r.subscriptionId);
      if (!sub) return false;
      
      const expDate = toInputDate(sub.nextRenewalDate);
      const isPastExpiry = expDate && expDate < todayStr;
      
      // Remove reminder from list after expiry date
      if (sub.status !== "Active" || isPastExpiry) {
        return false;
      }
      
      // If one policy is over and move to another, hide old reminder and show only matching/latest reminder
      const rDueDateStr = toInputDate(r.dueDate);
      if (rDueDateStr && expDate && rDueDateStr !== expDate) {
        return false;
      }
    }
    return true;
  });

  const triggerEmailSend = (r: Reminder) => {
    // If it's a subscription-near-renewal notice:
    if (r.id.startsWith("sub_rem_")) {
      openSubscriptionEmailModal(r.id.replace("sub_rem_", ""));
      return;
    }

    const client = customers.find(c => c.id === r.customerId) || customers.find(c => (c.company || "").toLowerCase() === (r.relatedTo || "").toLowerCase());
    if (!client) {
      alert("No Client mapping found. Set 'Associate Consignee Client' on this reminder to send an Email notice.");
      return;
    }
    if (!client.email) {
      alert("This customer doesn't have a registered email address.");
      return;
    }

    const dueDateStr = formatDate(r.dueDate);
    const subject = `Urgent Update Notification: ${r.title}`;
    const body = `Dear ${client.name},\n\nWe would like to send you this friendly update notice.\n\nTask/Ref: ${r.title}\nDue Date: ${dueDateStr}\n\nDescription:\n${r.description || "N/A"}\n\nKindly acknowledge. Feel free to contact us for any query.\n\nRegards,\n${settings.name}\nEmail: ${settings.email || ""}\nPhone: ${settings.phone || ""}`;

    setEmailModalData({
      customerId: client.id,
      customerEmail: client.email,
      subject,
      body
    });
    setIsEmailModalOpen(true);
  };

  const triggerWhatsAppSend = (r: Reminder) => {
    const client = customers.find(c => c.id === r.customerId) || customers.find(c => (c.company || "").toLowerCase() === (r.relatedTo || "").toLowerCase());
    if (!client) {
      alert("No Client mapping found. Set 'Associate Consignee Client' on this reminder to dispatch a WhatsApp notice.");
      return;
    }
    if (!client.phone) {
      alert("This customer doesn't have a registered phone number.");
      return;
    }

    const dueDateStr = formatDate(r.dueDate);
    const text = `Dear *${client.name}*,\n\nThis is a friendly business update from *${settings.name}*.\n\n🔔 *Ref:* ${r.title}\n📅 *Target Date:* ${dueDateStr}\n📝 *Context:* ${r.description || "Review required."}\n\nKindly take note. Thank you!\n\nRegards,\n*${settings.name}*`;

    // format phone number
    const cleanPhone = client.phone.replace(/[^0-9]/g, "");
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    
    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`, "_blank");
  };

  const openSubscriptionEmailModal = (subId: string) => {
    const sub = subscriptions.find(s => s.id === subId);
    if (!sub) return;
    const client = customers.find(c => c.id === sub.customerId);
    if (!client) {
      alert("Customer details not found for this subscription.");
      return;
    }
    
    // Calculate days for template variables
    const diffTime = new Date(sub.nextRenewalDate).getTime() - new Date().getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Find highest matching policy
    const policy = settings.subscriptionPolicies?.filter(p => p.isActive && diffDays <= p.daysBeforeRenewal)
                    .sort((a,b) => a.daysBeforeRenewal - b.daysBeforeRenewal)[0] || 
        // Fallback dummy policy
        { emailSubjectTemplate: `Reminder: Subscription Renewal`, emailBodyTemplate: `Dear {{customerName}},\n\nYour subscription {{serviceName}} renews in {{days}} days.\n\nRegards,\n{{companyName}}` };

    let subject = policy.emailSubjectTemplate
      .replace(/{{customerName}}/g, client.name)
      .replace(/{{serviceName}}/g, sub.serviceName)
      .replace(/{{renewalDate}}/g, formatDate(sub.nextRenewalDate))
      .replace(/{{days}}/g, String(diffDays))
      .replace(/{{companyName}}/g, settings.name);

    let body = policy.emailBodyTemplate
      .replace(/{{customerName}}/g, client.name)
      .replace(/{{serviceName}}/g, sub.serviceName)
      .replace(/{{renewalDate}}/g, formatDate(sub.nextRenewalDate))
      .replace(/{{days}}/g, String(diffDays))
      .replace(/{{companyName}}/g, settings.name);

    setEmailModalData({
      customerId: client.id,
      customerEmail: client.email,
      subject,
      body
    });
    setIsEmailModalOpen(true);
  };

  const filteredReminders = allItems.filter(r => {
    const term = searchTerm.toLowerCase();
    const client = customers.find(c => c.id === r.customerId);
    const clientCompany = client ? (client.company || "").toLowerCase() : "";
    return (
      (r.title || "").toLowerCase().includes(term) ||
      (r.description && (r.description || "").toLowerCase().includes(term)) ||
      (r.relatedTo && (r.relatedTo || "").toLowerCase().includes(term)) ||
      clientCompany.includes(term)
    );
  });

  return (
    <div className="space-y-6" id="reminders-view-panel">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">System Reminders & Tasks</h2>
          <p className="text-xs text-slate-500">Log upcoming administrative follows, corporate collections, and physical dispatch dates</p>
        </div>
        <button
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Assemble Task
        </button>
      </div>

      {/* FILTER SEARCH BAR */}
      <div className="flex bg-white p-3.5 rounded-xl border border-slate-200 font-sans shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search active tasks, description instructions, client names..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-slate-800 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none placeholder:text-slate-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* CORE DISPLAY (FULL WIDTH LIST) */}
      <div className="space-y-4 font-sans">
          {filteredReminders.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 text-slate-400 font-sans text-sm font-semibold shadow-sm">
              No reminders or tasks match. Toggle standard alerts or draft a task.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm font-sans">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                    <th className="p-3 pl-4 w-12 text-center">Status</th>
                    <th className="p-3">Reminder / Task Detail</th>
                    <th className="p-3">Associated client</th>
                    <th className="p-3">Target Date & Priority</th>
                    <th className="p-3">Notice Delivery</th>
                    <th className="p-3 pr-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredReminders.map((r) => {
                    const isCompleted = r.status === "Completed";
                    const isSubscriptionRenewal = r.id.startsWith("sub_rem_");
                    const client = customers.find(c => c.id === r.customerId) || customers.find(c => (c.company || "").toLowerCase() === (r.relatedTo || "").toLowerCase());

                    return (
                      <tr 
                        key={r.id} 
                        className={`hover:bg-indigo-50/10 transition-colors ${
                          isCompleted ? "opacity-60 bg-slate-50/50" : ""
                        }`}
                      >
                        {/* Status Checkbox column */}
                        <td className="p-3 pl-4 text-center vertical-top">
                          <button
                            type="button"
                            disabled={isSubscriptionRenewal}
                            onClick={() => toggleReminderStatus(r.id)}
                            className={`mt-0.5 cursor-pointer selection:bg-transparent ${
                              isSubscriptionRenewal ? "opacity-30 cursor-not-allowed" : "hover:scale-105 transition-transform"
                            }`}
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            ) : (
                              <Circle className="w-5 h-5 text-slate-300 hover:text-indigo-500" />
                            )}
                          </button>
                        </td>

                        {/* Task details */}
                        <td className="p-3 vertical-top max-w-[220px]">
                          <div className={`font-extrabold break-words leading-snug ${
                            isCompleted ? "line-through text-slate-400" : "text-slate-900"
                          }`}>
                            {r.title}
                            {isSubscriptionRenewal && <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold bg-amber-100 text-amber-700">Policy Matched</span>}
                          </div>
                          {r.description && (
                            <p className="text-[10px] text-slate-400 line-clamp-2 mt-1 leading-normal font-medium">
                              {r.description}
                            </p>
                          )}
                        </td>

                        {/* Customer Company Name */}
                        <td className="p-3 vertical-top">
                          {client ? (
                            <>
                              <div className="font-bold leading-snug text-slate-800">
                                {client.company}
                              </div>
                              <div className="text-[10px] text-slate-400 font-medium">
                                Attn: {client.name}
                              </div>
                            </>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic font-medium">
                              {r.relatedTo || "Unlinked Client"}
                            </span>
                          )}
                        </td>

                        {/* Due Date and Priority */}
                        <td className="p-3 vertical-top text-[11px] leading-relaxed">
                          <div className="text-slate-550 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <strong>Due:</strong> {formatDate(r.dueDate)}
                          </div>
                          <div className="mt-1">
                            <span className={`inline-flex px-1.5 py-0.2 rounded text-[8px] uppercase font-bold tracking-wider border ${
                              r.priority === "High" ? "bg-rose-50 text-rose-600 border-rose-100" :
                              r.priority === "Medium" ? "bg-amber-50 text-amber-600 border-amber-100" :
                              "bg-slate-50 text-slate-550 border-slate-200"
                            }`}>
                              {r.priority} Priority
                            </span>
                          </div>
                        </td>

                        {/* Communicator buttons (Manual WhatsApp / Email options) */}
                        <td className="p-3 vertical-top">
                          <div className="flex flex-col xs:flex-row gap-1.5 font-sans">
                            {/* Send Email Notice */}
                            <button
                              type="button"
                              onClick={() => triggerEmailSend(r)}
                              className="px-2 py-1 flex items-center justify-center gap-1 text-[9px] uppercase font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded hover:bg-indigo-100 transition-all cursor-pointer whitespace-nowrap"
                              title="Prepare manual email notice"
                            >
                              <Mail className="w-3 h-3" /> Mail Notice
                            </button>
                            {/* Send WhatsApp Notice */}
                            <button
                              type="button"
                              onClick={() => triggerWhatsAppSend(r)}
                              className="px-2 py-1 flex items-center justify-center gap-1 text-[9px] uppercase font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100 transition-all cursor-pointer whitespace-nowrap"
                              title="Direct-send manual WhatsApp reminder"
                            >
                              <MessageSquare className="w-3 h-3 text-emerald-600" /> WA Notice
                            </button>
                          </div>
                        </td>

                        {/* Actions buttons */}
                        <td className="p-3 pr-4 vertical-top text-right">
                          <div className="flex gap-2 justify-end">
                            <button
                              type="button"
                              disabled={isSubscriptionRenewal}
                              onClick={() => deleteReminder(r.id)}
                              className={`p-1 rounded transition-colors border ${
                                isSubscriptionRenewal 
                                  ? "opacity-20 bg-slate-100 border-slate-200 cursor-not-allowed text-slate-400" 
                                  : "bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-100 cursor-pointer"
                              }`}
                              title="Delete permanently"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
      </div>

      {/* Creation Box Modal Overlay */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm font-sans animate-fade-in">
          <form 
            onSubmit={saveReminder} 
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]"
          >
            <div className="px-5 py-3.5 flex items-center justify-between border-b border-slate-100 bg-slate-50">
              <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                Draft Reminder Task
              </h3>
              <button 
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold select-none cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 px-6 overflow-y-auto max-h-[70vh] text-xs font-sans">
              <div>
                <label className="block text-slate-550 font-bold mb-1 uppercase text-[9px] tracking-wide">Task Subject *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Call client for pending payment checkout"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 focus:outline-none focus:border-indigo-505"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-slate-550 font-bold mb-1 uppercase text-[9px] tracking-wide">Instructions / Details</label>
                <textarea
                  rows={3}
                  placeholder="Review quotation numbers, pending values, direct terms..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 focus:outline-none focus:border-indigo-505 leading-normal"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-slate-555 font-bold mb-1 uppercase text-[9px] tracking-wide">Associate Consignee Client</label>
                <select
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 focus:outline-none focus:border-indigo-508 font-sans"
                  value={formCustomerId}
                  onChange={(e) => {
                    setFormCustomerId(e.target.value);
                    const cust = customers.find(c => c.id === e.target.value);
                    if (cust) {
                      setFormRelated(cust.company);
                    } else {
                      setFormRelated("");
                    }
                  }}
                >
                  <option value="">-- No Linked Client --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company} (Attn: {c.name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-550 font-bold mb-1 uppercase text-[9px] tracking-wide">Target Due Date</label>
                  <input
                    type="date"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-805 focus:outline-none text-[11px] focus:border-indigo-505"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-slate-550 font-bold mb-1 uppercase text-[9px] tracking-wide">Priority Tiers</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-slate-800 focus:outline-none focus:border-indigo-505 text-[11px]"
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as Reminder["priority"])}
                  >
                    <option value="Low">Low Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="High">High Priority</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-bold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg cursor-pointer transition-colors shadow-sm"
              >
                Log Task
              </button>
            </div>
          </form>
        </div>
      )}
      
      {isEmailModalOpen && (
        <EmailModal
          isOpen={isEmailModalOpen}
          onClose={() => setIsEmailModalOpen(false)}
          documentName={"Task_Reminder"}
          customerEmail={emailModalData.customerEmail}
          defaultSubject={emailModalData.subject}
          defaultBody={emailModalData.body}
          isNoticeOnly={true}
        />
      )}

    </div>
  );
}
