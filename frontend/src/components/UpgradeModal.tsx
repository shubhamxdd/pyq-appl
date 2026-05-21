import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { CheckCircle2, Zap, FileText, FileEdit, Crown } from "lucide-react";
import { trackEvent } from "../lib/analytics";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
}

export function UpgradeModal({ isOpen, onClose, message }: UpgradeModalProps) {
  const benefits = [
    {
      icon: <Zap className="size-4 text-yellow-500" />,
      text: "Unlimited AI Tutor Questions"
    },
    {
      icon: <FileEdit className="size-4 text-purple-500" />,
      text: "Unlimited Mock Exam Generations"
    },
    {
      icon: <FileText className="size-4 text-blue-500" />,
      text: "Unlimited Study Resource Storage"
    },
    {
      icon: <Crown className="size-4 text-primary" />,
      text: "Priority AI Model Access"
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px] overflow-hidden border-primary/20">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-primary" />
        
        <DialogHeader className="pt-4">
          <div className="size-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Crown className="size-6 text-primary" />
          </div>
          <DialogTitle className="text-2xl font-black tracking-tight">Upgrade to Premium</DialogTitle>
          <DialogDescription className="text-base pt-2">
            {message || "You've reached your free tier limit. Upgrade now to unlock the full power of PYQ Gen."}
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-4">
          <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Premium Benefits:</h4>
          <div className="grid grid-cols-1 gap-3">
            {benefits.map((benefit, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                <div className="shrink-0">{benefit.icon}</div>
                <span className="text-sm font-medium text-foreground">{benefit.text}</span>
                <CheckCircle2 className="size-4 text-primary ml-auto" />
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-3">
          <Button 
            className="w-full h-12 text-base font-bold shadow-lg shadow-primary/20"
            onClick={() => {
              trackEvent('upgrade_button_clicked', { 
                source: message ? 'limit_reached' : 'manual',
                message: message || 'default'
              });
              // Future: Redirect to checkout or open Razorpay
              console.log("Redirecting to payment...");
              onClose();
            }}
          >
            Upgrade Now — $9/mo
          </Button>
          <Button variant="ghost" onClick={() => {
            trackEvent('upgrade_modal_dismissed', { source: message ? 'limit_reached' : 'manual' });
            onClose();
          }} className="w-full font-semibold">
            Maybe Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}