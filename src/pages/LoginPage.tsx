import React from 'react';
import { Navigate } from 'react-router-dom';
import { LoginForm } from '../components/auth/LoginForm';
import { useUserSession } from '../hooks/use-user-session';

export const LoginPage: React.FC = () => {
  const userSession = useUserSession();

  // If user is already logged in, redirect to main app
  if (userSession.isLoggedIn) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <LoginForm
        isOpen={true}
        onLogin={userSession.login}
        onRegister={userSession.register}
        existingUsers={userSession.getAllUsers()}
        isLoading={userSession.isLoading}
      />
    </div>
  );
}; 