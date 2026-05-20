import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import { 
  Upload, 
  MessageSquare, 
  FileText, 
  Check, 
  Shield, 
  ArrowRight, 
  Download, 
  BrainCircuit, 
  BookOpen, 
  GraduationCap,
  Search,
  CheckCircle2,
  Menu,
  X,
  Sun,
  Moon
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

export default function Landing() {
  const token = useAuthStore((state) => state.token);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  useEffect(() => {
    // Check initial theme
    const isDarkTheme = document.documentElement.classList.contains('dark') || 
                       (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setIsDark(isDarkTheme);
    if (isDarkTheme) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    if (newDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  useEffect(() => {
    // Enable smooth scroll on mount
    document.documentElement.style.scrollBehavior = 'smooth';
    
    const handleScroll = () => {
      const isTop = window.scrollY < 200;
      setScrolled(window.scrollY > 20);
      
      if (isTop) {
        setActiveSection(null);
        if (window.location.hash) {
          window.history.replaceState(null, '', window.location.pathname);
          document.title = "PrepAI | Stop guessing. Start acing.";
        }
      }
    };
    window.addEventListener('scroll', handleScroll);

    // Intersection Observer to update URL on scroll
    const observerOptions = {
      root: null,
      rootMargin: '-80px 0px -50% 0px', // Adjust based on header height and trigger point
      threshold: 0
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          if (id) {
            window.history.replaceState(null, '', `#${id}`);
            
            // Update Page Title based on section
            const sectionNames: Record<string, string> = {
              'features': 'Features',
              'how-it-works': 'How it Works',
              'pricing': 'Pricing'
            };
            
            if (sectionNames[id]) {
              document.title = `${sectionNames[id]} | PrepAI - Smart Exam Preparation`;
            }
          }
        } else if (window.scrollY < 200) {
          // Reset to default title when at the top
          document.title = "PrepAI | Stop guessing. Start acing.";
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);
    const sections = ['features', 'how-it-works', 'pricing'];
    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    
    return () => {
      // Cleanup
      document.documentElement.style.scrollBehavior = 'auto';
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  }, []);

  const closeMenuAndScroll = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    setIsMenuOpen(false);
    
    // Update URL hash immediately on click
    window.history.pushState(null, '', `#${id}`);

    const element = document.getElementById(id);
    if (element) {
      const offset = 80; // Account for fixed header
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30 transition-colors duration-300">
      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled ? 'bg-background/80 backdrop-blur-md border-b border-border py-3' : 'bg-transparent py-5'
      }`}>
        <div className="container mx-auto px-6 flex items-center justify-between">
          <Link 
            to="/" 
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }} 
            className="flex items-center gap-2 group"
          >
            <div className="bg-primary p-1.5 rounded-lg transition-transform group-hover:rotate-6">
              <GraduationCap className="size-6 text-white" />
            </div>
            <span className="text-2xl font-black tracking-tighter">Prep<span className="text-primary">AI</span></span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {[
              { id: 'how-it-works', label: 'How it Works' },
              { id: 'features', label: 'Features' },
              { id: 'pricing', label: 'Pricing' }
            ].map((item) => (
              <a 
                key={item.id}
                href={`#${item.id}`} 
                onClick={(e) => closeMenuAndScroll(e, item.id)} 
                className={cn(
                  "text-sm font-bold transition-all uppercase tracking-widest relative py-1",
                  activeSection === item.id ? "text-primary" : "text-muted-foreground hover:text-primary"
                )}
              >
                {item.label}
                {activeSection === item.id && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary animate-in fade-in slide-in-from-left-2 duration-300" />
                )}
              </a>
            ))}
            
            <div className="h-6 w-px bg-border/50 mx-2" />
            
            {/* Theme Toggle */}
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-muted transition-colors"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="size-5 text-yellow-500" /> : <Moon className="size-5 text-slate-700" />}
            </button>

            {token ? (
              <Button asChild size="sm" className="font-bold">
                <Link to="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <div className="flex items-center gap-4">
                <Link to="/login" className="text-sm font-bold hover:text-primary transition-colors uppercase tracking-widest">Login</Link>
                <Button asChild size="sm" className="font-bold rounded-full px-6">
                  <Link to="/register">Join Free</Link>
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Actions */}
          <div className="flex items-center gap-2 md:hidden">
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-muted transition-colors"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="size-5 text-yellow-500" /> : <Moon className="size-5 text-slate-700" />}
            </button>
            <button 
              className="p-2 text-foreground"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-full left-0 w-full bg-background border-b border-border py-6 px-6 flex flex-col gap-6 animate-in slide-in-from-top duration-300 shadow-xl">
            {[
              { id: 'how-it-works', label: 'How it Works' },
              { id: 'features', label: 'Features' },
              { id: 'pricing', label: 'Pricing' }
            ].map((item) => (
              <a 
                key={item.id}
                href={`#${item.id}`} 
                onClick={(e) => closeMenuAndScroll(e, item.id)} 
                className={cn(
                  "text-lg font-bold flex items-center justify-between",
                  activeSection === item.id ? "text-primary" : "text-foreground"
                )}
              >
                {item.label}
                {activeSection === item.id && <div className="size-2 rounded-full bg-primary" />}
              </a>
            ))}
            {token ? (
              <Button asChild className="w-full">
                <Link to="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <div className="flex flex-col gap-4">
                <Button asChild variant="outline" className="w-full">
                  <Link to="/login">Login</Link>
                </Button>
                <Button asChild className="w-full">
                  <Link to="/register">Join Free</Link>
                </Button>
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 right-0 -z-10 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 left-0 -z-10 w-[400px] h-[400px] bg-blue-500/5 blur-[100px] rounded-full" />

        <div className="container mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 text-center md:text-left">
            <Badge variant="secondary" className="bg-primary/10 text-primary border-none px-4 py-1 font-bold text-xs tracking-widest uppercase">
              ✨ The future of exam prep is here
            </Badge>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.1]">
              Stop guessing.<br />
              <span className="text-primary underline decoration-primary/20 underline-offset-8">Start acing.</span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed max-w-xl mx-auto md:mx-0">
              Upload your syllabus, notes, or past papers. Get instant, accurate answers and generate full mock exams tailored exactly to your curriculum.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <Button asChild size="lg" className="h-14 px-8 text-lg font-bold rounded-full group">
                <Link to="/register">
                  Start Studying for Free
                  <ArrowRight className="ml-2 size-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button asChild variant="ghost" size="lg" className="h-14 px-8 text-lg font-bold rounded-full">
                <a href="#how-it-works">See How it Works</a>
              </Button>
            </div>
            
            <div className="flex items-center gap-6 justify-center md:justify-start pt-4">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="size-10 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-black overflow-hidden">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i + 10}`} alt="User" />
                  </div>
                ))}
              </div>
              <p className="text-sm font-bold text-muted-foreground">
                <span className="text-foreground">2,000+</span> students acing exams
              </p>
            </div>
          </div>

          <div className="relative group">
            <div className="absolute inset-0 bg-primary/10 blur-[60px] rounded-full group-hover:bg-primary/20 transition-all duration-500" />
            <div className="relative border border-border shadow-2xl rounded-3xl overflow-hidden bg-background/50 backdrop-blur-sm transform hover:scale-[1.02] transition-transform duration-500">
              <div className="h-10 bg-muted/50 border-b border-border flex items-center gap-2 px-4">
                <div className="size-3 rounded-full bg-red-400" />
                <div className="size-3 rounded-full bg-yellow-400" />
                <div className="size-3 rounded-full bg-green-400" />
                <div className="ml-4 h-5 w-48 bg-background/50 rounded-full" />
              </div>
              <img 
                src={isDark ? "/dashboard-dark.png" : "/dashboard-light.png"} 
                alt="PrepAI Dashboard" 
                className="w-full h-auto object-cover"
              />
            </div>
            
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-24 bg-muted/30 relative">
        <div className="container mx-auto px-6">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight">Three steps to success</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Our engine handles the heavy lifting so you can focus on learning.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            {[
              {
                step: "01",
                title: "Upload",
                description: "Drag and drop your PDFs or text notes securely. We support textbooks, lecture notes, and syllabus files.",
                icon: Upload,
                color: "text-blue-500",
                bg: "bg-blue-500/10"
              },
              {
                step: "02",
                title: "Ask",
                description: "Our AI Tutor answers your questions using *only* your materials. No hallucinations, just facts from your notes.",
                icon: MessageSquare,
                color: "text-primary",
                bg: "bg-primary/10"
              },
              {
                step: "03",
                title: "Generate",
                description: "Create realistic sample papers in seconds. From MCQs to long-form questions, test yourself like it's the real exam.",
                icon: BrainCircuit,
                color: "text-purple-500",
                bg: "bg-purple-500/10"
              }
            ].map((item, i) => (
              <div key={i} className="relative p-8 rounded-3xl bg-background border border-border shadow-sm hover:shadow-xl transition-all group">
                <span className="absolute top-6 right-8 text-4xl font-black text-muted-foreground/10 group-hover:text-primary/10 transition-colors">
                  {item.step}
                </span>
                <div className={`size-14 rounded-2xl ${item.bg} flex items-center justify-center mb-6`}>
                  <item.icon className={`size-7 ${item.color}`} />
                </div>
                <h3 className="text-2xl font-black mb-4">{item.title}</h3>
                <p className="text-muted-foreground leading-relaxed font-medium">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Bento Grid */}
      <section id="features" className="py-24">
        <div className="container mx-auto px-6">
          <div className="text-center space-y-4 mb-16">
             <Badge variant="outline" className="rounded-full px-4 py-1 border-primary/20 text-primary font-bold uppercase tracking-widest text-[10px]">The Toolkit</Badge>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight">Everything you need to prep</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[280px]">
            {/* Bento 1: AI Solver */}
            <div className="md:col-span-2 row-span-1 p-8 rounded-[2rem] bg-gradient-to-br from-blue-600 to-blue-800 text-white relative overflow-hidden group">
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                  <Badge className="bg-white/20 text-white border-none mb-4 font-bold">SMART RAG</Badge>
                  <h3 className="text-3xl font-black mb-2 leading-tight">Accurate Answers</h3>
                  <p className="text-white/80 font-medium max-w-md">No hallucinations. We cite your exact notes so you can trust every word the AI says.</p>
                </div>
                <div className="flex gap-2">
                   <div className="px-4 py-2 bg-white/10 rounded-full border border-white/20 flex items-center gap-2">
                      <Search className="size-4" />
                      <span className="text-xs font-bold">Source-Backed</span>
                   </div>
                </div>
              </div>
              <div className="absolute right-[-10%] bottom-[-20%] opacity-20 group-hover:scale-110 transition-transform duration-700">
                <MessageSquare className="size-64" />
              </div>
            </div>

            {/* Bento 2: Smart Generation */}
            <div className="md:col-span-1 row-span-2 p-8 rounded-[2rem] bg-muted border border-border relative overflow-hidden group">
              <div className="relative z-10 h-full flex flex-col">
                <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                  <BrainCircuit className="size-7 text-primary" />
                </div>
                <h3 className="text-3xl font-black mb-4 leading-tight">Smart Generation</h3>
                <p className="text-muted-foreground font-medium mb-8">Generate MCQs, Short-form, and Long-form questions that mirror your exam board's patterns.</p>
                
                <div className="space-y-3 mt-auto">
                   {['Multiple Choice', 'Short Answer', 'Detailed Essays', 'Case Studies'].map((t) => (
                      <div key={t} className="flex items-center gap-3 bg-background/50 border border-border p-3 rounded-xl">
                        <CheckCircle2 className="size-4 text-green-500" />
                        <span className="text-xs font-bold">{t}</span>
                      </div>
                   ))}
                </div>
              </div>
            </div>

            {/* Bento 3: PDF Export */}
            <div className="md:col-span-1 row-span-1 p-8 rounded-[2rem] bg-background border border-border shadow-sm flex flex-col justify-between group">
               <div>
                  <div className="size-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-6">
                    <Download className="size-6 text-purple-600" />
                  </div>
                  <h3 className="text-2xl font-black mb-2">PDF Export</h3>
                  <p className="text-muted-foreground text-sm font-medium leading-relaxed">Download your generated papers to print and practice offline, just like the real deal.</p>
               </div>
               <Button asChild variant="ghost" className="p-0 font-bold text-purple-600 hover:text-purple-700 hover:bg-transparent group/btn">
                  <a href="https://pyq-space.sfo3.digitaloceanspaces.com/papers/fe472efc-ee7a-4f16-bc82-0ec54a4dc9c1_a370202f.pdf" target="_blank" rel="noopener noreferrer">
                    See examples <ArrowRight className="ml-2 size-4 group-hover/btn:translate-x-1 transition-transform" />
                  </a>
               </Button>
            </div>

            {/* Bento 4: Security */}
            <div className="md:col-span-1 row-span-1 p-8 rounded-[2rem] bg-background border border-border shadow-sm flex flex-col justify-between group">
               <div>
                  <div className="size-12 rounded-xl bg-orange-500/10 flex items-center justify-center mb-6">
                    <Shield className="size-6 text-orange-600" />
                  </div>
                  <h3 className="text-2xl font-black mb-2">Secure Vault</h3>
                  <p className="text-muted-foreground text-sm font-medium leading-relaxed">Your study materials are encrypted and never shared. Private notes stay private.</p>
               </div>
               <div className="flex gap-2">
                 <Badge variant="secondary" className="bg-orange-500/5 text-orange-600 border-none font-bold text-[10px]">AES-256</Badge>
                 <Badge variant="secondary" className="bg-orange-500/5 text-orange-600 border-none font-bold text-[10px]">PRIVATE</Badge>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Deep Dive */}
      <section className="py-24 bg-background overflow-hidden">
        <div className="container mx-auto px-6 space-y-32">
          {/* Section 1: AI Solver */}
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="order-2 md:order-1 relative">
               <div className="absolute -inset-4 bg-primary/5 blur-3xl rounded-full" />
               <Card className="relative border border-border overflow-hidden shadow-2xl rounded-3xl transform -rotate-2">
                 <CardHeader className="border-b bg-muted/30 py-4">
                    <div className="flex items-center gap-3">
                       <div className="size-8 bg-primary rounded-full flex items-center justify-center">
                          <BrainCircuit className="size-4 text-white" />
                       </div>
                       <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">AI Tutor Session</p>
                          <p className="text-xs font-bold">Physics Chapter 4: Waves</p>
                       </div>
                    </div>
                 </CardHeader>
                 <CardContent className="p-6 space-y-6">
                    <div className="flex justify-end">
                       <div className="bg-primary text-white p-3 rounded-2xl rounded-tr-none text-xs font-medium max-w-[80%]">
                          Explain the difference between longitudinal and transverse waves.
                       </div>
                    </div>
                    <div className="flex justify-start">
                       <div className="bg-muted p-4 rounded-2xl rounded-tl-none text-xs font-medium max-w-[90%] space-y-3">
                          <p>In a <strong>transverse wave</strong>, the particles of the medium vibrate perpendicular to the direction of wave motion (e.g., light waves).</p>
                          <p>In a <strong>longitudinal wave</strong>, particles vibrate parallel to the wave motion (e.g., sound waves).</p>
                          <div className="pt-2 flex items-center gap-2 text-[9px] font-bold text-primary">
                             <BookOpen className="size-3" />
                             SOURCE: NCERT Class 12 Physics, Page 142
                          </div>
                       </div>
                    </div>
                 </CardContent>
               </Card>
            </div>
            <div className="order-1 md:order-2 space-y-6">
              <Badge className="bg-blue-100 text-blue-600 border-none px-3 py-1 font-bold">THE AI SOLVER</Badge>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">Your 24/7<br />Personal Tutor</h2>
              <p className="text-lg text-muted-foreground leading-relaxed font-medium">
                Don't get stuck at 2 AM. Ask questions and get step-by-step explanations sourced directly from the textbooks your professor assigned. No more scrolling through forums.
              </p>
              <ul className="space-y-4">
                {[
                  "Context-aware answers from your notes",
                  "Page-level citations for verification",
                  "Support for complex equations & formulas",
                  "Summarization of long chapters"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 font-bold text-sm">
                    <div className="size-5 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                      <Check className="size-3 text-green-600" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Section 2: Generator */}
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <Badge className="bg-purple-100 text-purple-600 border-none px-3 py-1 font-bold">MOCK GENERATOR</Badge>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">Practice<br />Makes Perfect</h2>
              <p className="text-lg text-muted-foreground leading-relaxed font-medium">
                Automatically extract the exact exam pattern from past papers, or build your own. Generate infinite practice tests so you never run out of revision material.
              </p>
              <div className="grid grid-cols-2 gap-4">
                 <div className="p-4 bg-muted/50 rounded-2xl border border-border">
                    <p className="text-2xl font-black text-primary">01.</p>
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-1">Smart Extraction</p>
                 </div>
                 <div className="p-4 bg-muted/50 rounded-2xl border border-border">
                    <p className="text-2xl font-black text-primary">02.</p>
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-1">Unlimited Tests</p>
                 </div>
              </div>
              <Button asChild variant="outline" className="rounded-full font-bold px-8 h-12">
                 <Link to="/register">Create my first paper</Link>
              </Button>
            </div>
            <div className="relative">
               <div className="absolute -inset-4 bg-purple-500/5 blur-3xl rounded-full" />
               <Card className="relative border border-border overflow-hidden shadow-2xl rounded-3xl transform rotate-2">
                 <div className="bg-muted/30 p-4 border-b">
                    <div className="flex justify-between items-center">
                       <span className="text-xs font-black uppercase tracking-tighter">Mock Exam v2.1</span>
                       <Badge variant="outline" className="text-[10px] font-black uppercase">Biology Mid-term</Badge>
                    </div>
                 </div>
                 <CardContent className="p-8 space-y-8">
                    <div className="space-y-3">
                       <p className="text-xs font-bold text-muted-foreground">SECTION A: MULTIPLE CHOICE</p>
                       <div className="space-y-4">
                          <div className="p-3 bg-muted/20 border border-border rounded-xl">
                             <p className="text-sm font-bold mb-3">1. Which of the following is the powerhouse of the cell?</p>
                             <div className="grid grid-cols-2 gap-2">
                                {['Nucleus', 'Mitochondria', 'Ribosome', 'Golgi'].map((opt) => (
                                   <div key={opt} className="px-3 py-1.5 border border-border rounded-md text-[10px] font-medium bg-background">
                                      {opt}
                                   </div>
                                ))}
                             </div>
                          </div>
                       </div>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-dashed">
                        <div className="flex items-center gap-2">
                           <FileText className="size-4 text-purple-600" />
                           <span className="text-[10px] font-bold">12 Questions Generated</span>
                        </div>
                        <Button size="sm" className="h-8 rounded-full text-[10px] font-bold bg-purple-600">Download PDF</Button>
                    </div>
                 </CardContent>
               </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight">Simple pricing for better grades</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Choose the plan that fits your study needs.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Free Tier */}
            <Card className="p-8 rounded-[2rem] border border-border bg-background shadow-sm flex flex-col hover:shadow-md transition-shadow relative">
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-2 text-muted-foreground">Free</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-4xl font-black">₹0</span>
                  <span className="text-muted-foreground font-bold">/ forever</span>
                </div>
                <p className="text-muted-foreground text-sm font-medium leading-relaxed">Perfect for students just getting started with AI-assisted study.</p>
              </div>

              <div className="space-y-4 mb-8 flex-grow">
                {[
                  "3 Resources stored",
                  "30 AI questions / month",
                  "3 Sample Papers / month",
                  "PDF Downloads",
                  "Smart Format Detection",
                  "Standard response speed"
                ].map((f, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="size-4 text-green-500 shrink-0" />
                    <span className="text-sm font-bold">{f}</span>
                  </div>
                ))}
              </div>

              <Button asChild variant="outline" className="w-full h-12 rounded-full font-bold">
                <Link to="/register">Get Started</Link>
              </Button>
            </Card>

            {/* Pro Tier (Limited) */}
            <Card className="p-8 rounded-[2rem] border-2 border-primary bg-background shadow-2xl relative flex flex-col scale-105 z-10 overflow-visible">
              {/* Fixed Popular Ribbon */}
              <div className="absolute top-0 right-0 w-32 h-32 overflow-hidden rounded-tr-[2rem] pointer-events-none">
                <div className="absolute top-6 -right-8 w-40 bg-primary text-white text-[10px] font-black py-1 rotate-45 uppercase tracking-widest text-center shadow-sm">
                  Popular
                </div>
              </div>
              
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-2">
                   <h3 className="text-xl font-bold">Pro</h3>
                   <Badge className="bg-primary/10 text-primary border-none text-[10px] font-black px-2 h-5">BEST VALUE</Badge>
                </div>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-4xl font-black">₹499</span>
                  <span className="text-muted-foreground font-bold">/ month</span>
                </div>
                <p className="text-muted-foreground text-sm font-medium leading-relaxed">For serious students who want more power in their preparation.</p>
              </div>

              <div className="space-y-4 mb-8 flex-grow">
                {[
                  "20 Resources stored",
                  "100 AI questions / month",
                  "10 Sample Papers / month",
                  "Everything in Free",
                  "Priority AI Model Access",
                  "Ad-free Experience"
                ].map((f, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="size-4 text-primary shrink-0" />
                    <span className="text-sm font-bold">{f}</span>
                  </div>
                ))}
              </div>

              <Button asChild className="w-full h-12 rounded-full font-bold shadow-lg shadow-primary/25">
                <Link to="/register">Go Pro Now</Link>
              </Button>
            </Card>

            {/* Elite Tier (Unlimited) */}
            <Card className="p-8 rounded-[2rem] border border-border bg-background shadow-sm flex flex-col hover:shadow-md transition-shadow">
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-2 text-purple-600">Elite</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-4xl font-black">₹999</span>
                  <span className="text-muted-foreground font-bold">/ month</span>
                </div>
                <p className="text-muted-foreground text-sm font-medium leading-relaxed">The ultimate toolkit for top rankers and exam board preparation.</p>
              </div>

              <div className="space-y-4 mb-8 flex-grow">
                {[
                  "Unlimited Resources",
                  "Unlimited AI questions",
                  "Unlimited Sample Papers",
                  "Everything in Pro",
                  "Advanced Case Study AI",
                  "Early Access to Features",
                  "Personalized Exam Strategy"
                ].map((f, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="size-4 text-purple-500 shrink-0" />
                    <span className="text-sm font-bold">{f}</span>
                  </div>
                ))}
              </div>

              <Button asChild variant="outline" className="w-full h-12 rounded-full font-bold border-purple-200 hover:bg-purple-50 text-purple-700">
                <Link to="/register">Go Elite</Link>
              </Button>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="container mx-auto px-6">
           <div className="bg-primary rounded-[3rem] p-12 md:p-20 text-center text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 -z-0 opacity-10 group-hover:scale-110 transition-transform duration-[2000ms]">
                 <BrainCircuit className="size-[500px]" />
              </div>
              <div className="relative z-10 space-y-8">
                 <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">Ready to transform<br />your study routine?</h2>
                 <p className="text-xl text-white/80 font-medium max-w-2xl mx-auto">Join thousands of students who are already using PrepAI to get better grades in less time.</p>
                 <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button asChild size="lg" className="h-16 px-10 text-xl font-black rounded-full bg-white text-primary hover:bg-white/90">
                       <Link to="/register">Join PrepAI Today</Link>
                    </Button>
                    <Button asChild variant="outline" size="lg" className="h-16 px-10 text-xl font-black rounded-full border-white/20 hover:bg-white/10 text-white">
                       <Link to="/login">Sign In</Link>
                    </Button>
                 </div>
              </div>
           </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-2 space-y-6">
              <Link to="/" className="flex items-center gap-2">
                <div className="bg-primary p-1.5 rounded-lg">
                  <GraduationCap className="size-6 text-white" />
                </div>
                <span className="text-2xl font-black tracking-tighter">Prep<span className="text-primary">AI</span></span>
              </Link>
              <p className="text-muted-foreground font-medium max-w-xs leading-relaxed">
                Empowering students with AI-driven preparation tools. Stop guessing, start acing.
              </p>
            </div>
            <div className="space-y-4">
              <h4 className="font-black text-sm uppercase tracking-widest">Navigation</h4>
              <ul className="space-y-2">
                <li><a href="#how-it-works" onClick={(e) => closeMenuAndScroll(e, 'how-it-works')} className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">How it Works</a></li>
                <li><a href="#features" onClick={(e) => closeMenuAndScroll(e, 'features')} className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">Features</a></li>
                <li><a href="#pricing" onClick={(e) => closeMenuAndScroll(e, 'pricing')} className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">Pricing</a></li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-black text-sm uppercase tracking-widest">Legal</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">© 2026 PrepAI. All rights reserved.</p>
            <div className="flex gap-6">
               <div className="size-8 rounded-full bg-muted flex items-center justify-center hover:bg-primary/10 transition-colors cursor-pointer">
                  <span className="sr-only">Twitter</span>
                  <svg className="size-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.84 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
               </div>
               <div className="size-8 rounded-full bg-muted flex items-center justify-center hover:bg-primary/10 transition-colors cursor-pointer">
                  <span className="sr-only">GitHub</span>
                  <svg className="size-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
               </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
