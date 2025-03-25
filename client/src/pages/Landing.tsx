import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { ArrowRight, PenTool, Timer, DollarSign, Palette, Users2, Lightbulb } from 'lucide-react';
import { motion } from 'framer-motion';

// Mockup Components
import { BrandConceptMockup } from '../components/mockups/BrandConceptMockup';
import { DashboardMockup } from '../components/mockups/DashboardMockup';
import { LogoGenerationMockup } from '../components/mockups/LogoGenerationMockup';

export default function LandingPage() {
  const { user, startDemoSession } = useAuth();
  const [, navigate] = useLocation();
  const [showingMockup, setShowingMockup] = useState<'dashboard' | 'concept' | 'logo'>('dashboard');

  const handleStartDemo = async () => {
    await startDemoSession();
    navigate('/');
  };

  const handleSignIn = () => {
    navigate('/auth');
  };

  // If already logged in, redirect to dashboard
  if (user) {
    navigate('/dashboard');
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-background to-gray-50 dark:from-background dark:to-background">
      {/* Header */}
      <header className="container mx-auto py-6 px-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-r from-violet-600 to-indigo-600 w-8 h-8 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold">M</span>
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
            MindToEye
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={handleSignIn}>
            Sign In
          </Button>
          <Button onClick={handleStartDemo}>
            Start Free Demo
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto py-20 px-4 flex flex-col lg:flex-row items-center gap-12">
        <div className="lg:w-1/2 space-y-6">
          <motion.h1 
            className="text-4xl md:text-5xl lg:text-6xl font-bold"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            End the{' '}
            <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              speculative work cycle
            </span>
          </motion.h1>
          <motion.p 
            className="text-lg text-muted-foreground"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            MindToEye helps branding agencies eliminate hours of unpaid design work. Stop wasting time on concepts 
            clients might reject - instantly visualize professional brand identities your clients will approve on the first try.
          </motion.p>
          <motion.div 
            className="flex flex-col sm:flex-row gap-4 pt-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Button size="lg" onClick={handleStartDemo}>
              Start Free Demo <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={handleSignIn}>
              Sign In
            </Button>
          </motion.div>
        </div>

        <motion.div 
          className="lg:w-1/2"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="relative">
            <div className="absolute -top-8 -left-8 w-full h-full bg-gradient-to-br from-violet-600/20 to-indigo-600/20 rounded-lg"></div>
            <div className="relative bg-card border border-border shadow-xl rounded-lg overflow-hidden">
              {/* Mockup Display Section */}
              <div className="aspect-[4/3] bg-card p-4 overflow-hidden">
                {showingMockup === 'dashboard' && <DashboardMockup />}
                {showingMockup === 'concept' && <BrandConceptMockup />}
                {showingMockup === 'logo' && <LogoGenerationMockup />}
              </div>

              {/* Mockup Navigation */}
              <div className="flex justify-between bg-muted p-3 border-t">
                <button
                  className={`px-4 py-2 rounded-md font-medium text-sm transition-all ${showingMockup === 'dashboard' ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-muted-foreground/10'}`}
                  onClick={() => setShowingMockup('dashboard')}
                >
                  Dashboard
                </button>
                <button
                  className={`px-4 py-2 rounded-md font-medium text-sm transition-all ${showingMockup === 'concept' ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-muted-foreground/10'}`}
                  onClick={() => setShowingMockup('concept')}
                >
                  Brand Concept
                </button>
                <button
                  className={`px-4 py-2 rounded-md font-medium text-sm transition-all ${showingMockup === 'logo' ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-muted-foreground/10'}`}
                  onClick={() => setShowingMockup('logo')}
                >
                  Logo Generation
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto py-20 px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Stop Losing Money on Speculative Work</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            MindToEye saves branding agencies up to 80% of the time spent on creating initial client concepts.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <FeatureCard 
            icon={<Timer className="h-8 w-8 text-violet-600" />}
            title="Faster Client Approvals"
            description="Present multiple cohesive brand concepts in your first client meeting instead of spending days on initial designs."
          />
          <FeatureCard 
            icon={<DollarSign className="h-8 w-8 text-violet-600" />}
            title="Higher Conversion Rates"
            description="Convert more prospects to paying clients by showing professional concepts in the first meeting."
          />
          <FeatureCard 
            icon={<PenTool className="h-8 w-8 text-violet-600" />}
            title="AI-Powered Logo Creation"
            description="Generate distinctive logos that would take hours to create manually - in just seconds."
          />
          <FeatureCard 
            icon={<Palette className="h-8 w-8 text-violet-600" />}
            title="Complete Brand Systems"
            description="Deliver more than just logos - provide full color palettes, typography, and brand applications from day one."
          />
          <FeatureCard 
            icon={<Users2 className="h-8 w-8 text-violet-600" />}
            title="Client Collaboration"
            description="Easily share concepts with clients and collect feedback in one place, eliminating endless revision emails."
          />
          <FeatureCard 
            icon={<Lightbulb className="h-8 w-8 text-violet-600" />}
            title="Creative Inspiration"
            description="Break through creative blocks with AI-generated concepts that spark new design directions."
          />
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-muted py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">From Client Brief to Presentation in Minutes</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              MindToEye transforms your agency's workflow and eliminates hours of speculative design work.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <StepCard 
              number={1}
              title="Enter Client Brief"
              description="Add the client name, industry, brand values and target audience from your intake form."
            />
            <StepCard 
              number={2}
              title="Generate Multiple Concepts"
              description="Our AI creates multiple cohesive brand identities complete with logos, colors, and typography in seconds."
            />
            <StepCard 
              number={3}
              title="Present to Clients"
              description="Export premium-quality presentations to wow clients in your first meeting, without days of design time."
            />
          </div>

          <div className="text-center mt-12">
            <Button size="lg" onClick={handleStartDemo}>
              Try It For Your Next Client <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto py-20 px-4">
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl p-8 md:p-12">
          <div className="max-w-3xl mx-auto text-center text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Stop losing revenue on speculative work</h2>
            <p className="text-lg mb-8 opacity-90">
              Your agency's time is valuable. Try MindToEye free and win more clients with less design time.
              Present professional brand concepts in your first client meeting.
            </p>
            <Button size="lg" variant="secondary" onClick={handleStartDemo}>
              Start Free Demo <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background border-t">
        <div className="container mx-auto py-8 px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <div className="bg-gradient-to-r from-violet-600 to-indigo-600 w-6 h-6 rounded flex items-center justify-center">
                <span className="text-white font-bold text-xs">M</span>
              </div>
              <span className="text-sm font-medium">MindToEye © {new Date().getFullYear()}</span>
            </div>
            <div className="flex gap-6">
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground">Privacy Policy</a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground">Terms of Service</a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Feature Card Component
function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-6 transition-all hover:shadow-md">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}

// Step Card Component
function StepCard({ number, title, description }: { number: number, title: string, description: string }) {
  return (
    <div className="text-center">
      <div className="bg-primary text-primary-foreground w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
        {number}
      </div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}