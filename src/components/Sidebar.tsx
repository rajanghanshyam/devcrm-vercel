/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  LayoutGrid, 
  FileText, 
  FileCheck, 
  Truck, 
  Users, 
  UserCheck, 
  Package, 
  CalendarClock, 
  Bell, 
  Settings, 
  ChevronsLeft,
  ChevronsRight,
  LogOut,
  ShoppingCart,
  Megaphone
} from "lucide-react";
import { User } from "../types";

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  userEmail?: string;
  userName?: string;
  onLogout?: () => void;
  user?: User | null;
}

export default function Sidebar({ currentTab, onTabChange, userEmail = "rajanghanshyam@gmail.com", userName = "Rajan Ghanshyam", onLogout, user }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutGrid },
    { id: "quotations", label: "Quotations", icon: FileText },
    { id: "proforma", label: "Proforma Invoices", icon: FileCheck },
    { id: "challans", label: "Delivery Challans", icon: Truck },
    { id: "leads", label: "Leads", icon: Users },
    { id: "customers", label: "Customers", icon: UserCheck },
    { id: "products", label: "Products & Services", icon: Package },
    { id: "catalogues", label: "Catalogues & Ads", icon: Megaphone },
    { id: "inventory", label: "Inventory", icon: Package },
    { id: "subscriptions", label: "Subscriptions", icon: CalendarClock },
    { id: "reminders", label: "Reminders", icon: Bell },
    { id: "amazonSeller", label: "Amazon Seller", icon: ShoppingCart },
    { id: "settings", label: "Company Settings", icon: Settings },
  ];

  const allowedMenuItems = menuItems.filter((item) => {
    // If user has granular rights configured, apply them
    if (user && user.rights) {
      if (item.id === "catalogues") return true;
      return !!user.rights[item.id as keyof typeof user.rights];
    }
    return true;
  });

  return (
    <aside 
      className={`bg-slate-900 text-slate-200 min-h-screen flex flex-col border-r border-slate-800 select-none transition-all duration-300 ${
        isCollapsed ? "w-16" : "w-64"
      }`}
      id="sidemenu-sidebar"
    >
      {/* Sidebar Header */}
      <div className="p-3.5 flex items-center justify-between border-b border-slate-800 h-16">
        <div className="flex items-center gap-2 overflow-hidden">
          {/* Glowing Purple App Icon Container */}
          <div className="bg-indigo-600 p-2 rounded-lg flex items-center justify-center shrink-0 shadow-md">
            <FileText className="w-4 h-4 text-white" />
          </div>
          {!isCollapsed && (
            <span className="font-sans font-bold text-lg text-white tracking-tight leading-none whitespace-nowrap">
              QuoteManager
            </span>
          )}
        </div>
        
        {/* Toggle Collapse */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          id="toggle-sidebar-collapse"
        >
          {isCollapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Menu Options List */}
      <nav className="flex-1 px-2.5 py-3 space-y-1 overflow-y-auto custom-scrollbar">
        {allowedMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 cursor-pointer group text-left ${
                isActive 
                  ? "bg-indigo-600 text-white shadow-sm" 
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
              id={`sidebar-item-${item.id}`}
            >
              <Icon 
                className={`w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                  isActive ? "text-white" : "text-slate-500 group-hover:text-slate-300"
                }`} 
              />
              {!isCollapsed && (
                <span className="text-xs font-semibold tracking-wide">
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Developer Credits Info */}
      <div className="border-t border-slate-800/80 bg-slate-950/25 py-2.5 px-3.5 flex flex-col justify-center select-text">
        {isCollapsed ? (
          <div className="mx-auto text-center" title="Developer: Devfinity (+91 98250390203 / +91 8780706192)">
            <span className="text-[10px] font-extrabold text-indigo-400 bg-indigo-950/80 px-1.5 py-0.5 rounded border border-indigo-900/60 font-mono">DF</span>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-indigo-400">Developer By:</span>
              <span className="text-xs font-bold text-white">Devfinity</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed font-mono">
              +91 98250390203<br/>
              +91 8780706192
            </p>
          </div>
        )}
      </div>

      {/* User Footer Profile Block */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between gap-2.5 h-16 overflow-hidden">
        <div className="flex items-center gap-2.5 overflow-hidden">
          {/* Avatar */}
          <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white font-sans font-bold text-sm border border-indigo-400/20 shrink-0">
            {userName ? userName.charAt(0) : "R"}
          </div>
          
          {/* Text labels */}
          {!isCollapsed && (
            <div className="flex flex-col text-left overflow-hidden">
              <span className="font-semibold text-xs text-white truncate max-w-[120px]">
                {userName}
              </span>
              <span className="text-[10px] text-slate-500 truncate max-w-[120px]" title={userEmail}>
                {userEmail}
              </span>
            </div>
          )}
        </div>

        {/* Action button */}
        {!isCollapsed && (
          <button 
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer shrink-0"
            title="Log Out"
            onClick={() => {
              if(confirm("Are you sure you want to log out?")) {
                if (onLogout) {
                  onLogout();
                } else {
                  alert("Logged out successfully! Feel free to log in again any time.");
                }
              }
            }}
            id="sidebar-logout-btn"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
}
