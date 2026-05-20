import { defineConfig } from 'vite';

export default defineConfig({
    base: './',
    server: {
        proxy: {
            '/api/app': {
                target: 'https://api.muapi.ai',
                changeOrigin: true,
                secure: false,
                rewrite: (path) => path.replace(/^\/api/, ''),
            },
            '/api/workflow': {
                target: 'https://api.muapi.ai',
                changeOrigin: true,
                secure: false,
                rewrite: (path) => path.replace(/^\/api/, ''),
            },
            '/api/agents': {
                target: 'https://api.muapi.ai',
                changeOrigin: true,
                secure: false,
                rewrite: (path) => path.replace(/^\/api/, ''),
            },
            '/api/api': {
                target: 'https://api.muapi.ai',
                changeOrigin: true,
                secure: false,
                rewrite: (path) => path.replace(/^\/api/, ''),
            },
            '/api': {
                target: 'https://api.muapi.ai',
                changeOrigin: true,
                secure: false,
            },
        },
    },
});
