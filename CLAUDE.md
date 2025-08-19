# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Telegram Mini App for Storacha that enables users to securely back up their Telegram chats using decentralized storage. It's built with Next.js and runs within the Telegram ecosystem.

## Development Commands

### Root Level Commands

- `pnpm app:dev` - Start the development server for the main app
- `pnpm prepare` - Install Husky git hooks

### App Level Commands (run from `/app` directory)

- `pnpm dev` - Start Next.js development server (localhost:3000)
- `pnpm build` - Build the application for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint (also used as test command)
- `pnpm format` - Format code with Prettier
- `pnpm test` - Run tests (currently just linting)
- `pnpm db:migrate` - Run database migrations
- `pnpm db:dev:console` - Open PostgreSQL console for development database
- `pnpm pages:build` - Build for Cloudflare Pages deployment
- `pnpm pages:preview` - Preview Cloudflare Pages build locally
- `pnpm pages:deploy` - Deploy to Cloudflare Pages

### Linting and Formatting

This project uses Biome for code formatting and linting:

- Code style: tabs (2-space width), single quotes, trailing commas
- Line width: 120 characters
- Console.log statements are errors (except in scripts)
- Run `cd app && pnpm lint --fix` to auto-fix issues

## Architecture

### Core Structure

- **Monorepo setup** with workspace in `app/` directory
- **Next.js 15** with App Router using React 19
- **Telegram Mini App** architecture - must run inside Telegram client
- **Dual deployment** - supports both Cloudflare Pages and traditional hosting

### Key Technologies

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS, Radix UI components
- **Backend**: Next.js API routes, PostgreSQL with postgres.js
- **Storage**: Storacha decentralized storage (@storacha/\* packages)
- **Telegram Integration**: @telegram-apps/sdk-react, telegram library
- **Authentication**: iron-session, Telegram init data validation
- **Monitoring**: Sentry error tracking
- **Analytics**: Plausible analytics

### Database

- **PostgreSQL** for user data, jobs, and backup metadata
- **Migration system** in `/app/scripts/migrations/`
- **Local development**: Docker Compose setup (docker-compose.yml)
- **Production**: Supports AWS RDS with IAM authentication

### Key Directories

#### `/app/app/` - Next.js App Router pages

- `backup/` - Main backup functionality pages
- `dialog/[id]/` - Chat/dialog specific pages
- `leaderboard/` - User ranking system
- `api/` - API routes for bot webhooks, jobs, entities

#### `/app/components/` - React components

- `backup/` - Backup-related UI components
- `dashboard/` - Main dashboard components
- `layouts/` - Header, menu, chat header layouts
- `ui/` - Reusable UI components (shadcn/ui style)

#### `/app/lib/` - Core utilities

- `server/` - Server-side utilities (database, Telegram API, jobs)
- `backup/` - Backup processing logic
- `store/` - Client-side state management

#### `/app/providers/` - React context providers

- `backup.tsx` - Backup state management
- `telegram.tsx` - Telegram SDK integration
- `error.tsx` - Error boundary handling

### State Management

- **Zustand** for client state (`/app/zustand/`)
- **React Context** for feature-specific state (providers)
- **PostgreSQL** for persistent data with real-time job updates via LISTEN/NOTIFY

### Telegram Integration

- **Bot API** for webhook handling (`/app/api/bot/`)
- **TDLib integration** for accessing user chat history
- **Mini App SDK** for Telegram-specific UI features
- **Session management** using iron-session with Telegram init data

### Job Processing System

- **Background jobs** for backup processing
- **Real-time updates** via PostgreSQL LISTEN/NOTIFY
- **Progress tracking** and status management
- **Job queue** with AWS SQS integration

## Development Setup

### Prerequisites

- Node.js 18+
- pnpm 9.0.0+
- PostgreSQL database
- Telegram Bot Token and API credentials

### Environment Setup

1. Copy `app/.env.tpl` to `app/.env`
2. Fill in required environment variables
3. Set up PostgreSQL database (use Docker Compose for local dev)
4. Run database migrations: `cd app && pnpm db:migrate`

### Local Development

1. Use ngrok or similar for HTTPS tunnel (required for Telegram)
2. Configure Telegram bot with BotFather
3. Set up Mini App in Telegram
4. Run `cd app && pnpm dev`

### Testing

- Currently uses ESLint as the primary test mechanism
- No unit test framework configured yet
- Manual testing through Telegram Mini App interface

## Deployment

### Cloudflare Pages

- Primary deployment target
- Uses `@cloudflare/next-on-pages` for compatibility
- Wrangler configuration in `/app/wrangler.toml`

### Environment Variables

- Database connection (PostgreSQL)
- Telegram Bot API credentials
- Storacha service configuration
- Sentry DSN for error tracking

## Important Notes

- **Telegram Context Required**: This app must run within Telegram - it cannot function as a standalone web app
- **Encrypted Storage**: All backup data is encrypted before storage using AES-CBC encryption
- **Decentralized Storage**: Uses Storacha's IPFS-based storage network
- **Real-time Updates**: Job progress updates use PostgreSQL LISTEN/NOTIFY for real-time UI updates
- **Security**: Never commit secrets, API keys, or Telegram credentials to the repository
