import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './routes/AppRoutes';
import { useAuthStore } from './store/useAuthStore';
import { useWalletStore } from './store/useWalletStore';

export const App: React.FC = () => {
  const { initialize, user } = useAuthStore();
  const { fetchWallet, subscribeRealtime, unsubscribeRealtime } = useWalletStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (user?.id) {
      fetchWallet();
      subscribeRealtime(user.id);
    }
    return () => {
      unsubscribeRealtime();
    };
  }, [user?.id, fetchWallet, subscribeRealtime, unsubscribeRealtime]);

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
};

export default App;
