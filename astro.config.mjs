// @ts-check
import { defineConfig, envField } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import icon from 'astro-icon';
import sitemap from '@astrojs/sitemap';
import netlify from '@astrojs/netlify';

// https://astro.build/config
export default defineConfig({
  site:"https://tejpatel.in",
  vite: {
    plugins: [tailwindcss()],
  },
  // "server" so the Netlify adapter emits the SSR function the Spotify server
  // island needs; pages opt back into static HTML with `prerender = true`.
  output: "server",
  adapter: netlify(),
  integrations: [icon(), sitemap()],
  env: {
    schema: {
      SPOTIFY_CLIENT_ID: envField.string({ context: "server", access: "secret", optional: true }),
      SPOTIFY_CLIENT_SECRET: envField.string({ context: "server", access: "secret", optional: true }),
      SPOTIFY_REFRESH_TOKEN: envField.string({ context: "server", access: "secret", optional: true }),
    },
  },
  build: {
    inlineStylesheets: "always"
  }
});