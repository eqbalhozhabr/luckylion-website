// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // لازم بود تا sitemap.xml و لینک‌های canonical مطلق (نه نسبی) درست ساخته بشن.
  site: 'https://www.luckylion.games',
  integrations: [sitemap()],
});
