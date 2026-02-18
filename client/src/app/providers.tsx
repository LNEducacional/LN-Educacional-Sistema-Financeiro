import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { NotificationProvider } from '@/features/notifications';

const queryClient = new QueryClient();

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <NotificationProvider>{children}</NotificationProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
