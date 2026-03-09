package com.communication.repository;

import com.communication.entity.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, Long> {

    Optional<Conversation> findByCommandeId(Long commandeId);

    List<Conversation> findByClientIdOrFournisseurIdOrderByLastMessageDateDesc(Long clientId, Long fournisseurId);

    List<Conversation> findByClientId(Long clientId);

    List<Conversation> findByFournisseurId(Long fournisseurId);

    @Query("SELECT c FROM Conversation c WHERE (c.clientId = :userId OR c.fournisseurId = :userId) AND c.statut = :statut")
    List<Conversation> findByUserIdAndStatut(@Param("userId") Long userId, @Param("statut") Conversation.ConversationStatut statut);

    boolean existsByCommandeIdAndClientIdAndFournisseurId(Long commandeId, Long clientId, Long fournisseurId);
}
