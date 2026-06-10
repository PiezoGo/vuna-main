import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-primary to-primary-dark rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-xs">V</span>
            </div>
            <span className="text-sm font-semibold text-gray-700">Vuna</span>
            <span className="text-xs text-gray-400">· Farm to Market</span>
          </div>

          <div className="flex items-center gap-4 text-xs text-gray-400">
            <Link to="/about" className="hover:text-primary transition-colors">About</Link>
            <Link to="/terms" className="hover:text-primary transition-colors">Terms</Link>
            <Link to="/team" className="hover:text-primary transition-colors">Team</Link>
          </div>

          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} Vuna. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
