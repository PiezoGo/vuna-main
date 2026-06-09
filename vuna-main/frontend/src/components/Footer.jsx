import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-primary/10 mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="text-lg font-black text-primary">Vuna</span>
            <p className="text-xs text-gray-500 mt-1">Kenyan B2B Agricultural Marketplace</p>
          </div>
          <nav className="flex flex-wrap gap-4 text-xs font-semibold">
            <Link to="/about" className="text-gray-600 hover:text-primary transition">About</Link>
            <Link to="/terms" className="text-gray-600 hover:text-primary transition">Terms &amp; Conditions</Link>
            <Link to="/team" className="text-gray-600 hover:text-primary transition">Team</Link>
          </nav>
        </div>
        <div className="mt-6 pt-4 border-t border-gray-100 flex flex-col sm:flex-row sm:justify-between gap-2 text-[11px] text-gray-400">
          <span>&copy; {year} Vuna. All rights reserved.</span>
          <a href="mailto:hello@vuna.co.ke" className="hover:text-primary transition">hello@vuna.co.ke</a>
        </div>
      </div>
    </footer>
  );
}
