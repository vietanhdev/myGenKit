import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { LoginForm } from '../components/auth/LoginForm';
import { useUserSession } from '../hooks/use-user-session';
import { User } from '../lib/user-management';

export const LoginPage: React.FC = () => {
  const userSession = useUserSession();
  const [refreshKey, setRefreshKey] = useState(0);

  // If user is already logged in, redirect to main app
  if (userSession.isLoggedIn) {
    return <Navigate to="/" replace />;
  }

  const handleDeleteUser = (deletedUser: User) => {
    // Force re-render to refresh the user list
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <LoginForm
        key={refreshKey}
        isOpen={true}
        onLogin={userSession.login}
        onRegister={userSession.register}
        onDeleteUser={handleDeleteUser}
        existingUsers={userSession.getAllUsers()}
        isLoading={userSession.isLoading}
      />
    </div>
  );
}; 