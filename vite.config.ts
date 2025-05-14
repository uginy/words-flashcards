import path from "node:path"; // Added for shadcn/ui and fixed lint error
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: { // Added for shadcn/ui
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
