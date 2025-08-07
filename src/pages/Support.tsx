import React from 'react';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuthUser } from '@/hooks/useAuthUser';

const Support = () => {
  const { user, userProfile, isLoading, handleLogout, handleProfileUpdated } = useAuthUser();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-yellow-50">
      <Header 
        user={user}
        userProfile={userProfile}
        cartItems={[]}
        isLoading={isLoading}
        onLogout={handleLogout}
        onToggleCart={() => {}}
        onProfileUpdated={handleProfileUpdated}
      />
      
      <main className="py-8">
        <ChatInterface userId={user?.id} />
      </main>
      
      <Footer />
    </div>
  );
};

export default Support;