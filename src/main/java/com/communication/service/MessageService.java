package com.communication.service;

import com.communication.entity.Conversation;
import com.communication.entity.Message;
import com.communication.repository.ConversationRepository;
import com.communication.repository.MessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class MessageService {

    private final MessageRepository messageRepository;
    private final ConversationRepository conversationRepository;
    private final ConversationService conversationService;

    @Transactional
    public Message sendMessage(Long conversationId, Long senderId, Message.SenderType senderType, String content) {
        // Verify access to conversation
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found: " + conversationId));

        // Verify sender is part of the conversation
        boolean hasAccess = (senderType == Message.SenderType.CLIENT && conversation.getClientId().equals(senderId)) ||
                           (senderType == Message.SenderType.FOURNISSEUR && conversation.getFournisseurId().equals(senderId));

        if (!hasAccess) {
            throw new IllegalArgumentException("User is not authorized to send messages in this conversation");
        }

        Message message = Message.builder()
                .conversationId(conversationId)
                .senderId(senderId)
                .senderType(senderType)
                .message(content)
                .messageType(Message.MessageType.TEXT)
                .build();

        Message savedMessage = messageRepository.save(message);
        
        // Update conversation last message time
        conversationService.updateLastMessageTime(conversationId);
        
        log.info("Message sent in conversation {} by {}", conversationId, senderType);
        
        return savedMessage;
    }

    @Transactional
    public Message sendSystemMessage(Long conversationId, String content, Message.MessageType messageType) {
        Message message = Message.builder()
                .conversationId(conversationId)
                .senderId(0L)
                .senderType(Message.SenderType.SYSTEM)
                .message(content)
                .messageType(messageType)
                .build();

        return messageRepository.save(message);
    }

    public List<Message> getMessages(Long conversationId) {
        return messageRepository.findByConversationIdOrderByDateEnvoiAsc(conversationId);
    }

    public List<Message> getMessagesPaged(Long conversationId, int page, int size) {
        // Simple pagination - get all and slice
        List<Message> allMessages = messageRepository.findByConversationIdOrderByDateEnvoiAsc(conversationId);
        int start = page * size;
        int end = Math.min(start + size, allMessages.size());
        
        if (start >= allMessages.size()) {
            return List.of();
        }
        
        return allMessages.subList(start, end);
    }

    @Transactional
    public void markMessagesAsRead(Long conversationId, Long userId) {
        messageRepository.markMessagesAsRead(conversationId, userId);
    }

    public Long getUnreadCount(Long conversationId, Long userId) {
        return messageRepository.countUnreadMessages(conversationId, userId);
    }

    public Message getLastMessage(Long conversationId) {
        return messageRepository.findLastMessageByConversationId(conversationId);
    }
}
