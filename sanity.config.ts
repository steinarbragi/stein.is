import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import postSchema from './sanity/schema/post';
import syndicationSchema from './sanity/schema/syndication';

export default defineConfig({
  name: 'default',
  title: 'Stein.is Blog',

  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',

  plugins: [structureTool()],

  schema: {
    types: [postSchema, syndicationSchema],
  },
});

