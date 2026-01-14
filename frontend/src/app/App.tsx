import React, { useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Providers } from './Providers';
import AppRoutes from './routes';
import ErrorBoundary from '../components/system/ErrorBoundary';
import { authStore } from '../store/auth.store';

const App: React.FC = () => {
  const [isInitializing, setIsInitializing] = useState(true);

  // Silent session restore on app boot
  useEffect(() => {
    const initializeApp = async () => {
      // If we have a refresh token but no access token (or want to refresh),
      // attempt silent restore
      const refreshToken = authStore.getRefreshToken();
      if (refreshToken) {
        try {
          await authStore.silentRestoreSession();
        } catch (error) {
          // Silent restore failed - user will be logged out
          // No need to show error - this is expected if refresh token expired
        }
      }
      setIsInitializing(false);
    };

    initializeApp();
  }, []);

  // Show nothing while initializing to prevent login page flash
  if (isInitializing) {
    return null;
  }

  return (
    <ErrorBoundary>
      <Providers>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </Providers>
    </ErrorBoundary>
  );
};

export default App;

