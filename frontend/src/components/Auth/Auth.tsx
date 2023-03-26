import userOperations from "@/graphql/operations/users";
import { CreateUsernameData, CreateUsernameVariables } from "@/util/types";
import { useMutation } from "@apollo/client";
import { Button, Center, Image, Input, Stack, Text } from "@chakra-ui/react";
import { Session } from "next-auth";
import { signIn } from "next-auth/react";
import React, { useState } from "react";
import toast from "react-hot-toast";

type IAuthProps = {
  session: Session | null;
  reloadSession: () => void;
};

const Auth: React.FC<IAuthProps> = ({ session, reloadSession }) => {
  const [username, setusername] = useState("");
  const [createUsername, { data, loading, error }] = useMutation<
    CreateUsernameData,
    CreateUsernameVariables
  >(userOperations.Mutations.createUsername);

  const onSubmit = async () => {
    /** Creating username using graphql mutation */
    if (!username) return;
    try {
      const { data, errors } = await createUsername({
        variables: {
          username,
        },
      });

      if (!data?.createUsername) {
        throw new Error();
      }

      if (data.createUsername.error || errors?.length) {
        const {createUsername: {error}} = data;
        toast.error(error);
        return;
      }
      toast.success("Username created successfully");
       /**
       * Reload session to obtain new username
       */
       reloadSession();

    } catch (error: any) {
      toast.error("There was an error");
      console.log("create username error", error);
    }
  };

  if (error) {
    toast.error(error.message);
  }

  return (
    <Center height="100vh">
      <Stack spacing={8} align="center">
        {session ? (
          <>
            <Text fontSize="3xl">Create username</Text>
            <Input
              placeholder="Enter username"
              value={username}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                setusername(event.target.value);
              }}
            />
            <Button onClick={onSubmit} isLoading={loading}>
              Save
            </Button>
          </>
        ) : (
          <>
            <Image
              height={100}
              src="/images/imessage-logo.png"
              alt="imessage"
            />
            <Text fontSize="4xl">MessengerQL</Text>
            <Text width="70%" align="center">
              Sign in with Google to send unlimited free messages to your
              friends
            </Text>
            <Button
              onClick={() => signIn("google")}
              leftIcon={
                <Image
                  height="20px"
                  src="/images/googlelogo.png"
                  alt="Google"
                />
              }
            >
              Continue with Google
            </Button>
          </>
        )}
      </Stack>
    </Center>
  );
};
export default Auth;
