package com.communication.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "messages")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "message_id")
    private Long messageId;

    @Column(name = "conversation_id", nullable = false)
    private Long conversationId;

    @Column(name = "sender_id", nullable = false)
    private Long senderId;

    @Column(name = "sender_type", nullable = false)
    @Enumerated(EnumType.STRING)
    private SenderType senderType;

    @Column(name = "message", columnDefinition = "TEXT", nullable = false)
    private String message;

    @Column(name = "message_type")
    @Enumerated(EnumType.STRING)
    private MessageType messageType;

    @Column(name = "date_envoi", nullable = false)
    private LocalDateTime dateEnvoi;

    @Column(name = "is_read")
    private Boolean isRead;

    @PrePersist
    protected void onCreate() {
        dateEnvoi = LocalDateTime.now();
        if (isRead == null) {
            isRead = false;
        }
        if (messageType == null) {
            messageType = MessageType.TEXT;
        }
    }

    public enum SenderType {
        CLIENT,
        FOURNISSEUR,
        SYSTEM
    }

    public enum MessageType {
        TEXT,
        IMAGE,
        FILE,
        AUDIO_CALL_START,
        AUDIO_CALL_END,
        VIDEO_CALL_START,
        VIDEO_CALL_END,
        CALL_DECLINED,
        CALL_ACCEPTED
    }
}
