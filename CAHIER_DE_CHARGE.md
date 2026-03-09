# Cahier de Charge - Module de Communication Client / Fournisseur

## 1. Contexte du Projet

### 1.1 Présentation
Module de communication temps réel pour une plateforme de gestion de commandes développée avec Spring Boot. Ce module permet aux clients et fournisseurs de communiquer directement via chat texte, appels audio et vidéo.

### 1.2 Technologies Utilisées
| Technologie | Version | Utilisation |
|-------------|---------|--------------|
| Spring Boot | 3.2.0 | Framework backend |
| Spring WebSocket | - | Communication temps réel |
| H2 Database | - | Base de données |
| WebRTC | - | Audio/Vidéo |
| SockJS | - | Fallback WebSocket |
| STOMP | - | Protocol messaging |

---

## 2. Architecture du Système

### 2.1 Vue d'Ensemble
```
┌─────────────────┐     WebSocket      ┌─────────────────┐
│  Navigateur     │◄──────────────────►│  Backend        │
│  Client         │                    │  Spring Boot    │
└─────────────────┘                    └────────┬────────┘
                                                 │
                                          ┌──────▼──────┐
                                          │  H2 Database│
                                          └─────────────┘
                                                 │
                    Connexion WebRTC             │
              ┌──────────────────────────────────┼──────────────────┐
              │                                  │                  │
┌─────────────▼─────────────┐                    │      ┌───────────▼───────────┐
│  Navigateur Client         │◄───────────────────┘      │  Navigateur Fournisseur │
│  - Chat                   │                             │  - Chat                 │
│  - WebRTC Audio/Vidéo     │◄────────────────────────────│  - WebRTC Audio/Vidéo   │
└───────────────────────────┘                             └─────────────────────────┘
```

### 2.2 Architecture des Connexions

#### Connexion WebSocket (Chat & Signalisation)
- **Endpoint**: `/ws-communication`
- **Protocol**: STOMP over SockJS
- **Topics**:
  - `/topic/conversations` - Liste des conversations
  - `/topic/conversation/{id}` - Messages d'une conversation
  - `/topic/conversation/{id}/call` - Signalisation appels
  - `/topic/user/{userId}/calls` - Notifications d'appels personnelles

#### Connexion WebRTC (Audio/Vidéo)
- **Type**: Peer-to-Peer (P2P)
- **Signalisation**: Via WebSocket STOMP
- **ICE Candidates**: Échange via WebSocket

---

## 3. Structure des Données

### 3.1 Base de Données H2

#### Table: CONVERSATIONS
```sql
CREATE TABLE conversations (
    conversation_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    commande_id BIGINT NOT NULL,
    client_id BIGINT NOT NULL,
    fournisseur_id BIGINT NOT NULL,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_message_date TIMESTAMP,
    statut VARCHAR(20) DEFAULT 'ACTIVE'
);
```

#### Table: MESSAGES
```sql
CREATE TABLE messages (
    message_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    conversation_id BIGINT NOT NULL,
    sender_id BIGINT NOT NULL,
    sender_type VARCHAR(20) NOT NULL,
    message TEXT,
    message_type VARCHAR(20) DEFAULT 'TEXT',
    date_envoi TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_read BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id)
);
```

### 3.2 Entités Java

#### Conversation
- `conversationId`: Long (PK)
- `commandeId`: Long
- `clientId`: Long
- `fournisseurId`: Long
- `dateCreation`: Timestamp
- `lastMessageDate`: Timestamp
- `statut`: String

#### Message
- `messageId`: Long (PK)
- `conversationId`: Long (FK)
- `senderId`: Long
- `senderType`: String (CLIENT/FOURNISSEUR)
- `message`: String
- `messageType`: String (TEXT/CALL_REQUEST/CALL_END)
- `dateEnvoi`: Timestamp
- `isRead`: Boolean

---

## 4. API et Points d'Accès

### 4.1 REST API

#### Conversations
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/conversations` | Liste des conversations d'un utilisateur |
| POST | `/api/conversations` | Créer une nouvelle conversation |
| GET | `/api/conversations/{id}` | Détails d'une conversation |
| GET | `/api/conversations/{id}/messages` | Messages d'une conversation |

#### Format des Données

**ConversationDTO:**
```json
{
  "conversationId": 1,
  "commandeId": 2045,
  "clientId": 14,
  "fournisseurId": 7,
  "dateCreation": "2026-03-09T07:50:04",
  "lastMessageDate": "2026-03-09T07:51:19",
  "statut": "ACTIVE"
}
```

**ChatMessageDTO:**
```json
{
  "messageId": 1,
  "conversationId": 1,
  "senderId": 14,
  "senderType": "CLIENT",
  "message": "Bonjour",
  "messageType": "TEXT",
  "dateEnvoi": "2026-03-09T07:50:04",
  "isRead": false
}
```

### 4.2 WebSocket Messages (STOMP)

#### Envoyer un message
- **Destination**: `/app/chat/{conversationId}`
- **Corps**:
```json
{
  "senderId": 14,
  "senderType": "CLIENT",
  "message": "Bonjour",
  "messageType": "TEXT"
}
```

#### Signalisation Appel WebRTC
- **Destination**: `/app/call/{conversationId}`
- **Types de messages**:
  - `call-request`: Demande d'appel
  - `call-accept`: Acceptation
  - `call-decline`: Refus
  - `call-end`: Fin d'appel
  - `ice-candidate`: Candidate ICE

---

## 5. Fonctionnalités

### 5.1 Chat Temps Réel

#### Flux de Fonctionnement
1. L'utilisateur sélectionne une conversation
2. L'interface se connecte au topic `/topic/conversation/{id}`
3. L'utilisateur tape un message et clique "Envoyer"
4. Le message est envoyé via WebSocket vers `/app/chat/{id}`
5. Le backend sauvegarde le message en base
6. Le message est broadcasté à tous les subscribers

#### Format des Messages
- **TEXT**: Message normal
- **CALL_REQUEST**: Demande d'appel
- **CALL_ACCEPT**: Acceptation d'appel
- **CALL_DECLINE**: Refus d'appel
- **CALL_END**: Fin d'appel

### 5.2 Appel Audio

#### Flux d'Appel Audio
```
┌──────────────┐                    ┌─────────────────┐
│   Client     │                    │   Fournisseur   │
│   (ID: 14)   │                    │   (ID: 7)       │
└──────┬───────┘                    └────────┬────────┘
       │                                     │
       │  1. call-request (AUDIO)           │
       ├────────────────────────────────────►
       │                                     │
       │  2. Notification (topic user)       │
       │◄────────────────────────────────────┤
       │                                     │
       │  3. Accept → call-accept             │
       ├────────────────────────────────────►
       │                                     │
       │  4. WebRTC SDP Offer/Answer         │
       ├────────────────────────────────────►
       │                                     │
       │  5. ICE Candidates                  │
       ├────────────────────────────────────►
       │                                     │
       │  6. Connexion P2P Audio établie     │
       │◄────────────────────────────────────┤
       │                                     │
       │  7. call-end                        │
       ├────────────────────────────────────►
```

### 5.3 Appel Vidéo

Le flux est identique à l'appel audio, sauf que:
- Type d'appel: `VIDEO` au lieu de `AUDIO`
- Les flux vidéo sont échangés en plus de l'audio

---

## 6. Configuration WebRTC

### 6.1 Serveurs STUN/TURN

```javascript
const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};
```

### 6.2 Contraintes Média

#### Audio
```javascript
{
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  }
}
```

#### Vidéo
```javascript
{
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 }
  }
}
```

---

## 7. Sécurité

### 7.1 Mesures Implémentées

| Mesure | Description |
|--------|-------------|
| HTTPS | Requis pour WebRTC |
| CORS | Configuré pour localhost:8081 |
| Validation | Vérification des IDs utilisateur |
| Conversation Access | Seul client/fournisseur peuvent accéder |

### 7.2 Contrôle d'Accès

- Chaque conversation vérifie que l'utilisateur est soit le client soit le fournisseur
- Les messages sont liés à une commande spécifique
- Les appels ne peuvent être initiés que par les participants

---

## 8. Interface Utilisateur

### 8.1 Éléments de l'Interface

#### Liste des Conversations
- Affichage des commandes avec numéro
- Bouton "Contacter le fournisseur" ou "Contacter le client"
- Indicateur de nouveaux messages

#### Zone de Chat
- En-tête: Numéro de commande
- Liste des messages avec émetteur et timestamp
- Zone de saisie avec bouton "Envoyer"

#### Contrôles d'Appel
- 📞 Bouton appel audio
- 📹 Bouton appel vidéo
- Icône verte clignotante: Acceptation en cours
- Icône rouge clignotante: Refus en cours

### 8.2 Notifications

- Son de sonnerie pendant un appel entrant
- Modal de demande d'appel avec boutons Accepter/Refuser
- Indicateur visuel d'appel en cours

---

## 9. Structure des Fichiers

### 9.1 Backend (src/main/java/com/communication/)

```
src/main/java/com/communication/
├── ModuleCommunicationApplication.java
├── config/
│   ├── SecurityConfig.java
│   └── WebSocketConfig.java
├── controller/
│   ├── ChatWebSocketController.java
│   └── ConversationRestController.java
├── dto/
│   ├── ChatMessageDTO.java
│   ├── ConversationDTO.java
│   └── SignalingDTO.java
├── entity/
│   ├── Conversation.java
│   └── Message.java
├── repository/
│   ├── ConversationRepository.java
│   └── MessageRepository.java
└── service/
    ├── ConversationService.java
    └── MessageService.java
```

### 9.2 Frontend (src/main/resources/static/)

```
src/main/resources/static/
├── index.html    # Interface principale
├── app.js        # Logique WebSocket et API
├── webrtc.js     # Logique WebRTC
└── styles.css    # Styles CSS
```

---

## 10. Modes de Déploiement

### 10.1 Développement
- **URL**: http://localhost:8081
- **H2 Console**: http://localhost:8081/h2-console
- **Base**: In-memory (perdée au redémarrage)

### 10.2 Production (Futur)
- **URL**: https://votre-domaine.com
- **Base**: MySQL/PostgreSQL
- **Serveur TURN**: Nécessaire pour NAT traversal

---

## 11. Dépannage

### 11.1 Problèmes Courants

| Problème | Cause Possible | Solution |
|----------|---------------|----------|
| WebSocket ne connecte pas | Port occupé | Vérifier le port 8081 |
| Appel ne arrive pas | Firewalls | Ouvrir les ports UDP |
| Pas de vidéo | Permissions navigateur | Autoriser caméra |
| Pas d'audio | Permissions navigateur | Autoriser microphone |

### 11.2 Logs Importants

Rechercher ces logs dans la console serveur:
- `ChatWebSocketController` - Signalisation WebRTC
- `ConversationService` - Opérations base de données
- `WebSocketHandlerMapping` - Connexions WebSocket

---

## 12. Versions et Dépendances

### pom.xml - Dépendances Principales
```xml
<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-websocket</artifactId>
    </dependency>
    <dependency>
        <groupId>com.h2database</groupId>
        <artifactId>h2</artifactId>
        <scope>runtime</scope>
    </dependency>
</dependencies>
```

---

*Document généré automatiquement pour le Module de Communication Client/Fournisseur*
*Version: 1.0*
*Date: 2026-03-09*
