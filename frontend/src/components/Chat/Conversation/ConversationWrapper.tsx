import React, { useEffect } from "react";
import { Session } from "next-auth";
import ConversationList from "./ConversationList";
import { Box } from "@chakra-ui/react";
import conversationOperations from "@/graphql/operations/conversations";
import messageOperations from '@/graphql/operations/messages';
import { gql, useMutation, useQuery, useSubscription } from "@apollo/client";
import {
  ConversationData,
  ConversationDeletedData,
  ConversationSubscriptionData,
  ConversationUpdatedSubscriptionData,
  MessageData,
} from "@/util/types";
import { ParticipantPopulated } from "../../../../../backend/src/utils/types";
import { useRouter } from "next/router";
import SkeletionLoader from "@/components/common/SkeletonLoader";
import { toast } from "react-hot-toast";

interface ConversationWrapperProps {
  session: Session;
}

const ConversationWrapper: React.FC<ConversationWrapperProps> = ({
  session,
}) => {
  const router = useRouter();
  const { conversationId } = router.query;
  const { id: userId } = session.user;

  const [markConversationAsRead] = useMutation<
    { markConversationAsRead: boolean },
    { userId: string; conversationId: string }
  >(conversationOperations.Mutations.markConversationAsRead);

  useSubscription<ConversationUpdatedSubscriptionData, Record<string, null>>(
    conversationOperations.Subscriptions.conversationUpdated,
    {
      onData: ({ client, data }) => {
        const { data: subscriptionData } = data;
        if (!subscriptionData) return;

        const {
          conversationUpdated: { conversation: updatedConversation, addedUserIds, removedUserIds },
        } = subscriptionData;

        const { id: updatedConversationId, latestMessage } = updatedConversation;
        
        /**
         * Check if user is being removed
        */
        if(removedUserIds && removedUserIds.length){
          const isUserBeingRemoved = removedUserIds.includes(userId);
          if(isUserBeingRemoved){
           const conversationData = client.readQuery<ConversationData>({
              query: conversationOperations.Queries.conversations,
            });

            if(!conversationData) return;

            client.writeQuery<ConversationData>({
              query: conversationOperations.Queries.conversations,
              data: {
                conversations: conversationData.conversations.filter(conversation => conversation.id !== updatedConversationId)
              }
            });
            if(conversationId === updatedConversationId){
              router.replace(
                typeof process.env.NEXT_PUBLIC_BASE_URL === "string"
                ? process.env.NEXT_PUBLIC_BASE_URL
                : ""
              );
            }
             /**
             * Early return - no more updates required
             */
             return;
          }

        }

        /**
          * Check if user is being added to conversation
        */
        if(addedUserIds && addedUserIds.length){
          const isUserBeingAdded = addedUserIds.includes(userId);
          if(isUserBeingAdded){
            const conversationData = client.readQuery<ConversationData>({
              query: conversationOperations.Queries.conversations,
            });

            if(!conversationData) return;

            client.writeQuery<ConversationData>({
              query: conversationOperations.Queries.conversations,
              data: {
                conversations: [
                  ...conversationData.conversations || [],
                  updatedConversation
                ]
              }
            });
        }
      }

       /**
         * Already viewing conversation where
         * new message is received; no need
         * to manually update cache due to
         * message subscription
        */
       if(updatedConversation.id === conversationId){
        onViewConversation(conversationId, false);
        return;
       }

       const existing = client.readQuery<MessageData>({
        query: messageOperations.Queries.messages,
        variables:{
          conversationId: updatedConversationId
        }
       });

       if(!existing) return;

         /**
         * Check if lastest message is already present
         * in the message query
         */

         const hasLatestMessage = 
         existing.messages.find(message => message.id === latestMessage?.id);

        /**
         * Update query as re-fetch won't happen if you
         * view a conversation you've already viewed due
         * to caching
         */
        if(!hasLatestMessage && latestMessage){
          client.writeQuery<MessageData>({
            query: messageOperations.Queries.messages,
            variables: {
              conversationId: updatedConversationId
            },
            data:{
              messages: [
                latestMessage,
                ...existing.messages
              ]
            }
          });
        }
      },
    }
  );

  useSubscription<ConversationDeletedData, Record<string, null>>(
    conversationOperations.Subscriptions.conversationDeleted,
    {
      onData: ({ client, data }) => {
        const { data: subscriptionData } = data;

        if (!subscriptionData) return;

        const existing = client.readQuery<ConversationData>({
          query: conversationOperations.Queries.conversations,
        });

        if (!existing) return;

        const { conversations } = existing;
        const {
          conversationDeleted: { id: deletedConversationId },
        } = subscriptionData;

        client.writeQuery<ConversationData>({
          query: conversationOperations.Queries.conversations,
          data: {
            conversations: conversations.filter(
              (conversation) => conversation.id !== deletedConversationId
            ),
          },
        });
      },
    }
  );

  const {
    data: conversationsData,
    loading: conversationsLoading,
    error: conversationsError,
    subscribeToMore,
  } = useQuery<ConversationData, Record<string, never>>(
    conversationOperations.Queries.conversations
  );

  const subscribeToNewConversations = () => {
    subscribeToMore({
      document: conversationOperations.Subscriptions.conversationCreated,
      updateQuery: (
        prev,
        { subscriptionData }: ConversationSubscriptionData
      ) => {
        if (!subscriptionData.data) return prev;
        const newConversation = subscriptionData.data.conversationCreated;
        return Object.assign({}, prev, {
          conversations: [newConversation, ...prev.conversations],
        });
      },
    });
  };

  const onViewConversation = async (
    conversationId: string,
    hasSeenLatestMessage?: boolean
  ) => {
    /**
     * 1. Push conversation id into query params
     */
    router.push({ query: { conversationId } });
    /**
     * 2. Mark conversation as read
     */
    if (hasSeenLatestMessage) {
      return;
    }
    try {
      // markConversationAsRead mutation call
      await markConversationAsRead({
        variables: {
          userId: userId,
          conversationId,
        },
        optimisticResponse: {
          markConversationAsRead: true,
        },
        update: (cache) => {
          /**
           * Get conversation participants from cache - fragment is a piece of cache
           */
          const participantsFragment = cache.readFragment<{
            participants: Array<ParticipantPopulated>;
          }>({
            id: `Conversation:${conversationId}`,
            fragment: gql`
              fragment Participants on Conversation {
                participants {
                  user {
                    id
                    username
                  }
                  hasSeenLatestMessage
                }
              }
            `,
          });

          if (!participantsFragment) return;
          /**
           * Mutating participant entity
           */
          const participants = [...participantsFragment.participants];

          const userParticipantIndex = participants.findIndex(
            (participant) => participant.user.id == userId
          );

          if (userParticipantIndex === -1) return;

          const userParticipant = participants[userParticipantIndex];
          /**
           * update user to show latest message as read
           */
          participants[userParticipantIndex] = {
            ...userParticipant,
            hasSeenLatestMessage: true,
          };

          /** Update cache */
          cache.writeFragment({
            id: `Conversation:${conversationId}`,
            fragment: gql`
              fragment UpdatedParticipants on Conversation {
                participants
              }
            `,
            data: {
              participants,
            },
          });
        },
      });
    } catch (error: any) {
      console.log("onViewConversation error", error);
    }
  };

  useEffect(() => {
    // subscribing to conversations on component mount
    subscribeToNewConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (conversationsError) {
    toast.error("There was an error fetching conversations");
    return null;
  }

  return (
    <Box
      display={{ base: conversationId ? "none" : "flex", md: "flex" }}
      width={{ base: "100%", md: "430px" }}
      bg="whiteAlpha.50"
      flexDirection="column"
      gap={4}
      py={6}
      px={3}
      position="relative"
    >
      {conversationsLoading ? (
        <SkeletionLoader count={7} height="80px" width="360px" />
      ) : (
        <ConversationList
          session={session}
          conversations={conversationsData?.conversations || []}
          onViewConversation={onViewConversation}
        />
      )}
    </Box>
  );
};

export default ConversationWrapper;
