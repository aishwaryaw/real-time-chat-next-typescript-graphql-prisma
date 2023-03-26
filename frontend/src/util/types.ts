import {ConversationPopulated, MessagePopulated} from '../../../backend/src/utils/types';
/**
 * Users
 */
export interface CreateUsernameData{
    createUsername: {
    success: boolean;
    error: string;
    }
}

export interface CreateUsernameVariables{
    username: string;
}

export interface SearchUsersVariables{
    username: string;
}

export interface SearchUsersData{
    searchUsers: searchedUser[];
}

export interface searchedUser{
    id: string;
    username: string;
}

/**
 * Conversations
 */
export interface createConversationData {
    createConversation : {
        conversationId: string;
    }
}

export interface createConversationVariables {
    participantIds: string[];
}

export interface ConversationData {
    conversations: Array<ConversationPopulated>;
}

export interface updateParticipantsVariables {
    conversationId: string;
    participantIds: string[];
}

export interface ConversationSubscriptionData {
    subscriptionData : {
        data: 
        {
        conversationCreated: ConversationPopulated
        }
    }
}

export interface ConversationUpdatedSubscriptionData {
    conversationUpdated : {
        conversation: ConversationPopulated;
        addedUserIds: string[];
        removedUserIds: string[];
    }
}


export interface ConversationDeletedData {
    conversationDeleted: {
      id: string;
}
}

/**
 * Messages
 */

export interface MessageData {
    messages : Array<MessagePopulated>;
}

export interface MessageVariables {
    conversationId: string;
}

export interface SendMessageVariables {
    id: string;
    body: string;
    conversationId: string;
    senderId: string;
}

export interface MessagesSubscriptionData {
    subscriptionData: {
        data : { messageSent : MessagePopulated }
    }
}