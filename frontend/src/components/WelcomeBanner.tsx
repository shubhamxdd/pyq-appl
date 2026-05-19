import { useState, useEffect } from 'react';
import { X, FileText, Zap, FileEdit, Rocket, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

export function WelcomeBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const isDismissed = localStorage.getItem('hideWelcomeBanner');
    if (!isDismissed) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('hideWelcomeBanner', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  const steps = [
    {
      icon: <FileText className="size-5 text-blue-500" />,
      title: "1. Upload",
      description: "Add your syllabus, notes, or past papers in the Resources section."
    },
    {
      icon: <Zap className="size-5 text-yellow-500" />,
      title: "2. Ask",
      description: "Use the AI Solver to get instant answers grounded in your materials."
    },
    {
      icon: <FileEdit className="size-5 text-purple-500" />,
      title: "3. Generate",
      description: "Create realistic mock exams with answers and explanations."
    }
  ];

  return (
    <Card className="relative overflow-hidden border-primary/20 bg-primary/5 shadow-md animate-in slide-in-from-top duration-500 mb-8">
      <div className="absolute top-0 right-0 p-2">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleDismiss}
          className="size-8 text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </Button>
      </div>
      
      <CardContent className="p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="size-16 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0">
            <Rocket className="size-8 text-primary" />
          </div>
          
          <div className="space-y-4 flex-1">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                Welcome to PYQ Gen! 
                <span className="text-xs font-black bg-primary text-primary-foreground px-2 py-0.5 rounded-full uppercase tracking-tighter">Quick Start</span>
              </h2>
              <p className="text-muted-foreground">
                Get started with your academic journey in three simple steps:
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              {steps.map((step, i) => (
                <div key={i} className="flex gap-4 group">
                  <div className="size-10 rounded-xl bg-background border border-border/50 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                    {step.icon}
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-foreground">{step.title}</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
