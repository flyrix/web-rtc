package com.communication.service;

import com.communication.entity.Conversation;
import com.communication.entity.Message;
import com.communication.repository.ConversationRepository;
import com.communication.repository.MessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ConversationService {

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;

    @Transactional
    public Conversation createConversation(Long commandeId, Long clientId, Long fournisseurId) {
        // Check if conversation already exists for this command
        Optional<Conversation> existingConversation = conversationRepository.findByCommandeId(commandeId);
        
        if (existingConversation.isPresent()) {
            log.info("Conversation already exists for commande {}", commandeId);
            return existingConversation.get();
        }

        Conversation conversation = Conversation.builder()
                .commandeId(commandeId)
                .clientId(clientId)
                .fournisseurId(fournisseurId)
                .statut(Conversation.ConversationStatut.ACTIVE)
                .build();

        Conversation savedConversation = conversationRepository.save(conversation);
        log.info("Created new conversation with ID: {}", savedConversation.getConversationId());
        
        return savedConversation;
    }

    public Optional<Conversation> getConversationById(Long conversationId) {
        return conversationRepository.findById(conversationId);
    }

    public Optional<Conversation> getConversationByCommandeId(Long commandeId) {
        return conversationRepository.findByCommandeId(commandeId);
    }

    public List<Conversation> getConversationsForUser(Long userId) {
        return conversationRepository.findByClientIdOrFournisseurIdOrderByLastMessageDateDesc(userId, userId);
    }

    public List<Conversation> getConversationsForClient(Long clientId) {
        return conversationRepository.findByClientId(clientId);
    }

    public List<Conversation> getConversationsForFournisseur(Long fournisseurId) {
        return conversationRepository.findByFournisseurId(fournisseurId);
    }

    @Transactional
    public void updateLastMessageTime(Long conversationId) {
        conversationRepository.findById(conversationId).ifPresent(conversation -> {
            conversation.setLastMessageDate(LocalDateTime.now());
            conversationRepository.save(conversation);
        });
    }

    @Transactional
    public void closeConversation(Long conversationId) {
        conversationRepository.findById(conversationId).ifPresent(conversation -> {
            conversation.setStatut(Conversation.ConversationStatut.CLOSED);
            conversationRepository.save(conversation);
        });
    }

    public boolean hasAccess(Long conversationId, Long userId) {
        return conversationRepository.findById(conversationId)
                .map(conv -> conv.getClientId().equals(userId) || conv.getFournisseurId().equals(userId))
                .orElse(false);
    }
}
