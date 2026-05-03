import react from '@vitejs/plugin-react'
import path from 'path'
import {defineConfig, loadEnv} from 'vite'
import {VitePWA} from 'vite-plugin-pwa'

export default defineConfig(({mode}) => {
    const env = loadEnv(mode, process.cwd(), '')

    return {
        server: {
            host: true,
            proxy: {
                '/api': {
                    target: 'http://localhost:3000',
                    rewrite: (path) => path.replace(/^\/api/, ''),
                },
            },
        },
        plugins: [
            react(),
            VitePWA({
                registerType: 'autoUpdate',
                includeAssets: ['icons/*.png'],
                manifest: {
                    name: 'Dance Manager',
                    short_name: 'DanceMgr',
                    description: 'Dance class abonement manager',
                    theme_color: '#18181b',
                    background_color: '#18181b',
                    display: 'standalone',
                    orientation: 'portrait',
                    start_url: '/',
                    icons: [
                        {src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png'},
                        {src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png'}
                    ]
                },
                workbox: {
                    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
                    runtimeCaching: [
                        {
                            urlPattern: ({url}) => {
                                const apiBase = env.VITE_API_BASE_URL || ''
                                if (!apiBase) return url.pathname.startsWith('/api')
                                try {
                                    return url.origin === new URL(apiBase).origin
                                } catch {
                                    return false
                                }
                            },
                            handler: 'NetworkFirst',
                            options: {
                                cacheName: 'api-cache',
                                networkTimeoutSeconds: 4,
                                expiration: {
                                    maxEntries: 200,
                                    maxAgeSeconds: 60 * 60 * 24
                                }
                            }
                        }
                    ]
                }
            })
        ],
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src')
            }
        }
    }
})
