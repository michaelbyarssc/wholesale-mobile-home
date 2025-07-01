
import React from 'react';

interface UserWelcomeProps {
  userProfile: {first_name?: string, last_name?: string} | null;
}

export const UserWelcome: React.FC<UserWelcomeProps> = ({ userProfile }) => {
  console.log('🔍 UserWelcome component - userProfile:', userProfile);
  
  const getUserDisplayName = () => {
    if (!userProfile) {
      console.log('🔍 UserWelcome - No userProfile provided');
      return null;
    }

    if (userProfile.first_name && userProfile.last_name) {
      return `${userProfile.first_name} ${userProfile.last_name}`;
    } else if (userProfile.first_name) {
      return userProfile.first_name;
    }
    
    console.log('🔍 UserWelcome - No name fields found in userProfile');
    return null;
  };

  const displayName = getUserDisplayName();
  console.log('🔍 UserWelcome - final displayName:', displayName);

  if (!displayName) {
    console.log('🔍 UserWelcome - No display name, not rendering');
    return null;
  }

  return (
    <p className="text-lg text-blue-600 mb-2">Welcome, {displayName}!</p>
  );
};
