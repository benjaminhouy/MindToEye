import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { ArrowRight, LayoutDashboard, Sparkles, PenTool, Monitor, Globe, Image } from 'lucide-react';
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
    navigate('/');
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
            Transform your brand ideas into{' '}
            <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              visual reality
            </span>
          </motion.h1>
          <motion.p 
            className="text-lg text-muted-foreground"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            MindToEye is an AI-powered platform that helps branding agencies and designers
            quickly visualize brand concepts, generate stunning logos, and create cohesive brand identities.
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
            <div className="absolute -top-5 -left-5 w-full h-full bg-gradient-to-br from-violet-600/20 to-indigo-600/20 rounded-lg"></div>
            <div className="relative bg-card border border-border shadow-xl rounded-lg overflow-hidden">
              {/* Mockup Display Section */}
              <div className="aspect-[16/9] bg-card p-2 overflow-hidden">
                {showingMockup === 'dashboard' && <DashboardMockup />}
                {showingMockup === 'concept' && <BrandConceptMockup />}
                {showingMockup === 'logo' && <LogoGenerationMockup />}
              </div>

              {/* Mockup Navigation */}
              <div className="flex justify-between bg-muted p-2 border-t">
                <button
                  className={`px-3 py-2 rounded-md ${showingMockup === 'dashboard' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted-foreground/10'}`}
                  onClick={() => setShowingMockup('dashboard')}
                >
                  Dashboard
                </button>
                <button
                  className={`px-3 py-2 rounded-md ${showingMockup === 'concept' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted-foreground/10'}`}
                  onClick={() => setShowingMockup('concept')}
                >
                  Brand Concept
                </button>
                <button
                  className={`px-3 py-2 rounded-md ${showingMockup === 'logo' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted-foreground/10'}`}
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
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Powerful Features</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            MindToEye combines cutting-edge AI with intuitive design tools to streamline your branding workflow.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <FeatureCard 
            icon={<Sparkles className="h-8 w-8 text-violet-600" />}
            title="AI-Powered Generation"
            description="Create brand concepts in seconds using advanced AI models including Claude 3.7 Sonnet and FLUX 1.1 Pro."
          />
          <FeatureCard 
            icon={<PenTool className="h-8 w-8 text-violet-600" />}
            title="Logo Creation"
            description="Generate professional logos that capture your brand's essence with customizable styles and variations."
          />
          <FeatureCard 
            icon={<LayoutDashboard className="h-8 w-8 text-violet-600" />}
            title="Brand Management"
            description="Organize and manage multiple brand projects in one centralized dashboard."
          />
          <FeatureCard 
            icon={<Monitor className="h-8 w-8 text-violet-600" />}
            title="Visual Previews"
            description="See how your brand elements will look in real-world applications like websites and marketing materials."
          />
          <FeatureCard 
            icon={<Globe className="h-8 w-8 text-violet-600" />}
            title="Landing Page Generation"
            description="Automatically create hero sections for your brand's landing page with matching typography and colors."
          />
          <FeatureCard 
            icon={<Image className="h-8 w-8 text-violet-600" />}
            title="Asset Management"
            description="Export and manage all your brand assets in one place, with different formats for various use cases."
          />
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-muted py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              MindToEye simplifies the brand creation process in just a few steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <StepCard 
              number={1}
              title="Input Brand Details"
              description="Enter your brand name, industry, values, and design preferences."
            />
            <StepCard 
              number={2}
              title="AI Visualization"
              description="Our AI generates multiple brand concepts with logos, colors, typography, and applications."
            />
            <StepCard 
              number={3}
              title="Refine & Export"
              description="Iterate on your favorite concepts, make adjustments, and export the final assets."
            />
          </div>

          <div className="text-center mt-12">
            <Button size="lg" onClick={handleStartDemo}>
              Try It Yourself <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto py-20 px-4">
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl p-8 md:p-12">
          <div className="max-w-3xl mx-auto text-center text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to transform your brand ideas?</h2>
            <p className="text-lg mb-8 opacity-90">
              Start your free demo today and see how MindToEye can revolutionize your branding process.
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