import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { 
  ArrowRight, PenTool, Timer, DollarSign, Palette, Users2, Lightbulb,
  Building2, UserCircle2, Briefcase, Building, Pen, Megaphone, Clock
} from 'lucide-react';
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
            <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              Win more pitches
            </span>{' '}
            with fewer revisions
          </motion.h1>
          <motion.p 
            className="text-lg text-muted-foreground"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            MindToEye helps branding agencies get faster client approvals and reduce iteration cycles by 80%. 
            Generate complete brand identities in seconds—no account required, just enter a brand name and go.
          </motion.p>
          <motion.div 
            className="flex flex-col sm:flex-row gap-4 pt-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Button size="lg" onClick={handleStartDemo}>
              Generate Your First Concept—No Signup <ArrowRight className="ml-2 h-4 w-4" />
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
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Tangible Benefits for Your Agency</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            MindToEye directly impacts your agency's bottom line by accelerating approvals and reducing revision cycles.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <FeatureCard 
            icon={<Timer className="h-8 w-8 text-violet-600" />}
            title="Get Client Sign-Off Faster"
            description="Shorten feedback loops by 75% with professional-quality concepts in the first client meeting."
          />
          <FeatureCard 
            icon={<DollarSign className="h-8 w-8 text-violet-600" />}
            title="Close More Deals"
            description="Convert 3x more prospects to paying clients by showing polished concepts during the pitch phase."
          />
          <FeatureCard 
            icon={<PenTool className="h-8 w-8 text-violet-600" />}
            title="Create in Minutes, Not Days"
            description="Develop compelling logos and brand identities in minutes that would take a designer days to craft."
          />
          <FeatureCard 
            icon={<Palette className="h-8 w-8 text-violet-600" />}
            title="Present Complete Brand Systems"
            description="Impress clients with cohesive color palettes, typography, and brand applications from the first meeting."
          />
          <FeatureCard 
            icon={<Users2 className="h-8 w-8 text-violet-600" />}
            title="Streamline Client Collaboration"
            description="Consolidate feedback, make real-time adjustments, and eliminate confusing back-and-forth communications."
          />
          <FeatureCard 
            icon={<Lightbulb className="h-8 w-8 text-violet-600" />}
            title="Beat Creative Blocks"
            description="Never start from a blank canvas again—generate multiple professional-grade directions in seconds."
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

      {/* Use Cases Section */}
      <section className="container mx-auto py-20 px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Real Scenarios, Real Results</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            See how agencies and freelancers are transforming their workflows with MindToEye.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-card border border-border rounded-lg p-8 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-violet-100 text-violet-600 p-3 rounded-full">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Branding Agency</h3>
                <p className="text-muted-foreground text-sm">5-person team</p>
              </div>
            </div>
            <h4 className="font-semibold text-lg mb-3">
              "Increased our pitch win rate from 30% to 60%"
            </h4>
            <p className="text-muted-foreground mb-4">
              "We used to spend 20+ hours creating initial concept boards for each pitch. Now we can generate 3-5 
              distinct directions in under an hour, letting us present more options and win more clients."
            </p>
            <p className="text-sm font-medium">
              <Clock className="inline-block h-4 w-4 mr-1 text-violet-600" /> 
              Time saved: 15-20 hours per pitch
            </p>
          </div>

          <div className="bg-card border border-border rounded-lg p-8 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-violet-100 text-violet-600 p-3 rounded-full">
                <UserCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Freelance Designer</h3>
                <p className="text-muted-foreground text-sm">Solo practitioner</p>
              </div>
            </div>
            <h4 className="font-semibold text-lg mb-3">
              "Cut my revision cycles in half"
            </h4>
            <p className="text-muted-foreground mb-4">
              "My clients used to request 4-5 rounds of revisions, which ate into my profitability. With MindToEye, 
              I start with better concepts and typically only need 1-2 rounds of refinement. I can take on more clients."
            </p>
            <p className="text-sm font-medium">
              <Clock className="inline-block h-4 w-4 mr-1 text-violet-600" /> 
              Time saved: 8-10 hours per client
            </p>
          </div>

          <div className="bg-card border border-border rounded-lg p-8 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-violet-100 text-violet-600 p-3 rounded-full">
                <Briefcase className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Creative Studio</h3>
                <p className="text-muted-foreground text-sm">12-person team</p>
              </div>
            </div>
            <h4 className="font-semibold text-lg mb-3">
              "Doubled our branding project capacity"
            </h4>
            <p className="text-muted-foreground mb-4">
              "Our senior designers used to be bogged down with initial concept work. MindToEye handles the first 
              80% of the process, letting our team focus on high-value refinement and strategic applications."
            </p>
            <p className="text-sm font-medium">
              <Clock className="inline-block h-4 w-4 mr-1 text-violet-600" /> 
              Time saved: 30+ hours per month
            </p>
          </div>
        </div>
      </section>

      {/* Who It's For Section */}
      <section className="bg-card border-y py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Who Benefits Most from MindToEye</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our platform is specifically designed for creative professionals who want to reduce 
              speculative work and improve client outcomes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
            <div className="text-center p-6">
              <div className="bg-violet-100 text-violet-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building className="h-8 w-8" />
              </div>
              <h3 className="font-bold text-lg mb-2">Branding Agencies</h3>
              <p className="text-muted-foreground text-sm">
                Save hours on initial concepts and win more clients with polished first presentations.
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="bg-violet-100 text-violet-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Pen className="h-8 w-8" />
              </div>
              <h3 className="font-bold text-lg mb-2">Freelance Designers</h3>
              <p className="text-muted-foreground text-sm">
                Take on more clients and reduce unprofitable revision cycles with better initial concepts.
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="bg-violet-100 text-violet-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Megaphone className="h-8 w-8" />
              </div>
              <h3 className="font-bold text-lg mb-2">Marketing Teams</h3>
              <p className="text-muted-foreground text-sm">
                Generate brand assets for campaigns and product launches without hiring additional designers.
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="bg-violet-100 text-violet-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Briefcase className="h-8 w-8" />
              </div>
              <h3 className="font-bold text-lg mb-2">Agency Project Managers</h3>
              <p className="text-muted-foreground text-sm">
                Strengthen client proposals with preliminary concepts before kicking off the full design process.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto py-20 px-4">
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl p-8 md:p-12">
          <div className="max-w-3xl mx-auto text-center text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Create your first brand concept in 60 seconds</h2>
            <p className="text-lg mb-8 opacity-90">
              No signup required. Just enter a brand name and go—your complete brand identity is waiting.
              Try it now before your next client meeting.
            </p>
            <Button size="lg" variant="secondary" onClick={handleStartDemo}>
              Generate Instantly—No Signup <ArrowRight className="ml-2 h-4 w-4" />
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