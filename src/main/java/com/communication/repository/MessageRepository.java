package com.communication.repository;

import com.communication.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {

    List<Message> findByConversationIdOrderByDateEnvoiAsc(Long conversationId);

    List<Message> findByConversationIdOrderByDateEnvoiDesc(Long conversationId);

    @Query("SELECT COUNT(m) FROM Message m WHERE m.conversationId = :conversationId AND m.isRead = false AND m.senderId != :userId")
    Long countUnreadMessages(@Param("conversationId") Long conversationId, @Param("userId") Long userId);

    @Modifying
    @Query("UPDATE Message m SET m.isRead = true WHERE m.conversationId = :conversationId AND m.senderId != :userId AND m.isRead = false")
    void markMessagesAsRead(@Param("conversationId") Long conversationId, @Param("userId") Long userId);

    @Query("SELECT m FROM Message m WHERE m.conversationId = :conversationId AND m.messageType IN :types ORDER BY m.dateEnvoi DESC")
    List<Message> findByConversationIdAndMessageTypeIn(@Param("conversationId") Long conversationId, @Param("types") List<Message.MessageType> types);

    @Query("SELECT m FROM Message m WHERE m.conversationId = :conversationId ORDER BY m.dateEnvoi DESC LIMIT 1")
    Message findLastMessageByConversationId(@Param("conversationId") Long conversationId);
}
