import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Sidebar as SidebarContainer,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  useSidebar
} from '@/components/ui/sidebar';
import {
  Ambulance,
  BarChart3,
  Home,
  MapPin,
  Settings,
  TrafficCone,
  AlertCircle,
  Activity,
  Menu,
  Siren
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const menuItems = [
  { to: '/', icon: Home, label: 'Dashboard' },
  { to: '/ambulances', icon: Ambulance, label: 'Ambulances' },
  { to: '/traffic-signals', icon: TrafficCone, label: 'Traffic Signals' },
  { to: '/route-optimization', icon: MapPin, label: 'Routes' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export const Sidebar = () => {
  const navigate = useNavigate();
  const { sidebarOpen, setSidebarOpen } = useSidebar();

  const handleClick = () => {
    navigate('/trigger-emergency');
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const handleNavClick = () => {
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  return (
    <>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <SidebarContainer
  className={cn(
    'fixed z-40 md:static md:translate-x-0 transform transition-transform duration-300 bg-[hsl(130,70%,93%)] border-r dark:bg-background dark:border-muted w-64',
    sidebarOpen ? 'translate-x-0' : '-translate-x-full'
  )}


      >
        <SidebarHeader className="p-4 flex items-center space-x-2">
          <Siren className="h-6 w-6 text-emergency" />
          <span className="text-lg font-bold">Smart Siren</span>

          {/* Custom toggle button for mobile */}
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto md:hidden"
            onClick={() => setSidebarOpen(prev => !prev)}
          >
            <Menu className="h-6 w-6" />
          </Button>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {menuItems.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.to}
                        onClick={handleNavClick}
                        className={({ isActive }) =>
                          cn(
                            'flex items-center gap-3 px-3 py-2 rounded-md transition-colors',
                            isActive
                              ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                              : 'hover:bg-sidebar-accent/50 text-sidebar-foreground'
                          )
                        }
                      >
                        <item.icon className="h-5 w-5" />
                        <span>{item.label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup className="mt-8">
            <SidebarGroupLabel>Emergency Alerts</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="px-4 py-2">
                <Button variant="destructive" className="w-full gap-2" onClick={handleClick}>
                  <AlertCircle className="h-4 w-4" />
                  <span>Trigger Emergency</span>
                </Button>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="p-4 text-xs text-muted-foreground">
          <div>Smart Siren © 2025</div>
        </SidebarFooter>
      </SidebarContainer>
    </>
  );
};
