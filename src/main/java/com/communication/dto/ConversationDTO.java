package com.communication.dto;

import com.communication.entity.Conversation;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConversationDTO {

    private Long conversationId;
    private Long commandeId;
    private Long clientId;
    private Long fournisseurId;
    private String clientName;
    private String fournisseurName;
    private LocalDateTime dateCreation;
    private LocalDateTime lastMessageDate;
    private String statut;
    private MessageDTO lastMessage;
    private Long unreadCount;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MessageDTO {
        private Long messageId;
        private String message;
        private String senderType;
        private LocalDateTime dateEnvoi;
    }

    public static ConversationDTO fromEntity(Conversation conversation) {
        return ConversationDTO.builder()
                .conversationId(conversation.getConversationId())
                .commandeId(conversation.getCommandeId())
                .clientId(conversation.getClientId())
                .fournisseurId(conversation.getFournisseurId())
                .dateCreation(conversation.getDateCreation())
                .lastMessageDate(conversation.getLastMessageDate())
                .statut(conversation.getStatut().name())
                .build();
    }
}
