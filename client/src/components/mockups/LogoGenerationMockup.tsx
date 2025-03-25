import { ScrollArea } from "@/components/ui/scroll-area";
import { Wand2, RefreshCw, Download, ArrowRight } from "lucide-react";
import { useState } from "react";

// Logo Generation Mockup showing the logo creation process
export function LogoGenerationMockup() {
  const [activeStep, setActiveStep] = useState<number>(2);
  
  return (
    <div className="bg-card text-card-foreground w-full h-full flex flex-col rounded-md border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="border-b p-4">
        <h2 className="font-bold text-lg">Logo Generation</h2>
        <p className="text-sm text-muted-foreground">Quantum Coffee - New Logo</p>
      </div>
      
      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Settings */}
        <div className="w-1/3 border-r overflow-hidden flex flex-col">
          <div className="p-4 border-b">
            <h3 className="text-sm font-medium mb-3">Style Settings</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium block mb-1.5">Logo Style</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Minimalist', 'Modern', 'Vintage'].map((style, i) => (
                    <button 
                      key={i}
                      className={`text-xs py-1.5 px-1 rounded-md border ${i === 1 ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-muted'}`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="text-xs font-medium block mb-1.5">Color Theme</label>
                <div className="flex gap-2">
                  {mockColorThemes.map((theme, i) => (
                    <button 
                      key={i}
                      className={`w-6 h-6 rounded-full ${i === 0 ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                      style={{ background: theme.gradient }}
                    />
                  ))}
                </div>
              </div>
              
              <div>
                <label className="text-xs font-medium block mb-1.5">Symbol Preferences</label>
                <div className="flex flex-wrap gap-2">
                  {['Coffee Cup', 'Bean', 'Molecule', 'Circular'].map((symbol, i) => (
                    <span 
                      key={i}
                      className={`text-xs py-1 px-2 rounded-full ${i === 0 || i === 3 ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}
                    >
                      {symbol}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <ScrollArea className="flex-1 p-4">
            <h3 className="text-sm font-medium mb-3">Brand Keywords</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">Premium</span>
                <span className="text-xs text-muted-foreground">90%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5">
                <div className="bg-primary h-1.5 rounded-full" style={{ width: '90%' }}></div>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm">Scientific</span>
                <span className="text-xs text-muted-foreground">75%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5">
                <div className="bg-primary h-1.5 rounded-full" style={{ width: '75%' }}></div>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm">Artisanal</span>
                <span className="text-xs text-muted-foreground">65%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5">
                <div className="bg-primary h-1.5 rounded-full" style={{ width: '65%' }}></div>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm">Innovative</span>
                <span className="text-xs text-muted-foreground">85%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5">
                <div className="bg-primary h-1.5 rounded-full" style={{ width: '85%' }}></div>
              </div>
            </div>
          </ScrollArea>
          
          <div className="border-t p-4">
            <button className="w-full bg-primary text-primary-foreground flex items-center justify-center gap-2 py-2 rounded-md font-medium">
              <Wand2 className="h-4 w-4" />
              Generate Logos
            </button>
          </div>
        </div>
        
        {/* Right Panel - Results */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Steps */}
          <div className="flex border-b">
            {['Input', 'Processing', 'Results'].map((step, i) => (
              <button 
                key={i}
                className={`flex-1 py-2 text-center text-sm ${activeStep === i ? 'border-b-2 border-primary font-medium' : 'text-muted-foreground'}`}
                onClick={() => setActiveStep(i)}
              >
                {step}
              </button>
            ))}
          </div>
          
          {/* Results Content */}
          <ScrollArea className="flex-1 p-4">
            <div className="grid grid-cols-2 gap-4">
              {mockLogos.map((logo, i) => (
                <LogoCard key={i} logo={logo} isSelected={i === 0} />
              ))}
            </div>
          </ScrollArea>
          
          <div className="border-t p-4 flex justify-between items-center">
            <button className="flex items-center gap-1 text-sm">
              <RefreshCw className="h-4 w-4" />
              Regenerate
            </button>
            
            <button className="bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1">
              Continue
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Logo Card Component
function LogoCard({ logo, isSelected }: { logo: any, isSelected: boolean }) {
  return (
    <div className={`rounded-lg border overflow-hidden ${isSelected ? 'ring-2 ring-primary' : ''}`}>
      <div 
        className="aspect-square p-6 flex items-center justify-center"
        style={{ backgroundColor: logo.background }}
      >
        <div className="w-full h-full bg-contain bg-no-repeat bg-center" style={{
          backgroundImage: `url("${logo.svgUrl}")`
        }}></div>
      </div>
      
      <div className="p-3 flex justify-between items-center">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: logo.color }}></div>
          <div className="text-xs">Variation {logo.variant}</div>
        </div>
        <button className="p-1 rounded-md hover:bg-muted">
          <Download className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// Mock data
const mockColorThemes = [
  { name: "Brown & Gold", gradient: "linear-gradient(to right, #6D4534, #D4B483)" },
  { name: "Blue & Teal", gradient: "linear-gradient(to right, #2D3047, #419D78)" },
  { name: "Purple & Pink", gradient: "linear-gradient(to right, #5E548E, #BE95C4)" },
  { name: "Gray & Orange", gradient: "linear-gradient(to right, #2A2B2A, #E76F51)" },
];

const mockLogos = [
  {
    variant: 1,
    color: "#6D4534",
    background: "#F5EFE6",
    svgUrl: "data:image/svg+xml,%3Csvg width='150' height='150' viewBox='0 0 150 150' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='75' cy='75' r='70' stroke='%236D4534' stroke-width='5'/%3E%3Cpath d='M40 60C40 46.7 50.7 36 64 36H86C99.3 36 110 46.7 110 60V60C110 73.3 99.3 84 86 84H64C50.7 84 40 73.3 40 60V60Z' fill='%236D4534'/%3E%3Cpath d='M50 96C50 92.7 52.7 90 56 90H94C97.3 90 100 92.7 100 96V108C100 111.3 97.3 114 94 114H56C52.7 114 50 111.3 50 108V96Z' fill='%236D4534'/%3E%3Cpath d='M70 84V114' stroke='%236D4534' stroke-width='5'/%3E%3Cpath d='M80 84V114' stroke='%236D4534' stroke-width='5'/%3E%3C/svg%3E"
  },
  {
    variant: 2,
    color: "#6D4534",
    background: "#F5EFE6",
    svgUrl: "data:image/svg+xml,%3Csvg width='150' height='150' viewBox='0 0 150 150' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M75 25L97 47.5M75 25L52 47.5M75 25V65M75 65L110 100M75 65L40 100' stroke='%236D4534' stroke-width='5'/%3E%3Ccircle cx='75' cy='110' r='15' fill='%236D4534'/%3E%3Ccircle cx='75' cy='65' r='10' stroke='%236D4534' stroke-width='5'/%3E%3Cpath d='M30 60C30 40.67 38 25 75 25C112 25 120 40.67 120 60' stroke='%236D4534' stroke-width='5'/%3E%3C/svg%3E"
  },
  {
    variant: 3,
    color: "#D4B483",
    background: "#6D4534",
    svgUrl: "data:image/svg+xml,%3Csvg width='150' height='150' viewBox='0 0 150 150' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M75 140C110.899 140 140 110.899 140 75C140 39.1015 110.899 10 75 10C39.1015 10 10 39.1015 10 75C10 110.899 39.1015 140 75 140Z' stroke='%23D4B483' stroke-width='5'/%3E%3Cpath d='M75 125C102.614 125 125 102.614 125 75C125 47.3858 102.614 25 75 25' stroke='%23D4B483' stroke-width='5'/%3E%3Cpath d='M75 105C91.5685 105 105 91.5685 105 75C105 58.4315 91.5685 45 75 45' stroke='%23D4B483' stroke-width='5'/%3E%3Cpath d='M40 75C40 55 55 40 75 40' stroke='%23D4B483' stroke-width='5'/%3E%3Cpath d='M60 75C60 66.7157 66.7157 60 75 60' stroke='%23D4B483' stroke-width='5'/%3E%3Cpath d='M90 45L105 60' stroke='%23D4B483' stroke-width='5'/%3E%3Cpath d='M105 45L120 60' stroke='%23D4B483' stroke-width='5'/%3E%3C/svg%3E"
  },
  {
    variant: 4,
    color: "#D4B483",
    background: "#6D4534",
    svgUrl: "data:image/svg+xml,%3Csvg width='150' height='150' viewBox='0 0 150 150' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='40' y='40' width='70' height='70' rx='6' fill='%23D4B483'/%3E%3Cpath d='M52 65L68 85L98 45' stroke='%236D4534' stroke-width='8' stroke-linecap='round' stroke-linejoin='round'/%3E%3Ccircle cx='75' cy='75' r='60' stroke='%23D4B483' stroke-width='5'/%3E%3C/svg%3E"
  }
];