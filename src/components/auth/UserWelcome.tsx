
import React from 'react';

interface UserWelcomeProps {
  userProfile: {first_name?: string, last_name?: string} | null;
}

export const UserWelcome: React.FC<UserWelcomeProps> = ({ userProfile }) => {
  const getUserDisplayName = () => {
    return userProfile?.first_name || null;
  };

  const displayName = getUserDisplayName();

  if (!displayName) return null;

  return (
    <p className="text-lg text-blue-600 mb-2">Welcome, {displayName}!</p>
  );
};
