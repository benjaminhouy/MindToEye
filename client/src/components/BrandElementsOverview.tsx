import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { EditIcon } from "lucide-react";

// Type definitions for brand elements
interface BrandColor {
  name: string;
  hex: string;
  type: "primary" | "secondary" | "accent" | "base";
}

interface BrandTypography {
  headings: string;
  body: string;
}

interface BrandElementsOverviewProps {
  brandOutput: any;
  onElementEdit?: (type: string, updatedData: any) => Promise<void>;
  /**
   * Optional: If provided, will immediately update the UI with new values
   * after a regeneration, without waiting for server refresh 
   */
  immediateUpdate?: boolean;
}

// Extended list of font options for dropdowns
const COMMON_FONTS = [
  // Sans-serif fonts
  "Arial", "Roboto", "Montserrat", "Open Sans", "Lato", "Poppins", 
  "Raleway", "Nunito", "Source Sans Pro", "Oswald", "Ubuntu", "PT Sans", 
  "Noto Sans", "Inter", "Work Sans", "Quicksand", "Barlow", "Mulish", 
  "Rubik", "Karla", "Helvetica Neue", "Segoe UI", "Verdana", "Tahoma",
  "Proxima Nova", "Avenir", "DM Sans", "SF Pro", "Century Gothic", "Futura",
  
  // Serif fonts
  "Playfair Display", "Merriweather", "Georgia", "Times New Roman", "Baskerville",
  "Garamond", "Didot", "Bodoni", "Caslon", "Palatino", "Cambria", "Bookman",
  "Hoefler Text", "Cormorant Garamond", "EB Garamond", "Libre Baskerville",
  
  // Display & decorative fonts
  "Bebas Neue", "Abril Fatface", "Pacifico", "Comfortaa", "Dancing Script",
  "Lobster", "Caveat", "Sacramento", "Righteous", "Permanent Marker",
  "Fredoka One", "Staatliches", "Monoton", "Baloo", "Satisfy",
  
  // Tech & Modern fonts
  "Audiowide", "Orbitron", "Exo", "Exo 2", "Rajdhani", "Quantico", "Teko",
  "Aldrich", "Syncopate", "Michroma", "Electrolize", "Sarpanch", "Oxanium",
  "Jura", "Russo One", "Chakra Petch", "Saira Stencil One", "Unica One",
  
  // Creative & Unique fonts
  "Poiret One", "Julius Sans One", "Amatic SC", "Handlee", "Kalam",
  "Indie Flower", "Patrick Hand", "Architects Daughter", "Shadows Into Light",
  "Rock Salt", "Gloria Hallelujah", "Kaushan Script", "Neucha", "Fredericka the Great",
  
  // Monospace fonts
  "Courier", "Courier New", "Roboto Mono", "IBM Plex Mono", "Source Code Pro",
  "Space Mono", "Fira Code", "JetBrains Mono", "Inconsolata", "VT323"
];

const BrandElementsOverview = ({ brandOutput, onElementEdit }: BrandElementsOverviewProps) => {
  const { toast } = useToast();
  
  // Default colors and typography from brandOutput
  const initialColors: BrandColor[] = brandOutput?.colors || [
    { name: "Primary", hex: "#10B981", type: "primary" },
    { name: "Secondary", hex: "#0F766E", type: "secondary" },
    { name: "Accent", hex: "#38BDF8", type: "accent" },
    { name: "Base", hex: "#1F2937", type: "base" }
  ];

  const initialTypography: BrandTypography = brandOutput?.typography || {
    headings: "Montserrat",
    body: "Open Sans"
  };

  // State for editable elements
  const [colors, setColors] = useState<BrandColor[]>(initialColors);
  const [typography, setTypography] = useState<BrandTypography>(initialTypography);
  const [editingColor, setEditingColor] = useState<number | null>(null);
  const [editingTypography, setEditingTypography] = useState(false);
  
  // Keep colors and typography in sync with brandOutput
  useEffect(() => {
    if (brandOutput?.colors) {
      setColors(brandOutput.colors);
    }
    if (brandOutput?.typography) {
      setTypography(brandOutput.typography);
    }
  }, [brandOutput]);
  
  // Function to handle color changes
  const handleColorChange = (index: number, hex: string) => {
    const updatedColors = [...colors];
    updatedColors[index] = { ...updatedColors[index], hex };
    setColors(updatedColors);
  };

  // Save color changes
  const saveColorChanges = async () => {
    try {
      if (onElementEdit) {
        // Update the element with the new colors
        await onElementEdit('colors', colors);
        
        // The parent component will handle toast notifications
      }
      setEditingColor(null);
    } catch (error) {
      toast({
        title: "Update failed",
        description: "Failed to update colors. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle typography changes
  const handleTypographyChange = (type: 'headings' | 'body', value: string) => {
    setTypography((prev: typeof initialTypography) => ({ ...prev, [type]: value }));
  };

  // Save typography changes
  const saveTypographyChanges = async () => {
    try {
      if (onElementEdit) {
        // Update the element with the new typography
        await onElementEdit('typography', typography);
        
        // The parent component will handle toast notifications
      }
      setEditingTypography(false);
    } catch (error) {
      toast({
        title: "Update failed",
        description: "Failed to update typography. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 bg-gray-50 border-t border-b border-gray-200">
      {/* Logo */}
      <div className="p-8 border-b md:border-b-0 md:border-r border-gray-200 flex flex-col items-center justify-center">
        <div className="w-32 h-32 flex items-center justify-center bg-white rounded-xl shadow-sm mb-4">
          {brandOutput?.logo?.primary ? (
            <div 
              dangerouslySetInnerHTML={{ __html: brandOutput.logo.primary }}
              className="w-full h-full flex items-center justify-center" 
              style={{ maxWidth: "100%", maxHeight: "100%" }}
            />
          ) : (
            <svg className="w-24 h-24" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="100" cy="100" r="90" stroke="#10B981" strokeWidth="8" fill="white"/>
              <path d="M100 30C61.34 30 30 61.34 30 100C30 138.66 61.34 170 100 170C138.66 170 170 138.66 170 100C170 61.34 138.66 30 100 30ZM135 110H110V135C110 140.52 105.52 145 100 145C94.48 145 90 140.52 90 135V110H65C59.48 110 55 105.52 55 100C55 94.48 59.48 90 65 90H90V65C90 59.48 94.48 55 100 55C105.52 55 110 59.48 110 65V90H135C140.52 90 145 94.48 145 100C145 105.52 140.52 110 135 110Z" fill="#10B981"/>
            </svg>
          )}
        </div>
        <h3 className="text-base font-medium text-gray-900">Logo</h3>
        <p className="mt-1 text-sm text-gray-500">{brandOutput?.logoDescription || 'Brand logo design'}</p>
        {onElementEdit && (
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
              >
                <EditIcon className="h-3 w-3 mr-1" /> Regenerate Logo
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Describe your logo</h4>
                <p className="text-xs text-gray-500">Tell the AI what kind of logo you want. Be specific about style, symbols, and colors.</p>
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const formData = new FormData(form);
                    const description = formData.get('logoDescription') as string;
                    
                    try {
                      if (onElementEdit) {
                        toast({
                          title: "Regenerating logo instantly",
                          description: "Creating a professional logo design based on your description...",
                        });
                        
                        await onElementEdit('logo', { description });
                        
                        toast({
                          title: "Logo regenerated",
                          description: "New logo ready for client presentation! Approve designs faster.",
                        });
                      }
                      
                      // Close the popover
                      const closeEvent = new CustomEvent('close-popover');
                      document.dispatchEvent(closeEvent);
                    } catch (error) {
                      toast({
                        title: "Regeneration failed",
                        description: "Failed to regenerate logo. Please try again.",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  <div className="space-y-2">
                    <textarea 
                      name="logoDescription"
                      className="w-full min-h-[100px] p-2 text-sm border rounded-md"
                      placeholder="Example: A minimalist logo with abstract elements representing growth and innovation. Use teal and gold as primary colors."
                      defaultValue=""
                    />
                    <div className="flex justify-end">
                      <Button type="submit" size="sm">Generate</Button>
                    </div>
                  </div>
                </form>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
      
      {/* Color Palette */}
      <div className="p-8 border-b md:border-b-0 md:border-r border-gray-200">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-base font-medium text-gray-900">Color Palette</h3>
          {onElementEdit && (
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-xs px-2 h-7 text-blue-600 hover:text-blue-700"
                  >
                    <EditIcon className="h-3 w-3 mr-1" /> AI Generate
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Generate Color Palette</h4>
                    <p className="text-xs text-gray-500">Describe the color palette you want. Include moods, themes, or specific colors.</p>
                    <form 
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const form = e.currentTarget;
                        const formData = new FormData(form);
                        const description = formData.get('colorDescription') as string;
                        
                        try {
                          toast({
                            title: "Generating color palette",
                            description: "Creating a color scheme based on your description...",
                          });
                          
                          await onElementEdit!('colors', { description });
                          
                          toast({
                            title: "Colors generated",
                            description: "Fresh color palette is ready for client review!",
                          });
                          
                          // Close the popover
                          const closeEvent = new CustomEvent('close-popover');
                          document.dispatchEvent(closeEvent);
                        } catch (error) {
                          toast({
                            title: "Generation failed",
                            description: "Failed to generate colors. Please try again.",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      <div className="space-y-2">
                        <textarea 
                          name="colorDescription"
                          className="w-full min-h-[100px] p-2 text-sm border rounded-md"
                          placeholder="Example: A bold, modern palette with deep purples and vibrant teals that conveys luxury and innovation."
                          defaultValue=""
                        />
                        <div className="flex justify-end">
                          <Button type="submit" size="sm">Generate</Button>
                        </div>
                      </div>
                    </form>
                  </div>
                </PopoverContent>
              </Popover>
              
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={editingColor !== null ? saveColorChanges : () => setEditingColor(0)}
                className={`text-xs px-2 h-7 ${editingColor === null ? "text-blue-600 hover:text-blue-700" : ""}`}
              >
                {editingColor !== null ? "Save" : <><EditIcon className="h-3 w-3 mr-1" /> Manual Edit</>}
              </Button>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {colors.map((color: any, index: number) => (
            <div key={index} className="rounded-lg overflow-hidden shadow-sm">
              <div className="h-12" style={{ backgroundColor: color.hex }}></div>
              <div className="bg-white p-2">
                <p className="text-xs font-medium text-gray-900">{color.name}</p>
                {editingColor === index ? (
                  <Input 
                    type="text" 
                    value={color.hex}
                    onChange={(e) => handleColorChange(index, e.target.value)}
                    className="h-6 mt-1 text-xs px-2"
                  />
                ) : (
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-gray-500">{color.hex}</p>
                    {onElementEdit && editingColor !== null && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setEditingColor(index)}
                        className="h-5 w-5 p-0"
                      >
                        <EditIcon className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Typography */}
      <div className="p-8">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-base font-medium text-gray-900">Typography</h3>
          {onElementEdit && (
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-xs px-2 h-7 text-blue-600 hover:text-blue-700"
                  >
                    <EditIcon className="h-3 w-3 mr-1" /> AI Generate
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Generate Typography</h4>
                    <p className="text-xs text-gray-500">Describe the typography style you want. Include the brand personality or specific font inspiration.</p>
                    <form 
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const form = e.currentTarget;
                        const formData = new FormData(form);
                        const description = formData.get('typographyDescription') as string;
                        
                        try {
                          toast({
                            title: "Generating typography",
                            description: "Finding the perfect font combination based on your description...",
                          });
                          
                          await onElementEdit!('typography', { description });
                          
                          toast({
                            title: "Typography updated",
                            description: "New font combination is ready for client review!",
                          });
                          
                          // Close the popover
                          const closeEvent = new CustomEvent('close-popover');
                          document.dispatchEvent(closeEvent);
                        } catch (error) {
                          toast({
                            title: "Generation failed",
                            description: "Failed to generate typography. Please try again.",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      <div className="space-y-2">
                        <textarea 
                          name="typographyDescription"
                          className="w-full min-h-[100px] p-2 text-sm border rounded-md"
                          placeholder="Example: Modern tech fonts for a futuristic brand. The heading should be bold and tech-oriented like Audiowide, and the body text should be clean and readable."
                          defaultValue=""
                        />
                        <div className="flex justify-end">
                          <Button type="submit" size="sm">Generate</Button>
                        </div>
                      </div>
                    </form>
                  </div>
                </PopoverContent>
              </Popover>

              <Button 
                variant="ghost" 
                size="sm"
                onClick={editingTypography ? saveTypographyChanges : () => setEditingTypography(true)}
                className={`text-xs px-2 h-7 ${!editingTypography ? "text-blue-600 hover:text-blue-700" : ""}`}
              >
                {editingTypography ? "Save" : <><EditIcon className="h-3 w-3 mr-1" /> Manual Edit</>}
              </Button>
            </div>
          )}
        </div>
        <div className="space-y-3">
          <div>
            <p className="text-sm text-gray-500 mb-1">Headings</p>
            {editingTypography ? (
              <Select onValueChange={(value) => handleTypographyChange('headings', value)} defaultValue={typography.headings}>
                <SelectTrigger className="w-full h-8 text-sm">
                  <SelectValue placeholder={typography.headings} />
                </SelectTrigger>
                <SelectContent className="max-h-80 overflow-y-auto">
                  {COMMON_FONTS.map(font => (
                    <SelectItem key={font} value={font}>
                      <span style={{ fontFamily: `'${font}', sans-serif` }}>{font}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-xl font-bold" style={{ fontFamily: `'${typography.headings}', sans-serif` }}>
                {typography.headings}
              </p>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Body Text</p>
            {editingTypography ? (
              <Select onValueChange={(value) => handleTypographyChange('body', value)} defaultValue={typography.body}>
                <SelectTrigger className="w-full h-8 text-sm">
                  <SelectValue placeholder={typography.body} />
                </SelectTrigger>
                <SelectContent className="max-h-80 overflow-y-auto">
                  {COMMON_FONTS.map(font => (
                    <SelectItem key={font} value={font}>
                      <span style={{ fontFamily: `'${font}', sans-serif` }}>{font}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-base" style={{ fontFamily: `'${typography.body}', sans-serif` }}>
                {typography.body}
              </p>
            )}
          </div>
          <div className="pt-2">
            <p className="text-sm font-medium" style={{ fontFamily: editingTypography ? `'${typography.headings}', sans-serif` : 'inherit' }}>
              The quick brown fox jumps over the lazy dog.
            </p>
            <p className="text-sm" style={{ fontFamily: editingTypography ? `'${typography.body}', sans-serif` : 'inherit' }}>
              Portez ce vieux whisky au juge blond qui fume.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandElementsOverview;