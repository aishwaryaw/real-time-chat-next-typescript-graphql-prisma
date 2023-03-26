import { Prisma } from "@prisma/client";
import { GraphQLError } from "graphql";
import { withFilter } from "graphql-subscriptions";
import {
  ConversationCreatedSubscriptionPayload,
  conversationDeletedSubscriptionPayload,
  ConversationPopulated,
  conversationUpdatedSubscriptionPayload,
  createConversationResponse,
  GraphQLContext,
} from "../../utils/types";
import { isUserInConversationParticipants } from "../../utils/functions";

const resolvers = {
  Query: {
    conversations: async (
      _: any,
      args: Record<string, never>,
      context: GraphQLContext
    ): Promise<Array<ConversationPopulated>> => {
      const { session, prisma } = context;

      if (!session?.user) {
        throw new GraphQLError("Not authorized");
      }

      try {
        const { id } = session.user;
        /**
         * Find all conversations that user is part of
         */

        const conversations = await prisma.conversation.findMany({
          where: {
            participants: {
              some: {
                userId: {
                  equals: id,
                },
              },
            },
          },
          include: conversationPopulated,
        });
        return conversations;
      } catch (error: any) {
        console.log("conversations error", error);
        throw new GraphQLError(error?.message);
      }
    },
  },
  Mutation: {
    createConversation: async (
      _: any,
      args: { participantIds: string[] },
      context: GraphQLContext
    ): Promise<createConversationResponse> => {
      const { session, prisma, pubsub } = context;
      const { participantIds } = args;

      if (!session?.user) {
        throw new GraphQLError("Not authorized");
      }
      const { id: userId } = session.user;

      try {
        const userConversations = await prisma.conversation.findMany({
          where: {
            participants: {
              some: {
                userId: {
                  equals: userId,
                },
              },
            },
          },
          include: conversationPopulated,
        });

        const existingConversations = userConversations.filter(
          (conversation) => {
            return participantIds.every((participantId) =>
              conversation.participants
                .map((participant) => participant.userId)
                .includes(participantId)
            );
          }
        );

        if (existingConversations.length > 0) {
          throw new GraphQLError("Conversation already exists");
        }
        const conversation = await prisma.conversation.create({
          data: {
            participants: {
              createMany: {
                data: participantIds.map((id) => ({
                  userId: id,
                  hasSeenLatestMessage: id === userId,
                })),
              },
            },
          },
          include: conversationPopulated,
        });

        pubsub.publish("CONVERSATION_CREATED", {
          conversationCreated: conversation,
        });

        return { conversationId: conversation.id };
      } catch (error: any) {
        console.log("createConversation error", error);
        throw new GraphQLError(`Error creating conversation - ${error}`);
      }
    },

    markConversationAsRead: async (
      _: any,
      args: { userId: string; conversationId: string },
      context: GraphQLContext
    ): Promise<boolean> => {
      const { prisma, session } = context;
      const { userId, conversationId } = args;

      if (!session?.user) {
        throw new GraphQLError("User is not authorized");
      }
      try {
        const participant = await prisma.conversationParticipant.findFirst({
          where: {
            userId,
            conversationId,
          },
        });

        if (!participant) {
          throw new GraphQLError("Participant entity not foud");
        }

        await prisma.conversationParticipant.update({
          where: {
            id: participant.id,
          },
          data: {
            hasSeenLatestMessage: true,
          },
        });
        return true;
      } catch (error: any) {
        console.log("markConversationAsRead error", error);
        throw new GraphQLError(error.message);
      }
    },

    deleteConversation: async(
      _:any,
      args:{conversationId: string},
      context: GraphQLContext
    ): Promise<boolean> => {
      const {pubsub, session, prisma} = context;
      const { conversationId } = args;
      if(!session?.user){
        throw new GraphQLError('User is not authorized');
      }
      try {
         /**
         * Delete conversation and all related entities
         */
      const [deletedConversation] = await prisma.$transaction([
        prisma.conversation.delete({
          where : {
            id: conversationId
          },
          include: conversationPopulated
        }),
        prisma.conversationParticipant.deleteMany({
          where : {
            conversationId
          }
        }),
        prisma.message.deleteMany({
          where :{
            conversationId
          }
        })
      ]);
      pubsub.publish("CONVERSATION_DELETED", {
        conversationDeleted: deletedConversation
      })
    }
    catch (error: any) {
      console.log("deleteConversation error", error);
      throw new GraphQLError("Failed to delete conversation");
    }

      return true;
    },

    updateParticipants: async (
      _: any,
      args: {conversationId: string, participantIds: Array<string>},
      context: GraphQLContext
    ): Promise<boolean> => {

      const { session, prisma, pubsub } = context;
      if(!session?.user) {
        throw new GraphQLError('User is not authorized');
      }

      const { id: userId } = session.user;
      const { conversationId, participantIds } = args;

      try {
        const participants = await prisma.conversationParticipant.findMany({
          where: {
            conversationId
          }
        });

        const existingParticipants = participants.map(p => p.userId);

        const partiipantsToDelete = existingParticipants.filter(p => !participantIds.includes(p));

        const participantsToCreate = participantIds.filter(p => !existingParticipants.includes(p));

        const transactionStatements = [
          prisma.conversation.update({
            where: {
              id: conversationId
            },
            data: {
              participants: {
                deleteMany: {
                  userId: {
                    in: partiipantsToDelete
                  },
                  conversationId
                } 
              }
            },
            include: conversationPopulated,
          })
        ];

        if(participantsToCreate.length){
          transactionStatements.push(
            prisma.conversation.update({
              where: {
                id: conversationId
              },
              data: {
                participants: {
                  createMany: {
                    data : participantsToCreate.map(participantId => ({
                      userId: participantId,
                      hasSeenLatestMessage: true
                    }))
                  }
                }
              },
              include: conversationPopulated
            })
          );
      }

      const [deleteUpdate, addUpdate] = await prisma.$transaction(transactionStatements);
      pubsub.publish('CONVERSATION_UPDATED', {
        conversationUpdated : {
          conversation: addUpdate || deleteUpdate,
          addedUserIds: participantsToCreate,
          removedUserIds: partiipantsToDelete
        }
      });
      return true;
      }

      catch(error:any){
        console.log("updateParticipants error", error);
        throw new GraphQLError(error?.message);
      }

    }
  },
  Subscription: {
    conversationCreated: {
      subscribe: withFilter(
        (_: any, __: any, context: GraphQLContext) => {
          const { pubsub } = context;
          return pubsub.asyncIterator(["CONVERSATION_CREATED"]);
        },
        (
          payload: ConversationCreatedSubscriptionPayload,
          _,
          context: GraphQLContext
        ) => {
          const { session } = context;
          if (!session?.user) {
            throw new GraphQLError("Not authorized");
          }
          const {
            user: { id: userId },
          } = session;
          const {
            conversationCreated: { participants },
          } = payload;

          return isUserInConversationParticipants(participants, userId);
        }
      ),
    },

    conversationUpdated: {
      subscribe: withFilter(
        (_: any, __: any, context: GraphQLContext) => {
          const { pubsub } = context;
          return pubsub.asyncIterator(["CONVERSATION_UPDATED"]);
        },
        (
          payload: conversationUpdatedSubscriptionPayload,
          _: any,
          context: GraphQLContext
        ) => {
          const { session } = context;
          if (!session?.user) {
            throw new GraphQLError("Not authorized");
          }
          const { id: userId } = session.user;
          const {
            conversationUpdated: { conversation: { participants }, removedUserIds},
          } = payload;

          const userIsParticipant = isUserInConversationParticipants(
            participants,
            userId
          );

          const userSentLatestMessage =
            payload.conversationUpdated.conversation.latestMessage?.senderId === userId;

          const userIsBeingRemoved  = 
            removedUserIds &&
            Boolean(removedUserIds.find(p => p === userId));

          return (
            (userIsParticipant && !userSentLatestMessage) ||
            userSentLatestMessage ||
            userIsBeingRemoved
          );
        }
      ),
    },
    conversationDeleted: {
      subscribe : withFilter(
        (_: any, __: any, context: GraphQLContext) => {
          const {pubsub} = context;
          return pubsub.asyncIterator(['CONVERSATION_DELETED']);
        },
        (
          payload: conversationDeletedSubscriptionPayload,
          _: any,
          context: GraphQLContext
        )=> {
          const { session } = context;
          if (!session?.user) {
            throw new GraphQLError("Not authorized");
          }

          const { id: userId } = session.user; 
          const { conversationDeleted: { participants } } = payload;
          return isUserInConversationParticipants(participants, userId);
        }
      )
    }
  },
};

export const participantsPopulated =
  Prisma.validator<Prisma.ConversationParticipantInclude>()({
    user: {
      select: {
        id: true,
        username: true,
      },
    },
  });

export const conversationPopulated =
  Prisma.validator<Prisma.ConversationInclude>()({
    latestMessage: {
      include: {
        sender: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    },
    participants: {
      include: participantsPopulated,
    },
  });
export default resolvers;
