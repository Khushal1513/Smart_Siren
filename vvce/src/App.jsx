import React from 'react';
import './index.css';

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import EmergencyRouteMap from '@/components/ui/EmergencyRouteMap';
import { SidebarProvider } from '@/components/ui/sidebar-context';

import NotFound from "./pages/NotFound";
import NotificationPage from "@/components/ui/NotificationPage";
import TriggerEmergency from '@/components/ui/TriggeredEmergency';
import AppLayout from "./components/Layouts/AppLayout";
import Dashboard from "./pages/Dashboard";
import AmbulancesPage from "./pages/AmbulancesPage";
import TrafficSignalsPage from "./pages/TrafficSignalsPage";
import RouteOptimizationPage from "./pages/RouteOptimizationPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import SettingsPage from "./pages/SettingsPage";
import MissionsPage from "./pages/MissionsPage"; // <-- Imported here
import VehicleRegistrationForm from '@/components/ui/VehicleRegistrationForm';
import TrafficSignalRegistrationForm from '@/components/ui/TrafficSignalRegistrationForm';
import SignalsList from '@/components/ui/SignalsList';
import TrafficSignalControls from '@/components/ui/TrafficSignalControls';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />

      <SidebarProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/ambulances" element={<AmbulancesPage />} />
              <Route path="/vehicle-registration" element={<VehicleRegistrationForm />} />
              <Route path="/notifications" element={<NotificationPage />} />
              <Route path="/traffic-signals" element={<TrafficSignalsPage />} />
              <Route path="/signal-registration" element={<TrafficSignalRegistrationForm />} />
              <Route path="/trigger-emergency" element={<TriggerEmergency />} />
              <Route path="/route-optimization" element={<RouteOptimizationPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="signals-list" element={<SignalsList />} />
              <Route path="traffic-controls" element={<TrafficSignalControls />} />
              <Route path="/emergency-route" element={<EmergencyRouteMap />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/missions" element={<MissionsPage />} /> {/* <-- Registered here */}
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </SidebarProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;