import React from 'react';
import { Ambulance, Github, Map, TrafficCone } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-300 py-8 px-4 mt-10">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* About Section */}
        <div>
          <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <TrafficCone className="h-5 w-5 text-yellow-400" />
            Smart Siren
          </h2>
          <p className="text-sm text-gray-400">
            Smart Siren is an AI and IoT-enabled traffic signal control system built to ensure emergency vehicle clearance during critical situations.
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h2 className="text-lg font-semibold mb-2">Quick Links</h2>
          <ul className="text-sm space-y-2">
            <li><Link to="/" className="hover:underline">Home</Link></li>
            <li><Link to="/active-routes" className="hover:underline">Active Routes</Link></li>
            <li><Link to="/vehicle-registration" className="hover:underline">Register Vehicle</Link></li>
            <li><Link to="/signal-control" className="hover:underline">Signal Control</Link></li>
          </ul>
        </div>

        {/* Contact / Team Info */}
        <div>
          <h2 className="text-lg font-semibold mb-2">Team Vision</h2>
          <p className="text-sm text-gray-400">
            Built by Bhaskara, Prasad A M, Khushal L Vision with the goal of saving lives through tech-driven emergency response.
          </p>
          <div className="flex items-center gap-4 mt-4">
            <a href="https://github.com/your-github" target="_blank" rel="noopener noreferrer" className="hover:text-white">
              <Github className="h-5 w-5" />
            </a>
            <Link to="/map-view" className="hover:text-white">
              <Map className="h-5 w-5" />
            </Link>
            <Link to="/ambulances" className="hover:text-white">
              <Ambulance className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>

      <div className="text-center text-xs text-gray-500 mt-8">
        &copy; {new Date().getFullYear()} Smart Siren Project — All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
