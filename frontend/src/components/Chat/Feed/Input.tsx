import * as React from "react";
import { Box, Input } from "@chakra-ui/react";
import { Session } from "next-auth";
import { useState } from "react";
import { useMutation } from "@apollo/client";
import messageOperations from '../../../graphql/operations/messages';
import { MessageData, SendMessageVariables } from "@/util/types";
import { ObjectId } from "bson";
import { toast } from "react-hot-toast";


interface IMessageInputProps {
  session: Session;
  conversationId: string;
}

const MessageInput: React.FC<IMessageInputProps> = ({
  session,
  conversationId,
}) => {
  const [messageBody, setMessageBody] = useState("");
  const [ sendMessage ] = 
  useMutation<{sendMessage: boolean}, SendMessageVariables>(messageOperations.Mutations.sendMessage);

  const onSubmit = async(event: React.FormEvent) => {
    event.preventDefault();
    // send message mutation
    try{
    const { id: senderId } = session.user;
    const newMessageId = new ObjectId().toString();
    const {data, errors} = await sendMessage({
      variables: {
        id: newMessageId,
        body: messageBody,
        conversationId,
        senderId
      },
      // optimistically update UI without waiting for server to respond
      optimisticResponse: {
        sendMessage: true
      },
      update: (cache) => {
        setMessageBody("");
        const existing = cache.readQuery<MessageData>({
          query: messageOperations.Queries.messages,
          variables: {conversationId},
        }) as MessageData;

        cache.writeQuery<MessageData, {conversationId: string}>({ 
          query: messageOperations.Queries.messages,
          variables: {conversationId},
          data: {
            ...existing,
            messages: [
              {
                id: newMessageId,
                conversationId,
                body:messageBody,
                senderId: session.user.id,
                sender: {
                  id: session.user.id,
                  username: session.user.username
                },
                createdAt: new Date(Date.now()),
                updatedAt: new Date(Date.now())
              },
              ...existing.messages
            ]
          }
        });
      }
    });
    if(!data?.sendMessage || errors){
      throw new Error("Error sending message");
    }
  }
  catch(error:any){
    console.log('onSendMessageError', error);
    toast.error(error?.message)
  }

  };
  return (
    <Box px={4} py={6} width="100%">
      <form onSubmit={onSubmit}>
        <Input
          value={messageBody}
          onChange={(event) => setMessageBody(event.target.value)}
          size="md"
          placeholder="Enter a message"
          color="whiteAlpha.900"
          resize="none"
          _focus={{
            boxShadow: "none",
            border: "1px solid",
            borderColor: "whiteAlpha.300",
          }}
          _hover={{
            borderColor: "whiteAlpha.300",
          }}
        />
      </form>
    </Box>
  );
};

export default MessageInput;
