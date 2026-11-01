import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../ui/Sidebar"; // adjust if path is different
import Footer from "../Footer"; // adjust path if needed

const AppLayout = () => {
  return (
    <div className="flex h-screen w-screen w-full">
      <Sidebar />
      <div className="flex flex-col flex-grow">
        <main className="flex-grow overflow-y-auto p-4">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default AppLayout;
