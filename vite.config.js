import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
// https://vite-plugin-pwa.netlify.app/guide/generate.html
export default defineConfig({
  base: './',
  server: { https: true },
  plugins: [VitePWA({
    workbox: {
      cleanupOutdatedCaches: true,
    },
    registerType: 'autoUpdate',
    includeAssets: ['/js/*.{js,map}', '/model/*.{json,bin}'],
    manifest: {
      name: 'StrepScan',
      short_name: 'StrepScan',
      description: 'Web app powered by AI and camera to take images of different areas of the throat.',
      theme_color: '#ffffff',
      icons: [
        {
          src: 'icons/pwa-192x192.png',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: 'icons/pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png',
        },
        {
          src: 'icons/pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable',
        }
      ]
    }
  })]
});
