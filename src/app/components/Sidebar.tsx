import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router';
import { 
  LayoutDashboard, 
  Users, 
  ClipboardList, 
  UserPlus, 
  Calendar,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  MessageSquare,
  ScanLine,
  Shield,
  UserCog,
  QrCode,
  ClipboardCheck,
  MapPin,
  RefreshCw,
  Database
} from 'lucide-react';
import { Logo } from './Logo';
import { toast } from 'sonner';

interface SidebarProps {
  role: 'employee' | 'admin' | 'super-admin';
}

export function Sidebar({ role }: SidebarProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const getNavItems = () => {
    if (role === 'employee') {
      return [
        { to: '/employee', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/employee/schedule', icon: Calendar, label: 'My Schedule' },
        { to: '/employee/attendance', icon: ClipboardList, label: 'Attendance History' },
        { to: '/employee/leave', icon: FileText, label: 'Request Leave' },
        { to: '/employee/forgot-time', icon: MessageSquare, label: 'Forgot Time In/Out' },
        { to: '/employee/settings', icon: Settings, label: 'Settings' },
      ];
    }
    
    if (role === 'admin') {
      return [
        { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/admin/team', icon: Users, label: 'My Team' },
        { to: '/admin/register', icon: UserPlus, label: 'Register Employee' },
        { to: '/admin/schedule', icon: Calendar, label: 'Manage Schedule' },
        { to: '/admin/attendance', icon: ClipboardList, label: 'Attendance' },
        { to: '/admin/leaves', icon: FileText, label: 'Team Leave Requests' },
        { to: '/admin/admin-leave', icon: MessageSquare, label: 'My Leave Requests' },
        { to: '/admin/time-correction-requests', icon: ClipboardCheck, label: 'Time Corrections' },
        { to: '/admin/scanner', icon: ScanLine, label: 'QR Scanner' },
        { to: '/admin/settings', icon: Settings, label: 'Settings' },
      ];
    }
    
    // super-admin
    return [
      { to: '/super-admin', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/super-admin/admins', icon: UserCog, label: 'Admin Management' },
      { to: '/super-admin/register-admin', icon: Shield, label: 'Register Admin' },
      { to: '/super-admin/employees', icon: Users, label: 'Employees' },
      { to: '/super-admin/register', icon: UserPlus, label: 'Register Employee' },
      { to: '/super-admin/schedule', icon: Calendar, label: 'Manage Schedule' },
      { to: '/super-admin/attendance', icon: ClipboardList, label: 'Attendance' },
      { to: '/super-admin/leaves', icon: FileText, label: 'Leave Requests' },
      { to: '/super-admin/reset-leave-balance', icon: RefreshCw, label: 'Reset Leave Balance' },
      { to: '/super-admin/scanner', icon: ScanLine, label: 'QR Scanner' },
      { to: '/super-admin/geofence', icon: MapPin, label: 'Geofence Settings' },
      { to: '/super-admin/settings', icon: Settings, label: 'Settings' },
    ];
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-primary text-white p-2.5 rounded-xl shadow-lg hover:bg-primary-light transition-all"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed lg:static w-64 bg-gradient-to-b from-primary to-primary-dark min-h-screen flex flex-col z-40 transition-transform duration-300 shadow-2xl ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-6 border-b border-white/10">
          <Logo variant="light" />
        </div>
        
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-1.5">
            {getNavItems().map((item) => {
              const IconComponent = item.icon;
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end
                    onClick={() => setIsOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
                        isActive
                          ? 'bg-white/15 text-secondary shadow-lg'
                          : 'text-white/80 hover:bg-white/10 hover:text-white'
                      }`
                    }
                  >
                    <IconComponent className="w-5 h-5 flex-shrink-0" />
                    <span className="font-medium">{item.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </>
  );
}