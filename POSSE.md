# POSSE Blog System Documentation

This project implements a POSSE (Publish on Own Site, Syndicate Elsewhere) blog system using Markdown files for content and Sanity CMS for metadata and syndication tracking.

## Architecture

- **Content**: Markdown files in `/content/posts/`
- **Metadata**: Sanity CMS for post metadata and syndication status
- **Frontend**: Next.js App Router with blog pages
- **Syndication**: API routes for LinkedIn, Twitter/X, Dev.to, and Medium

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

Required variables:
- `NEXT_PUBLIC_SANITY_PROJECT_ID` - Your Sanity project ID
- `NEXT_PUBLIC_SANITY_DATASET` - Dataset name (usually "production")
- `SANITY_API_TOKEN` - Sanity API token with write permissions
- `NEXT_PUBLIC_SITE_URL` - Your site URL (e.g., https://stein.is)

For syndication, add platform-specific credentials (see `.env.example`).

### 3. Set Up Sanity

1. Create a Sanity project at https://sanity.io
2. Add your project ID and dataset to `.env.local`
3. Generate an API token with write permissions
4. Access Sanity Studio at `/studio` to manage post metadata

### 4. Create Your First Post

Create a markdown file in `/content/posts/`:

```markdown
---
title: "My First Post"
slug: "my-first-post"
date: "2025-01-15"
excerpt: "This is my first blog post."
tags: ["web-dev", "ai"]
published: true
---

# My First Post

Content goes here...
```

## Workflow

### Publishing a Post

1. **Create Markdown File**: Write your post in `/content/posts/[slug].md`
2. **Sync to Sanity**: Run the sync API to create/update metadata:
   ```bash
   curl -X POST http://localhost:3000/api/sync-all
   ```
   Or for a single post:
   ```bash
   curl -X POST "http://localhost:3000/api/publish?slug=my-first-post"
   ```
3. **Syndicate**: The publish endpoint can automatically syndicate, or use the syndicate endpoint:
   ```bash
   curl -X POST http://localhost:3000/api/syndicate \
     -H "Content-Type: application/json" \
     -d '{"slug": "my-first-post", "platforms": ["linkedin", "twitter", "devto", "medium"]}'
   ```

### API Endpoints

#### `POST /api/sync-all`
Sync all markdown posts to Sanity metadata.

#### `POST /api/publish?slug=[slug]&platforms=[platforms]&autoSyndicate=[true|false]`
Publish workflow:
- Syncs post to Sanity
- Optionally syndicates to platforms (default: true)
- Updates syndication status

#### `POST /api/syndicate`
Syndicate a post to external platforms.

**Body:**
```json
{
  "slug": "post-slug",
  "platforms": ["linkedin", "twitter", "devto", "medium"]
}
```

**Query Parameters (alternative):**
- `slug` - Post slug
- `platforms` - Comma-separated list of platforms

## Platform-Specific Notes

### LinkedIn
- Requires OAuth 2.0 access token
- Needs LinkedIn Person URN
- Posts as articles with link to original

### Twitter/X
- Requires Bearer Token or OAuth 1.0a credentials
- 280 character limit
- Includes link to original post

### Dev.to
- Requires API key from Dev.to settings
- Accepts markdown content
- Automatically includes canonical URL

### Medium
- Requires OAuth access token
- Accepts HTML content
- Includes canonical URL for SEO

## Sanity Studio

Access the Sanity Studio at `/studio` to:
- View and edit post metadata
- Track syndication status
- See syndicated URLs
- Monitor errors

## POSSE Principles

This implementation follows POSSE best practices:

1. **Own Your Content**: Posts are stored as Markdown files in your repository
2. **Canonical URLs**: All posts have canonical URLs on your domain
3. **Link Back**: Syndicated posts include links to the original
4. **Track Status**: Sanity tracks syndication status for each platform
5. **Independent**: Your site works independently of syndication platforms

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## File Structure

```
├── app/
│   ├── api/
│   │   ├── publish/route.ts      # Publish workflow
│   │   ├── syndicate/route.ts    # Syndication endpoint
│   │   └── sync-all/route.ts     # Sync all posts
│   ├── blog/
│   │   ├── page.tsx              # Blog listing
│   │   └── [slug]/page.tsx       # Individual post
│   └── studio/                    # Sanity Studio
├── components/
│   ├── PostCard.tsx              # Post preview card
│   └── PostContent.tsx           # Post content renderer
├── content/
│   └── posts/                    # Markdown blog posts
├── lib/
│   ├── markdown.ts              # Markdown parsing
│   ├── posts.ts                 # Post utilities
│   ├── sanity.ts                # Sanity client
│   ├── sync-post.ts             # Sync utilities
│   └── syndication/             # Platform handlers
├── sanity/
│   └── schema/                  # Sanity schemas
└── types/
    └── post.ts                  # TypeScript types
```

