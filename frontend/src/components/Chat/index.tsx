import { Flex } from '@chakra-ui/react';
import { Session } from 'next-auth'
import React from 'react'
import ConversationWrapper from './Conversation/ConversationWrapper';
import FeedWrapper from './Feed/FeedWrapper';

type IChatProps = {
    session: Session;
}

const Chat: React.FC<IChatProps> = ({session}) => {
  return (
   
    <Flex height='100vh' border="1px solid white">
    <ConversationWrapper session={session} />
    <FeedWrapper session = {session} />
    </Flex>
  )
}

export default Chat;