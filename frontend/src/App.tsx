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

import { TooltipProvider } from "@/components/ui/tooltip"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { LayoutDashboard, Zap, FileText, CheckCircle2 } from "lucide-react"

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
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground animate-pulse font-medium">Syncing profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3">
          <LayoutDashboard className="size-9 text-primary" />
          Dashboard
        </h1>
        <p className="text-muted-foreground text-lg">
          Welcome back, <span className="text-foreground font-semibold underline underline-offset-4 decoration-primary/30">{displayUser?.email}</span>
        </p>
      </div>

      <Separator className="bg-border/50" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Plan Status */}
        <Card className="border-border/50 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <CheckCircle2 className="size-12 text-primary" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="uppercase tracking-widest text-[10px] font-bold">Account Plan</CardDescription>
            <CardTitle className="text-3xl font-black capitalize flex items-center gap-2">
              {displayUser?.plan}
              <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 border-none font-bold">ACTIVE</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">You are currently on the {displayUser?.plan} tier with standard limits.</p>
          </CardContent>
        </Card>

        {/* Usage Stats */}
        <Card className="md:col-span-2 border-border/50 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <Zap className="size-12 text-green-500" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="uppercase tracking-widest text-[10px] font-bold">Usage Activity</CardDescription>
            <CardTitle className="text-3xl font-black text-green-600 dark:text-green-500">
              {displayUser?.questions_used} <span className="text-sm font-medium text-muted-foreground uppercase tracking-normal">Questions Answered</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
               <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 transition-all duration-1000 ease-out" 
                    style={{ width: `${Math.min((displayUser?.questions_used || 0) / 30 * 100, 100)}%` }}
                  />
               </div>
               <span className="text-[10px] font-bold text-muted-foreground uppercase whitespace-nowrap">Quota: {displayUser?.questions_used} / 30</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
         <Card className="border-dashed bg-muted/20 hover:bg-muted/30 transition-colors cursor-pointer group">
            <CardHeader className="items-center text-center py-10">
               <div className="size-12 bg-background rounded-xl flex items-center justify-center mb-4 shadow-sm border border-border/50 group-hover:scale-110 transition-transform">
                  <FileText className="size-6 text-primary" />
               </div>
               <CardTitle>Manage Resources</CardTitle>
               <CardDescription>Upload notes, syllabi and past papers to train your tutor.</CardDescription>
            </CardHeader>
         </Card>

         <Card className="border-dashed bg-muted/20 hover:bg-muted/30 transition-colors cursor-pointer group">
            <CardHeader className="items-center text-center py-10">
               <div className="size-12 bg-background rounded-xl flex items-center justify-center mb-4 shadow-sm border border-border/50 group-hover:scale-110 transition-transform">
                  <Zap className="size-6 text-yellow-500" />
               </div>
               <CardTitle>Open AI Solver</CardTitle>
               <CardDescription>Start a new chat session and get answers grounded in your data.</CardDescription>
            </CardHeader>
         </Card>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
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
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
