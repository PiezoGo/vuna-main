import React from 'react';
import { Link } from 'react-router-dom';

export default function Terms() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-black text-gray-900 mb-4">Terms &amp; Conditions</h1>
      <div className="bg-white border border-primary/10 rounded-2xl p-6 shadow-sm space-y-4 text-sm text-gray-600 leading-relaxed">
        <p><strong className="text-gray-800">1. Platform Use.</strong> Vuna is provided as a demonstration marketplace. Users must register with accurate information and use the platform in good faith.</p>
        <p><strong className="text-gray-800">2. Orders &amp; Payments.</strong> Orders placed through Vuna are simulated in this demo. No real payment processing occurs. Sellers and buyers are responsible for agreeing on delivery terms offline.</p>
        <p><strong className="text-gray-800">3. Stock &amp; Listings.</strong> Sellers are responsible for maintaining accurate stock levels. Buyers may not order products marked as out of stock.</p>
        <p><strong className="text-gray-800">4. Disputes.</strong> Buyers may dispute orders during delivery. After the resolution window expires, unresolved disputes may be escalated for manual review.</p>
        <p><strong className="text-gray-800">5. Privacy.</strong> Profile images and chat messages may be stored locally in your browser for demo purposes. Do not upload sensitive personal data.</p>
        <p><strong className="text-gray-800">6. Changes.</strong> These mock terms may be updated as the platform evolves. Continued use constitutes acceptance of the current terms.</p>
      </div>
      <Link to="/" className="inline-block mt-6 text-xs font-semibold text-primary hover:underline">
        &larr; Back to app
      </Link>
    </div>
  );
}
