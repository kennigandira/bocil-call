import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
    plugins: [vue()],
    server: {
        port: 3000,
        host: true,
        proxy: {
            '/api/socket': {
                target: 'http://localhost:3001',
                changeOrigin: true,
                secure: false
            }
        }
    },
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        rollupOptions: {
            output: {
                manualChunks: undefined
            }
        }
    },
    optimizeDeps: {
        include: ['socket.io-client']
    },
    esbuild: {
        target: 'es2020'
    }
}) 