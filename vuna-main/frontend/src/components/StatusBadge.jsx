import React from 'react';

const STATUS_CONFIG = {
  pending:    { label: 'Pending',    bg: 'bg-amber-100',   text: 'text-amber-800',   dot: 'bg-amber-500' },
  paid:       { label: 'Paid',       bg: 'bg-emerald-100', text: 'text-emerald-800', dot: 'bg-emerald-500' },
  assigned:   { label: 'Assigned',   bg: 'bg-blue-100',    text: 'text-blue-800',    dot: 'bg-blue-500' },
  collected:  { label: 'Collected',  bg: 'bg-violet-100',  text: 'text-violet-800',  dot: 'bg-violet-500' },
  in_transit: { label: 'In Transit', bg: 'bg-indigo-100',  text: 'text-indigo-800',  dot: 'bg-indigo-500' },
  delivered:  { label: 'Delivered',  bg: 'bg-green-100',   text: 'text-green-800',   dot: 'bg-green-600' },
  completed:  { label: 'Completed',  bg: 'bg-emerald-100', text: 'text-emerald-900', dot: 'bg-emerald-700' },
  cancelled:  { label: 'Cancelled',  bg: 'bg-red-100',     text: 'text-red-800',     dot: 'bg-red-500' },
};

export default function StatusBadge({ status, size = 'sm' }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const sizeClasses = size === 'lg'
    ? 'px-3 py-1.5 text-sm'
    : 'px-2 py-0.5 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${config.bg} ${config.text} ${sizeClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
