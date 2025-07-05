import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUserSession } from '../../hooks/use-user-session';
import { Card, CardBody } from '@heroui/react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const userSession = useUserSession();
  const location = useLocation();

  // Show loading screen while checking authentication
  if (userSession.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardBody className="p-6 text-center space-y-4">
            <div className="flex items-center justify-center gap-3 mb-2">
              <img 
                src="/logo.svg" 
                alt="myGenKit Logo" 
                className="w-10 h-10 shrink-0"
                onError={(e) => {
                  // Fallback to PNG if SVG fails to load
                  e.currentTarget.src = "/logo.png";
                }}
              />
              <h2 className="text-xl font-bold">myGenKit</h2>
            </div>
            <p className="text-sm text-default-500">
              Loading...
            </p>
          </CardBody>
        </Card>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!userSession.isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Render the protected component
  return <>{children}</>;
}; 