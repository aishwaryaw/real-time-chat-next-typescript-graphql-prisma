import { useLazyQuery, useMutation } from "@apollo/client";
import {
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  Stack,
  Input,
  Box,
} from "@chakra-ui/react";
import React, { useEffect, useState } from "react";
import userOperations from "@/graphql/operations/users";
import conversationOperations from "@/graphql/operations/conversations";
import {
  createConversationData,
  createConversationVariables,
  searchedUser,
  SearchUsersData,
  SearchUsersVariables,
  updateParticipantsVariables,
} from "@/util/types";
import UserSearchList from "./UserSearchList";
import { toast } from "react-hot-toast";
import Participants from "./Participants";
import { Session } from "next-auth";
import { useRouter } from "next/router";
import {
  ConversationPopulated,
  ParticipantPopulated,
} from "../../../../../../backend/src/utils/types";
import ConversationItem from "../ConversationItem";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: Session;
  editingConversation?: ConversationPopulated | null;
  onViewConversation?: (
    conversationId: string,
    hasSeenLatestMessage: boolean
  ) => void;
  conversations: Array<ConversationPopulated>;
  getUserParticipantObject?: (
    conversation: ConversationPopulated
  ) => ParticipantPopulated;
  leavingConversation?: ConversationPopulated | null;
}
const ConversationModal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  session,
  editingConversation,
  onViewConversation,
  conversations,
  getUserParticipantObject,
  leavingConversation,
}) => {
  const rounter = useRouter();
  const [username, setUsername] = useState("");
  const {
    user: { id: userId },
  } = session;
  /**  
    Unlike with useQuery, when you call useLazyQuery, 
    it does not immediately execute its associated query. 
    Instead, it returns a query function in its result tuple that you call
    whenever you're ready to execute the query.
    */
  const [participants, setParticipants] = useState<searchedUser[]>([]);
  const [existingConversation, setExistingConversation] =
    useState<ConversationPopulated | null>(null);
  const [searchUsers, { loading: searchUsersLoading }] = useLazyQuery<
    SearchUsersData,
    SearchUsersVariables
  >(userOperations.Queries.searchUsers);

  const [searchedUsersData, setSearchedUsersData] =
    useState<SearchUsersData | null>(null);

  const [updateParticipants, { loading: updateParticipantsLoading }] =
    useMutation<{ updateParticipants: boolean }, updateParticipantsVariables>(
      conversationOperations.Mutations.updateParticipants
    );

  const [createConversation, { loading: createConversationLoading }] =
    useMutation<createConversationData, createConversationVariables>(
      conversationOperations.Mutations.createConversation
    );
  const [modifyAdmin, { loading: modifyAdminLoading }] = useMutation<
    { modifyAdmin: boolean },
    { conversationId: string; userId: string }
  >(conversationOperations.Mutations.modifyAdmin);

  const onSearch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const { data: userData, error: searchedUserError } = await searchUsers({
        variables: {
          username,
        },
      });
      if (!userData || searchedUserError) {
        throw new Error("Failed to get users", searchedUserError);
      }
      setSearchedUsersData(userData);
    } catch (error: any) {
      console.log("search user error", error);
      toast.error(error.message);
    } finally {
      setUsername("");
    }
  };

  const addParticipant = (participant: searchedUser) => {
    setParticipants((prev) =>
      !prev.includes(participant) ? [...prev, participant] : [...prev]
    );
  };

  const removeParticipant = (id: string) => {
    setParticipants((prev) => prev.filter((p) => p.id != id));
  };

  const leaveConversation = async (participantId: string) => {
    if (leavingConversation) {
      try {
        const { data, errors } = await modifyAdmin({
          variables: {
            conversationId: leavingConversation.id,
            userId: participantId,
          },
        });

        if (!data?.modifyAdmin || errors) {
          throw new Error("modify admin error");
        } else {
          const participantIds = leavingConversation.participants
            .filter((participant) => participant.user.id !== userId)
            .map((p) => p.user.id);
          try {
            const { data, errors } = await updateParticipants({
              variables: {
                conversationId: leavingConversation.id,
                participantIds,
              },
            });
            if (!data || errors) {
              throw new Error("Failed to update participants");
            }
          } catch (error: any) {
            console.log("onUpdateConversation error", error);
            toast.error(error?.message);
          }
        }
      } catch (error: any) {
        console.log("Modify admin error", error);
        toast.error(error.message);
      }
      onClose();
    }
  };

  /**
   * Verifies that a conversation with selected
   * participants does not already exist
   */
  const findExistingConversation = (
    participantIds: string[]
  ): ConversationPopulated | null => {
    let existingConversation: ConversationPopulated | null = null;
    if (!conversations.length) return null;
    for (const conversation of conversations) {
      const addedParticipants = conversation.participants.filter(
        (p) => p.user.id !== userId
      );
      if (addedParticipants.length !== participantIds.length) {
        continue;
      }
      let allMatchingParticipants: boolean = false;
      for (const participant of addedParticipants) {
        const foundParticipant = participantIds.find(
          (p) => p === participant.user.id
        );

        if (!foundParticipant) {
          allMatchingParticipants = false;
          break;
        }
        allMatchingParticipants = true;
      }

      if (allMatchingParticipants) {
        existingConversation = conversation;
      }
    }

    return existingConversation;
  };

  const onSubmit = async () => {
    if (!participants.length) return;
    // create conversation mutation
    const participantIds = participants.map((participant) => participant.id);
    const existing = findExistingConversation(participantIds);

    if (existing) {
      toast("Conversation already exists");
      setExistingConversation(existing);
      return;
    }

    /**
     * Determine which function to call
     */

    editingConversation
      ? onUpdateConversation(editingConversation)
      : onCreateConversation();
  };

  const onCreateConversation = async () => {
    const participantIds = [userId, ...participants.map((p) => p.id)];
    try {
      const { data, errors } = await createConversation({
        variables: {
          participantIds,
        },
      });
      if (!data?.createConversation || errors) {
        throw new Error("Failed to create conversation");
      }
      const {
        createConversation: { conversationId },
      } = data;

      rounter.push({ query: { conversationId } });

      /**
       * Clear state and close modal
       * on successful creation
       */
      setParticipants([]);
      setUsername("");
      onClose();
    } catch (error: any) {
      console.log("create conversation error", error);
      toast.error(error.message);
    }
  };

  const onUpdateConversation = async (conversation: ConversationPopulated) => {
    try {
      if (conversation.admin.id === session.user.id) {
        const { data, errors } = await updateParticipants({
          variables: {
            conversationId: conversation.id,
            participantIds: [
              userId,
              ...participants.map((participant) => participant.id),
            ],
          },
        });
        if (!data?.updateParticipants || errors) {
          throw new Error("Failed to update participants");
        }
        /**
         * Clear state and close modal
         * on successful update
         */
        setParticipants([]);
        setUsername("");
        onClose();
      } else {
        throw new Error("Conversation can not be edited");
      }
    } catch (error: any) {
      console.log("onUpdateConversation error", error);
      toast.error("Failed to update participants");
    }
  };

  const onConversationClick = () => {
    if (!existingConversation) return;
    if (getUserParticipantObject && onViewConversation) {
      const { hasSeenLatestMessage } =
        getUserParticipantObject(existingConversation);
      onViewConversation(existingConversation.id, !hasSeenLatestMessage);
      onClose();
    } else return;
  };

  /**
   * If a conversation is being edited,
   * update participant state to be that
   * conversations' participants
   */
  useEffect(() => {
    if (editingConversation) {
      setParticipants(
        editingConversation.participants
          .filter((participant) => participant.user.id !== userId)
          .map((p) => p.user as searchedUser)
      );
      return;
    }
    if (leavingConversation) {
      setParticipants(
        leavingConversation.participants.map((p) => p.user as searchedUser)
      );
      return;
    }
  }, [editingConversation, leavingConversation, userId]);

  /**
   * Reset existing conversation state
   * when participants added/removed
   */
  useEffect(() => {
    setExistingConversation(null);
  }, [participants]);

  /**
   * Clear participant state if closed
   */
  useEffect(() => {
    if (!isOpen) {
      setParticipants([]);
      setUsername("");
      setSearchedUsersData(null);
    }
  }, [isOpen]);

  return leavingConversation ? (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent bg="#2d2d2d" pb={4}>
        <ModalHeader>Select admin</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {participants.length > 0 && (
            <>
              <Participants
                participants={participants.filter(
                  (participant) => participant.id !== userId
                )}
                selectAsAdmin={leaveConversation}
              />
            </>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  ) : (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent bg="#2d2d2d" pb={4}>
        <ModalHeader>Create a conversation</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <form onSubmit={onSearch}>
            <Stack spacing={4}>
              <Input
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <Button
                type="submit"
                disabled={!username}
                isLoading={searchUsersLoading}
              >
                submit
              </Button>
            </Stack>
          </form>
          {searchedUsersData?.searchUsers && (
            <UserSearchList
              searchedUsers={searchedUsersData.searchUsers}
              addParticipant={addParticipant}
            />
          )}
          {participants.length > 0 && (
            <>
              <Participants
                participants={participants}
                removeParticipant={removeParticipant}
              />
              <Box mt={4}>
                {existingConversation && (
                  <ConversationItem
                    key={existingConversation.id}
                    userId={userId}
                    conversation={existingConversation}
                    onClick={() => onConversationClick()}
                  />
                )}
              </Box>
              <Button
                mt={4}
                bg="brand.100"
                _hover={{ bg: "brand.100" }}
                width="100%"
                onClick={onSubmit}
                isLoading={
                  createConversationLoading || updateParticipantsLoading
                }
              >
                {editingConversation
                  ? "Update conversation"
                  : "Create conversation"}
              </Button>
            </>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default ConversationModal;
