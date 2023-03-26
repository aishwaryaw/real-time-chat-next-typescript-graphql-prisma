import { Prisma, PrismaClient } from '@prisma/client';
import { ISODateString } from 'next-auth';
import { conversationPopulated, participantsPopulated } from '../graphql/resolvers/conversations';
import { Context } from 'graphql-ws/lib/server'
import { PubSub } from 'graphql-subscriptions';
import { messagePopulated } from '../graphql/resolvers/messages';

/**
 * Server Configuration
 */
export interface GraphQLContext {
    session: Session | null;
    prisma: PrismaClient;
    pubsub: PubSub
}

export interface Session {
    user?: User;
    expires: ISODateString;
}

/**
 * Subscription context
 */
export interface SubscriptionContext extends Context {
    connectionParams: {
        session? : Session
    }
}

/**
 * Users
*/
export interface User {
    id: string;
    username: string;
    email: string;
    emailVerified: boolean;
    image: string;
    name: string;
}

export interface createUsernameResponse {
    success?: boolean;
    error?: string;
}

/**
 * Conversations
 */
export interface createConversationResponse {
    conversationId: string;
}

export type ConversationPopulated = Prisma.ConversationGetPayload<
{include: typeof conversationPopulated}
>;

export type ParticipantPopulated = Prisma.ConversationParticipantGetPayload<
{include: typeof participantsPopulated}
>

export interface ConversationCreatedSubscriptionPayload {
    conversationCreated: ConversationPopulated;
}

export interface conversationUpdatedSubscriptionPayload {
    conversationUpdated: {
        conversation: ConversationPopulated,
        addedUserIds: Array<string>;
        removedUserIds: Array<string>;
    }
}

export interface conversationDeletedSubscriptionPayload {
    conversationDeleted: ConversationPopulated;
}


/**
 * Messages
 */
export interface SendMessageArguments {
    id: string;
    conversationId: string;
    senderId : string;
    body: string;
}

export interface SendMessageSubscriptionPayload {
    messageSent: MessagePopulated;
}


export type MessagePopulated = Prisma.MessageGetPayload<{
    include: typeof messagePopulated
}>