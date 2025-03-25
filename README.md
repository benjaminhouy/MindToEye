# MindToEye: AI-Powered Brand Concept Visualization Platform

MindToEye is a powerful brand concept visualization platform that empowers creative professionals to rapidly generate, iterate, and present unique brand identities through intelligent design tools and collaborative workflows.

## Architecture Overview

The application is built with a modern full-stack JavaScript architecture:

**Express Server** (Port 5000): A Node.js backend that serves both the React frontend and API endpoints from a single server, with PostgreSQL for data persistence and Supabase for authentication

## Setup and Development

### Running the Application

The application is configured to run on port 5000 with the "Start application" workflow:

```
npm run dev
```

### Environment Variables

The following environment variables need to be set:

- `ANTHROPIC_API_KEY` - API key for Claude (3.7 Sonnet)
- `OPENAI_API_KEY` - API key for OpenAI (optional)
- `REPLICATE_API_TOKEN` - API token for Replicate (FLUX 1.1 Pro)
- `SUPABASE_URL` - URL for your Supabase project
- `SUPABASE_ANON_KEY` - Anon/Public key for Supabase authentication
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for Supabase admin operations
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Secret for securing user sessions

## Authentication

MindToEye uses a robust authentication system with multiple layers of fallback:

1. **Supabase Authentication** - Primary authentication provider with JWT token support
2. **Token Refresh** - Automatic refresh mechanism for expired tokens
3. **Session Persistence** - LocalStorage fallback for maintaining sessions during API disruptions
4. **Anonymous Sessions** - Support for demo users with secure account conversion
5. **Header Authentication** - All API requests include proper authentication headers

## Key Features

- AI-assisted design generation (Claude 3.7 Sonnet + Black Forest Labs FLUX 1.1 Pro)
- Interactive visualization components
- Real-time collaborative design editing
- Replicate AI integration for logo generation
- Selective regeneration of design elements
- Advanced error handling and keyword-based AI fallbacks
- Dynamic element regeneration with contextual AI support
- Demo account conversion with persistent project data
- Robust authentication with multiple fallback mechanisms
- Supabase storage integration for asset management

## Key Technologies

- React TypeScript frontend
- Node.js/Express backend
- Claude 3.7 Sonnet for brand concept generation
- Black Forest Labs FLUX 1.1 Pro for logo generation
- PostgreSQL database for persistent storage
- Supabase for authentication and storage
- RESTful API with authenticated endpoints
- TanStack Query for data fetching
- Shadcn UI components