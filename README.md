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
- In-memory storage with optional persistence
- RESTful API with JSON output
- TanStack Query for data fetching
- Shadcn UI components