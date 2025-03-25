# MindToEye: AI-Powered Brand Concept Visualization Platform

MindToEye is a powerful brand concept visualization platform that empowers creative professionals to rapidly generate, iterate, and present unique brand identities through intelligent design tools and collaborative workflows.

## Architecture Overview

The application is built with a modern full-stack JavaScript architecture:

**Express Server** (Port 5000): A Node.js backend that serves both the React frontend and API endpoints from a single server

## Setup and Development

### Running the Application

The application is configured to run on port 5000 with the "Start application" workflow:

```
npm run dev
```

### Environment Variables

The following environment variables need to be set:

- `ANTHROPIC_API_KEY` - API key for Claude (3.7 Sonnet)
- `OPENAI_API_KEY` - API key for OpenAI
- `REPLICATE_API_TOKEN` - API token for Replicate (FLUX 1.1 Pro)
- `SUPABASE_URL` - URL for your Supabase project
- `SUPABASE_ANON_KEY` - Anon/Public key for Supabase authentication
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for Supabase admin operations
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Secret for session management

## Key Features

- AI-assisted design generation (Claude 3.7 Sonnet + Black Forest Labs FLUX 1.1 Pro)
- Interactive visualization components
- Real-time collaborative design editing
- Replicate AI integration for logo generation
- Selective regeneration of design elements
- Advanced error handling and keyword-based AI fallbacks
- Dynamic element regeneration with contextual AI support

## Key Technologies

- React TypeScript frontend
- Node.js/Express backend
- Claude 3.7 Sonnet for brand concept generation
- Black Forest Labs FLUX 1.1 Pro for logo generation
- Supabase database for persistent storage
- RESTful API with JSON output
- TanStack Query for data fetching
- Shadcn UI components

## Supabase Integration

MindToEye uses Supabase for multiple critical functions:

### Authentication

- **Multi-method Auth**: Supports email/password, anonymous, and direct database authentication
- **Auth Flow**: 
  - JWT-based authentication with Supabase Auth
  - Fallback to database authentication for converted accounts
  - Session persistence with sessionStorage

### Database

- **PostgreSQL Database**: Primary data store accessed through Supabase API
- **Schema**: 
  - `users` - User accounts and metadata
  - `projects` - Brand projects with client information
  - `brand_concepts` - Generated brand concepts with inputs and outputs

### Storage

- **Asset Storage**: Generated images are stored in Supabase Storage
- **Path Structure**: `${userId}/${projectId}/${conceptId}/[asset-type]/[filename]`
- **Types of Assets**:
  - Logo SVGs (original, monochrome, and reverse variants)
  - Landing page hero images
  - Color palette swatches
  - Typography samples

### Authentication Headers

The application uses two primary authentication methods:
1. **JWT Token**: `Authorization: Bearer <token>` for Supabase RLS policies
2. **Auth ID**: `x-auth-id` custom header for both Supabase UUID and numeric IDs

### Demo Mode and User Conversion

- **Anonymous Authentication**: Initial demo sessions use Supabase anonymous auth
- **Two-Phase Conversion**: 
  1. Email collection (stored in user metadata)
  2. Optional password setting (for full account creation)
- **ID Handling**: System supports both Supabase UUID and numeric database ID formats

### Client-Side Integration

- Custom hooks in `/client/src/lib/supabase.ts` handle database operations
- Authentication state management in `/client/src/lib/auth-context.tsx`
- API request formatting with auth headers in `/client/src/lib/queryClient.ts`

### Server-Side Integration

- Direct PostgreSQL access via Drizzle ORM
- Supabase admin operations in `/server/supabase-admin.ts`
- Storage utilities in `/server/storage-utils.ts`