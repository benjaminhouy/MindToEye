import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Palette, Type, Layout, RefreshCw, Download, Check } from "lucide-react";

// Brand Concept Mockup showing colors, typography, and application
export function BrandConceptMockup() {
  return (
    <div className="bg-card text-card-foreground w-full h-full flex flex-col rounded-md border shadow-sm overflow-hidden">
      {/* Concept Header */}
      <div className="border-b p-4 flex justify-between items-center">
        <div>
          <h2 className="font-bold text-lg">Quantum Coffee</h2>
          <p className="text-sm text-muted-foreground">Brand Concept #3</p>
        </div>
        <div className="flex gap-2">
          <button className="p-1.5 rounded-md hover:bg-muted">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button className="p-1.5 rounded-md hover:bg-muted">
            <Download className="h-4 w-4" />
          </button>
          <button className="bg-primary/10 text-primary p-1.5 rounded-md flex items-center gap-1 text-sm font-medium">
            <Check className="h-4 w-4" />
            <span>Active</span>
          </button>
        </div>
      </div>
      
      {/* Concept Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="colors" className="h-full flex flex-col">
          <div className="px-4 pt-2 border-b">
            <TabsList>
              <TabsTrigger value="colors" className="flex items-center gap-1">
                <Palette className="h-4 w-4" />
                <span>Colors</span>
              </TabsTrigger>
              <TabsTrigger value="typography" className="flex items-center gap-1">
                <Type className="h-4 w-4" />
                <span>Typography</span>
              </TabsTrigger>
              <TabsTrigger value="applications" className="flex items-center gap-1">
                <Layout className="h-4 w-4" />
                <span>Applications</span>
              </TabsTrigger>
            </TabsList>
          </div>
          
          <ScrollArea className="flex-1">
            <TabsContent value="colors" className="p-4 mt-0">
              <h3 className="text-sm font-medium mb-3">Color Palette</h3>
              <div className="grid grid-cols-2 gap-3">
                {mockColors.map((color, index) => (
                  <ColorCard key={index} color={color} />
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="typography" className="p-4 mt-0">
              <h3 className="text-sm font-medium mb-3">Typography</h3>
              <div className="space-y-6">
                <div>
                  <div className="text-xs text-muted-foreground mb-2">HEADINGS: Montserrat</div>
                  <div className="space-y-2">
                    <div className="text-3xl font-bold" style={{fontFamily: 'Montserrat, sans-serif'}}>Quantum Coffee</div>
                    <div className="text-xl font-bold" style={{fontFamily: 'Montserrat, sans-serif'}}>Premium Roasts, Exceptional Experience</div>
                  </div>
                </div>
                
                <div>
                  <div className="text-xs text-muted-foreground mb-2">BODY: Open Sans</div>
                  <div className="text-base" style={{fontFamily: 'Open Sans, sans-serif'}}>
                    Quantum Coffee delivers a unique coffee experience by sourcing the finest beans from sustainable farms around the world. Our expert roasting process brings out the distinct flavors and aromas that make each cup exceptional.
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="applications" className="p-4 mt-0">
              <h3 className="text-sm font-medium mb-3">Logo</h3>
              <div className="rounded-lg border overflow-hidden mb-6">
                <div className="bg-muted p-6 flex justify-center">
                  <div className="w-48 h-48 bg-contain bg-center bg-no-repeat" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='150' height='150' viewBox='0 0 150 150' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='75' cy='75' r='70' stroke='%236D4534' stroke-width='5'/%3E%3Cpath d='M40 60C40 46.7 50.7 36 64 36H86C99.3 36 110 46.7 110 60V60C110 73.3 99.3 84 86 84H64C50.7 84 40 73.3 40 60V60Z' fill='%236D4534'/%3E%3Cpath d='M50 96C50 92.7 52.7 90 56 90H94C97.3 90 100 92.7 100 96V108C100 111.3 97.3 114 94 114H56C52.7 114 50 111.3 50 108V96Z' fill='%236D4534'/%3E%3Cpath d='M70 84V114' stroke='%236D4534' stroke-width='5'/%3E%3Cpath d='M80 84V114' stroke='%236D4534' stroke-width='5'/%3E%3C/svg%3E")`
                  }}></div>
                </div>
                <div className="p-3 flex justify-between items-center">
                  <div className="text-sm">Primary Logo</div>
                  <button className="text-xs px-2 py-1 bg-muted rounded-md">
                    Download
                  </button>
                </div>
              </div>
              
              <h3 className="text-sm font-medium mb-3">Landing Page Hero</h3>
              <div className="rounded-lg border overflow-hidden">
                <div 
                  className="w-full h-48 bg-cover bg-center flex flex-col justify-center p-6"
                  style={{ 
                    backgroundImage: 'linear-gradient(to right, rgba(109, 69, 52, 0.9), rgba(109, 69, 52, 0.7)), url(https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80)'
                  }}
                >
                  <h2 className="text-white text-3xl font-bold mb-2" style={{fontFamily: 'Montserrat, sans-serif'}}>
                    Experience Coffee at Its Finest
                  </h2>
                  <p className="text-white/80 text-lg" style={{fontFamily: 'Open Sans, sans-serif'}}>
                    From farm to cup, discover the Quantum difference
                  </p>
                  <button className="mt-4 bg-white text-[#6D4534] px-4 py-2 rounded-md text-sm font-medium w-max">
                    Explore Our Blends
                  </button>
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </div>
    </div>
  );
}

// Color Card Component
function ColorCard({ color }: { color: any }) {
  return (
    <div className="rounded-md border overflow-hidden">
      <div 
        className="h-16 w-full" 
        style={{ backgroundColor: color.hex }}
      ></div>
      <div className="p-2">
        <div className="text-sm font-medium">{color.name}</div>
        <div className="text-xs text-muted-foreground">{color.hex}</div>
      </div>
    </div>
  );
}

// Mock data
const mockColors = [
  {
    name: "Coffee Brown",
    hex: "#6D4534",
    type: "primary"
  },
  {
    name: "Cream",
    hex: "#F5EFE6",
    type: "secondary"
  },
  {
    name: "Gold Accent",
    hex: "#D4B483",
    type: "accent"
  },
  {
    name: "Dark Roast",
    hex: "#2A1A12",
    type: "base"
  }
];