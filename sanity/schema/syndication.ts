import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'syndication',
  title: 'Syndication',
  type: 'object',
  fields: [
    defineField({
      name: 'platform',
      title: 'Platform',
      type: 'string',
      options: {
        list: [
          { title: 'LinkedIn', value: 'linkedin' },
          { title: 'Twitter/X', value: 'twitter' },
          { title: 'Dev.to', value: 'devto' },
          { title: 'Medium', value: 'medium' },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'Pending', value: 'pending' },
          { title: 'Published', value: 'published' },
          { title: 'Failed', value: 'failed' },
        ],
      },
      initialValue: 'pending',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'url',
      title: 'Syndicated URL',
      type: 'url',
      description: 'URL of the post on the syndicated platform',
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published At',
      type: 'datetime',
      description: 'When the post was published on this platform',
    }),
    defineField({
      name: 'error',
      title: 'Error Message',
      type: 'text',
      description: 'Error message if syndication failed',
    }),
  ],
  preview: {
    select: {
      platform: 'platform',
      status: 'status',
      url: 'url',
    },
    prepare({ platform, status, url }) {
      return {
        title: `${platform} - ${status}`,
        subtitle: url || 'No URL',
      };
    },
  },
});

