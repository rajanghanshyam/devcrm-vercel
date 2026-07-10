/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from "react";
import { 
  FileText, 
  Users, 
  IndianRupee, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  TrendingUp,
  ArrowRight,
  Plus
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Quotation, ProformaInvoice, Lead, Customer, Reminder } from "../types";
import { formatINR, formatDate } from "../utils";

interface DashboardViewProps {
  quotations: Quotation[];
  invoices: ProformaInvoice[];
  leads: Lead[];
  customers: Customer[];
  reminders: Reminder[];
  onNavigate: (tab: string) => void;
  onAddQuotation: () => void;
  onAddLead: () => void;
}

export default function DashboardView({
  quotations,
  invoices,
  leads,
  customers,
  reminders,
  onNavigate,
  onAddQuotation,
  onAddLead
}: DashboardViewProps) {
  
  // Calculate stats
  const totalQuotedVal = quotations.reduce((acc, q) => acc + q.grandTotal, 0);
  const activeQuotationsCount = quotations.filter(q => q.status === "Pending" || q.status === "Approved").length;

  const totalInvoicedVal = invoices.reduce((acc, i) => acc + i.grandTotal, 0);
  const paidInvoicedVal = invoices.filter(i => i.status === "Paid").reduce((acc, i) => acc + i.grandTotal, 0);
  const unpaidInvoicedVal = invoices.filter(i => i.status === "Unpaid" || i.status === "Overdue").reduce((acc, i) => acc + i.grandTotal, 0);

  const totalLeadPipeline = leads.filter(l => l.status !== "Lost" && l.status !== "Won").reduce((acc, l) => acc + l.value, 0);
  const openLeadsCount = leads.filter(l => l.status !== "Lost" && l.status !== "Won").length;

  const pendingReminders = reminders.filter(r => r.status === "Pending");

  // Revenue trends for the chart
  const chartData = useMemo(() => {
    const data: Record<string, number> = {};
    invoices.forEach(i => {
      const month = new Date(i.date).toLocaleString('default', { month: 'short' });
      data[month] = (data[month] || 0) + i.grandTotal;
    });
    return Object.entries(data).map(([name, revenue]) => ({ name, revenue }));
  }, [invoices]);

  // State calculations for document status distribution
  const statusCounts = {
    Approved: quotations.filter(q => q.status === "Approved").length,
    Pending: quotations.filter(q => q.status === "Pending").length,
    Draft: quotations.filter(q => q.status === "Draft").length,
    Other: quotations.filter(q => q.status !== "Approved" && q.status !== "Pending" && q.status !== "Draft").length,
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6" id="dashboard-view-panel">
      {/* Welcome Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <span className="text-indigo-600 font-sans text-[10px] font-bold uppercase tracking-wider block mb-0.5">
            Indian Standard Business Console
          </span>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            Welcome back, Rajan Ghanshyam
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Manage your corporate quotations, tax-compliant invoices, and customer pipeline securely.
          </p>
        </div>
        
        {/* Quick Date Display */}
        <div className="bg-slate-50 px-3 py-2 rounded-lg border border-slate-150 text-right shrink-0 flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-600" />
          <div className="text-left">
            <div className="text-[9px] text-slate-400 uppercase font-sans font-bold leading-none">System Date</div>
            <div className="text-xs font-bold text-slate-800 mt-0.5">
              {formatDate(today)}
            </div>
          </div>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 - Total Quotation Pipeline */}
        <div className="relative overflow-hidden bg-white border border-slate-200 p-4 rounded-xl group hover:border-slate-300 transition-all duration-300 shadow-sm">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block">Quotation Pipeline</span>
              <div className="text-lg font-bold font-sans text-slate-900 tracking-tight leading-none">
                {formatINR(totalQuotedVal)}
              </div>
              <span className="text-[11px] text-indigo-600 font-semibold block">
                {activeQuotationsCount} Active Quotations
              </span>
            </div>
            <div className="bg-indigo-50 p-2 rounded-lg border border-indigo-100 text-indigo-600">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-indigo-500/20 group-hover:bg-indigo-600 transition-colors"></div>
        </div>

        {/* Card 2 - Paid Invoices */}
        <div className="relative overflow-hidden bg-white border border-slate-200 p-4 rounded-xl group hover:border-slate-300 transition-all duration-300 shadow-sm">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block">Revenue Realized</span>
              <div className="text-lg font-bold font-sans text-emerald-600 tracking-tight leading-none">
                {formatINR(paidInvoicedVal)}
              </div>
              <span className="text-[11px] text-slate-500 font-medium block">
                Out of {formatINR(totalInvoicedVal)} total invoices
              </span>
            </div>
            <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-100 text-emerald-600">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-emerald-500/20 group-hover:bg-emerald-600 transition-colors"></div>
        </div>

        {/* Card 3 - Pending/Outstanding Invoices */}
        <div className="relative overflow-hidden bg-white border border-slate-200 p-4 rounded-xl group hover:border-slate-300 transition-all duration-300 shadow-sm">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block">Outstanding Payments</span>
              <div className="text-lg font-bold font-sans text-amber-600 tracking-tight leading-none">
                {formatINR(unpaidInvoicedVal)}
              </div>
              <span className="text-[11px] text-amber-600 font-bold block">
                Pending realization
              </span>
            </div>
            <div className="bg-amber-50 p-2 rounded-lg border border-amber-100 text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-amber-500/20 group-hover:bg-amber-600 transition-colors"></div>
        </div>

        {/* Card 4 - Lead Pipeline */}
        <div className="relative overflow-hidden bg-white border border-slate-200 p-4 rounded-xl group hover:border-slate-300 transition-all duration-300 shadow-sm">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block">Hot Lead Valuation</span>
              <div className="text-lg font-bold font-sans text-sky-600 tracking-tight leading-none">
                {formatINR(totalLeadPipeline)}
              </div>
              <span className="text-[11px] text-sky-600 font-bold block">
                {openLeadsCount} Open Opportunities
              </span>
            </div>
            <div className="bg-sky-50 p-2 rounded-lg border border-sky-100 text-sky-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-sky-500/20 group-hover:bg-sky-600 transition-colors"></div>
        </div>
      </div>

      {/* Grid: Charts & Reminders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Visual Funnel & Sales Stats (2 Columns span) */}
        <div className="lg:col-span-2 space-y-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-950 text-base">Quotation Lifecycle Distribution</h3>
              <p className="text-xs text-slate-500">Pipeline health break-down by current active status</p>
            </div>
            <TrendingUp className="w-4 h-4 text-indigo-650" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-center">
              <div className="text-slate-500 text-[10px] font-bold uppercase mb-0.5">Approved Contracts</div>
              <div className="text-xl font-extrabold text-emerald-600">{statusCounts.Approved}</div>
              <p className="text-[9px] text-slate-400 mt-0.5">Ready for invoicing</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-center">
              <div className="text-slate-500 text-[10px] font-bold uppercase mb-0.5">Pending Follow-up</div>
              <div className="text-xl font-extrabold text-amber-600">{statusCounts.Pending}</div>
              <p className="text-[9px] text-slate-400 mt-0.5">Sent to customers</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-center">
              <div className="text-slate-500 text-[10px] font-bold uppercase mb-0.5">Draft Quotes</div>
              <div className="text-xl font-extrabold text-slate-600">{statusCounts.Draft}</div>
              <p className="text-[9px] text-slate-400 mt-0.5">Unsent internal drafts</p>
            </div>
          </div>

          <div className="h-64 mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value / 1000}k`} />
                <Tooltip 
                  formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Revenue']}
                  contentStyle={{ fontSize: '12px', borderRadius: '8px' }}
                />
                <Bar dataKey="revenue" fill="#4F46E5" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Graphical Progress Meters representing conversion visually */}
          <div className="space-y-3 pt-2">
            <h4 className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Lead to Approved Conversion Meter</h4>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-xs text-slate-600 font-semibold mb-1">
                  <span>Approved Quotient ({Math.round(statusCounts.Approved / (quotations.length || 1) * 100)}%)</span>
                  <span className="text-slate-500">{statusCounts.Approved} of {quotations.length} quotes</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/50">
                  <div 
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${(statusCounts.Approved / (quotations.length || 1)) * 100}%` }}
                  ></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-xs text-slate-600 font-semibold mb-1">
                  <span>Pending Quotient ({Math.round(statusCounts.Pending / (quotations.length || 1) * 100)}%)</span>
                  <span className="text-slate-500">{statusCounts.Pending} of {quotations.length} quotes</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/50">
                  <div 
                    className="bg-amber-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${(statusCounts.Pending / (quotations.length || 1)) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-600 font-semibold mb-1">
                  <span>Realized Invoiced Ratio ({Math.round(paidInvoicedVal / (totalInvoicedVal || 1) * 100)}%)</span>
                  <span className="text-slate-500">{formatINR(paidInvoicedVal)} / {formatINR(totalInvoicedVal)}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/50">
                  <div 
                    className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${(paidInvoicedVal / (totalInvoicedVal || 1)) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Pending Action Reminders */}
        <div className="space-y-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-950 text-base">Urgent Reminders</h3>
                <p className="text-xs text-slate-500">Upcoming tasks & deadlines</p>
              </div>
              <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded text-[10px] font-bold border border-rose-250">
                {pendingReminders.length} PENDING
              </span>
            </div>

            <div className="mt-3 space-y-2 overflow-y-auto max-h-[190px] pr-1 custom-scrollbar">
              {pendingReminders.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  <CheckCircle className="w-6 h-6 text-emerald-500/40 mx-auto mb-1.5" />
                  All clear! No pending reminders.
                </div>
              ) : (
                pendingReminders.slice(0, 4).map((reminder) => (
                  <div 
                    key={reminder.id}
                    className="p-2.5 rounded-lg bg-slate-50 border border-slate-150 space-y-1"
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <span className="text-xs font-bold text-slate-800 leading-normal line-clamp-1">
                        {reminder.title}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase leading-none shrink-0 ${
                        reminder.priority === "High" ? "bg-rose-50 text-rose-700 border border-rose-200" :
                        reminder.priority === "Medium" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                        "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}>
                        {reminder.priority}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span className="truncate max-w-[120px] font-medium text-slate-400">
                        {reminder.relatedTo || "General task"}
                      </span>
                      <span className="font-bold text-indigo-600 shrink-0">
                        Due: {formatDate(reminder.dueDate)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <button
            onClick={() => onNavigate("reminders")}
            className="w-full mt-3 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200 font-semibold text-xs border border-slate-200 transition-all cursor-pointer"
          >
            Manage All Reminders <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Row: Recent Active Quotations & Quick Operations */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 gap-3">
          <div>
            <h3 className="font-bold text-slate-950 text-base">Recent Active Quotations</h3>
            <p className="text-xs text-slate-500">Quick view and workflow actions for recently logged proposals</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onAddQuotation}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Create Quotation
            </button>
            <button
              onClick={onAddLead}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer border border-slate-200 transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Add Lead
            </button>
          </div>
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-xs text-slate-600 min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold border-y border-slate-150 py-2.5">
                <th className="py-2.5 px-4 font-bold text-slate-600 uppercase tracking-wider">Quote ID</th>
                <th className="py-2.5 px-4 font-bold text-slate-600 uppercase tracking-wider">Customer / Company</th>
                <th className="py-2.5 px-4 font-bold text-slate-600 uppercase tracking-wider">Date of Creation</th>
                <th className="py-2.5 px-4 font-bold text-slate-600 uppercase tracking-wider text-right">Grand Total (INR)</th>
                <th className="py-2.5 px-4 font-bold text-slate-600 uppercase tracking-wider text-center">Status</th>
                <th className="py-2.5 px-4 font-bold text-slate-600 uppercase tracking-wider text-center">Operation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {quotations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-slate-400 font-medium">
                    No quotations log found. Create one to begin!
                  </td>
                </tr>
              ) : (
                quotations.slice(0, 5).map((q) => {
                  const client = customers.find(c => c.id === q.customerId);
                  return (
                    <tr key={q.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900 font-mono">
                        {q.quotationNo}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">
                          {client ? client.company : "N/A"}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          Attn: {client ? client.name : "N/A"}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-500">
                        {formatDate(q.date)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 font-mono">
                        {formatINR(q.grandTotal)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                          q.status === "Approved" ? "bg-emerald-50 text-emerald-700 border-emerald-250" :
                          q.status === "Pending" ? "bg-amber-50 text-amber-700 border-amber-200" :
                          q.status === "Draft" ? "bg-slate-100 text-slate-600 border-slate-200" :
                          "bg-rose-50 text-rose-700 border-rose-200"
                        }`}>
                          {q.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => onNavigate("quotations")}
                          className="text-xs text-indigo-650 hover:text-indigo-850 font-bold cursor-pointer hover:underline inline-flex items-center justify-center gap-1 mx-auto"
                        >
                          Invoice Workspace <ArrowRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
