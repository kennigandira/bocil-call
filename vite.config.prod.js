import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
    plugins: [vue()],
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
        include: []
    },
    esbuild: {
        target: 'es2020'
    },
    define: {
        __ENV__: '"production"'
    }
}) 