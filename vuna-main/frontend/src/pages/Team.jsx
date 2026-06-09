import React from 'react';
import { Link } from 'react-router-dom';

const TEAM = [
  { name: 'Amina Wanjiku', role: 'Co-founder & Product Lead', bio: 'Passionate about connecting Kenyan farmers to fair markets.' },
  { name: 'James Otieno', role: 'Lead Engineer', bio: 'Builds reliable tools for rural and urban agricultural trade.' },
  { name: 'Grace Muthoni', role: 'Operations & Partnerships', bio: 'Works with market associations across Nairobi and beyond.' },
];

export default function Team() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-black text-gray-900 mb-4">Our Team</h1>
      <p className="text-sm text-gray-500 mb-6">The people behind the Vuna marketplace demo.</p>
      <div className="grid gap-4">
        {TEAM.map((member) => (
          <div key={member.name} className="bg-white border border-primary/10 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                {member.name.charAt(0)}
              </div>
              <div>
                <h2 className="font-bold text-gray-900">{member.name}</h2>
                <p className="text-xs text-primary font-semibold">{member.role}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">{member.bio}</p>
          </div>
        ))}
      </div>
      <Link to="/" className="inline-block mt-6 text-xs font-semibold text-primary hover:underline">
        &larr; Back to app
      </Link>
    </div>
  );
}
