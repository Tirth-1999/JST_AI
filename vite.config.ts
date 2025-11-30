import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate Plotly into its own chunk (loaded only when needed)
          plotly: ['plotly.js-basic-dist-min'],
          // Excel processing library
          excel: ['exceljs'],
          // Vendor libraries (axios, papaparse)
          vendor: ['axios', 'papaparse'],
        },
      },
    },
    // Increase chunk size warning limit since Plotly and ExcelJS are 
    // intentionally large but loaded only when needed (dynamic imports)
    chunkSizeWarningLimit: 1500,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['plotly.js-basic-dist-min', 'exceljs', 'axios', 'papaparse'],
  },
});
