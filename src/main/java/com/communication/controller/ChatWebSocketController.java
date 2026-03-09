package com.communication.controller;

import com.communication.dto.ChatMessageDTO;
import com.communication.dto.SignalingDTO;
import com.communication.entity.Conversation;
import com.communication.entity.Message;
import com.communication.service.ConversationService;
import com.communication.service.MessageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.Map;

@Controller
@RequiredArgsConstructor
@Slf4j
public class ChatWebSocketController {

    private final MessageService messageService;
    private final ConversationService conversationService;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Handle incoming chat messages
     */
    @MessageMapping("/chat/{conversationId}")
    @SendTo("/topic/conversation/{conversationId}")
    public ChatMessageDTO handleChatMessage(
            @DestinationVariable Long conversationId,
            @Payload Map<String, Object> messageData) {
        
        log.info("Received chat message for conversation {}: {}", conversationId, messageData);
        
        Long senderId = Long.valueOf(messageData.get("senderId").toString());
        String senderTypeStr = messageData.get("senderType").toString();
        String content = messageData.get("message").toString();
        
        Message.SenderType senderType = Message.SenderType.valueOf(senderTypeStr);
        
        // Verify access
        if (!conversationService.hasAccess(conversationId, senderId)) {
            throw new IllegalArgumentException("Unauthorized access to conversation");
        }
        
        Message savedMessage = messageService.sendMessage(conversationId, senderId, senderType, content);
        
        ChatMessageDTO dto = ChatMessageDTO.fromEntity(savedMessage);
        
        return dto;
    }

    /**
     * Handle WebRTC signaling for calls
     */
    @MessageMapping("/call/{conversationId}")
    public void handleSignaling(
            @DestinationVariable Long conversationId,
            @Payload SignalingDTO signalingDTO) {
        
        log.info("Received WebRTC signaling for conversation {}: {}", conversationId, signalingDTO);
        
        signalingDTO.setConversationId(conversationId);
        
        switch (signalingDTO.getType()) {
            case "call-request":
                handleCallRequest(signalingDTO);
                break;
            case "call-accept":
                handleCallAccept(signalingDTO);
                break;
            case "call-decline":
                handleCallDecline(signalingDTO);
                break;
            case "call-end":
                handleCallEnd(signalingDTO);
                break;
            case "offer":
            case "answer":
            case "ice-candidate":
                forwardSignaling(signalingDTO);
                break;
            default:
                log.warn("Unknown signaling type: {}", signalingDTO.getType());
        }
    }

    private void handleCallRequest(SignalingDTO signalingDTO) {
        Long calleeId = signalingDTO.getCalleeId();
        
        // Send notification to callee via user-specific topic (so they receive it even without joining conversation)
        messagingTemplate.convertAndSend(
                "/topic/user/" + calleeId + "/calls",
                signalingDTO
        );
        
        // Also send via conversation topic (for those who have joined)
        messagingTemplate.convertAndSend(
                "/topic/conversation/" + signalingDTO.getConversationId() + "/call",
                signalingDTO
        );
        
        // Store call request message in conversation
        Message message = messageService.sendSystemMessage(
                signalingDTO.getConversationId(),
                "Appel " + signalingDTO.getCallType() + " initiée",
                Message.MessageType.AUDIO_CALL_START
        );
        
        // Broadcast to conversation topic
        messagingTemplate.convertAndSend(
                "/topic/conversation/" + signalingDTO.getConversationId(),
                ChatMessageDTO.fromEntity(message)
        );
    }

    private void handleCallAccept(SignalingDTO signalingDTO) {
        // Forward to caller via conversation topic
        messagingTemplate.convertAndSend(
                "/topic/conversation/" + signalingDTO.getConversationId() + "/call",
                signalingDTO
        );
        
        // Store system message
        Message message = messageService.sendSystemMessage(
                signalingDTO.getConversationId(),
                "Appel accepté",
                Message.MessageType.CALL_ACCEPTED
        );
        
        messagingTemplate.convertAndSend(
                "/topic/conversation/" + signalingDTO.getConversationId(),
                ChatMessageDTO.fromEntity(message)
        );
    }

    private void handleCallDecline(SignalingDTO signalingDTO) {
        // Forward to caller via conversation topic
        messagingTemplate.convertAndSend(
                "/topic/conversation/" + signalingDTO.getConversationId() + "/call",
                signalingDTO
        );
        
        // Store system message
        Message message = messageService.sendSystemMessage(
                signalingDTO.getConversationId(),
                "Appel refusé",
                Message.MessageType.CALL_DECLINED
        );
        
        messagingTemplate.convertAndSend(
                "/topic/conversation/" + signalingDTO.getConversationId(),
                ChatMessageDTO.fromEntity(message)
        );
    }

    private void handleCallEnd(SignalingDTO signalingDTO) {
        // Notify both parties via conversation topic
        messagingTemplate.convertAndSend(
                "/topic/conversation/" + signalingDTO.getConversationId() + "/call",
                signalingDTO
        );
        
        // Store system message
        Message.MessageType messageType = "VIDEO".equals(signalingDTO.getCallType())
                ? Message.MessageType.VIDEO_CALL_END
                : Message.MessageType.AUDIO_CALL_END;
        
        Message message = messageService.sendSystemMessage(
                signalingDTO.getConversationId(),
                "Appel terminé",
                messageType
        );
        
        messagingTemplate.convertAndSend(
                "/topic/conversation/" + signalingDTO.getConversationId(),
                ChatMessageDTO.fromEntity(message)
        );
    }

    private void forwardSignaling(SignalingDTO signalingDTO) {
        // Forward SDP or ICE candidate to the other party via conversation topic
        messagingTemplate.convertAndSend(
                "/topic/conversation/" + signalingDTO.getConversationId() + "/call",
                signalingDTO
        );
        
        // Also send to the other user's personal topic for better delivery
        Long callerId = signalingDTO.getCallerId();
        Long calleeId = signalingDTO.getCalleeId();
        
        // Send to both participants to ensure delivery
        if (callerId != null) {
            messagingTemplate.convertAndSend(
                    "/topic/user/" + callerId + "/calls",
                    signalingDTO
            );
        }
        if (calleeId != null) {
            messagingTemplate.convertAndSend(
                    "/topic/user/" + calleeId + "/calls",
                    signalingDTO
            );
        }
    }

    /**
     * Join a conversation room
     */
    @MessageMapping("/conversation/{conversationId}/join")
    public void joinConversation(
            @DestinationVariable Long conversationId,
            @Payload Map<String, Object> userData) {
        
        log.info("User {} joining conversation {}", userData.get("userId"), conversationId);
        
        // Could implement presence tracking here
    }

    /**
     * Leave a conversation room
     */
    @MessageMapping("/conversation/{conversationId}/leave")
    public void leaveConversation(
            @DestinationVariable Long conversationId,
            @Payload Map<String, Object> userData) {
        
        log.info("User {} leaving conversation {}", userData.get("userId"), conversationId);
    }
}
