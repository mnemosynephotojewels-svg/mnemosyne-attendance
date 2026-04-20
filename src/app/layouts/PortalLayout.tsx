import React from 'react';
import { Outlet } from 'react-router';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';

interface PortalLayoutProps {
  role: 'employee' | 'admin' | 'super-admin';
  user: {
    name: string;
    position: string;
    employeeNumber?: string;
    email?: string;
    team?: string;
    profilePicture?: string;
    profile_picture_url?: string;
    role?: string;
    access_level?: string;
  };
}

export function PortalLayout({ role, user }: PortalLayoutProps) {
  return (
    <div className="flex min-h-screen bg-[#F3F4F6] overflow-x-hidden">
      <Sidebar role={role} />
      <div className="flex-1 flex flex-col w-full lg:w-auto min-w-0">
        <Header user={user} />
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}