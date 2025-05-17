import path from "node:path";
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';

const packageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'));

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const define: Record<string, string> = {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(packageJson.version),
  };

  for (const key in env) {
    if (Object.prototype.hasOwnProperty.call(env, key)) {
      define[`import.meta.env.${key}`] = JSON.stringify(env[key]);
    }
  }

  return {
    define,
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
  };
});
