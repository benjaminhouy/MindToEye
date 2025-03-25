// Type definitions for Cloudflare Turnstile
declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: (error: any) => void;
          theme?: 'light' | 'dark' | 'auto';
          tabindex?: number;
          size?: 'normal' | 'compact';
          'refresh-expired'?: 'manual' | 'auto';
          language?: string;
          action?: string;
          cData?: string;
          appearance?: 'always' | 'execute' | 'interaction-only';
        }
      ) => string;
      reset: (widgetId?: string) => void;
      getResponse: (widgetId?: string) => string | undefined;
      remove: (widgetId?: string) => void;
    };
  }
}

export {};