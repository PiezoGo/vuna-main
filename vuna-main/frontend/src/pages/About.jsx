import React from 'react';
import { Link } from 'react-router-dom';

export default function About() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-black text-gray-900 mb-4">About Vuna</h1>
      <div className="bg-white border border-primary/10 rounded-2xl p-6 shadow-sm space-y-4 text-sm text-gray-600 leading-relaxed">
        <p>
          Vuna is a Kenyan B2B agricultural marketplace that connects farmers directly with buyers —
          wholesalers, retailers, and food businesses — without unnecessary middlemen.
        </p>
        <p>
          Our mission is to make fresh produce trading transparent, efficient, and fair. Farmers can list
          commodities with live stock levels, manage deliveries, and communicate with buyers in real time.
          Buyers can browse the marketplace, place orders, track status, and resolve disputes when needed.
        </p>
        <p>
          This demo platform showcases order workflows, stock management, messaging, and video calling —
          all designed for the realities of markets like Muthurwa, Wakulima, and Marikiti.
        </p>
      </div>
      <Link to="/" className="inline-block mt-6 text-xs font-semibold text-primary hover:underline">
        &larr; Back to app
      </Link>
    </div>
  );
}
