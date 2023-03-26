/* eslint-disable import/no-anonymous-default-export */
import { gql } from "@apollo/client";
import { messsageFields } from "./messages";


const conversationFields = `
    id
    updatedAt
    participants {
        user {
            id
            username
        }
        hasSeenLatestMessage
    }
    latestMessage {
       ${messsageFields}
    }
    admin {
        id
        username
    }
`;

export default {
    Queries: {
        conversations: gql`
        query Conversations{
            conversations{
                ${conversationFields}
            }
        }
        `
    },
    Mutations: {
        createConversation: gql`
         mutation CreateConversation($participantIds:[String]!){
            createConversation(participantIds:$participantIds){
                conversationId
            }
         }
        `,
        markConversationAsRead: gql`
        mutation MarkConversationAsRead($userId:String!, $conversationId: String!){
            markConversationAsRead(userId:$userId, conversationId:$conversationId)
        }
        `,
        deleteConversation: gql`
        mutation DeleteConversation($conversationId: String!){
            deleteConversation(conversationId:$conversationId)
        }
        `,
        updateParticipants: gql`
        mutation UpdateParticipants($conversationId: String!, $participantIds:[String]!){
            updateParticipants(conversationId: $conversationId, participantIds: $participantIds)
        }
        `,
        modifyAdmin: gql`
        mutation ModifyAdmin($conversationId: String!, $userId: String!){
            modifyAdmin(conversationId: $conversationId, userId: $userId)
        }
        `
    },
    Subscriptions: {
        conversationCreated: gql`
        subscription ConversationCreated{
            conversationCreated{
                ${conversationFields}
            }
        }
        `,
        conversationUpdated: gql`
        subscription ConversationUpdated{
            conversationUpdated{
                conversation{ 
                    ${conversationFields}
                },
                addedUserIds,
                removedUserIds
            }
        }
        `,
        conversationDeleted: gql`
        subscription ConversationDeleted{
            conversationDeleted{
                id
            }
        }
        `
    }
};