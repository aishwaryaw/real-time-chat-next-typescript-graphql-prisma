import { getSession, useSession } from "next-auth/react";
import { NextPage, NextPageContext } from "next";
import { Box } from "@chakra-ui/react";
import Auth from "@/components/Auth/Auth";
import Chat from "@/components/Chat";

const Home : NextPage = () => {

  const { data : session } = useSession();
  const reloadSession = () => {
    const event = new Event("visibilitychange");
    document.dispatchEvent(event);
  };

  return (
    <Box>
      {session && session?.user?.username ? (
        <Chat session={session} />
      ) : (
       <Auth session={session} reloadSession={reloadSession} />
      )}
    </Box>
  );
}



export async function getServerSideProps(context: NextPageContext){
  const session = await getSession(context);
  return {
    props:{
      session
    }
  }

}

export default Home;