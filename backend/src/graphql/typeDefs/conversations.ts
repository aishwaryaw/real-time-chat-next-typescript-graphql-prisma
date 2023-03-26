import gql from "graphql-tag";

const typeDefs = gql`

    scalar Date

    type CreateConversationResponse {
        conversationId: String
    }
    type Conversation {
        id: String
        admin: User
        latestMessage: Message
        participants: [Participant]
        updatedAt: Date
        createdAt: Date
    }
    type Participant {
        id: String
        user: User
        hasSeenLatestMessage: Boolean
    }

    type ConversationUpdatedSubscriptionPayload {
        conversation: Conversation,
        addedUserIds: [String],
        removedUserIds: [String]
    }
    type ConversationDeletedSubscriptionPayload {
        id: String
    }
    
    type Query {
        conversations: [Conversation]
    }
    type Mutation {
        createConversation(participantIds: [String]) : CreateConversationResponse
    }
    type Mutation {
        markConversationAsRead(userId:String, conversationId: String): Boolean
    }
    type Mutation {
        deleteConversation(conversationId: String) : Boolean
    }
    type Mutation {
        updateParticipants(conversationId: String, participantIds: [String]): Boolean
    }
    type Mutation {
        modifyAdmin(conversationId: String, userId: String) : Boolean
    }
    type Subscription {
        conversationCreated : Conversation
    }
    type Subscription {
        conversationUpdated: ConversationUpdatedSubscriptionPayload
    }
    type Subscription {
        conversationDeleted: ConversationDeletedSubscriptionPayload
    }
`

export default typeDefs;