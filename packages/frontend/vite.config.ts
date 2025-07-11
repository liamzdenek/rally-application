/// <reference types='vitest' />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    root: __dirname,
    cacheDir: '../../node_modules/.vite/packages/frontend',
    server: {
      port: 4200,
      host: 'localhost',
    },
    preview: {
      port: 4300,
      host: 'localhost',
    },
    plugins: [react(), nxViteTsPaths(), nxCopyAssetsPlugin(['*.md'])],
    
    // Define environment variables available to the client
    define: {
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(
        env.VITE_API_BASE_URL || 'https://z1r1s9h73b.execute-api.us-west-2.amazonaws.com/prod'
      ),
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(
        process.env.npm_package_version || '1.0.0'
      ),
      'import.meta.env.VITE_APP_NAME': JSON.stringify('RallyUXR'),
    },
    
    // Uncomment this if you are using workers.
    // worker: {
    //  plugins: [ nxViteTsPaths() ],
    // },
    
    build: {
      outDir: '../../dist/packages/frontend',
      emptyOutDir: true,
      reportCompressedSize: true,
      commonjsOptions: {
        transformMixedEsModules: true,
      },
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            router: ['@tanstack/react-router'],
            charts: ['recharts'],
            shared: ['@rallyuxr/shared'],
          },
        },
      },
      // Optimize for production
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: mode === 'production',
          drop_debugger: mode === 'production',
        },
      },
      // Generate source maps for debugging
      sourcemap: mode !== 'production',
      // Set asset file names
      assetsDir: 'assets',
      chunkSizeWarningLimit: 1000,
    },
    
    // Environment variable prefix
    envPrefix: 'VITE_',
  };
});
