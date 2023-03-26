import { ConversationData } from '@/util/types';
import { Flex, Stack, Button, Text } from '@chakra-ui/react';
import * as React from 'react';
import { BiMessageSquareDots } from 'react-icons/bi';
import conversationOperations from '../../../graphql/operations/conversations';
import { useQuery } from '@apollo/client';
import { useState } from 'react';
import ConversationModal from '../Conversation/Modal/Modal';
import { Session } from 'next-auth';

interface NoConversationSelectedProps {
    session: Session;
}

const NoConversationSelected: React.FunctionComponent<NoConversationSelectedProps>= ({session}) => {

    const {data, error, loading } = useQuery<ConversationData, Record<string,null>>(conversationOperations.Queries.conversations);

    const [isOpen, setIsOpen] = useState(false);
    const openModal = () => setIsOpen(true);
    const onClose = () => setIsOpen(false);

    
    if(!data?.conversations || error || loading) return null;
    const { conversations } = data;
    const hasConversations = conversations.length;
    
    const text = hasConversations
    ? "Select a Conversation"
    : "Let's Get Started 🥳";


    return (
        <Flex height="100%" justify="center" align="center">
          <Stack spacing={10} align="center">
            <Text fontSize={40}>{text}</Text>
            {hasConversations ? (
              <BiMessageSquareDots fontSize={90} />
            ) : (
                <>
                <ConversationModal isOpen={isOpen} onClose={onClose} session={session}  conversations={conversations}/>
                <Button bg="brand.100" onClick={openModal}>
                    Create Conversation
                </Button>
                </>
            )}
          </Stack>
        </Flex>
      );
};

export default NoConversationSelected;
