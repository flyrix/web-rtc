package com.communication.dto;

import com.communication.entity.Message;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessageDTO {

    private Long messageId;
    private Long conversationId;
    private Long senderId;
    private String senderType;
    private String message;
    private String messageType;
    private LocalDateTime dateEnvoi;
    private Boolean isRead;

    public static ChatMessageDTO fromEntity(Message message) {
        return ChatMessageDTO.builder()
                .messageId(message.getMessageId())
                .conversationId(message.getConversationId())
                .senderId(message.getSenderId())
                .senderType(message.getSenderType().name())
                .message(message.getMessage())
                .messageType(message.getMessageType().name())
                .dateEnvoi(message.getDateEnvoi())
                .isRead(message.getIsRead())
                .build();
    }
}
