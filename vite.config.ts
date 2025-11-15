import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { existsSync, readdirSync, statSync, unlinkSync, renameSync, copyFileSync } from "fs";

// Files that are in blob storage and should NOT be copied to build
const DATA_FILES_TO_EXCLUDE = [
  'master_data.csv',
  'sites_data.csv',
  'contacts_data.csv',
  'users.json',
];

// Plugin to exclude data files from public directory during build
// These files are hosted in Azure Blob Storage, not in the static web app
const excludeDataFilesPlugin = () => {
  let tempFiles: string[] = [];

  return {
    name: 'exclude-data-files',
    buildStart() {
      // Temporarily rename data files in public directory to prevent Vite from copying them
      const publicDir = path.resolve(__dirname, 'public');
      if (existsSync(publicDir)) {
        const files = readdirSync(publicDir);
        files.forEach(file => {
          const filePath = path.join(publicDir, file);
          try {
            const stat = statSync(filePath);
            if (stat.isFile()) {
              // Temporarily rename CSV, JSON, and PDF files to prevent copying
              if (DATA_FILES_TO_EXCLUDE.includes(file) ||
                  file.endsWith('.pdf') ||
                  (file.endsWith('.csv') && DATA_FILES_TO_EXCLUDE.includes(file))) {
                const tempPath = filePath + '.excluded';
                renameSync(filePath, tempPath);
                tempFiles.push(tempPath);
                console.log(`Temporarily excluded ${file} from build (hosted in blob storage)`);
              }
            }
          } catch (err) {
            // Ignore errors
          }
        });
      }
    },
    closeBundle() {
      // Restore original file names after build
      tempFiles.forEach(tempPath => {
        try {
          const originalPath = tempPath.replace('.excluded', '');
          if (existsSync(tempPath)) {
            renameSync(tempPath, originalPath);
          }
        } catch (err) {
          // Ignore errors
        }
      });
      tempFiles = [];

      // Also remove any data files that might have been copied (safety net)
      const buildDir = path.resolve(__dirname, 'build');
      const removeDataFiles = (dir: string) => {
        if (!existsSync(dir)) return;
        const items = readdirSync(dir);
        items.forEach(item => {
          const itemPath = path.join(dir, item);
          try {
            const stat = statSync(itemPath);
            if (stat.isFile()) {
              if (DATA_FILES_TO_EXCLUDE.includes(item) ||
                  item.endsWith('.pdf') ||
                  (item.endsWith('.csv') && DATA_FILES_TO_EXCLUDE.includes(item))) {
                unlinkSync(itemPath);
                console.log(`Removed ${itemPath} from build (hosted in blob storage)`);
              }
            } else if (stat.isDirectory()) {
              removeDataFiles(itemPath);
            }
          } catch (err) {
            // Ignore errors
          }
        });
      };
      removeDataFiles(buildDir);

      // Copy staticwebapp.config.json to build directory for Azure Static Web Apps
      try {
        const configSource = path.resolve(__dirname, 'staticwebapp.config.json');
        const configDest = path.join(buildDir, 'staticwebapp.config.json');
        if (existsSync(configSource)) {
          copyFileSync(configSource, configDest);
          console.log('Copied staticwebapp.config.json to build directory');
        }
      } catch (err) {
        console.warn('Failed to copy staticwebapp.config.json:', err);
      }
    },
  };
};

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    excludeDataFilesPlugin(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: 'build', // Output to 'build' to match Azure Static Web Apps configuration
    // Disable source maps for production to reduce file count
    sourcemap: false,
    // Optimize chunk splitting - consolidate into fewer files
    rollupOptions: {
      output: {
        // Consolidate ALL code into minimal chunks to minimize file count
        manualChunks: () => {
          // Put everything into a single vendor chunk to minimize file count
          return 'vendor';
        },
        // Minimize asset files - consolidate all assets into a single directory with minimal naming
        assetFileNames: (assetInfo) => {
          // All assets go to assets/ with a hash to prevent conflicts
          // Vite will inline small assets automatically based on assetsInlineLimit
          return 'assets/[name]-[hash:8][extname]';
        },
        // Minimize chunk file names
        chunkFileNames: 'assets/[name]-[hash:8].js',
        entryFileNames: 'assets/[name]-[hash:8].js',
      },
    },
    // Reduce chunk size warnings
    chunkSizeWarningLimit: 2000,
    // DON'T copy public directory - data files are in blob storage
    copyPublicDir: false,
    // Minimize CSS output
    cssCodeSplit: false, // Put all CSS in a single file
    // Aggressively inline assets to minimize file count - inline everything under 50KB
    assetsInlineLimit: 51200, // Inline assets smaller than 50KB (most icons, small images, fonts)
  },
  // Public directory disabled to prevent copying data files
  publicDir: false,
});
