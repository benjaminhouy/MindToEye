import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { EditIcon, RefreshCw } from "lucide-react";

interface BrandApplicationsProps {
  brandOutput: any;
  onElementEdit?: (type: string, updatedData: any) => Promise<void>;
}

const BrandApplications = ({ brandOutput, onElementEdit }: BrandApplicationsProps) => {
  const { toast } = useToast();
  const [regenerating, setRegenerating] = useState(false);
  const [activeTab, setActiveTab] = useState("stationery"); // Default active tab

  // Get colors from brandOutput or use defaults
  const colorScheme = brandOutput?.colors || [
    { name: "Primary", hex: "#10B981", type: "primary" },
    { name: "Secondary", hex: "#0F766E", type: "secondary" },
    { name: "Accent", hex: "#38BDF8", type: "accent" },
    { name: "Base", hex: "#1F2937", type: "base" }
  ];

  // Get typography from brandOutput or use defaults
  const typography = brandOutput?.typography || {
    headings: "Montserrat",
    body: "Open Sans"
  };

  // Get the logo from brandOutput or use a placeholder
  const logoSvg = brandOutput?.logo?.primary || `
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="90" stroke="#10B981" strokeWidth="8" fill="white"/>
      <path d="M100 30C61.34 30 30 61.34 30 100C30 138.66 61.34 170 100 170C138.66 170 170 138.66 170 100C170 61.34 138.66 30 100 30ZM135 110H110V135C110 140.52 105.52 145 100 145C94.48 145 90 140.52 90 135V110H65C59.48 110 55 105.52 55 100C55 94.48 59.48 90 65 90H90V65C90 59.48 94.48 55 100 55C105.52 55 110 59.48 110 65V90H135C140.52 90 145 94.48 145 100C145 105.52 140.52 110 135 110Z" fill="#10B981"/>
    </svg>
  `;

  // Extract primary, secondary and accent colors
  const primaryColor = colorScheme.find((c: {type: string}) => c.type === "primary")?.hex || "#10B981";
  const secondaryColor = colorScheme.find((c: {type: string}) => c.type === "secondary")?.hex || "#0F766E";
  const accentColor = colorScheme.find((c: {type: string}) => c.type === "accent")?.hex || "#38BDF8";
  const baseColor = colorScheme.find((c: {type: string}) => c.type === "base")?.hex || "#1F2937";

  // Helper to handle regenerating applications
  const handleRegenerateApplications = async (description: string) => {
    if (!onElementEdit) return;
    
    try {
      setRegenerating(true);
      toast({
        title: "Regenerating brand applications",
        description: "Creating mockups based on your description...",
      });
      
      await onElementEdit('applications', { description });
      
      toast({
        title: "Applications updated",
        description: "New brand applications are ready for client review!",
      });
    } catch (error) {
      toast({
        title: "Regeneration failed",
        description: "Failed to regenerate applications. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRegenerating(false);
    }
  };

  // Render stationery mockup
  const renderStationery = () => (
    <div className="relative">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-center mb-8">
          <div className="w-full max-w-4xl">
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* Business Card Mockup */}
              <div className="bg-white w-full max-w-xs rounded-md shadow-lg overflow-hidden border border-gray-200 transition-all hover:shadow-xl">
                <div className="h-56 bg-gradient-to-br" style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)` }}>
                  <div className="flex flex-col items-center justify-center h-full p-6 text-white">
                    <div className="w-16 h-16 mb-2" dangerouslySetInnerHTML={{ __html: logoSvg }} />
                    <h3 className="text-xl font-medium mb-1" style={{ fontFamily: typography.headings }}>
                      {brandOutput?.brandName || brandOutput?.brandInputs?.brandName || "Brand"}
                    </h3>
                    <p className="text-xs text-center opacity-80" style={{ fontFamily: typography.body }}>
                      PREMIUM QUALITY PRODUCTS
                    </p>
                  </div>
                </div>
                <div className="p-4">
                  <h4 className="text-sm font-medium mb-1" style={{ fontFamily: typography.headings }}>
                    Alex Johnson
                  </h4>
                  <p className="text-xs text-gray-500 mb-3" style={{ fontFamily: typography.body }}>
                    Creative Director
                  </p>
                  <div className="flex flex-col text-xs space-y-1 text-gray-700" style={{ fontFamily: typography.body }}>
                    <div>info@{(brandOutput?.brandName || "brand").toLowerCase()}.com</div>
                    <div>+1 (555) 123-4567</div>
                    <div>{brandOutput?.brandName || "Brand"} Inc.</div>
                  </div>
                </div>
              </div>

              {/* Letterhead Mockup */}
              <div className="w-full">
                <div className="bg-white rounded-md shadow-md overflow-hidden border border-gray-200 transition-all hover:shadow-lg">
                  <div className="h-24 flex items-center px-6" style={{ borderBottom: `4px solid ${primaryColor}` }}>
                    <div className="flex justify-between items-center w-full">
                      <div className="flex items-center">
                        <div className="w-12 h-12 mr-4" dangerouslySetInnerHTML={{ __html: logoSvg }} />
                        <h3 className="text-xl font-medium" style={{ fontFamily: typography.headings, color: baseColor }}>
                          {brandOutput?.brandName || brandOutput?.brandInputs?.brandName || "Brand"}
                        </h3>
                      </div>
                      <div className="text-xs text-right text-gray-500" style={{ fontFamily: typography.body }}>
                        <div>{brandOutput?.brandName || "Brand"} Inc.</div>
                        <div>123 Business Avenue</div>
                        <div>New York, NY 10001</div>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 min-h-[200px]">
                    <div className="mb-8">
                      <p className="text-sm text-gray-600 mb-1" style={{ fontFamily: typography.body }}>May 15, 2025</p>
                      <p className="text-sm text-gray-600 mb-4" style={{ fontFamily: typography.body }}>
                        Dear Valued Client,
                      </p>
                      <p className="text-sm text-gray-600 mb-2" style={{ fontFamily: typography.body }}>
                        Thank you for your interest in our premium products. We're excited to share our catalog with you.
                      </p>
                      <p className="text-sm text-gray-600" style={{ fontFamily: typography.body }}>
                        Our team is dedicated to providing exceptional quality and service to all our clients.
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-4" style={{ fontFamily: typography.body }}>
                        Sincerely,
                      </p>
                      <p className="text-sm font-medium" style={{ fontFamily: typography.headings, color: primaryColor }}>
                        Alex Johnson
                      </p>
                      <p className="text-xs text-gray-500" style={{ fontFamily: typography.body }}>
                        Creative Director
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render social media mockup
  const renderSocialMedia = () => (
    <div className="relative">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-center mb-8">
          <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Instagram Post Mockup */}
            <div className="bg-white rounded-md shadow-md overflow-hidden border border-gray-200 transition-all hover:shadow-xl">
              <div className="h-10 bg-gray-50 border-b border-gray-200 flex items-center px-3">
                <div className="w-6 h-6 rounded-full bg-gray-300 mr-2 flex items-center justify-center overflow-hidden">
                  <div className="scale-[0.6]" dangerouslySetInnerHTML={{ __html: logoSvg }} />
                </div>
                <span className="text-xs font-medium" style={{ fontFamily: typography.body }}>
                  {(brandOutput?.brandName || "brand").toLowerCase()}
                </span>
                <div className="ml-auto">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 13C12.5523 13 13 12.5523 13 12C13 11.4477 12.5523 11 12 11C11.4477 11 11 11.4477 11 12C11 12.5523 11.4477 13 12 13Z" fill="currentColor" />
                    <path d="M19 13C19.5523 13 20 12.5523 20 12C20 11.4477 19.5523 11 19 11C18.4477 11 18 11.4477 18 12C18 12.5523 18.4477 13 19 13Z" fill="currentColor" />
                    <path d="M5 13C5.55228 13 6 12.5523 6 12C6 11.4477 5.55228 11 5 11C4.44772 11 4 11.4477 4 12C4 12.5523 4.44772 13 5 13Z" fill="currentColor" />
                  </svg>
                </div>
              </div>
              <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                <div style={{ 
                  background: `radial-gradient(circle, ${primaryColor}22 0%, ${secondaryColor}22 100%)`,
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <div className="w-32 h-32" dangerouslySetInnerHTML={{ __html: logoSvg }} />
                </div>
              </div>
              <div className="p-3">
                <div className="flex text-gray-500 mb-2 text-sm space-x-4">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 21.35L10.55 20.03C5.4 15.36 2 12.27 2 8.5C2 5.41 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.08C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.41 22 8.5C22 12.27 18.6 15.36 13.45 20.03L12 21.35Z" fill="currentColor" />
                  </svg>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21.99 4C21.99 4 22 4.01 22 4C22 4 21.99 3.98 21.99 3.98C21.99 3.99 21.99 3.99 21.99 4ZM7.38 4H16.63L17.6 5.01L20.74 8.25C21.15 8.67 21.4 9.23 21.47 9.82C21.5 10.04 21.5 10.27 21.5 10.5V19C21.5 20.1 20.6 21 19.5 21H4.5C3.4 21 2.5 20.1 2.5 19V5C2.5 3.9 3.4 3 4.5 3H6.74C7.07 3 7.39 3.13 7.63 3.37L8.36 4.13L7.38 4ZM12.01 17C10.34 17 9.01 15.66 9.01 14C9.01 12.34 10.34 11 12.01 11C13.68 11 15.01 12.34 15.01 14C15.01 15.66 13.68 17 12.01 17Z" fill="currentColor" />
                  </svg>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21.5 11.1L12.5 2.1C12.1 1.7 11.5 1.7 11.1 2.1L2.1 11.1C1.7 11.5 1.7 12.1 2.1 12.5C2.5 12.9 3.1 12.9 3.5 12.5L4 12V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V12L20.5 12.5C20.9 12.9 21.5 12.9 21.9 12.5C22.3 12.1 22.3 11.5 21.9 11.1" fill="currentColor" />
                  </svg>
                </div>
                <div className="text-xs" style={{ fontFamily: typography.body }}>
                  <span className="font-medium" style={{ fontFamily: typography.headings }}>
                    {(brandOutput?.brandName || "brand").toLowerCase()}</span> Introducing our new collection. #premium #quality #design
                </div>
              </div>
            </div>

            {/* Facebook Post Mockup */}
            <div className="bg-white rounded-md shadow-md overflow-hidden border border-gray-200 transition-all hover:shadow-xl">
              <div className="h-12 px-4 flex items-center border-b border-gray-200">
                <div className="w-8 h-8 rounded-full overflow-hidden mr-2 flex items-center justify-center" 
                     style={{ background: primaryColor }}>
                  <div className="scale-[0.6] brightness-[10]" dangerouslySetInnerHTML={{ __html: logoSvg }} />
                </div>
                <div>
                  <div className="text-sm font-medium" style={{ fontFamily: typography.headings }}>
                    {brandOutput?.brandName || brandOutput?.brandInputs?.brandName || "Brand"}
                  </div>
                  <div className="text-xs text-gray-500" style={{ fontFamily: typography.body }}>
                    Sponsored · 2h
                  </div>
                </div>
                <div className="ml-auto">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 13C12.5523 13 13 12.5523 13 12C13 11.4477 12.5523 11 12 11C11.4477 11 11 11.4477 11 12C11 12.5523 11.4477 13 12 13Z" fill="currentColor" />
                    <path d="M19 13C19.5523 13 20 12.5523 20 12C20 11.4477 19.5523 11 19 11C18.4477 11 18 11.4477 18 12C18 12.5523 18.4477 13 19 13Z" fill="currentColor" />
                    <path d="M5 13C5.55228 13 6 12.5523 6 12C6 11.4477 5.55228 11 5 11C4.44772 11 4 11.4477 4 12C4 12.5523 4.44772 13 5 13Z" fill="currentColor" />
                  </svg>
                </div>
              </div>
              <div className="p-4">
                <p className="text-sm mb-4" style={{ fontFamily: typography.body }}>
                  Introducing our premium quality products. Designed with attention to every detail.
                </p>
              </div>
              <div className="h-56 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center border-t border-b border-gray-200">
                <div style={{ 
                  background: `linear-gradient(135deg, ${primaryColor}33 0%, ${secondaryColor}33 100%)`,
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column'
                }}>
                  <div className="w-24 h-24 mb-4" dangerouslySetInnerHTML={{ __html: logoSvg }} />
                  <h3 className="text-xl font-medium text-center px-6" 
                      style={{ fontFamily: typography.headings, color: baseColor }}>
                    Experience premium quality
                  </h3>
                </div>
              </div>
              <div className="p-3 border-t border-gray-200">
                <div className="flex justify-between text-gray-500 text-sm">
                  <span>42 Likes</span>
                  <span>7 Comments</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render merchandise mockup
  const renderMerchandise = () => (
    <div className="relative">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-center mb-8">
          <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* T-shirt Mockup */}
            <div className="bg-white rounded-md shadow-md overflow-hidden border border-gray-200 transition-all hover:shadow-xl">
              <div className="aspect-square bg-gray-100 flex items-center justify-center">
                <div className="relative w-full h-full flex items-center justify-center">
                  {/* T-shirt background */}
                  <svg viewBox="0 0 300 300" className="w-full h-full">
                    <path d="M100,80 L50,110 L60,190 L120,220 L180,220 L240,190 L250,110 L200,80 L170,100 C170,100 150,120 130,100 L100,80 Z" 
                          fill="white" stroke="#e5e7eb" strokeWidth="2"/>
                  </svg>
                  
                  {/* Logo on t-shirt */}
                  <div className="absolute w-32 h-32 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 mt-2"
                       dangerouslySetInnerHTML={{ __html: logoSvg }} />
                </div>
              </div>
              <div className="p-4">
                <h4 className="text-base font-medium mb-1" style={{ fontFamily: typography.headings, color: baseColor }}>
                  Premium T-Shirt
                </h4>
                <p className="text-sm text-gray-500 mb-2" style={{ fontFamily: typography.body }}>
                  100% organic cotton with embroidered logo
                </p>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium" style={{ color: primaryColor }}>$29.99</span>
                  <div className="flex space-x-1">
                    <div className="w-4 h-4 rounded-full bg-gray-800"></div>
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: primaryColor }}></div>
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: secondaryColor }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mug Mockup */}
            <div className="bg-white rounded-md shadow-md overflow-hidden border border-gray-200 transition-all hover:shadow-xl">
              <div className="aspect-square bg-gray-100 flex items-center justify-center">
                <div className="relative w-full h-full flex items-center justify-center">
                  {/* Mug background */}
                  <svg viewBox="0 0 300 300" className="w-full h-full">
                    <path d="M100,100 Q100,160 100,220 L200,220 Q200,160 200,100 Z" 
                          fill="white" stroke="#e5e7eb" strokeWidth="2"/>
                    <path d="M200,140 Q230,140 230,160 Q230,180 200,180" 
                          fill="none" stroke="#e5e7eb" strokeWidth="2"/>
                  </svg>
                  
                  {/* Logo on mug */}
                  <div className="absolute w-24 h-24 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                       dangerouslySetInnerHTML={{ __html: logoSvg }} />
                </div>
              </div>
              <div className="p-4">
                <h4 className="text-base font-medium mb-1" style={{ fontFamily: typography.headings, color: baseColor }}>
                  Branded Ceramic Mug
                </h4>
                <p className="text-sm text-gray-500 mb-2" style={{ fontFamily: typography.body }}>
                  12oz high-quality ceramic with printed logo
                </p>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium" style={{ color: primaryColor }}>$14.99</span>
                  <div className="flex space-x-1">
                    <div className="w-4 h-4 rounded-full bg-white border border-gray-300"></div>
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: accentColor }}></div>
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: secondaryColor }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="mt-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Brand Applications</h2>
        {onElementEdit && (
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                disabled={regenerating}
              >
                {regenerating ? (
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <EditIcon className="h-3 w-3 mr-1" />
                )}
                Regenerate Applications
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Describe brand applications</h4>
                <p className="text-xs text-gray-500">Tell the AI what kind of brand applications you want to see. Specify products, styles, or contexts.</p>
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const formData = new FormData(form);
                    const description = formData.get('applicationDescription') as string;
                    
                    await handleRegenerateApplications(description);
                    
                    // Close the popover
                    const closeEvent = new CustomEvent('close-popover');
                    document.dispatchEvent(closeEvent);
                  }}
                >
                  <div className="space-y-2">
                    <textarea 
                      name="applicationDescription"
                      className="w-full min-h-[100px] p-2 text-sm border rounded-md"
                      placeholder="Example: Show the brand applied to luxury retail packaging, high-end stationery, and premium merchandise with gold accents."
                      defaultValue=""
                    />
                    <div className="flex justify-end">
                      <Button type="submit" size="sm" disabled={regenerating}>
                        {regenerating ? 'Generating...' : 'Generate'}
                      </Button>
                    </div>
                  </div>
                </form>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      <Tabs defaultValue="stationery" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="stationery">Stationery</TabsTrigger>
          <TabsTrigger value="social">Social Media</TabsTrigger>
          <TabsTrigger value="merchandise">Merchandise</TabsTrigger>
        </TabsList>
        <TabsContent value="stationery">
          {renderStationery()}
        </TabsContent>
        <TabsContent value="social">
          {renderSocialMedia()}
        </TabsContent>
        <TabsContent value="merchandise">
          {renderMerchandise()}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BrandApplications;