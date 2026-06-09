import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function PasswordField({
  id,
  name,
  value,
  onChange,
  placeholder = '••••••••',
  required = true,
  className = '',
}) {
  const [visible, setVisible] = useState(false);

  const toggleVisibility = () => setVisible((v) => !v);

  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        name={name}
        required={required}
        value={value}
        onChange={onChange}
        className={`block w-full px-3 py-2 pr-10 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm ${className}`}
        placeholder={placeholder}
      />
      <button
        type="button"
        aria-label={visible ? 'Hide password' : 'Show password'}
        onClick={toggleVisibility}
        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
