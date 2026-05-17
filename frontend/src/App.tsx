import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Login from './pages/Login';
import Register from './pages/Register';
import Resources from './pages/Resources';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import { useAuthStore } from './store/authStore';

const queryClient = new QueryClient();

function Dashboard() {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-md p-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Dashboard</h1>
        <div className="space-y-4">
          <p className="text-lg text-gray-700 dark:text-gray-300">
            Welcome back, <span className="font-bold text-blue-600">{user?.email}</span>!
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Account Plan</p>
              <p className="text-2xl font-bold dark:text-white capitalize">{user?.plan}</p>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-lg">
              <p className="text-sm text-green-600 dark:text-green-400 font-medium">Questions Answered</p>
              <p className="text-2xl font-bold dark:text-white">{user?.questions_used}</p>
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

          {/* Fallbacks */}
          <Route path="/solver" element={<Navigate to="/" replace />} />
          <Route path="/generator" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
