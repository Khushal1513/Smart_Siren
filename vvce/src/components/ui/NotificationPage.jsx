// src/pages/NotificationPage.jsx

import React from "react";

const NotificationPage = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Notifications</h1>
      <ul className="space-y-2">
        <li className="p-4 bg-gray-100 rounded-md shadow-sm">
          🔔 Your vehicle registration has been approved.
        </li>
        <li className="p-4 bg-blue-100 rounded-md shadow-sm">
          🛠 Scheduled maintenance is due in 5 days.
        </li>
        {/* <li className="p-4 bg-gray-100 rounded-md shadow-sm"> */}
          {/* ⚠ Insurance renewal reminder for your vehicle. */}
        {/* </li> */}
      </ul>
    </div>
  );
};

export default NotificationPage;
