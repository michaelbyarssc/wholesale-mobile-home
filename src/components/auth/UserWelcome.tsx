
import React from 'react';

interface UserWelcomeProps {
  userProfile: {first_name?: string, last_name?: string} | null;
}

export const UserWelcome: React.FC<UserWelcomeProps> = ({ userProfile }) => {
  const getUserDisplayName = () => {
    const first = userProfile?.first_name?.trim() || '';
    const last = userProfile?.last_name?.trim() || '';
    const full = `${first} ${last}`.trim();
    return full || null;
  };

  const displayName = getUserDisplayName();

  if (!displayName) return null;

  return (
    <p className="text-lg text-blue-600 mb-2">Welcome, {displayName}!</p>
  );
};
