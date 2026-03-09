// Main Application JavaScript

// Generate unique session ID for this device
function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Application State
window.currentUserId = '14';
window.currentUserType = 'CLIENT'; // CLIENT or FOURNISSEUR
window.currentConversation = null;
window.stompClient = null;
window.sessionId = generateSessionId(); // Unique session ID for this device

console.log('Session ID:', window.sessionId);

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function initializeApp() {
    console.log('Initializing Communication Module...');
    
    // Connect to WebSocket
    await connectWebSocket();
    
    // Load orders
    loadOrders();
    
    // Load conversations
    loadConversations();
    
    console.log('Application initialized');
}

// Switch between client and supplier roles (for demo purposes)
function switchUser() {
    if (window.currentUserType === 'CLIENT') {
        window.currentUserType = 'FOURNISSEUR';
        window.currentUserId = '7';
    } else {
        window.currentUserType = 'CLIENT';
        window.currentUserId = '14';
    }
    
    document.getElementById('currentUser').textContent = 
        'Utilisateur: ' + window.currentUserType + ' (ID: ' + window.currentUserId + ')';
    
    // Reconnect WebSocket with new user ID to receive calls
    connectWebSocket().then(() => {
        // Load orders
        loadOrders();
        
        // Load conversations
        loadConversations();
    });
}

// WebSocket Connection
async function connectWebSocket() {
    return new Promise((resolve, reject) => {
        const socket = new SockJS(AppConfig.wsBaseUrl);
        window.stompClient = Stomp.over(socket);
        
        window.stompClient.connect({}, (frame) => {
            console.log('Connected to WebSocket');
            
            // Subscribe to conversation messages
            subscribeToConversation();
            
            // Subscribe to user-specific notifications
            subscribeToUserQueue();
            
            resolve();
        }, (error) => {
            console.error('WebSocket connection error:', error);
            reject(error);
        });
    });
}

// Subscribe to conversation topic
function subscribeToConversation() {
    // This will be updated when a conversation is selected
    console.log('Conversation subscription ready');
}

// Subscribe to user queue for calls and notifications (receives calls even without selecting a conversation)
// Now uses session ID to identify each device uniquely
function subscribeToUserQueue() {
    const userId = window.currentUserId;
    const sessionId = window.sessionId;
    
    // Subscribe to session-specific topic for call notifications
    // This ensures only the specific device receives the call
    window.stompClient.subscribe('/topic/user/' + userId + '/session/' + sessionId + '/calls', (message) => {
        const signalingData = JSON.parse(message.body);
        console.log('>>> Received call notification for session', sessionId, ':', signalingData);
        handleSignalingMessage(signalingData);
    });
    
    console.log('=== Subscribed to user queue for', userId, 'session', sessionId, '===');
}

// Handle signaling messages
function handleSignalingMessage(signalingData) {
    console.log('Received signaling message:', signalingData);
    
    switch (signalingData.type) {
        case 'call-request':
            window.webrtcManager.handleIncomingCall(signalingData);
            break;
        case 'call-accept':
            window.webrtcManager.handleCallAccepted(signalingData);
            break;
        case 'call-decline':
            window.webrtcManager.handleCallDeclined(signalingData);
            break;
        case 'call-end':
            window.webrtcManager.handleEndCall(signalingData);
            break;
        case 'ice-candidate':
            console.log('ICE candidate received, calling handler');
            window.webrtcManager.handleIceCandidate(signalingData);
            break;
    }
}

// Handle WebRTC signaling (SDP, ICE candidates)
function handleWebRTCSignaling(signalingData) {
    console.log('Received WebRTC signaling:', signalingData);
    
    switch (signalingData.type) {
        case 'offer':
            window.webrtcManager.handleOffer(signalingData);
            break;
        case 'answer':
            window.webrtcManager.handleAnswer(signalingData);
            break;
        case 'ice-candidate':
            window.webrtcManager.handleIceCandidate(signalingData);
            break;
    }
}

// Load conversations from API
async function loadConversations() {
    try {
        const endpoint = window.currentUserType === 'CLIENT' 
            ? '/api/conversations/client/' + window.currentUserId
            : '/api/conversations/fournisseur/' + window.currentUserId;
        
        const response = await fetch(AppConfig.apiBaseUrl + endpoint);
        
        if (!response.ok) {
            throw new Error('Failed to load conversations');
        }
        
        const conversations = await response.json();
        displayConversations(conversations);
        
    } catch (error) {
        console.error('Error loading conversations:', error);
    }
}

// Display conversations in the list
function displayConversations(conversations) {
    const container = document.getElementById('conversations');
    
    // Check if container exists
    if (!container) {
        console.error('Conversations container not found');
        return;
    }
    
    if (!conversations || conversations.length === 0) {
        container.innerHTML = '<p class="empty-message">Aucune conversation</p>';
        return;
    }
    
    let html = '';
    for (const conv of conversations) {
        const otherPartyId = window.currentUserType === 'CLIENT' ? conv.fournisseurId : conv.clientId;
        const otherPartyLabel = window.currentUserType === 'CLIENT' ? 'Fournisseur' : 'Client';
        
        html += '<div class="conversation-item" onclick="selectConversation(' + conv.commandeId + ')">';
        html += '<div class="conversation-header">';
        html += '<span class="commande-id">Commande #' + conv.commandeId + '</span>';
        html += '<span class="last-message-time">' + formatDate(conv.lastMessageDate) + '</span>';
        html += '</div>';
        html += '<div class="participant-info">';
        html += '<span>' + otherPartyLabel + ' ID: ' + otherPartyId + '</span>';
        html += '</div>';
        html += '</div>';
    }
    
    container.innerHTML = html;
}

// Select a conversation
async function selectConversation(commandeId) {
    try {
        const response = await fetch(AppConfig.apiBaseUrl + '/api/conversations/by-commande/' + commandeId);
        
        if (!response.ok) {
            throw new Error('Conversation not found');
        }
        
        window.currentConversation = await response.json();
        
        // Show chat area with null checks
        const conversationList = document.getElementById('conversationList');
        const chatArea = document.getElementById('chatArea');
        
        if (conversationList) {
            conversationList.style.display = 'none';
        }
        if (chatArea) {
            chatArea.style.display = 'flex';
        }
        
        // Update chat header
        const commandeIdElement = document.getElementById('commandeId');
        if (commandeIdElement) {
            commandeIdElement.textContent = window.currentConversation.commandeId;
        }
        
        // Subscribe to conversation topic
        subscribeToConversationTopic(window.currentConversation.conversationId);
        
        // Load messages
        loadMessages(window.currentConversation.conversationId);
        
    } catch (error) {
        console.error('Error selecting conversation:', error);
    }
}

// Subscribe to specific conversation topic
function subscribeToConversationTopic(conversationId) {
    console.log('=== Subscribing to conversation', conversationId, 'as user', window.currentUserId, '===');
    
    // Subscribe to messages
    window.stompClient.subscribe('/topic/conversation/' + conversationId, (message) => {
        const messageData = JSON.parse(message.body);
        displayNewMessage(messageData);
    });
    
    // Subscribe to call notifications
    window.stompClient.subscribe('/topic/conversation/' + conversationId + '/call', (message) => {
        const signalingData = JSON.parse(message.body);
        console.log('>>> Received call notification for user', window.currentUserId, ':', signalingData);
        handleSignalingMessage(signalingData);
    });
    
    console.log('=== Subscription complete ===');
}

// Load messages for a conversation
async function loadMessages(conversationId) {
    try {
        const response = await fetch(AppConfig.apiBaseUrl + '/api/conversations/' + conversationId + '/messages');
        
        if (!response.ok) {
            throw new Error('Failed to load messages');
        }
        
        const messages = await response.json();
        displayMessages(messages);
        
        // Mark messages as read
        markMessagesAsRead(conversationId);
        
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

// Display messages in the chat
function displayMessages(messages) {
    const container = document.getElementById('messagesContainer');
    
    // Check if container exists
    if (!container) {
        console.error('Messages container not found');
        return;
    }
    
    if (!messages || messages.length === 0) {
        container.innerHTML = '<p class="empty-message">Aucun message</p>';
        return;
    }
    
    let html = '';
    for (const msg of messages) {
        html += createMessageHTML(msg);
    }
    
    container.innerHTML = html;
    
    // Scroll to bottom
    scrollToBottom();
}

// Create HTML for a single message
function createMessageHTML(msg) {
    const isSent = msg.senderType === window.currentUserType;
    const isSystem = msg.senderType === 'SYSTEM';
    
    let className = 'message';
    if (isSystem) {
        className += ' system';
    } else {
        className += isSent ? ' sent' : ' received';
    }
    
    return '<div class="' + className + '">' +
        '<div class="message-header">' +
        '<span>' + msg.senderType + '</span>' +
        '<span>' + formatTime(msg.dateEnvoi) + '</span>' +
        '</div>' +
        '<div class="message-content">' + escapeHtml(msg.message) + '</div>' +
        '</div>';
}

// Display new incoming message
function displayNewMessage(messageData) {
    const container = document.getElementById('messagesContainer');
    
    if (!container) {
        console.error('Messages container not found');
        return;
    }
    
    // Remove empty message if present
    const emptyMessage = container.querySelector('.empty-message');
    if (emptyMessage) {
        emptyMessage.remove();
    }
    
    // Add new message
    container.innerHTML += createMessageHTML(messageData);
    
    // Scroll to bottom
    scrollToBottom();
    
    // Mark as read
    if (window.currentConversation) {
        markMessagesAsRead(window.currentConversation.conversationId);
    }
}

// Back to orders list
function backToOrders() {
    const ordersSection = document.getElementById('ordersSection');
    const chatArea = document.getElementById('chatArea');
    
    if (ordersSection) {
        ordersSection.style.display = 'block';
    }
    if (chatArea) {
        chatArea.style.display = 'none';
    }
    
    // Unsubscribe from conversation topic if needed
    window.currentConversation = null;
}

// Send a message
function sendMessage() {
    const input = document.getElementById('messageInput');
    
    if (!input) {
        console.error('Message input not found');
        return;
    }
    
    const message = input.value.trim();
    
    if (!message) return;
    if (!window.currentConversation) {
        alert('Veuillez selectionner une conversation');
        return;
    }
    
    const messageData = {
        senderId: parseInt(window.currentUserId),
        senderType: window.currentUserType,
        message: message
    };
    
    // Send via WebSocket
    window.stompClient.send(
        '/app/chat/' + window.currentConversation.conversationId,
        {},
        JSON.stringify(messageData)
    );
    
    // Clear input
    input.value = '';
}

// Handle enter key press
function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

// Start a call
async function startCall(callType) {
    if (!window.currentConversation) {
        alert('Veuillez selectionner une conversation');
        return;
    }
    
    await window.webrtcManager.startCall(window.currentConversation.conversationId, callType);
}

// Accept incoming call
async function acceptCall() {
    await window.webrtcManager.acceptCall();
}

// Decline incoming call
function declineCall() {
    window.webrtcManager.declineCall();
}

// End current call
function endCall() {
    window.webrtcManager.endCall();
}

// Mark messages as read
async function markMessagesAsRead(conversationId) {
    try {
        await fetch(
            AppConfig.apiBaseUrl + '/api/conversations/' + conversationId + '/read?userId=' + window.currentUserId,
            { method: 'POST' }
        );
    } catch (error) {
        console.error('Error marking messages as read:', error);
    }
}

// Show conversation list
function showConversationList() {
    document.getElementById('chatArea').style.display = 'none';
    document.getElementById('conversationList').style.display = 'block';
    window.currentConversation = null;
    
    // Reload conversations
    loadConversations();
}

// Scroll messages to bottom
function scrollToBottom() {
    const container = document.getElementById('messagesContainer');
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
}

// Format date
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR');
}

// Format time
function formatTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Show new conversation modal
function showNewConversationModal() {
    document.getElementById('newConversationModal').style.display = 'flex';
}

// Close modal
function closeModal() {
    document.getElementById('newConversationModal').style.display = 'none';
}

// Create new conversation
async function createConversation() {
    const commandeId = document.getElementById('newCommandeId').value;
    const clientId = document.getElementById('newClientId').value;
    const fournisseurId = document.getElementById('newFournisseurId').value;
    
    if (!commandeId || !clientId || !fournisseurId) {
        alert('Veuillez remplir tous les champs');
        return;
    }
    
    try {
        const response = await fetch(
            AppConfig.apiBaseUrl + '/api/conversations?commandeId=' + commandeId + '&clientId=' + clientId + '&fournisseurId=' + fournisseurId,
            { method: 'POST' }
        );
        
        if (!response.ok) {
            throw new Error('Failed to create conversation');
        }
        
        const conversation = await response.json();
        
        // Close modal
        closeModal();
        
        // Clear inputs
        document.getElementById('newCommandeId').value = '';
        document.getElementById('newClientId').value = '';
        document.getElementById('newFournisseurId').value = '';
        
        // Select the new conversation
        selectConversation(conversation.commandeId);
        
        // Reload conversations list
        loadConversations();
        
    } catch (error) {
        console.error('Error creating conversation:', error);
        alert('Erreur lors de la creation de la conversation');
    }
}

// =============================================
// ORDERS SECTION - New Flow
// =============================================

// Simulated orders (in a real app, this would come from an API)
const mockOrders = [
    { id: 2045, clientId: 14, fournisseurId: 7, produit: 'Ordinateur Portable', montant: 1200, statut: 'pending' },
    { id: 2046, clientId: 14, fournisseurId: 7, produit: 'Souris Sans Fil', montant: 45, statut: 'confirmed' },
    { id: 2047, clientId: 14, fournisseurId: 8, produit: 'Clavier Mécanique', montant: 89, statut: 'delivered' }
];

// Current order being used for call
window.currentOrderForCall = null;

// Load orders
function loadOrders() {
    const container = document.getElementById('ordersList');
    
    // Filter orders based on current user
    let userOrders = mockOrders;
    if (window.currentUserType === 'CLIENT') {
        userOrders = mockOrders.filter(o => o.clientId == window.currentUserId);
    } else {
        userOrders = mockOrders.filter(o => o.fournisseurId == window.currentUserId);
    }
    
    if (userOrders.length === 0) {
        container.innerHTML = '<p class="empty-orders">Aucune commande</p>';
        return;
    }
    
    let html = '';
    for (const order of userOrders) {
        const statusClass = order.statut;
        const statusLabel = {
            'pending': 'En attente',
            'confirmed': 'Confirmé',
            'delivered': 'Livré'
        }[order.statut];
        
        html += '<div class="order-item">';
        html += '<div class="order-info">';
        html += '<span class="order-id">Commande #' + order.id + '</span>';
        html += '<span class="order-details">' + order.produit + ' - ' + order.montant + '€</span>';
        html += '</div>';
        html += '<div style="display: flex; align-items: center; gap: 10px;">';
        html += '<span class="order-status ' + statusClass + '">' + statusLabel + '</span>';
        
        // Button to contact - only show for the relevant party
        const showContact = window.currentUserType === 'CLIENT' 
            ? (order.clientId == window.currentUserId && order.fournisseurId == 7)
            : (order.fournisseurId == window.currentUserId && order.clientId == 14);
        
        if (showContact) {
            // Determine who to contact based on user type
            const contactLabel = window.currentUserType === 'CLIENT' ? 'le fournisseur' : 'le client';
            html += '<button class="btn-contact" onclick="showCallOptions(' + order.id + ', ' + order.fournisseurId + ')">';
            html += '<span class="contact-icon">📞</span>';
            html += '<span>Contacter ' + contactLabel + '</span>';
            html += '</button>';
        }
        
        html += '</div>';
        html += '</div>';
    }
    
    container.innerHTML = html;
}

// Show call options modal
function showCallOptions(commandeId, fournisseurId) {
    window.currentOrderForCall = {
        commandeId: commandeId,
        clientId: window.currentUserId,
        fournisseurId: fournisseurId
    };
    
    document.getElementById('callOptionsCommandeId').textContent = commandeId;
    document.getElementById('callOptionsModal').style.display = 'flex';
}

// Close call options modal
function closeCallOptionsModal() {
    document.getElementById('callOptionsModal').style.display = 'none';
    window.currentOrderForCall = null;
}

// Initiate call from order
async function initiateCallFromOrder(callType) {
    if (!window.currentOrderForCall) {
        alert('Erreur: aucune commande sélectionnée');
        return;
    }
    
    const { commandeId, clientId, fournisseurId } = window.currentOrderForCall;
    
    // First, create or get the conversation
    try {
        // Try to get existing conversation
        let response = await fetch(AppConfig.apiBaseUrl + '/api/conversations/by-commande/' + commandeId);
        
        let conversation;
        if (response.ok) {
            conversation = await response.json();
        } else {
            // Create new conversation
            response = await fetch(
                AppConfig.apiBaseUrl + '/api/conversations?commandeId=' + commandeId + '&clientId=' + clientId + '&fournisseurId=' + fournisseurId,
                { method: 'POST' }
            );
            
            if (!response.ok) {
                throw new Error('Failed to create conversation');
            }
            conversation = await response.json();
        }
        
        // Close modal
        closeCallOptionsModal();
        
        // Select the conversation
        await selectConversation(commandeId);
        
        // Start the call after a short delay to ensure connection
        setTimeout(() => {
            window.webrtcManager.startCall(conversation.conversationId, callType);
        }, 1000);
        
    } catch (error) {
        console.error('Error initiating call from order:', error);
        alert('Erreur lors de l\'initiation de l\'appel');
    }
}
