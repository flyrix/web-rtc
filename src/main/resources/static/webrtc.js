// WebRTC Module for Audio/Video Calls

class WebRTCManager {
    constructor() {
        this.localStream = null;
        this.peerConnection = null;
        this.currentCallType = null;
        this.isCallActive = false;
        this.isInitiator = false;
        this.currentConversationId = null;
        this.currentCallerId = null;
        this.currentCalleeId = null;
        this.targetSessionId = null; // Session ID of the device we're calling/connected to
        
        // Audio for notifications
        this.audioContext = null;
        this.ringtoneInterval = null;
        this.ringtoneOscillator = null;
        this.dialInterval = null; // For dial tone ringing pattern
        
        // Connection timeout
        this.connectionTimeout = null;
        this.connectionCheckInterval = null;
        
        // DOM Elements
        this.localVideo = document.getElementById('localVideo');
        this.remoteVideo = document.getElementById('remoteVideo');
        this.videoCallOverlay = document.getElementById('videoCallOverlay');
        this.incomingCallModal = document.getElementById('incomingCallModal');
        this.callStatus = document.getElementById('callStatus');
    }

    // Initialize audio context
    initAudioContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        // Resume if suspended
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        return this.audioContext;
    }

    // Play ringtone for incoming call (continuous ring)
    playRingtone() {
        console.log('=== playRingtone called ===');
        this.stopRingtone();
        
        // Initialize audio context first (important for some browsers)
        const ctx = this.initAudioContext();
        
        // Resume audio context if suspended (needed for some browsers)
        if (ctx.state === 'suspended') {
            ctx.resume().then(() => {
                console.log('AudioContext resumed');
            }).catch(err => {
                console.error('Failed to resume AudioContext:', err);
            });
        }
        
        // Create a continuous ringtone sound
        const createRingtone = () => {
            // Check if modal is hidden or null before continuing
            if (!this.incomingCallModal) {
                console.log('No incoming call modal found');
                this.stopRingtone();
                return false;
            }
            
            const modalDisplay = this.incomingCallModal.style.display;
            if (!modalDisplay || modalDisplay === 'none' || modalDisplay === '') {
                console.log('Incoming call modal not visible, stopping ringtone');
                this.stopRingtone();
                return false;
            }
            
            try {
                // Create two oscillators for a more pleasant ringtone
                const osc1 = ctx.createOscillator();
                const osc2 = ctx.createOscillator();
                const gainNode = ctx.createGain();
                
                osc1.connect(gainNode);
                osc2.connect(gainNode);
                gainNode.connect(ctx.destination);
                
                // Classic phone ringtone - two tones alternating
                const now = ctx.currentTime;
                
                // First tone
                osc1.frequency.setValueAtTime(440, now); // A4
                osc1.type = 'sine';
                gainNode.gain.setValueAtTime(0.25, now);
                gainNode.gain.setValueAtTime(0, now + 0.25);
                
                // Second tone (after a pause)
                osc2.frequency.setValueAtTime(480, now + 0.5); // B4
                osc2.type = 'sine';
                gainNode.gain.setValueAtTime(0, now + 0.25);
                gainNode.gain.setValueAtTime(0.25, now + 0.5);
                gainNode.gain.setValueAtTime(0, now + 0.75);
                
                osc1.start(now);
                osc1.stop(now + 0.25);
                osc2.start(now + 0.5);
                osc2.stop(now + 0.75);
                
                return true;
            } catch (e) {
                console.error('Error playing ringtone:', e);
                return false;
            }
        };
        
        // Play first ring immediately
        try {
            createRingtone();
        } catch (e) {
            console.error('Error creating initial ringtone:', e);
        }
        
        // Continue playing every 1000ms (1 second - classic ringtone cadence)
        this.ringtoneInterval = setInterval(() => {
            try {
                if (!createRingtone()) {
                    this.stopRingtone();
                }
            } catch (e) {
                console.error('Error in ringtone interval:', e);
            }
        }, 1000);
        
        console.log('=== Ringtone started ===');
    }

    // Stop ringtone
    stopRingtone() {
        if (this.ringtoneInterval) {
            clearInterval(this.ringtoneInterval);
            this.ringtoneInterval = null;
            console.log('=== Ringtone stopped ===');
        }
    }

    // Play dial tone for outgoing call (with ringing pattern like real phone)
    playDialTone() {
        console.log('=== Playing dial tone with ringing pattern ===');
        this.stopDialTone(); // Stop any existing dial tone
        
        const ctx = this.initAudioContext();
        
        // Create a ringing pattern: beep-beep (1s each) - pause 2s - repeat
        const playRing = () => {
            if (this.dialOscillator) {
                try {
                    this.dialOscillator.stop();
                } catch(e) {}
            }
            
            // Create first beep
            this.dialOscillator = ctx.createOscillator();
            this.dialGainNode = ctx.createGain();
            
            this.dialOscillator.connect(this.dialGainNode);
            this.dialGainNode.connect(ctx.destination);
            
            // Ring frequency (more pleasant than pure sine)
            this.dialOscillator.frequency.setValueAtTime(440, ctx.currentTime); // A4
            this.dialOscillator.type = 'sine';
            
            // First beep: 1 second
            this.dialGainNode.gain.setValueAtTime(0.3, ctx.currentTime);
            this.dialGainNode.gain.setValueAtTime(0.3, ctx.currentTime + 0.5);
            this.dialGainNode.gain.setValueAtTime(0, ctx.currentTime + 1);
            
            this.dialOscillator.start(ctx.currentTime);
            this.dialOscillator.stop(ctx.currentTime + 1);
            
            // Second beep: 1 second after first ends
            setTimeout(() => {
                if (!this.dialOscillator || !this.dialGainNode) return;
                
                this.dialOscillator = ctx.createOscillator();
                this.dialGainNode = ctx.createGain();
                
                this.dialOscillator.connect(this.dialGainNode);
                this.dialGainNode.connect(ctx.destination);
                
                this.dialOscillator.frequency.setValueAtTime(440, ctx.currentTime);
                this.dialOscillator.type = 'sine';
                
                this.dialGainNode.gain.setValueAtTime(0.3, ctx.currentTime);
                this.dialGainNode.gain.setValueAtTime(0.3, ctx.currentTime + 0.5);
                this.dialGainNode.gain.setValueAtTime(0, ctx.currentTime + 1);
                
                this.dialOscillator.start(ctx.currentTime);
                this.dialOscillator.stop(ctx.currentTime + 1);
            }, 1000);
        };
        
        // Play first ring
        playRing();
        
        // Schedule subsequent rings every 3 seconds (1s beep + 2s pause)
        this.dialInterval = setInterval(() => {
            playRing();
        }, 3000);
        
        console.log('Dial tone ring pattern started');
    }
    
    // Stop dial tone
    stopDialTone() {
        if (this.dialOscillator) {
            try {
                this.dialOscillator.stop();
            } catch(e) {}
            this.dialOscillator = null;
        }
        if (this.dialInterval) {
            clearInterval(this.dialInterval);
            this.dialInterval = null;
        }
        this.dialGainNode = null;
    }

    // Play busy tone
    playBusyTone() {
        const ctx = this.initAudioContext();
        
        // Play short busy beeps
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.setValueAtTime(480, ctx.currentTime);
                osc.type = 'sine';
                gain.gain.setValueAtTime(0.3, ctx.currentTime);
                gain.gain.setValueAtTime(0, ctx.currentTime + 0.2);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.2);
            }, i * 300);
        }
    }

    // Play call connected sound
    playConnectSound() {
        console.log('=== Playing connect sound ===');
        try {
            const ctx = this.initAudioContext();
            
            // Two-tone connect sound
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(ctx.destination);
            
            const now = ctx.currentTime;
            osc1.frequency.setValueAtTime(500, now);
            osc2.frequency.setValueAtTime(700, now);
            osc1.type = 'sine';
            osc2.type = 'sine';
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            
            osc1.start(now);
            osc2.start(now);
            osc1.stop(now + 0.3);
            osc2.stop(now + 0.3);
            
            console.log('=== Connect sound played ===');
        } catch (e) {
            console.error('Error playing connect sound:', e);
        }
    }

    // Play call end sound
    playEndSound() {
        const ctx = this.initAudioContext();
        
        // Descending tone
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.3);
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.setValueAtTime(0, ctx.currentTime + 0.3);
        
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
    }

    // Initialize local media stream
    async initializeMedia(callType) {
        console.log('=== Initializing media for', callType, '===');
        console.log('Current URL:', window.location.href);
        console.log('Protocol:', window.location.protocol);
        console.log('Host:', window.location.host);
        
        // Check browser support
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert('Votre navigateur ne supporte pas l\'accès à la caméra/microphone.\n' +
                  'Veuillez utiliser un navigateur moderne (Chrome, Firefox, Edge, Safari).');
            throw new Error('getUserMedia not supported');
        }
        
        // Check secure context (required for getUserMedia in most browsers)
        const isSecure = window.location.protocol === 'https:' || 
                         window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1';
        
        if (!isSecure) {
            console.warn('Warning: getUserMedia on non-secure context. This may not work on some browsers.');
            // On mobile devices or some browsers, we might need HTTPS
            // For local development, we can try anyway
        }
        try {
            
            // Get audio and video constraints
            const constraints = callType === 'VIDEO' 
                ? AppConfig.mediaConstraints 
                : { 
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    }, 
                    video: false 
                };
            
            console.log('Media constraints:', JSON.stringify(constraints));
            
            this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
            
            // Log audio tracks info
            this.localStream.getAudioTracks().forEach(track => {
                console.log('Audio track:', track.label, 'enabled:', track.enabled);
            });
            
            if (this.localVideo) {
                this.localVideo.srcObject = this.localStream;
            }
            
            return this.localStream;
        } catch (error) {
            console.error('Error accessing media devices:', error);
            console.error('Error name:', error.name);
            console.error('Error message:', error.message);
            
            // Provide more specific error messages
            let errorMessage = 'Impossible d\'accéder à la caméra/microphone.\n\n';
            
            // Check if running on non-secure context
            const isSecure = window.location.protocol === 'https:' || 
                             window.location.hostname === 'localhost' || 
                             window.location.hostname === '127.0.0.1';
            
            if (!isSecure) {
                errorMessage += '⚠️ Le site n\'est pas sécurisé (HTTPS requis).\n';
                errorMessage += 'Essayez d\'accéder via https:// ou localhost\n\n';
            }
            
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                errorMessage += 'Vous avez refusé l\'accès.\n' +
                    'Veuillez autoriser l\'accès dans les paramètres du navigateur.\n' +
                    '- Chrome: Paramètres → Confidentialité → Paramètres des sites → Caméra/Microphone\n' +
                    '- Firefox: Préférences → Vie privée → Permissions\n\n' +
                    'Puis rechargez la page et réessayez.';
            } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
                errorMessage += 'Aucun périphérique trouvé.\n' +
                    'Veuillez connecter une caméra et/ou un microphone.';
            } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
                errorMessage += 'Le périphérique est déjà utilisé par une autre application.\n' +
                    'Veuillez fermer les autres applications (Skype, Zoom, WhatsApp, etc.)';
            } else if (error.name === 'OverconstrainedError') {
                errorMessage += 'Les contraintes demandées ne peuvent pas être satisfaites.\n' +
                    'Essayez un appel audio plutôt que vidéo.';
            } else {
                errorMessage += 'Erreur: ' + error.name + ' - ' + error.message;
            }
            
            alert(errorMessage);
            throw error;
        }
    }

    // Create peer connection
    createPeerConnection() {
        console.log('=== Creating peer connection ===');
        
        // Use ICE server configuration with improved settings for cross-browser compatibility
        const configuration = {
            iceServers: [
                // Google STUN servers (most reliable)
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' },
                { urls: 'stun:stun4.l.google.com:19302' }
            ],
            // Add ICE transport policy for better NAT traversal
            iceTransportPolicy: 'all',
            // Bundle policy for better performance
            bundlePolicy: 'balanced',
            // Increase candidate pool size
            iceCandidatePoolSize: 10
        };
        
        console.log('ICE servers configuration:', JSON.stringify(configuration));
        this.peerConnection = new RTCPeerConnection(configuration);
        
        // Force ICE candidate gathering to start immediately
        this.peerConnection.createDataChannel('dummy');
        
        // Add local tracks to connection
        if (this.localStream) {
            console.log('Adding', this.localStream.getTracks().length, 'tracks to peer connection');
            this.localStream.getTracks().forEach(track => {
                console.log('Adding track:', track.kind, track.label);
                this.peerConnection.addTrack(track, this.localStream);
            });
        }
        
        // Handle incoming remote tracks
        this.peerConnection.ontrack = (event) => {
            console.log('=== Received remote track ===', event.streams[0]);
            console.log('Remote track kind:', event.streams[0].getTracks().map(t => t.kind));
            this.remoteVideo.srcObject = event.streams[0];
        };
        
        // Handle ICE candidates - Filter out empty candidates
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                // Use validation method
                if (this.isValidCandidate(event.candidate)) {
                    console.log('=== Sending ICE candidate (valid) ===', event.candidate.candidate.substring(0, 50) + '...');
                    this.sendIceCandidate(event.candidate);
                } else {
                    console.log('⚠️ Invalid ICE candidate ignored');
                }
            } else {
                console.log('=== All ICE candidates sent (gathering complete) ===');
            }
        };
        
        // Handle connection state changes
        this.peerConnection.onconnectionstatechange = () => {
            console.log('=== Connection state:', this.peerConnection.connectionState, '===');
            
            switch (this.peerConnection.connectionState) {
                case 'connected':
                    this.isCallActive = true;
                    this.callStatus.textContent = 'Appel en cours...';
                    this.clearConnectionTimeout();
                    break;
                case 'disconnected':
                    console.log('Connection disconnected');
                    break;
                case 'failed':
                    console.log('Connection failed');
                    // Don't auto-end call, try to recover
                    break;
                case 'closed':
                    this.isCallActive = false;
                    break;
            }
        };
        
        // Handle ICE connection state
        this.peerConnection.oniceconnectionstatechange = () => {
            console.log('=== ICE Connection state:', this.peerConnection.iceConnectionState, '===');
            
            switch (this.peerConnection.iceConnectionState) {
                case 'connected':
                case 'completed':
                    console.log('=== ICE Connected! ===');
                    this.isCallActive = true;
                    this.callStatus.textContent = 'Appel en cours...';
                    this.clearConnectionTimeout();
                    break;
                case 'checking':
                    console.log('ICE checking...');
                    break;
                case 'disconnected':
                    console.log('ICE disconnected');
                    break;
                case 'failed':
                    console.log('ICE connection failed');
                    break;
                case 'closed':
                    this.isCallActive = false;
                    break;
            }
        };
        
        // Start connection timeout
        this.startConnectionTimeout();
        
        return this.peerConnection;
    }
    
    // Start connection timeout
    startConnectionTimeout() {
        this.clearConnectionTimeout();
        const timeout = AppConfig.callConfig.connectionTimeout || 15000;
        
        this.connectionTimeout = setTimeout(() => {
            if (!this.isCallActive) {
                console.log('Connection timeout - no connection established');
                // Don't auto-end, let user decide
                this.callStatus.textContent = 'Connexion en cours... (attente)';
            }
        }, timeout);
    }
    
    // Clear connection timeout
    clearConnectionTimeout() {
        if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
        }
    }

    // Start an outgoing call
    async startCall(conversationId, callType) {
        try {
            this.currentConversationId = conversationId;
            this.currentCallType = callType;
            this.isInitiator = true;
            
            // Get the other participant
            const conversation = window.currentConversation;
            this.currentCalleeId = window.currentUserType === 'CLIENT' 
                ? conversation.fournisseurId 
                : conversation.clientId;
            
            // Note: We don't know the callee's session ID yet, will be determined when they accept
            
            // Initialize media
            await this.initializeMedia(callType);
            
            // Create peer connection
            this.createPeerConnection();
            
            // Create offer
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);
            
            // Send call request via WebSocket
            this.sendSignalingMessage({
                type: 'call-request',
                conversationId: conversationId,
                callerId: parseInt(window.currentUserId),
                calleeId: this.currentCalleeId,
                callerSessionId: window.sessionId, // Include caller's session ID
                callType: callType,
                sdp: JSON.stringify(offer)
            });
            
            // Play dial tone
            this.playDialTone();
            
            // Show video overlay
            this.showVideoOverlay(callType);
            this.callStatus.textContent = 'Appel en cours... Sonnerie en cours...';
            
        } catch (error) {
            console.error('Error starting call:', error);
            this.cleanup();
        }
    }

    // Handle incoming call
    async handleIncomingCall(signalingData) {
        try {
            // Get current user ID
            const currentUserId = parseInt(window.currentUserId);
            
            console.log('=== handleIncomingCall ===');
            console.log('signalingData.callerId:', signalingData.callerId);
            console.log('currentUserId:', currentUserId);
            console.log('signalingData.calleeId:', signalingData.calleeId);
            console.log('========================');
            
            // Check if this is our own call request (we receive it because we're subscribed to conversation topic)
            if (signalingData.callerId === currentUserId) {
                console.log('Received our own call request, ignoring...');
                return;
            }
            
            // Also check if we're not the intended recipient
            if (signalingData.calleeId !== currentUserId) {
                console.log('Not the intended recipient, ignoring...');
                return;
            }
            
            this.currentConversationId = signalingData.conversationId;
            this.currentCallType = signalingData.callType;
            this.currentCallerId = signalingData.callerId;
            this.currentCalleeId = currentUserId;
            this.isInitiator = false;
            
            // Check if modal exists
            if (!this.incomingCallModal) {
                console.error('Incoming call modal not found!');
                // Try to get it again
                this.incomingCallModal = document.getElementById('incomingCallModal');
            }
            
            if (this.incomingCallModal) {
                // Show incoming call modal
                console.log('Showing incoming call modal...');
                this.incomingCallModal.style.display = 'flex';
                const incomingCallInfo = document.getElementById('incomingCallInfo');
                if (incomingCallInfo) {
                    const callTypeText = signalingData.callType === 'VIDEO' ? 'vidéo' : 'audio';
                    incomingCallInfo.textContent = `Appel ${callTypeText} de l'utilisateur ${signalingData.callerId}`;
                }
            } else {
                console.error('Still no incoming call modal!');
                // Fallback: use alert
                alert(`Appel entrant de l'utilisateur ${signalingData.callerId} - Type: ${signalingData.callType}`);
            }
            
            // Store the offer SDP
            this.pendingOffer = JSON.parse(signalingData.sdp);
            
            // Play ringtone
            this.playRingtone();
            
            console.log('Incoming call setup complete');
            
        } catch (error) {
            console.error('Error handling incoming call:', error);
        }
    }

    // Accept incoming call
    async acceptCall() {
        try {
            console.log('=== Accepting call ===');
            this.incomingCallModal.style.display = 'none';
            
            // Stop ringtone and play connect sound
            this.stopRingtone();
            
            // Initialize media FIRST
            await this.initializeMedia(this.currentCallType);
            
            // Create peer connection
            this.createPeerConnection();
            
            // Set remote description (the offer)
            await this.peerConnection.setRemoteDescription(
                new RTCSessionDescription(this.pendingOffer)
            );
            console.log('Remote description set');
            
            // Process any queued ICE candidates from before we had peer connection
            this.processQueuedCandidatesImmediate();
            
            // Create answer
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);
            
            // Send answer via WebSocket
            this.sendSignalingMessage({
                type: 'call-accept',
                conversationId: this.currentConversationId,
                callerId: this.currentCallerId,
                calleeId: this.currentCalleeId,
                targetSessionId: window.sessionId, // This device's session ID
                callType: this.currentCallType,
                sdp: JSON.stringify(answer)
            });
            
            // Play connect sound
            this.playConnectSound();
            
            // Show video overlay
            this.showVideoOverlay(this.currentCallType);
            this.callStatus.textContent = 'Appel en cours... Connexion en cours...';
            
            // Process queued candidates periodically
            setTimeout(() => {
                this.processQueuedCandidatesImmediate();
                console.log('ICE check at 1s after accept');
            }, 1000);
            setTimeout(() => {
                this.processQueuedCandidatesImmediate();
                console.log('ICE check at 2s after accept');
            }, 2000);
            setTimeout(() => {
                this.processQueuedCandidatesImmediate();
                console.log('ICE check at 3s after accept');
            }, 3000);
            
            // Start polling for connection
            this.pollForConnection();
            
        } catch (error) {
            console.error('Error accepting call:', error);
            this.declineCall();
        }
    }

    // Decline incoming call
    declineCall() {
        this.incomingCallModal.style.display = 'none';
        
        // Stop ringtone
        this.stopRingtone();
        
        this.sendSignalingMessage({
            type: 'call-decline',
            conversationId: this.currentConversationId,
            callerId: this.currentCallerId,
            calleeId: this.currentCalleeId,
            callType: this.currentCallType
        });
        
        this.cleanup();
    }

    // Handle call accepted (for initiator)
    async handleCallAccepted(signalingData) {
        try {
            console.log('=== handleCallAccepted called ===');
            
            // Stop dial tone when call is accepted
            this.stopDialTone();
            
            // Store the session ID of the device that accepted the call
            if (signalingData.targetSessionId) {
                this.targetSessionId = signalingData.targetSessionId;
                console.log('Target session ID set to:', this.targetSessionId);
            }
            
            // If peer connection doesn't exist (shouldn't happen), create it
            if (!this.peerConnection) {
                console.log('Creating peer connection in handleCallAccepted');
                await this.initializeMedia(this.currentCallType);
                this.createPeerConnection();
            }
            
            // Set remote description (the answer)
            const answer = new RTCSessionDescription(JSON.parse(signalingData.sdp));
            await this.peerConnection.setRemoteDescription(answer);
            console.log('Remote description set successfully');
            
            // Process any queued ICE candidates immediately
            this.processQueuedCandidatesImmediate();
            
            // Also try adding any new candidates that might have arrived since
            // Give multiple delays to ensure all candidates are received and processed
            setTimeout(() => {
                this.processQueuedCandidatesImmediate();
                console.log('ICE candidates check at 1s');
            }, 1000);
            
            setTimeout(() => {
                this.processQueuedCandidatesImmediate();
                console.log('ICE candidates check at 2s');
            }, 2000);
            
            setTimeout(() => {
                this.processQueuedCandidatesImmediate();
                console.log('ICE candidates check at 3s');
            }, 3000);
            
            setTimeout(() => {
                this.processQueuedCandidatesImmediate();
                console.log('ICE candidates check at 5s');
            }, 5000);
            
            // Force ICE gathering to restart if needed
            this.peerConnection.restartIce();
            
            // Play connect sound
            this.playConnectSound();
            
            this.callStatus.textContent = 'Appel en cours... Connexion en cours...';
            
            console.log('=== Call accepted, waiting for connection ===');
            
            // Start polling for connection state
            this.pollForConnection();
            
        } catch (error) {
            console.error('Error handling call accepted:', error);
        }
    }
    
    // Poll for connection state
    pollForConnection() {
        let attempts = 0;
        const maxAttempts = 30;
        
        const checkConnection = () => {
            attempts++;
            
            if (this.isCallActive) {
                return; // Connection already established
            }
            
            const state = this.peerConnection?.connectionState;
            const iceState = this.peerConnection?.iceConnectionState;
            
            console.log(`Connection check ${attempts}/${maxAttempts}: state=${state}, iceState=${iceState}`);
            
            if (state === 'connected' || iceState === 'connected' || iceState === 'completed') {
                this.isCallActive = true;
                this.callStatus.textContent = 'Appel en cours...';
                this.clearConnectionTimeout();
                return;
            }
            
            if (attempts < maxAttempts) {
                setTimeout(checkConnection, 1000);
            } else {
                console.log('Connection poll timed out');
                this.callStatus.textContent = 'Connexion en cours... (attente longue)'; // Updated message
            }
        };
        
        setTimeout(checkConnection, 500);
    }

    // Handle call declined
    handleCallDeclined(signalingData) {
        // Stop dial tone
        this.stopDialTone();
        
        // Play busy tone
        this.playBusyTone();
        alert('L\'appel a été refusé');
        this.cleanup();
    }

    // Handle end call
    handleEndCall(signalingData) {
        console.log('=== handleEndCall received ===', signalingData);
        
        // Play end sound
        this.playEndSound();
        
        // Hide both video overlay and incoming call modal
        this.hideVideoOverlay();
        if (this.incomingCallModal) {
            this.incomingCallModal.style.display = 'none';
        }
        
        this.cleanup();
    }

    // End current call
    endCall() {
        // Play end sound
        this.playEndSound();
        
        // Hide both video overlay and incoming call modal
        this.hideVideoOverlay();
        if (this.incomingCallModal) {
            this.incomingCallModal.style.display = 'none';
        }
        
        this.sendSignalingMessage({
            type: 'call-end',
            conversationId: this.currentConversationId,
            callerId: parseInt(window.currentUserId),
            calleeId: this.isInitiator ? this.currentCalleeId : this.currentCallerId,
            callType: this.currentCallType
        });
        
        this.cleanup();
    }

    // Validation stricte des candidats ICE
    isValidCandidate(candidate) {
        return candidate && 
               candidate.candidate && 
               candidate.candidate.trim() !== '' &&
               candidate.candidate.includes('typ');
    }

    // Send ICE candidate - with validation
    sendIceCandidate(candidate) {
        // Use the validation method
        if (!this.isValidCandidate(candidate)) {
            console.log('⚠️ Invalid candidate, not sent');
            return;
        }
        
        console.log('📤 Sending valid candidate:', candidate.candidate.substring(0, 60) + '...');
        
        this.sendSignalingMessage({
            type: 'ice-candidate',
            conversationId: this.currentConversationId,
            callerId: parseInt(window.currentUserId),
            calleeId: this.isInitiator ? this.currentCalleeId : this.currentCallerId,
            targetSessionId: this.targetSessionId, // Target specific device
            candidate: JSON.stringify(candidate)
        });
    }

    // Handle received ICE candidate
    async handleIceCandidate(candidateData) {
        try {
            console.log('=== handleIceCandidate called ===', candidateData);
            
            // Parse the candidate - handle both string and object formats
            let candidate;
            let candidateObj;
            try {
                candidateObj = typeof candidateData.candidate === 'string' 
                    ? JSON.parse(candidateData.candidate) 
                    : candidateData.candidate;
                
                // Use validation method
                if (!this.isValidCandidate(candidateObj)) {
                    console.log('⚠️ Invalid ICE candidate received - end of candidates or malformed');
                    // Trigger the ICE gathering to complete
                    if (this.peerConnection) {
                        this.peerConnection.addIceCandidate(new RTCIceCandidate({candidate: ''})).catch(() => {});
                    }
                    return;
                }
                
                console.log('✅ Valid candidate received:', candidateObj.candidate.substring(0, 50) + '...');
                candidate = new RTCIceCandidate(candidateObj);
            } catch (e) {
                console.error('Error parsing ICE candidate:', e);
                return;
            }
            
            // If peer connection doesn't exist yet, queue the candidate
            if (!this.peerConnection) {
                console.log('Peer connection not ready, queuing ICE candidate');
                if (!this.queuedCandidates) {
                    this.queuedCandidates = [];
                }
                this.queuedCandidates.push(candidateObj);
                console.log('Queued candidates count:', this.queuedCandidates.length);
                return;
            }
            
            // Check if remote description is set - if not, queue
            if (!this.peerConnection.remoteDescription || !this.peerConnection.remoteDescription.sdp) {
                console.log('Remote description not set yet, queuing ICE candidate');
                if (!this.queuedCandidates) {
                    this.queuedCandidates = [];
                }
                this.queuedCandidates.push(candidateObj);
                console.log('Queued candidates count:', this.queuedCandidates.length);
                return;
            }
            
            // Remote description is set, add candidate directly
            console.log('Adding ICE candidate directly');
            await this.peerConnection.addIceCandidate(candidate);
            console.log('ICE candidate added successfully');
            
            // Also process any queued candidates immediately
            this.processQueuedCandidatesImmediate();
            
        } catch (error) {
            console.error('Error adding ICE candidate:', error);
        }
    }
    
    // Process queued ICE candidates - synchronous version
    processQueuedCandidatesImmediate() {
        if (!this.queuedCandidates || this.queuedCandidates.length === 0) {
            return;
        }
        
        if (!this.peerConnection) {
            return;
        }
        
        if (!this.peerConnection.remoteDescription || !this.peerConnection.remoteDescription.sdp) {
            return;
        }
        
        console.log('Processing', this.queuedCandidates.length, 'queued ICE candidates');
        const candidatesToProcess = [...this.queuedCandidates];
        this.queuedCandidates = [];
        
        for (const candidate of candidatesToProcess) {
            try {
                const iceCandidate = candidate instanceof RTCIceCandidate ? candidate : new RTCIceCandidate(candidate);
                this.peerConnection.addIceCandidate(iceCandidate);
                console.log('Queued candidate added');
            } catch (e) {
                console.error('Error adding queued candidate:', e);
            }
        }
    }

    // Handle received offer (for non-initiator)
    async handleOffer(signalingData) {
        try {
            const offer = new RTCSessionDescription(JSON.parse(signalingData.sdp));
            await this.peerConnection.setRemoteDescription(offer);
            
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);
            
            this.sendSignalingMessage({
                type: 'answer',
                conversationId: this.currentConversationId,
                callerId: this.currentCallerId,
                calleeId: this.currentCalleeId,
                sdp: JSON.stringify(answer)
            });
            
        } catch (error) {
            console.error('Error handling offer:', error);
        }
    }

    // Handle received answer (for initiator)
    async handleAnswer(signalingData) {
        try {
            const answer = new RTCSessionDescription(JSON.parse(signalingData.sdp));
            await this.peerConnection.setRemoteDescription(answer);
        } catch (error) {
            console.error('Error handling answer:', error);
        }
    }

    // Send signaling message via WebSocket
    sendSignalingMessage(message) {
        if (window.stompClient && window.stompClient.connected) {
            window.stompClient.send(
                `/app/call/${this.currentConversationId}`,
                {},
                JSON.stringify(message)
            );
        }
    }

    // Show video overlay
    showVideoOverlay(callType) {
        this.videoCallOverlay.style.display = 'flex';
        
        // Update video labels based on user type
        const localLabel = document.getElementById('localVideoLabel');
        const remoteLabel = document.getElementById('remoteVideoLabel');
        
        // Determine labels based on who is calling whom
        const currentUserId = parseInt(window.currentUserId);
        
        if (this.isInitiator) {
            // We're calling someone (either client calling supplier or supplier calling client)
            if (window.currentUserType === 'CLIENT') {
                localLabel.textContent = 'Vous (Client)';
                remoteLabel.textContent = 'Fournisseur';
            } else {
                localLabel.textContent = 'Vous (Fournisseur)';
                remoteLabel.textContent = 'Client';
            }
        } else {
            // Someone is calling us
            if (window.currentUserType === 'CLIENT') {
                localLabel.textContent = 'Vous (Client)';
                remoteLabel.textContent = 'Fournisseur';
            } else {
                localLabel.textContent = 'Vous (Fournisseur)';
                remoteLabel.textContent = 'Client';
            }
        }
        
        // Hide video elements if audio only
        if (callType === 'AUDIO') {
            this.localVideo.style.display = 'none';
            this.remoteVideo.style.display = 'none';
        } else {
            this.localVideo.style.display = 'block';
            this.remoteVideo.style.display = 'block';
        }
    }

    // Hide video overlay
    hideVideoOverlay() {
        this.videoCallOverlay.style.display = 'none';
    }

    // Cleanup resources
    cleanup() {
        console.log('=== Cleanup called ===');
        
        // Stop dial tone if playing
        this.stopDialTone();
        
        // Clear connection timeout
        this.clearConnectionTimeout();
        
        this.hideVideoOverlay();
        this.incomingCallModal.style.display = 'none';
        
        // Stop local stream
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        
        // Close peer connection
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        
        // Clear video elements
        if (this.localVideo) this.localVideo.srcObject = null;
        if (this.remoteVideo) this.remoteVideo.srcObject = null;
        
        // Reset state
        this.isCallActive = false;
        this.currentConversationId = null;
        this.currentCallType = null;
        this.pendingOffer = null;
        this.queuedCandidates = [];
    }
}

// Create global WebRTC manager instance
window.webrtcManager = new WebRTCManager();
