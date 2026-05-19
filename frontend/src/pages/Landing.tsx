import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';

export default function Landing() {
  const token = useAuthStore((state) => state.token);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground space-y-6">
      <h1 className="text-4xl font-bold tracking-tighter sm:text-6xl">
        Landing Page
      </h1>
      <p className="text-muted-foreground text-xl">
        Welcome to PrepAI. The future of exam preparation.
      </p>
      
      <div className="flex gap-4">
        {token ? (
          <Button asChild size="lg">
            <Link to="/dashboard">Go to Dashboard</Link>
          </Button>
        ) : (
          <>
            <Button asChild size="lg">
              <Link to="/login">Login</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/register">Sign Up</Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
