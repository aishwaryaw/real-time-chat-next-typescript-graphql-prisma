import { searchedUser } from '@/util/types';
import { Avatar, Button, Flex, Stack, Text} from '@chakra-ui/react';
import * as React from 'react';

interface IUserSearchListProps {
    searchedUsers: Array<searchedUser>;
    addParticipant: (participant: searchedUser) => void;
}

const UserSearchList: React.FunctionComponent<IUserSearchListProps> = ({searchedUsers,addParticipant}) => {
  return (
    <>
    {searchedUsers.length == 0 ? 
    (
    <Flex mt={6} justify='center'>
      <Text>No users found</Text>
      </Flex>) 
      :
    (
    <Stack mt={6}>
      {searchedUsers.map(searchedUser => (
        <Stack 
        key={searchedUser.id}
        direction='row'
        spacing={2}
        align='center'
        py={2}
        px={4}
        borderRadius={4}
        _hover={{bg: "whiteAlpha.200"}}
        >
        <Avatar/>
        <Flex justifyContent="space-between" width="100%">
        <Text color="whiteAlpha.700">{searchedUser.username}</Text> 
        <Button bg="brand.100" _hover={{bg: "brand.100"}} onClick={()=> addParticipant(searchedUser)}>Select</Button>
        </Flex>
        </Stack>
      ))}
    </Stack>
    )
    
    }
    </>
  ) ;
};

export default UserSearchList;
