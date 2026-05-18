import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import Register from './pages/Register';
import Resources from './pages/Resources';
import Solver from './pages/Solver';
import Generator from './pages/Generator';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import { useAuthStore } from './store/authStore';

import { useQuery } from '@tanstack/react-query';
import api from './api/auth';
import { resourcesApi } from './api/resources';
import { papersApi } from './api/papers';
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
import { LayoutDashboard, Zap, FileText, CheckCircle2, FileEdit } from "lucide-react"

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

  const { data: resources } = useQuery({
    queryKey: ['resources'],
    queryFn: resourcesApi.list,
  });

  const { data: papers } = useQuery({
    queryKey: ['papers'],
    queryFn: papersApi.list,
  });

  // Sync store when data changes
  useEffect(() => {
    if (user && token) {
      setAuth(user, token);
    }
  }, [user, token, setAuth]);

  const displayUser = user || storeUser;

  const isPaid = displayUser?.plan === 'paid';
  const limits = {
    questions: isPaid ? 'Unlimited' : 30,
    resources: isPaid ? 'Unlimited' : 3,
    papers: isPaid ? 'Unlimited' : 2,
  };
  
  const getProgress = (used: number, limit: number | string) => {
    if (limit === 'Unlimited') return 0;
    return Math.min((used / (limit as number)) * 100, 100);
  };

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Plan Status */}
        <Card className="border-border/50 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <CheckCircle2 className="size-12 text-primary" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="uppercase tracking-widest text-[10px] font-bold">Account Plan</CardDescription>
            <CardTitle className="text-3xl font-black capitalize flex items-center gap-2">
              {displayUser?.plan}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 border-none font-bold">ACTIVE</Badge>
          </CardContent>
        </Card>

        {/* Questions Answered */}
        <Card className="border-border/50 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <Zap className="size-12 text-green-500" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="uppercase tracking-widest text-[10px] font-bold">Questions</CardDescription>
            <CardTitle className="text-4xl font-black text-green-600 dark:text-green-500">
              {displayUser?.questions_used || 0}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <span className="text-xs font-bold text-muted-foreground uppercase">Answered</span>
            <div className="space-y-1">
               <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 transition-all duration-1000 ease-out" 
                    style={{ width: `${getProgress(displayUser?.questions_used || 0, limits.questions)}%` }}
                  />
               </div>
               <p className="text-[10px] font-bold text-muted-foreground uppercase">Quota: {displayUser?.questions_used || 0} / {limits.questions}</p>
            </div>
          </CardContent>
        </Card>

        {/* Resources Uploaded */}
        <Card className="border-border/50 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <FileText className="size-12 text-blue-500" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="uppercase tracking-widest text-[10px] font-bold">Resources</CardDescription>
            <CardTitle className="text-4xl font-black text-blue-600 dark:text-blue-500">
              {resources?.length || 0}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <span className="text-xs font-bold text-muted-foreground uppercase">Uploaded</span>
             <div className="space-y-1">
               <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-1000 ease-out" 
                    style={{ width: `${getProgress(resources?.length || 0, limits.resources)}%` }}
                  />
               </div>
               <p className="text-[10px] font-bold text-muted-foreground uppercase">Quota: {resources?.length || 0} / {limits.resources}</p>
            </div>
          </CardContent>
        </Card>

        {/* Papers Generated */}
        <Card className="border-border/50 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <FileEdit className="size-12 text-purple-500" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="uppercase tracking-widest text-[10px] font-bold">Sample Papers</CardDescription>
            <CardTitle className="text-4xl font-black text-purple-600 dark:text-purple-500">
              {papers?.length || 0}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <span className="text-xs font-bold text-muted-foreground uppercase">Generated</span>
             <div className="space-y-1">
               <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-purple-500 transition-all duration-1000 ease-out" 
                    style={{ width: `${getProgress(papers?.length || 0, limits.papers)}%` }}
                  />
               </div>
               <p className="text-[10px] font-bold text-muted-foreground uppercase">Quota: {papers?.length || 0} / {limits.papers}</p>
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
              path="/solver/:sessionId?"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Solver />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/generator/:paperId?"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Generator />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Fallbacks */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
