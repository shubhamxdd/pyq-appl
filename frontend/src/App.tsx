import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import Register from './pages/Register';
import Resources from './pages/Resources';
import Solver from './pages/Solver';
import Generator from './pages/Generator';
import Landing from './pages/Landing';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import Layout from './components/Layout';
import { useAuthStore } from './store/authStore';

import { useQuery } from '@tanstack/react-query';
import api from './api/auth';
import { resourcesApi } from './api/resources';
import { papersApi } from './api/papers';
import { useEffect } from 'react';
import posthog from 'posthog-js';

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
import { 
  LayoutDashboard, 
  Zap, 
  FileText, 
  CheckCircle2, 
  FileEdit, 
  Clock, 
  XCircle, 
  Loader2,
  ChevronRight,
  ArrowRight
} from "lucide-react"
import { cn } from './lib/utils';
import { WelcomeBanner } from './components/WelcomeBanner';

const queryClient = new QueryClient();

function Dashboard() {
  const storeUser = useAuthStore((state) => state.user);
  const setAuth = useAuthStore((state) => state.setAuth);
  const token = useAuthStore((state) => state.token);
  const navigate = useNavigate();

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
    refetchInterval: (query) => {
        return query.state.data?.some((p: any) => p.status === 'pending' || p.status === 'generating') ? 3000 : false;
    }
  });

  // Sync store when data changes
  useEffect(() => {
    if (user && token) {
      setAuth(user, token);
      posthog.identify(user.id, {
        email: user.email,
        plan: user.plan,
      });
    }
  }, [user, token, setAuth]);

  const displayUser = user || storeUser;

  const isPaid = displayUser?.plan === 'paid';
  const limits = {
    questions: isPaid ? 'Unlimited' : 30,
    resources: isPaid ? 'Unlimited' : 3,
    papers: isPaid ? 'Unlimited' : 3,
  };
  
  const getProgress = (used: number, limit: number | string) => {
    if (limit === 'Unlimited') return 0;
    return Math.min((used / (limit as number)) * 100, 100);
  };

  const getRemaining = (used: number, limit: number | string) => {
    if (limit === 'Unlimited') return 'Unlimited';
    return Math.max((limit as number) - used, 0);
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

  const recentPapers = papers?.slice(0, 5) || [];

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <WelcomeBanner />
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3 text-foreground">
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
            <CardDescription className="uppercase tracking-widest text-[10px] font-bold text-muted-foreground">Account Plan</CardDescription>
            <CardTitle className="text-3xl font-black capitalize flex items-center gap-2 text-foreground">
              {displayUser?.plan}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 border-none font-bold">ACTIVE</Badge>
          </CardContent>
        </Card>

        {/* Questions Answered */}
        <Card className="border-border/50 shadow-sm relative overflow-hidden group bg-card">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <Zap className="size-12 text-green-500" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="uppercase tracking-widest text-[10px] font-bold text-muted-foreground">Questions Answered</CardDescription>
            <CardTitle className="text-4xl font-black text-green-600 dark:text-green-500">
              {displayUser?.questions_used || 0}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
               <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 transition-all duration-1000 ease-out" 
                    style={{ width: `${getProgress(displayUser?.questions_used || 0, limits.questions)}%` }}
                  />
               </div>
               <div className="flex justify-between items-center">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Used: {displayUser?.questions_used || 0} / {limits.questions}</p>
                  <p className="text-[10px] font-extrabold text-green-600 dark:text-green-400 uppercase">{getRemaining(displayUser?.questions_used || 0, limits.questions)} Left</p>
               </div>
            </div>
          </CardContent>
        </Card>

        {/* Resources Uploaded */}
        <Card className="border-border/50 shadow-sm relative overflow-hidden group bg-card">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <FileText className="size-12 text-blue-500" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="uppercase tracking-widest text-[10px] font-bold text-muted-foreground">Resources Uploaded</CardDescription>
            <CardTitle className="text-4xl font-black text-blue-600 dark:text-blue-500">
              {resources?.length || 0}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
             <div className="space-y-1">
               <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-1000 ease-out" 
                    style={{ width: `${getProgress(resources?.length || 0, limits.resources)}%` }}
                  />
               </div>
               <div className="flex justify-between items-center">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Used: {resources?.length || 0} / {limits.resources}</p>
                  <p className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 uppercase">{getRemaining(resources?.length || 0, limits.resources)} Left</p>
               </div>
            </div>
          </CardContent>
        </Card>

        {/* Papers Generated */}
        <Card className="border-border/50 shadow-sm relative overflow-hidden group bg-card">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <FileEdit className="size-12 text-purple-500" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="uppercase tracking-widest text-[10px] font-bold text-muted-foreground">Papers Generated</CardDescription>
            <CardTitle className="text-4xl font-black text-purple-600 dark:text-purple-500">
              {papers?.length || 0}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
             <div className="space-y-1">
               <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-purple-500 transition-all duration-1000 ease-out" 
                    style={{ width: `${getProgress(papers?.length || 0, limits.papers)}%` }}
                  />
               </div>
               <div className="flex justify-between items-center">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Used: {papers?.length || 0} / {limits.papers}</p>
                  <p className="text-[10px] font-extrabold text-purple-600 dark:text-purple-400 uppercase">{getRemaining(papers?.length || 0, limits.papers)} Left</p>
               </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <div className="space-y-6">
          <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground px-2">Quick Actions</h3>
          <div className="grid grid-cols-1 gap-4">
             <Card 
                onClick={() => navigate('/resources')}
                className="border-dashed bg-muted/20 hover:bg-muted/30 transition-all cursor-pointer group hover:border-primary/50"
              >
                <CardHeader className="flex flex-row items-center gap-4 py-6">
                   <div className="size-10 bg-background rounded-lg flex items-center justify-center shadow-sm border border-border/50 group-hover:scale-110 transition-transform">
                      <FileText className="size-5 text-primary" />
                   </div>
                   <div className="space-y-0.5">
                      <CardTitle className="text-base">Upload Resources</CardTitle>
                      <CardDescription className="text-xs">Add new study materials</CardDescription>
                   </div>
                   <ArrowRight className="size-4 ml-auto text-muted-foreground group-hover:text-primary transition-colors" />
                </CardHeader>
             </Card>

             <Card 
                onClick={() => navigate('/solver')}
                className="border-dashed bg-muted/20 hover:bg-muted/30 transition-all cursor-pointer group hover:border-yellow-500/50"
              >
                <CardHeader className="flex flex-row items-center gap-4 py-6">
                   <div className="size-10 bg-background rounded-lg flex items-center justify-center shadow-sm border border-border/50 group-hover:scale-110 transition-transform">
                      <Zap className="size-5 text-yellow-500" />
                   </div>
                   <div className="space-y-0.5">
                      <CardTitle className="text-base">Ask AI Tutor</CardTitle>
                      <CardDescription className="text-xs">Get answers from your notes</CardDescription>
                   </div>
                   <ArrowRight className="size-4 ml-auto text-muted-foreground group-hover:text-yellow-500 transition-colors" />
                </CardHeader>
             </Card>

             <Card 
                onClick={() => navigate('/generator')}
                className="border-dashed bg-muted/20 hover:bg-muted/30 transition-all cursor-pointer group hover:border-purple-500/50"
              >
                <CardHeader className="flex flex-row items-center gap-4 py-6">
                   <div className="size-10 bg-background rounded-lg flex items-center justify-center shadow-sm border border-border/50 group-hover:scale-110 transition-transform">
                      <FileEdit className="size-5 text-purple-500" />
                   </div>
                   <div className="space-y-0.5">
                      <CardTitle className="text-base">Generate Paper</CardTitle>
                      <CardDescription className="text-xs">Create a new mock exam</CardDescription>
                   </div>
                   <ArrowRight className="size-4 ml-auto text-muted-foreground group-hover:text-purple-500 transition-colors" />
                </CardHeader>
             </Card>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground">Recent Generations</h3>
            <Link to="/generator" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
              View all <ChevronRight className="size-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {recentPapers.map((paper: any) => (
              <Card 
                key={paper.id} 
                className="border-border/50 hover:bg-muted/10 transition-colors cursor-pointer"
                onClick={() => navigate(`/generator/${paper.id}`)}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={cn(
                      "size-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-border/50",
                      paper.status === 'done' ? "bg-green-500/5 text-green-600" :
                      paper.status === 'failed' ? "bg-destructive/5 text-destructive" :
                      "bg-primary/5 text-primary"
                    )}>
                      {paper.status === 'done' ? <CheckCircle2 className="size-6" /> : 
                       paper.status === 'failed' ? <XCircle className="size-6" /> : 
                       <Loader2 className="size-6 animate-spin" />}
                    </div>
                    <div className="min-w-0 space-y-1">
                      <h4 className="font-bold text-sm truncate text-foreground">{paper.title}</h4>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-muted-foreground font-bold flex items-center gap-1">
                          <Clock className="size-3" /> {new Date(paper.created_at).toLocaleDateString()}
                        </span>
                        <Badge variant="outline" className="text-[9px] uppercase h-4 px-1.5 font-black border-border/50 bg-background">
                          {paper.status}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="hidden md:flex flex-col items-center">
                      <span className="text-lg font-black text-foreground leading-none">{paper.resource_count || 0}</span>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">Sources</span>
                    </div>
                    <div className="hidden md:flex flex-col items-center border-l border-border/50 pl-6">
                      <span className="text-lg font-black text-foreground leading-none">{paper.question_count || 0}</span>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">Questions</span>
                    </div>
                    <ChevronRight className="size-5 text-muted-foreground/30" />
                  </div>
                </CardContent>
              </Card>
            ))}

            {recentPapers.length === 0 && (
              <div className="text-center py-16 border-2 border-dashed rounded-3xl bg-muted/5 flex flex-col items-center gap-3">
                <div className="size-16 bg-muted rounded-full flex items-center justify-center">
                  <FileEdit className="size-8 text-muted-foreground/30" />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-muted-foreground">No generations yet</p>
                  <p className="text-xs text-muted-foreground/60">Your mock exams will appear here once generated.</p>
                </div>
              </div>
            )}
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
        <Toaster position="top-right" reverseOrder={false} />
        <Router>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <Register />
                </PublicRoute>
              }
            />
            
            {/* Protected Routes with Layout */}
            <Route
              path="/dashboard"
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
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
