import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import Register from './pages/Register';
import Resources from './pages/Resources';
import Solver from './pages/Solver';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import { useAuthStore } from './store/authStore';

import { useQuery } from '@tanstack/react-query';
import api from './api/auth';
import { useEffect } from 'react';

import { SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"

const queryClient = new QueryClient();

function Dashboard() {
  const storeUser = useAuthStore((state) => state.user);
  const setAuth = useAuthStore((state) => state.setAuth);
  const token = useAuthStore((state) => state.token);

  const { data: user, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const response = await api.get('/auth/me');
      return response.data;
    },
  });

  // Sync store when data changes
  useEffect(() => {
    if (user && token) {
      setAuth(user, token);
    }
  }, [user, token, setAuth]);

  const displayUser = user || storeUser;

  if (isLoading && !storeUser) {
    return <div className="p-8 text-center">Loading stats...</div>;
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-md p-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Dashboard</h1>
        <div className="space-y-4">
          <p className="text-lg text-gray-700 dark:text-gray-300">
            Welcome back, <span className="font-bold text-blue-600">{displayUser?.email}</span>!
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Account Plan</p>
              <p className="text-2xl font-bold dark:text-white capitalize">{displayUser?.plan}</p>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-lg">
              <p className="text-sm text-green-600 dark:text-green-400 font-medium">Questions Answered</p>
              <p className="text-2xl font-bold dark:text-white">{displayUser?.questions_used}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider>
          <Toaster position="top-right" reverseOrder={false} />
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* Protected Routes with Layout */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Dashboard />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/resources"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Resources />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/solver"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Solver />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              {/* Fallbacks */}
              <Route path="/generator" element={<Navigate to="/" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </SidebarProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
