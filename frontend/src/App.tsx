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
    fetchWallet();
  }, [initialize, fetchWallet]);

  useEffect(() => {
    if (user?.id) {
      subscribeRealtime(user.id);
    }
    return () => {
      unsubscribeRealtime();
    };
  }, [user?.id, subscribeRealtime, unsubscribeRealtime]);

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
};

export default App;

