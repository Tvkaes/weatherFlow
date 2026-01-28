import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['weatherflow-icon.svg'],
      manifest: {
        name: 'WeatherFlow',
        short_name: 'WeatherFlow',
        description: 'WeatherFlow — immersive weather insights with dynamic atmospherics.',
        theme_color: '#0b0f1a',
        background_color: '#060912',
        display: 'standalone',
        start_url: '/',
        lang: 'en',
        icons: [
          {
            src: '/weatherflow-icon.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
          {
            src: '/weatherflow-icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    proxy: {
      '/freellm': {
        target: 'https://apifreellm.com',
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/freellm/, ''),
      },
      '/open-meteo': {
        target: 'https://api.open-meteo.com',
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/open-meteo/, ''),
      },
      '/geocoding-api': {
        target: 'https://geocoding-api.open-meteo.com',
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/geocoding-api/, ''),
      },
    },
  },
});
