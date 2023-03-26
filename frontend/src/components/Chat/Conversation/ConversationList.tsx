import { Box, Button, Text } from "@chakra-ui/react";
import { Session} from "next-auth";
import { signOut } from "next-auth/react";
import { useRouter } from "next/router";
import * as React from "react";
import { useState } from "react";
import {
  ConversationPopulated,
  ParticipantPopulated,
} from "../../../../../backend/src/utils/types";
import ConversationItem from "./ConversationItem";
import ConversationModal from "./Modal/Modal";
import conversationOperations from "@/graphql/operations/conversations";
import { useMutation } from "@apollo/client";
import toast from "react-hot-toast";
import { updateParticipantsVariables } from "@/util/types";

interface IConversationListProps {
  session: Session;
  conversations: Array<ConversationPopulated>;
  onViewConversation: (
    conversationId: string,
    hasSeenLatestMessage?: boolean
  ) => void;
}

const ConversationList: React.FunctionComponent<IConversationListProps> = ({
  session,
  conversations,
  onViewConversation,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editingConversation, setEditingConverdation] = useState<ConversationPopulated|null>(null);
  const openModal = () => setIsOpen(true);
  const onClose = () => setIsOpen(false);
  const router = useRouter();
  const { id: userId } = session.user;

  const [updateParticipants, {loading: updateParticipantsLoading}] = 
  useMutation<{updateParticipants: boolean}, updateParticipantsVariables>
  (conversationOperations.Mutations.updateParticipants);


  const [deleteConversation] = 
  useMutation<{deleteConversation: boolean},{conversationId: string}>
  (conversationOperations.Mutations.deleteConversation)


  const sortedConversations = [...conversations].sort(
    (a, b) => b.updatedAt.valueOf() - a.updatedAt.valueOf()
  );


  const onEditConversation = (conversation:ConversationPopulated) => {
    setEditingConverdation(conversation);
    openModal();
  }

  const onLeaveConversation = async(conversation: ConversationPopulated) => {
    const participantIds = conversation.participants
    .filter(participant => participant.user.id !== userId)
    .map(p => p.user.id);
    try{
    const {data, errors} = await updateParticipants({
      variables:{
        conversationId: conversation.id,
        participantIds
      }
    });

    if (!data || errors) {
      throw new Error("Failed to update participants");
    }
  } 
  catch (error: any) {
    console.log("onUpdateConversation error", error);
    toast.error(error?.message);
  }
  }

  const onToggleClose = () => {
    setEditingConverdation(null);
    onClose();
  }

  const getUserParticipantObject = (conversation: ConversationPopulated) => {
    return conversation.participants.find(
      (p) => p.user.id === session.user.id
    ) as ParticipantPopulated;
  };

  const onDeleteConversation = (conversationId: string) => {
    // delete mutation
    try{
    toast.promise(deleteConversation({
      variables: {
        conversationId
      },
      update: () => {
        router.replace(
          typeof process.env.NEXT_PUBLIC_BASE_URL === "string"
                ? process.env.NEXT_PUBLIC_BASE_URL
                : ""
        )
      }
    }),
    {
      loading: 'Deleting conversation',
      success: 'Conversation deleted',
      error: 'Failed to delete conversation'
    }
    );
  }
  catch(error:any){
    console.log("onDeleteConversation error", error);
  }
}

  return (

    <Box width={{ base: "100%", md: "400px" }} overflow="hidden">
      <Box
        px={4}
        py={2}
        mb={4}
        bg="blackAlpha.300"
        borderRadius={4}
        cursor="pointer"
        onClick={openModal}
      >
        <Text color="whiteAlpha.800" textAlign="center" fontWeight={500}>
          Find or start a conversation
        </Text>
      </Box>

      <ConversationModal 
      isOpen={isOpen} 
      onClose={onToggleClose} 
      session={session} 
      editingConversation = {editingConversation}
      onViewConversation = {onViewConversation}
      conversations = {conversations}
      getUserParticipantObject= {getUserParticipantObject}
      />
      {sortedConversations.map((conversation) => {
        const participant = conversation.participants.find(
          (participant: ParticipantPopulated) => participant.user.id === userId
        ) as ParticipantPopulated;
        return (
          <ConversationItem
            key={conversation.id}
            conversation={conversation}
            userId={userId}
            isSelected={router.query.conversationId === conversation.id}
            onClick={() =>
              onViewConversation(
                conversation.id,
                participant?.hasSeenLatestMessage
              )
            }
            hasSeenLatestMessage={participant?.hasSeenLatestMessage}
            onDeleteConversation={onDeleteConversation}
            onEditConversation = {onEditConversation}
            onLeaveConversation = {onLeaveConversation}
          />
        );
      })}
      <Box
        position="absolute"
        bottom={0}
        left={0}
        width="100%"
        bg="#313131"
        px={8}
        py={6}
        zIndex={1}
      >
        <Button width="100%" onClick={() => signOut()}>
          Logout
        </Button>
      </Box>
    </Box>
  );
};

export default ConversationList;
