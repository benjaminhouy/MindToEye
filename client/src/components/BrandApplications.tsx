import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { EditIcon, RefreshCw, ImageIcon } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface BrandApplicationsProps {
  brandOutput: any;
  onElementEdit?: (type: string, updatedData: any) => Promise<void>;
}

const BrandApplications = ({ brandOutput, onElementEdit }: BrandApplicationsProps) => {
  const { toast } = useToast();
  const [regenerating, setRegenerating] = useState(false);
  const [activeTab, setActiveTab] = useState("stationery"); // Default active tab
  const [billboardImage, setBillboardImage] = useState<string | null>(null);
  const [generateBillboardLoading, setGenerateBillboardLoading] = useState(false);

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
  
  // Generate billboard image using Flux AI via Replicate
  const generateBillboard = async () => {
    // Extract all relevant brand information for a highly customized billboard
    const brandName = brandOutput?.brandName || brandOutput?.brandInputs?.brandName || "Brand";
    
    // Get detailed brand description, handle NSFW content by modifying it to be brand-focused
    let description = brandOutput?.brandInputs?.description || "Premium quality products";
    if (description.toLowerCase().includes("bdsm") || description.toLowerCase().includes("flogger")) {
      description = "Premium lifestyle accessories with attention to aesthetic details and sensual experiences";
    }
    
    // Get specific industry, defaulting to relevant categories if not specified
    const industry = brandOutput?.brandInputs?.industry || 
      (description.toLowerCase().includes("accessory") || description.toLowerCase().includes("accessor")) 
        ? "Fashion Accessories" 
        : "Lifestyle Brand";
    
    // Extract brand values, ensuring we always have values to work with
    const values = brandOutput?.brandInputs?.values?.length > 0 
      ? brandOutput.brandInputs.values.map((v: any) => v.value).join(', ') 
      : "Quality, Innovation";
    
    try {
      setGenerateBillboardLoading(true);
      toast({
        title: "Generating billboard mockup",
        description: "Using Flux AI to create a realistic billboard design...",
      });
      
      // Create a more targeted prompt for Flux AI to generate the billboard
      let tagline = "";
      
      // Generate a highly specific tagline based on brand description, values, and industry
      if (description.toLowerCase().includes("bdsm") || description.toLowerCase().includes("flogger")) {
        // For BDSM-related products, use elegant phrasing
        tagline = "Aesthetic Design Meets Intimate Luxury";
      } else if (description.toLowerCase().includes("accessor") && values.toLowerCase().includes("innovation")) {
        // For innovative accessories
        tagline = "Accessories That Redefine Possibilities";
      } else if (description.toLowerCase().includes("sensor") || description.toLowerCase().includes("tech")) {
        // For tech products
        tagline = "Intelligently Designed For Modern Life";
      } else if (industry.toLowerCase().includes("fashion")) {
        // For fashion brands
        tagline = "Define Your Style, Express Your Identity";
      } else if (values.toLowerCase().includes("quality") && values.toLowerCase().includes("innovation")) {
        // For quality and innovation combination
        tagline = "Innovative Excellence, Uncompromising Quality";
      } else if (values.toLowerCase().includes("quality")) {
        // For quality-focused brands
        tagline = "Crafted To Perfection, Made To Last";
      } else if (values.toLowerCase().includes("innovation")) {
        // For innovation-focused brands
        tagline = "Breaking Boundaries, Creating Tomorrow";
      } else if (description.toLowerCase().includes("premium") || description.toLowerCase().includes("luxury")) {
        // For premium/luxury products
        tagline = "Experience True Luxury, Every Day";
      } else {
        // Fallback - create a tagline from the brand description
        const words = description.split(' ');
        if (words.length >= 4) {
          // Use first 4-6 words if available
          tagline = words.slice(0, Math.min(6, Math.floor(words.length/2))).join(' ');
        } else {
          tagline = description.substring(0, 30) + (description.length > 30 ? '...' : '');
        }
      }
      
      // Extract logo description if available, or use default
      const logoDescription = brandOutput?.logoDescription || "minimalist logo";
      
      // Prepare a more detailed prompt that incorporates brand identity elements
      const promptText = `
        Create a photorealistic billboard advertisement for ${brandName}, a premium ${industry} brand.
        
        BRAND CONTEXT:
        - Description: ${description.substring(0, 150)}
        - Core values: ${values}
        - Logo description: ${logoDescription}
        - Brand personality: ${brandOutput?.brandInputs?.designStyle || "modern"} and sophisticated
        
        DESIGN SPECIFICS:
        - The billboard should prominently feature the ${brandName} logo (${logoDescription})
        - Main headline: "${brandName}"
        - Tagline: "${tagline}"
        - Use EXACTLY these brand colors: Primary ${primaryColor}, Secondary ${secondaryColor}, Accent ${accentColor}
        - Typography style should match the brand's font choices
        - Show the billboard mounted on a building or highway in an urban setting at dusk/evening
        - Include dramatic lighting to highlight the billboard
        - Make it photorealistic - this should look like an actual photograph of a billboard in the real world
        - The design must accurately reflect the brand identity and be appropriate for the ${industry} industry
        - The billboard should feature product imagery or lifestyle visuals relevant to the brand's offerings
        
        EXTREMELY IMPORTANT: This is a creative billboard for ${brandName}, not a generic template. The brand name ${brandName} must be clearly featured, and the design must directly reflect the brand's actual identity as described above.
      `;
      
      // Make API request to generate the billboard with the enhanced prompt
      const response = await apiRequest('POST', '/api/generate-logo', {
        prompt: promptText,
        brandName: brandName,
        industry: industry
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate billboard image');
      }
      
      const result = await response.json();
      
      if (result.logoSvg) {
        setBillboardImage(result.logoSvg);
        toast({
          title: "Billboard created!",
          description: "Your AI-generated billboard is ready for client presentation.",
        });
      } else {
        throw new Error('No billboard image received from API');
      }
    } catch (error) {
      console.error("Error generating billboard:", error);
      toast({
        title: "Generation failed",
        description: "Could not generate billboard image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGenerateBillboardLoading(false);
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
                        {brandOutput?.brandInputs?.description
                          ? `Thank you for your interest in ${brandOutput?.brandName}. ${brandOutput?.brandInputs?.description.split('.')[0]}.`
                          : "Thank you for your interest in our premium products. We're excited to share our catalog with you."}
                      </p>
                      <p className="text-sm text-gray-600" style={{ fontFamily: typography.body }}>
                        {brandOutput?.brandInputs?.values?.length > 0
                          ? `Our commitment to ${brandOutput.brandInputs.values.map((v: any) => v.value.toLowerCase()).join(' and ')} is at the heart of everything we create.`
                          : "Our team is dedicated to providing exceptional quality and service to all our clients."}
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
                    {(brandOutput?.brandName || brandOutput?.brandInputs?.brandName || "brand").toLowerCase()}</span> {" "}
                    {brandOutput?.brandInputs?.description 
                      ? `Elevate your experience with our latest designs. ${brandOutput?.brandInputs?.values?.map((v: any) => `#${v.value?.toLowerCase()}`).join(' ') || '#premium'} #aesthetic #design` 
                      : "Introducing our new collection. #premium #quality #design"}
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
                  {brandOutput?.brandInputs?.description ? 
                    `Introducing our new ${brandOutput?.brandName} collection. ${brandOutput?.brandInputs?.description.split('.')[0]}.` : 
                    "Elevate your experience with our premium products crafted for those who appreciate quality and aesthetics."}
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
                    {brandOutput?.brandInputs?.values?.length > 0 
                      ? `Experience ${brandOutput.brandInputs.values[0].value}` 
                      : "Experience premium quality"}
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

  // Render advertising mockups with billboard
  const renderAdvertising = () => (
    <div className="relative">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-center mb-8">
          <div className="w-full max-w-4xl">
            <div className="flex flex-col items-center gap-6">
              {/* Billboard mockup */}
              <div className="w-full p-4 border border-gray-200 rounded-md shadow-md">
                <div className="mb-3 flex justify-between items-center">
                  <h3 className="text-lg font-medium" style={{ fontFamily: typography.headings }}>
                    Billboard Design
                  </h3>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={generateBillboard}
                    disabled={generateBillboardLoading}
                    className="flex items-center gap-1"
                  >
                    {generateBillboardLoading ? (
                      <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <ImageIcon className="w-4 h-4 mr-1" />
                    )}
                    {billboardImage ? "Regenerate" : "Generate"} Billboard
                  </Button>
                </div>
                
                <div className="aspect-[2/1] bg-gray-100 rounded-md overflow-hidden">
                  {billboardImage ? (
                    <div className="h-full w-full flex items-center justify-center p-2">
                      <div 
                        className="w-full h-full"
                        dangerouslySetInnerHTML={{ __html: billboardImage }}
                      />
                    </div>
                  ) : (
                    <div className="h-full w-full flex flex-col items-center justify-center p-4">
                      <div className="w-16 h-16 mb-4 opacity-30" dangerouslySetInnerHTML={{ __html: logoSvg }} />
                      <p className="text-gray-500 text-center max-w-md text-sm" style={{ fontFamily: typography.body }}>
                        Generate a realistic billboard design for this brand using our AI.
                        {generateBillboardLoading && (
                          <span className="block mt-2 text-xs">
                            Creating billboard design with Flux AI... This may take a moment.
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Urban poster mockup */}
              <div className="w-full p-4 border border-gray-200 rounded-md shadow-md">
                <h3 className="text-lg font-medium mb-3" style={{ fontFamily: typography.headings }}>
                  Urban Poster Display
                </h3>
                <div className="aspect-[4/3] bg-gray-100 rounded-md overflow-hidden relative">
                  {/* Background urban scene */}
                  <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                    <div className="w-full h-full" style={{
                      backgroundImage: "url('https://images.unsplash.com/photo-1517666669-45c3e262b513?auto=format&fit=crop&q=80&w=1200&h=800')", 
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      opacity: 0.7
                    }}></div>
                  </div>
                  
                  {/* Poster on wall */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-1/2 h-2/3 bg-white shadow-2xl transform perspective-700 rotate-y-6 skew-y-1" style={{
                      boxShadow: '8px 8px 24px rgba(0, 0, 0, 0.4)'
                    }}>
                      <div className="w-full h-full p-4 flex flex-col items-center justify-center"
                           style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)` }}>
                        <div className="w-1/2 h-1/3 mb-4" dangerouslySetInnerHTML={{ __html: logoSvg }} />
                        <h3 className="text-xl font-bold mb-2 text-white text-center" style={{ fontFamily: typography.headings }}>
                          {brandOutput?.brandName || brandOutput?.brandInputs?.brandName || "Brand"}
                        </h3>
                        <p className="text-xs text-white opacity-90 text-center" style={{ fontFamily: typography.body }}>
                          {brandOutput?.brandInputs?.description?.substring(0, 50) || "Premium quality products"}
                          {(brandOutput?.brandInputs?.description?.length || 0) > 50 ? '...' : ''}
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
                  {brandOutput?.brandInputs?.industry === "Fashion"
                    ? "Premium sustainable materials with embroidered logo"
                    : brandOutput?.brandInputs?.description?.includes("BDSM")
                      ? "Soft, high-quality fabric with subtle embroidered logo"
                      : "100% organic cotton with embroidered logo"}
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
                  {brandOutput?.brandInputs?.industry === "Food & Beverage"
                    ? "12oz double-wall insulated ceramic with debossed logo"
                    : brandOutput?.brandInputs?.description?.includes("BDSM") 
                      ? "Elegant matte black ceramic with subtle tonal logo" 
                      : "12oz high-quality ceramic with printed logo"}
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
          <TabsTrigger value="advertising">Advertising</TabsTrigger>
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
        <TabsContent value="advertising">
          {renderAdvertising()}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BrandApplications;