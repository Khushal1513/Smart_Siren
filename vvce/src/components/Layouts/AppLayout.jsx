import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { SidebarProvider } from '@/components/ui/sidebar';

export const AppLayout = () => {
  return (
    <SidebarProvider>
      <div className="flex flex-col md:flex-row min-h-screen ">
        {/* Sidebar: hidden on small screens, visible on md+ */}
        <Sidebar />

        <div className="flex-1 flex flex-col overflow-hidden">
          <Navbar />

          <main className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 lg:px-8">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;