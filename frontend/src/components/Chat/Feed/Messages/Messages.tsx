/* eslint-disable react-hooks/exhaustive-deps */
import SkeletionLoader from '@/components/common/SkeletonLoader';
import { MessageVariables, MessageData, MessagesSubscriptionData } from '@/util/types';
import { useQuery } from '@apollo/client';
import { Flex, Stack } from '@chakra-ui/react';
import * as React from 'react';
import { useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import messageOpertations from '../../../../graphql/operations/messages';
import MessageItem from './MessageItem';

interface IMessagesProps {
  userId: string;
  conversationId: string;
}

const Messages: React.FunctionComponent<IMessagesProps> = ({userId, conversationId}) => {
  const {data, error, loading, subscribeToMore} = 
    useQuery<MessageData, MessageVariables>(messageOpertations.Queries.messages, {
    variables: {
      conversationId
    },
    onError: ({message})=> {
      toast.error(message);
    },
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const subscribeToNewMessages = (conversationId: string) => {
    return subscribeToMore({
      document: messageOpertations.Subscription.messageSent,
      variables: {
        conversationId,
      },
      updateQuery: (prev, { subscriptionData }: MessagesSubscriptionData) => {
        if (!subscriptionData.data) return prev;

        const newMessage = subscriptionData.data.messageSent;

        return Object.assign({}, prev, {
          messages:
            newMessage.sender.id === userId
              ? prev.messages
              : [newMessage, ...prev.messages],
        });
      },
    });
  };


  useEffect(() => {
    const unsubscribe = subscribeToNewMessages(conversationId);
    return () => unsubscribe();

  }, [conversationId]);

  useEffect(() => {
    if (!messagesEndRef.current || !data) return;
    messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [data, messagesEndRef.current]);
  

  if(error){
    return null;
  }

  return <Flex direction='column' justify='flex-end' overflow='hidden'>
    {loading && (
      <Stack spacing={4} px={2}>
        <SkeletionLoader count={4} height='60px' width='100%'/>
      </Stack>
    )}
    {
      data?.messages && (
        <Flex direction='column-reverse' overflowY='scroll' height='100%'>
          {data.messages.map((message, index) =>(
            <div key={message.id} ref={index === 0 ? messagesEndRef: null} >
            <MessageItem message={message} sentByMe={message.sender.id === userId} />
            </div>
          ))}
          </Flex>
      )
    }
  </Flex>;
};

export default Messages;
