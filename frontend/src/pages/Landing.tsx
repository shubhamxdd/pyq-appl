import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Zap, 
  GraduationCap, 
  Upload, 
  MessageSquare, 
  FileEdit, 
  CheckCircle2, 
  FileText, 
  BarChart3, 
  Download,
  ChevronDown,
  Menu,
  X,
  Sun,
  Moon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';

export default function Landing() {
  const token = useAuthStore((state) => state.token);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setIsScrolled] = useState(false);
  const [isDark, setIsDark] = useState(
    document.documentElement.classList.contains('dark')
  );

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      {/* --- STICKY HEADER --- */}
      <header 
        className={cn(
          "fixed top-0 w-full z-50 transition-all duration-300 border-b",
          scrolled ? "bg-background/80 backdrop-blur-md py-3 border-border" : "bg-transparent py-5 border-transparent"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <div className="bg-primary size-9 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <Zap className="size-6 text-primary-foreground fill-current" />
            </div>
            <span className="font-black text-2xl tracking-tighter uppercase">PrepAI</span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-8">
            {['How it Works', 'Features', 'Pricing', 'FAQ'].map((item) => (
              <button
                key={item}
                onClick={() => scrollToSection(item.toLowerCase().replace(/ /g, '-'))}
                className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest"
              >
                {item}
              </button>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsDark(!isDark)}
              className="rounded-full size-10"
            >
              {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
            </Button>
            {token ? (
              <Button asChild className="rounded-full font-bold shadow-md px-6">
                <Link to="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild className="font-bold">
                  <Link to="/login">Login</Link>
                </Button>
                <Button asChild className="rounded-full font-bold shadow-lg shadow-primary/20 px-6 text-sm">
                  <Link to="/register">Sign Up Free</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsDark(!isDark)}
              className="rounded-full size-10"
            >
              {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
            </Button>
            <button className="p-2" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-full left-0 w-full bg-background border-b animate-in slide-in-from-top duration-300">
            <div className="flex flex-col p-6 gap-4 text-center">
              {['How it Works', 'Features', 'Pricing', 'FAQ'].map((item) => (
                <button
                  key={item}
                  onClick={() => scrollToSection(item.toLowerCase().replace(/ /g, '-'))}
                  className="font-bold text-lg"
                >
                  {item}
                </button>
              ))}
              <Separator />
              {token ? (
                <Button asChild className="w-full h-12 rounded-xl font-bold">
                  <Link to="/dashboard">Go to Dashboard</Link>
                </Button>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <Button variant="outline" asChild className="h-12 rounded-xl font-bold">
                    <Link to="/login">Login</Link>
                  </Button>
                  <Button asChild className="h-12 rounded-xl font-bold">
                    <Link to="/register">Sign Up</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      <main>
        {/* --- HERO SECTION --- */}
        <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
          {/* Enhanced Animated Background Grid */}
          <div className="absolute inset-0 -z-10 h-full w-full">
            <div className="absolute inset-0 bg-background" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
            
            {/* Animated Glow Blobs - High contrast for dark mode */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none overflow-hidden">
               <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-500/20 dark:bg-blue-600/30 rounded-full blur-[120px] animate-pulse" />
               <div className="absolute bottom-[20%] right-[-10%] w-[500px] h-[500px] bg-indigo-400/20 dark:bg-indigo-500/20 rounded-full blur-[120px] animate-bounce duration-[15s]" />
               <div className="absolute top-[20%] right-[10%] w-[300px] h-[300px] bg-purple-500/10 dark:bg-purple-600/20 rounded-full blur-[80px] animate-pulse duration-[8s]" />
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 md:px-8 text-center space-y-8 relative">
            <Badge variant="secondary" className="px-4 py-1.5 rounded-full font-black tracking-tighter text-primary dark:text-blue-400 bg-primary/10 dark:bg-blue-500/10 border-none animate-bounce">
               ✨ AI-POWERED EXAM PREP
            </Badge>
            <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-foreground leading-[0.9]">
              STOP GUESSING.<br /><span className="text-primary dark:text-blue-400 underline decoration-blue-500/30">START ACING.</span>
            </h1>
            <p className="max-w-2xl mx-auto text-muted-foreground text-lg md:text-xl font-medium leading-relaxed">
              Upload your syllabus, notes, or past papers. Get instant, accurate answers and generate full mock exams tailored exactly to your curriculum.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button asChild size="lg" className="h-14 px-10 rounded-2xl text-lg font-black shadow-xl shadow-primary/20 dark:shadow-blue-500/10 w-full sm:w-auto transition-transform hover:scale-105 active:scale-95">
                <Link to="/register">Start Studying for Free</Link>
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                onClick={() => scrollToSection('how-it-works')}
                className="h-14 px-10 rounded-2xl text-lg font-bold border-2 dark:border-primary/50 w-full sm:w-auto"
              >
                See How it Works
              </Button>
            </div>

            {/* Stats Bar */}
            <div className="pt-12 flex flex-wrap items-center justify-center gap-8 md:gap-16 opacity-70">
              {[
                { label: "Students", val: "10K+" },
                { label: "Questions Solved", val: "50K+" },
                { label: "Papers Generated", val: "5K+" },
                { label: "Success Rate", val: "99%" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-2xl font-black tracking-tighter">{stat.val}</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Browser Mockup Placeholder */}
            <div className="pt-16 max-w-5xl mx-auto px-4">
               <div className="rounded-3xl border-8 border-muted bg-muted/50 dark:bg-muted/20 shadow-2xl overflow-hidden aspect-video relative group border-t-border">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-background flex items-center justify-center">
                      <div className="space-y-4 text-center">
                         <div className="size-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Zap className="size-10 text-primary dark:text-blue-400" />
                         </div>
                         <p className="text-sm font-black text-muted-foreground uppercase tracking-widest animate-pulse">Previewing PrepAI Dashboard</p>
                         <div className="flex gap-2 justify-center">
                            {[1,2,3].map(i => <div key={i} className="w-20 h-2 bg-muted-foreground/20 rounded-full" />)}
                         </div>
                      </div>
                  </div>
                  <div className="absolute top-4 left-6 flex gap-2">
                     <div className="size-3 rounded-full bg-red-400/50" />
                     <div className="size-3 rounded-full bg-amber-400/50" />
                     <div className="size-3 rounded-full bg-green-400/50" />
                  </div>
               </div>
            </div>
          </div>
        </section>

        {/* --- HOW IT WORKS --- */}
        <section id="how-it-works" className="py-24 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-16 text-center">
            <div className="space-y-4">
              <h2 className="text-3xl md:text-5xl font-black tracking-tight uppercase">Ace Your Finals in <span className="text-primary dark:text-blue-400 italic">3 Steps</span></h2>
              <p className="text-muted-foreground font-medium">Simple, fast, and grounded in your specific study materials.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
              <div className="hidden md:block absolute top-24 left-1/4 right-1/4 h-0.5 border-t-2 border-dashed border-primary/20 -z-10" />

              {[
                { icon: Upload, title: "Upload", desc: "Drag and drop your PDFs or text notes securely. Syllabi, past year papers, or lecture notes—we handle it all.", color: "text-blue-500", bg: "bg-blue-500/10" },
                { icon: MessageSquare, title: "Ask", desc: "Our AI Tutor answers your questions using ONLY your materials. No hallucinations, just pure academic groundedness.", color: "text-yellow-500", bg: "bg-yellow-500/10" },
                { icon: FileEdit, title: "Generate", desc: "Create realistic sample papers in seconds. Auto-detect formats from past papers to build the perfect mock exam.", color: "text-purple-500", bg: "bg-purple-500/10" },
              ].map((step, i) => (
                <div key={i} className="space-y-6 group">
                  <div className={cn("size-20 rounded-3xl mx-auto flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 duration-500", step.bg)}>
                    <step.icon className={cn("size-10", step.color)} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black tracking-tighter uppercase">{i+1}. {step.title}</h3>
                    <p className="text-muted-foreground leading-relaxed px-4">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- FEATURES BENTO BOX --- */}
        <section id="features" className="py-24 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-16">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-4 max-w-2xl text-center md:text-left">
                <h2 className="text-3xl md:text-6xl font-black tracking-tighter uppercase leading-[0.9]">Built for <br /><span className="text-primary dark:text-blue-400">High-Performance</span> Students</h2>
                <p className="text-muted-foreground font-medium">Everything you need to transform your raw notes into an academic unfair advantage.</p>
              </div>
              <Button onClick={() => scrollToSection('pricing')} variant="ghost" className="font-bold underline decoration-primary/30">View Plans & Pricing</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[250px]">
              <Card className="md:col-span-8 border-none bg-primary/5 group overflow-hidden relative">
                <div className="absolute top-0 right-0 p-8 opacity-10 -rotate-12 group-hover:rotate-0 transition-transform duration-700">
                  <MessageSquare className="size-48 text-primary" />
                </div>
                <CardHeader className="h-full justify-end p-8 text-left">
                  <Badge className="w-fit mb-4 bg-primary/10 text-primary border-none font-bold">SOLVER</Badge>
                  <CardTitle className="text-3xl font-black tracking-tighter uppercase mb-2 text-foreground">Accurate AI Tutor</CardTitle>
                  <CardDescription className="text-base font-medium max-w-md">No hallucinations. Every answer is cited from your specific PDFs. It's like having a textbook that talks back to you.</CardDescription>
                </CardHeader>
              </Card>

              <Card className="md:col-span-4 border-none bg-yellow-500/5 group overflow-hidden relative">
                <CardHeader className="h-full justify-center text-center p-8">
                  <div className="size-16 bg-yellow-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                    <CheckCircle2 className="size-8 text-yellow-600 dark:text-yellow-500" />
                  </div>
                  <CardTitle className="text-2xl font-black tracking-tighter uppercase mb-2 text-foreground">Verified Answers</CardTitle>
                  <CardDescription className="text-sm font-medium">100% grounded responses based on YOUR uploaded material.</CardDescription>
                </CardHeader>
              </Card>

              <Card className="md:col-span-4 border-none bg-purple-500/5 group overflow-hidden relative">
                <CardHeader className="h-full justify-center text-center p-8">
                   <div className="size-16 bg-purple-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                    <FileEdit className="size-8 text-purple-600 dark:text-purple-400" />
                  </div>
                  <CardTitle className="text-2xl font-black tracking-tighter uppercase mb-2 text-foreground">Pattern Detection</CardTitle>
                  <CardDescription className="text-sm font-medium">AI analyzes past year papers to extract MCQ, Short, and Long answer counts automatically.</CardDescription>
                </CardHeader>
              </Card>

              <Card className="md:col-span-8 border-none bg-blue-500/5 group overflow-hidden relative">
                <div className="absolute bottom-0 right-0 p-8 opacity-10 group-hover:translate-y-2 transition-transform duration-700">
                  <Download className="size-40 text-blue-600" />
                </div>
                <CardHeader className="h-full justify-center p-8 text-left">
                  <Badge className="w-fit mb-4 bg-blue-500/10 text-blue-600 border-none font-bold uppercase">Export</Badge>
                  <CardTitle className="text-3xl font-black tracking-tighter uppercase mb-2 text-foreground">Professional PDF Export</CardTitle>
                  <CardDescription className="text-base font-medium max-w-md">Download beautiful, print-ready question papers and study guides with your school/college layout.</CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        {/* --- PRICING --- */}
        <section id="pricing" className="py-24 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-16">
            <div className="text-center space-y-4">
              <h2 className="text-4xl md:text-6xl font-black tracking-tight uppercase text-foreground">Simple Pricing</h2>
              <p className="text-muted-foreground font-medium text-lg">Start for free, upgrade when you're ready for elite performance.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
              {/* Free Tier */}
              <Card className="border-border/50 shadow-sm relative overflow-hidden bg-background flex flex-col transition-all hover:border-primary/20">
                <CardHeader className="p-8 pb-4">
                  <CardTitle className="text-2xl font-black tracking-tighter uppercase text-muted-foreground">Standard</CardTitle>
                  <div className="pt-4 flex items-baseline gap-1 text-foreground">
                    <span className="text-5xl font-black tracking-tighter">₹0</span>
                    <span className="text-muted-foreground font-bold uppercase tracking-widest text-xs">/ Forever</span>
                  </div>
                </CardHeader>
                <CardContent className="p-8 pt-0 space-y-8 flex-1">
                  <Separator className="opacity-50" />
                  <ul className="space-y-4 pt-4">
                    {[
                      { text: "3 Study Resources", icon: CheckCircle2 },
                      { text: "30 AI Questions / mo", icon: CheckCircle2 },
                      { text: "3 Sample Papers / mo", icon: CheckCircle2 },
                      { text: "Standard Speed", icon: CheckCircle2 },
                      { text: "PDF Downloads", icon: X, muted: true },
                    ].map((feature, i) => (
                      <li key={i} className={cn("flex items-center gap-3 text-sm font-bold tracking-tight", feature.muted ? "text-muted-foreground/30 line-through" : "text-foreground/80")}>
                        <feature.icon className={cn("size-5 shrink-0", feature.muted ? "text-muted-foreground/20" : "text-primary dark:text-blue-400")} />
                        {feature.text}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <div className="p-8 pt-0 mt-auto">
                  <Button asChild variant="outline" className="w-full h-12 font-black rounded-xl border-2 uppercase text-xs">
                    <Link to="/register">Get Started</Link>
                  </Button>
                </div>
              </Card>

              {/* Pro Tier */}
              <Card className="border-primary dark:border-blue-500/50 shadow-2xl relative overflow-hidden bg-background flex flex-col lg:scale-105 z-10">
                <div className="absolute top-0 right-0 p-4">
                   <Badge className="bg-primary dark:bg-blue-600 text-primary-foreground font-black px-4 py-1 border-none shadow-lg">POPULAR</Badge>
                </div>
                <CardHeader className="p-8 pb-4">
                  <CardTitle className="text-2xl font-black tracking-tighter uppercase text-primary dark:text-blue-400">Pro</CardTitle>
                  <div className="pt-4 flex items-baseline gap-1 text-foreground">
                    <span className="text-5xl font-black tracking-tighter">₹199</span>
                    <span className="text-muted-foreground font-bold uppercase tracking-widest text-xs">/ Month</span>
                  </div>
                </CardHeader>
                <CardContent className="p-8 pt-0 space-y-8 flex-1">
                  <Separator className="opacity-50" />
                  <ul className="space-y-4 pt-4">
                    {[
                      "15 Study Resources",
                      "300 AI Questions / mo",
                      "15 Sample Papers / mo",
                      "Instant PDF Downloads",
                      "Priority Support",
                    ].map((feature, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm font-bold tracking-tight text-foreground/90">
                        <CheckCircle2 className="size-5 shrink-0 text-primary dark:text-blue-400" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <div className="p-8 pt-0 mt-auto">
                   <Button asChild className="w-full h-12 font-black rounded-xl bg-primary dark:bg-blue-600 text-primary-foreground hover:bg-primary/90 dark:hover:bg-blue-700 uppercase shadow-xl text-xs">
                    <Link to="/register">Upgrade to Pro</Link>
                  </Button>
                </div>
              </Card>

              {/* Elite Tier */}
              <Card className="border-border/50 shadow-sm relative overflow-hidden bg-background flex flex-col transition-all hover:border-primary/20">
                <CardHeader className="p-8 pb-4">
                  <CardTitle className="text-2xl font-black tracking-tighter uppercase text-foreground">Elite</CardTitle>
                  <div className="pt-4 flex items-baseline gap-1 text-foreground">
                    <span className="text-5xl font-black tracking-tighter">₹499</span>
                    <span className="text-muted-foreground font-bold uppercase tracking-widest text-xs">/ Month</span>
                  </div>
                </CardHeader>
                <CardContent className="p-8 pt-0 space-y-8 flex-1">
                  <Separator className="opacity-50" />
                  <ul className="space-y-4 pt-4">
                    {[
                      "Unlimited Resources",
                      "Unlimited AI Questions",
                      "Unlimited Sample Papers",
                      "Advanced Analytics",
                      "24/7 Priority Support",
                    ].map((feature, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm font-bold tracking-tight text-foreground/80">
                        <CheckCircle2 className="size-5 shrink-0 text-primary dark:text-blue-400" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <div className="p-8 pt-0 mt-auto">
                  <Button asChild variant="outline" className="w-full h-12 font-black rounded-xl border-2 uppercase text-xs">
                    <Link to="/register">Go Elite</Link>
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* --- FAQ --- */}
        <section id="faq" className="py-24">
          <div className="max-w-3xl mx-auto px-4 md:px-8 space-y-16">
            <div className="text-center space-y-4">
               <h2 className="text-4xl md:text-6xl font-black tracking-tight uppercase">Questions?</h2>
               <p className="text-muted-foreground font-medium text-lg">Everything you need to know about PrepAI.</p>
            </div>

            <div className="space-y-4">
              {[
                { q: "Is PrepAI actually free?", a: "Yes! Our free tier is genuinely useful for students. You get 30 questions and 3 paper generations every single month at no cost." },
                { q: "What files can I upload?", a: "Currently, we support high-quality PDF extraction and plain text files. Our AI is optimized for academic documents like textbooks, lecture notes, and syllabi." },
                { q: "How accurate is the AI Tutor?", a: "Extremely accurate. Unlike general AI, PrepAI is 'grounded'—it only uses the context you provide. At the end of every answer, it cites exactly which part of your notes it used." },
                { q: "Can I cancel my subscription?", a: "Of course. You can cancel your Elite plan anytime from your account settings with one click. No hidden contracts." },
              ].map((faq, i) => <FAQItem key={i} question={faq.q} answer={faq.a} />)}
            </div>
          </div>
        </section>

        {/* --- BOTTOM CTA --- */}
        <section className="py-24 px-4">
           <div className="max-w-5xl mx-auto bg-primary dark:bg-blue-600 rounded-[3rem] p-12 md:p-24 text-center text-primary-foreground space-y-8 relative overflow-hidden shadow-2xl shadow-primary/20">
              <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              
              <h2 className="text-4xl md:text-7xl font-black tracking-tighter uppercase leading-[0.9]">Ready to Ace <br />Your Exams?</h2>
              <p className="max-w-xl mx-auto text-primary-foreground/80 font-bold text-lg">Join thousands of students using AI to study smarter, not harder.</p>
              <div className="pt-4">
                 <Button asChild size="lg" className="h-16 px-12 rounded-2xl text-xl font-black bg-background text-primary hover:bg-background/90 dark:text-blue-600 uppercase shadow-2xl">
                    <Link to="/register">Get Started Free</Link>
                 </Button>
              </div>
           </div>
        </section>
      </main>

      {/* --- FOOTER --- */}
      <footer className="border-t py-12 bg-muted/20">
         <div className="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="space-y-6 text-left">
               <div className="flex items-center gap-2">
                  <div className="bg-primary size-7 rounded-lg flex items-center justify-center">
                    <Zap className="size-4 text-primary-foreground fill-current" />
                  </div>
                  <span className="font-black text-xl tracking-tighter uppercase">PrepAI</span>
               </div>
               <p className="text-muted-foreground text-sm font-medium">The intelligent academic assistant for the modern student.</p>
               <div className="flex gap-4">
                  <Zap className="size-5 text-muted-foreground hover:text-primary cursor-pointer transition-colors" />
                  <MessageSquare className="size-5 text-muted-foreground hover:text-primary cursor-pointer transition-colors" />
                  <FileText className="size-5 text-muted-foreground hover:text-primary cursor-pointer transition-colors" />
               </div>
            </div>
            
            <div className="text-left">
               <h4 className="font-black uppercase tracking-widest text-xs mb-6">Product</h4>
               <ul className="space-y-4 text-sm font-bold text-muted-foreground">
                  <li className="hover:text-primary cursor-pointer" onClick={() => scrollToSection('features')}>Features</li>
                  <li className="hover:text-primary cursor-pointer" onClick={() => scrollToSection('pricing')}>Pricing</li>
                  <li className="hover:text-primary cursor-pointer" onClick={() => scrollToSection('how-it-works')}>How it Works</li>
               </ul>
            </div>

            <div className="text-left">
               <h4 className="font-black uppercase tracking-widest text-xs mb-6">Legal</h4>
               <ul className="space-y-4 text-sm font-bold text-muted-foreground">
                  <li className="hover:text-primary cursor-pointer">Terms of Service</li>
                  <li className="hover:text-primary cursor-pointer">Privacy Policy</li>
                  <li className="hover:text-primary cursor-pointer">Cookie Policy</li>
               </ul>
            </div>

            <div className="text-left">
               <h4 className="font-black uppercase tracking-widest text-xs mb-6">Support</h4>
               <p className="text-sm font-bold text-muted-foreground">support@prepai.co</p>
               <p className="text-xs text-muted-foreground/60 mt-2 font-medium">Available 24/7 for our students.</p>
            </div>
         </div>
         <div className="max-w-7xl mx-auto px-4 md:px-8 mt-12 pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">© 2026 PrepAI. Made with ❤️ for Students.</p>
            <div className="flex gap-6 text-[10px] font-black uppercase text-muted-foreground tracking-widest">
               <span>Status: Operational</span>
               <span>v0.1 MVP</span>
            </div>
         </div>
      </footer>
    </div>
  );
}

function FAQItem({ question, answer }: { question: string, answer: string }) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="border rounded-2xl bg-background overflow-hidden transition-all duration-300 shadow-sm hover:shadow-md">
      <button 
        className="w-full p-6 text-left flex items-center justify-between group"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="font-black text-lg tracking-tight group-hover:text-primary transition-colors text-foreground">{question}</span>
        <ChevronDown className={cn("size-5 text-muted-foreground transition-transform duration-300", isOpen && "rotate-180")} />
      </button>
      <div 
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="p-6 pt-0 text-muted-foreground font-medium border-t border-muted/10 mt-2 leading-relaxed text-sm">
          {answer}
        </div>
      </div>
    </div>
  );
}
