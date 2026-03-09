package com.communication.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "conversations")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Conversation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "conversation_id")
    private Long conversationId;

    @Column(name = "commande_id", nullable = false)
    private Long commandeId;

    @Column(name = "client_id", nullable = false)
    private Long clientId;

    @Column(name = "fournisseur_id", nullable = false)
    private Long fournisseurId;

    @Column(name = "date_creation", nullable = false)
    private LocalDateTime dateCreation;

    @Column(name = "last_message_date")
    private LocalDateTime lastMessageDate;

    @Column(name = "statut")
    @Enumerated(EnumType.STRING)
    private ConversationStatut statut;

    @PrePersist
    protected void onCreate() {
        dateCreation = LocalDateTime.now();
        lastMessageDate = LocalDateTime.now();
        if (statut == null) {
            statut = ConversationStatut.ACTIVE;
        }
    }

    public enum ConversationStatut {
        ACTIVE,
        CLOSED,
        ARCHIVED
    }
}
