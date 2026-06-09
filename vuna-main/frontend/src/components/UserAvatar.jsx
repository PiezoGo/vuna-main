import React from 'react';
import { getProfilePicture } from '../utils/marketplaceStore';

export default function UserAvatar({ userId, avatar, name, size = 'md', className = '', imageSrc }) {
  const pic = imageSrc || (userId ? getProfilePicture(userId) : null);
  const sizeClass =
    size === 'sm' ? 'w-8 h-8 text-sm' :
    size === 'lg' ? 'w-14 h-14 text-2xl' :
    'w-10 h-10 text-base';

  if (pic) {
    return (
      <img
        src={pic}
        alt={name || 'Profile'}
        className={`${sizeClass} rounded-full object-cover border border-primary/10 shrink-0 ${className}`}
      />
    );
  }

  const fallback = avatar || (name ? name.charAt(0).toUpperCase() : '👤');
  const isEmoji = fallback.length <= 2;

  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center font-bold bg-primary/10 text-primary shrink-0 ${className}`}
    >
      {isEmoji ? <span>{fallback}</span> : <span className="text-sm">{fallback}</span>}
    </div>
  );
}
