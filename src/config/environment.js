// Environment configuration
export const ENV = {
    // Detect if we're in development (localhost) or production
    isDevelopment: () => {
        return window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1' ||
            window.location.hostname.includes('localhost')
    },

    isProduction: () => {
        return !ENV.isDevelopment()
    },

    // Get the appropriate signaling server URL
    getSignalingUrl: () => {
        if (ENV.isDevelopment()) {
            return 'ws://localhost:3001'
        } else {
            return '/api/socket'
        }
    },

    // Get the appropriate signaling method
    getSignalingMethod: () => {
        return ENV.isDevelopment() ? 'websocket' : 'http-polling'
    },

    // Get the appropriate component to use
    getVideoChatComponent: () => {
        return ENV.isDevelopment() ? 'VideoChatLocal' : 'VideoChatProduction'
    },

    // Development settings
    development: {
        signalingServer: 'ws://localhost:3001',
        signalingMethod: 'websocket',
        component: 'VideoChatLocal'
    },

    // Production settings
    production: {
        signalingServer: '/api/socket',
        signalingMethod: 'http-polling',
        component: 'VideoChatProduction'
    }
}

export default ENV 