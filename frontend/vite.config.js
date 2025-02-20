
const { defineConfig } = require('vite')
const react = require('@vitejs/plugin-react')
const path = require('path')

module.exports = defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    target: 'es2015',
    commonjsOptions: {
      include: /node_modules/
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})