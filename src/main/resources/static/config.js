// Configuration for the Communication Module

// Get current host dynamically
const currentHost = window.location.host;

const AppConfig = {
    // API Configuration - Use dynamic host
    apiBaseUrl: 'http://' + currentHost,
    
    // WebSocket Configuration - Use dynamic host
    wsBaseUrl: 'http://' + currentHost + '/ws-communication',
    
    // STUN/TURN Servers for WebRTC - More reliable servers for cross-browser compatibility
    iceServers: {
        iceServers: [
            // Google STUN servers (most reliable)
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' },
            // Twilio STUN (fallback)
            { urls: 'stun:global.stun.twilio.com:3478' }
        ],
        iceCandidatePoolSize: 10
    },
    
    // Media Constraints - Simplified for better compatibility
    mediaConstraints: {
        video: {
            width: { ideal: 640, max: 1280 },
            height: { ideal: 480, max: 720 },
            frameRate: { ideal: 15, max: 30 }
        },
        audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
        }
    },
    
    // Call Configuration
    callConfig: {
        ringingTimeout: 30000, // 30 seconds
        callTimeout: 300000,    // 5 minutes
        connectionTimeout: 30000 // 30 seconds for ICE connection (increased for cross-browser)
    }
};
