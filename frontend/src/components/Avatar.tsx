import React from 'react';

interface AvatarProps {
  user: {
    id: number;
    name?: string;
    displayName?: string;
    username?: string;
  };
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const Avatar: React.FC<AvatarProps> = ({ user, size = 'md', className = '' }) => {
  const displayName = user.displayName || user.username || user.name || 'U';
  const initials = displayName
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base'
  };

  // Generate a consistent color based on user ID
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-yellow-500',
    'bg-red-500',
    'bg-teal-500'
  ];
  
  const colorClass = colors[user.id % colors.length];

  return (
    <div 
      className={`${sizeClasses[size]} ${colorClass} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 ${className}`}
      title={displayName}
    >
      {initials}
    </div>
  );
};

export default Avatar;