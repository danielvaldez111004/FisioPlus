import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, LogOut, X, ChevronRight } from 'lucide-react';

export default function Sidebar({ navItems, portalLabel, portalColor = 'text-medical-600' }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleBadgeColors = {
    SUPER_ADMIN:    'bg-rose-100 text-rose-700',
    ADMIN:          'bg-amber-100 text-amber-700',
    FISIOTERAPEUTA: 'bg-blue-100 text-blue-700',
    PACIENTE:       'bg-emerald-100 text-emerald-700',
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-medical-100 text-medical-600 rounded-xl">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <span className="font-display font-bold text-lg text-slate-900 leading-none">
              Fisio<span className="text-medical-600">Plus</span>
            </span>
            <span className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider leading-none mt-0.5">{portalLabel}</span>
          </div>
        </div>
        <button onClick={() => setMobileOpen(false)} className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* User Info */}
      <div className="px-4 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
          <div className="w-9 h-9 rounded-full bg-medical-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
            {user?.username?.charAt(0).toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-slate-700 truncate">{user?.alias || user?.username}</p>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${roleBadgeColors[user?.rol] || 'bg-slate-100 text-slate-600'}`}>
              {user?.rol?.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-hide px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `nav-link ${isActive ? 'nav-link-active' : ''}`
            }
          >
            <item.icon className="w-4 h-4 shrink-0" />
            <span className="flex-1">{item.label}</span>
            <ChevronRight className="w-3.5 h-3.5 opacity-30" />
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-slate-100">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-100 h-screen sticky top-0 shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile toggle button (to be triggered externally via state prop or ref) */}
      <div className={`fixed inset-0 z-50 lg:hidden ${mobileOpen ? '' : 'pointer-events-none'}`}>
        {/* Overlay */}
        <div
          className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity ${mobileOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setMobileOpen(false)}
        />
        {/* Drawer */}
        <aside className={`absolute left-0 top-0 bottom-0 w-64 bg-white shadow-2xl transform transition-transform ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <SidebarContent />
        </aside>
      </div>
    </>
  );
}
