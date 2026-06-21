import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from '@/hooks/use-auth';
import { router } from '@/router';

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
