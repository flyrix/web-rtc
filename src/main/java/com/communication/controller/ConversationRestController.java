package com.communication.controller;

import com.communication.dto.ChatMessageDTO;
import com.communication.dto.ConversationDTO;
import com.communication.entity.Conversation;
import com.communication.entity.Message;
import com.communication.service.ConversationService;
import com.communication.service.MessageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/conversations")
@RequiredArgsConstructor
@Slf4j
public class ConversationRestController {

    private final ConversationService conversationService;
    private final MessageService messageService;

    /**
     * Create or get existing conversation for a command
     */
    @PostMapping
    public ResponseEntity<ConversationDTO> createConversation(
            @RequestParam Long commandeId,
            @RequestParam Long clientId,
            @RequestParam Long fournisseurId) {
        
        log.info("Creating conversation for commande {} between client {} and fournisseur {}", 
                commandeId, clientId, fournisseurId);
        
        Conversation conversation = conversationService.createConversation(commandeId, clientId, fournisseurId);
        
        return ResponseEntity.ok(ConversationDTO.fromEntity(conversation));
    }

    /**
     * Get conversation by ID
     */
    @GetMapping("/{conversationId}")
    public ResponseEntity<ConversationDTO> getConversation(@PathVariable Long conversationId) {
        return conversationService.getConversationById(conversationId)
                .map(conversation -> ResponseEntity.ok(ConversationDTO.fromEntity(conversation)))
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Get conversation by command ID
     */
    @GetMapping("/by-commande/{commandeId}")
    public ResponseEntity<ConversationDTO> getConversationByCommande(@PathVariable Long commandeId) {
        return conversationService.getConversationByCommandeId(commandeId)
                .map(conversation -> ResponseEntity.ok(ConversationDTO.fromEntity(conversation)))
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Get all conversations for a user
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<ConversationDTO>> getConversationsForUser(@PathVariable Long userId) {
        List<ConversationDTO> conversations = conversationService.getConversationsForUser(userId)
                .stream()
                .map(ConversationDTO::fromEntity)
                .collect(Collectors.toList());
        
        return ResponseEntity.ok(conversations);
    }

    /**
     * Get all conversations for a client
     */
    @GetMapping("/client/{clientId}")
    public ResponseEntity<List<ConversationDTO>> getConversationsForClient(@PathVariable Long clientId) {
        List<ConversationDTO> conversations = conversationService.getConversationsForClient(clientId)
                .stream()
                .map(ConversationDTO::fromEntity)
                .collect(Collectors.toList());
        
        return ResponseEntity.ok(conversations);
    }

    /**
     * Get all conversations for a fournisseur
     */
    @GetMapping("/fournisseur/{fournisseurId}")
    public ResponseEntity<List<ConversationDTO>> getConversationsForFournisseur(@PathVariable Long fournisseurId) {
        List<ConversationDTO> conversations = conversationService.getConversationsForFournisseur(fournisseurId)
                .stream()
                .map(ConversationDTO::fromEntity)
                .collect(Collectors.toList());
        
        return ResponseEntity.ok(conversations);
    }

    /**
     * Get messages for a conversation
     */
    @GetMapping("/{conversationId}/messages")
    public ResponseEntity<List<ChatMessageDTO>> getMessages(
            @PathVariable Long conversationId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        
        List<ChatMessageDTO> messages = messageService.getMessagesPaged(conversationId, page, size)
                .stream()
                .map(ChatMessageDTO::fromEntity)
                .collect(Collectors.toList());
        
        return ResponseEntity.ok(messages);
    }

    /**
     * Mark messages as read
     */
    @PostMapping("/{conversationId}/read")
    public ResponseEntity<Void> markAsRead(
            @PathVariable Long conversationId,
            @RequestParam Long userId) {
        
        messageService.markMessagesAsRead(conversationId, userId);
        return ResponseEntity.ok().build();
    }

    /**
     * Get unread count for a conversation
     */
    @GetMapping("/{conversationId}/unread")
    public ResponseEntity<Long> getUnreadCount(
            @PathVariable Long conversationId,
            @RequestParam Long userId) {
        
        Long count = messageService.getUnreadCount(conversationId, userId);
        return ResponseEntity.ok(count);
    }

    /**
     * Close a conversation
     */
    @PostMapping("/{conversationId}/close")
    public ResponseEntity<Void> closeConversation(@PathVariable Long conversationId) {
        conversationService.closeConversation(conversationId);
        return ResponseEntity.ok().build();
    }
}
