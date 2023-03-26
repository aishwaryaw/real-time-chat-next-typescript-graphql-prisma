import { Prisma } from "@prisma/client";
import { GraphQLError } from "graphql";
import { withFilter } from "graphql-subscriptions";
import { isUserInConversationParticipants } from "../../utils/functions";
import {
  GraphQLContext,
  MessagePopulated,
  SendMessageArguments,
  SendMessageSubscriptionPayload,
} from "../../utils/types";
import { conversationPopulated } from "./conversations";

const resolvers = {
  Query: {
    messages :async (
        _: any,
        args: {conversationId: string},
        context: GraphQLContext
    ): Promise<Array<MessagePopulated>> => {

        const { session, prisma } = context;

        if(!session?.user) {
            throw new GraphQLError('User is not authorized');
        }

        const {
            user: { id: userId },
          } = session;

        /**
       * Verify that user is a participant
       */
        const conversation = await prisma.conversation.findUnique({
          where: {
            id: args.conversationId,
          },
          include: conversationPopulated
        });

        if (!conversation) {
          throw new GraphQLError("Conversation Not Found");
        }
        const allowedToView = isUserInConversationParticipants(conversation.participants, userId);

        if(!allowedToView){
          throw new Error('Not authorized');
        }
        try{
          const messages = await prisma.message.findMany({
              where: {
                  conversationId: args.conversationId
              },
              include : messagePopulated,
              orderBy: {
                createdAt: 'desc'
              }
          });

          return messages;
        }

        catch(error:any){
          console.log("messages error", error);
          throw new GraphQLError(error?.message);
        }
    }
  },
  Mutation: {
    sendMessage: async (
      _: any,
      args: SendMessageArguments,
      context: GraphQLContext
    ): Promise<boolean> => {
      const { prisma, pubsub, session } = context;
      const { id: messageId, conversationId, senderId, body } = args;
      if (!session?.user) {
        throw new GraphQLError("User is not authorized");
      }

      const { id: userId } = session.user;

      if (senderId !== userId) {
        throw new GraphQLError("User is not authorized");
      }
      try {
        const newMessage = await prisma.message.create({
          data: {
            id:messageId,
            body,
            senderId,
            conversationId,
          },
          include: messagePopulated,
        });

        const participant = await prisma.conversationParticipant.findFirst({
          where: {
            userId,
            conversationId,
          },
        });

        if (!participant) {
          throw new GraphQLError("Participant does not exist");
        }

        const { id: participantId } = participant;

        /**
         * Update conversation latest message
         */
        const conversation = await prisma.conversation.update({
          where: {
            id: conversationId,
          },
          data: {
            latestMessageId: newMessage.id,
            participants: {
              update: {
                where: {
                  id: participantId,
                },
                data: {
                  hasSeenLatestMessage: true,
                },
              },
              updateMany: {
                where: {
                  NOT: {
                    userId,
                  },
                },
                data: {
                  hasSeenLatestMessage: false,
                },
              },
            },
          },
          include: conversationPopulated,
        });

        pubsub.publish("MESSAGE_SENT", { messageSent: newMessage });

        pubsub.publish("CONVERSATION_UPDATED", {
          conversationUpdated: {
             conversation
          },
        });

        return true;
      } catch (error: any) {
        console.log("sendMessage error", error);
        throw new GraphQLError("Error sending message");
      }
    },
  },

  Subscription: {
    messageSent: {
      subscribe: withFilter(
        (_: any, __: any, context: GraphQLContext) => {
          const { pubsub } = context;
          return pubsub.asyncIterator(["MESSAGE_SENT"]);
        },

        (
          payload: SendMessageSubscriptionPayload,
          args: { conversationId: string },
          context: GraphQLContext
        ) => {
          return args.conversationId === payload.messageSent.conversationId;
        }
      ),
    },
  },
};

export const messagePopulated = Prisma.validator<Prisma.MessageInclude>()({
  sender: {
    select: {
      id: true,
      username: true,
    },
  },
});


export default resolvers;