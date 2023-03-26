import { searchedUser } from '@/util/types';
import { Flex, Stack, Text } from '@chakra-ui/react';
import * as React from 'react';
import { IoIosCloseCircleOutline, IoIosArrowUp } from "react-icons/io";


interface IParticipantsProps {
    participants: Array<searchedUser>;
    removeParticipant?: (participantId: string) => void;
    selectAsAdmin?: (participantId: string) => void
}

const Participants: React.FunctionComponent<IParticipantsProps> = ({participants, removeParticipant, selectAsAdmin}) => { 
 return(
    <Flex direction="row" mt={8} flexWrap="wrap" gap="10px">
    {participants.map((participant) => (
        <Stack
          key={participant.id}
          direction="row"
          align="center"
          bg="whiteAlpha.200"
          borderRadius={4}
          p={2}
        >
          <Text>{participant.username}</Text>
          {removeParticipant && (
          <IoIosCloseCircleOutline
            size={20}
            cursor="pointer"
            onClick={() => removeParticipant(participant.id)}
          /> )}
          {selectAsAdmin && (
           <IoIosArrowUp
            size={20}
            cursor="pointer"
            onClick={() => selectAsAdmin(participant.id)}
          />
        )
          }
        </Stack>
      ))}
      </Flex>
 )
};

export default Participants;
