import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from '@apollo/server/express4';
import express from "express";
import typeDefs from "./graphql/typeDefs";
import resolvers from "./graphql/resolvers";
import { makeExecutableSchema } from "@graphql-tools/schema";
import * as dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { GraphQLContext, Session, SubscriptionContext } from "./utils/types";
import { getSession } from "next-auth/react";
import { createServer } from "http";
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { WebSocketServer } from "ws";
import { useServer } from "graphql-ws/lib/use/ws";
import { PubSub } from 'graphql-subscriptions';
import cors from 'cors';
import { json } from "body-parser";

async function main() {
  dotenv.config();

  const app = express();
  
  const httpServer = createServer(app);
  
  // Creating the WebSocket server
  const wsServer = new WebSocketServer({
    // This is the `httpServer` we created in a previous step.
    server: httpServer,
    // Pass a different path here if app.use
    // serves expressMiddleware at a different path
    path: "/graphql/subscriptions",
  });

  const schema = makeExecutableSchema({
    typeDefs,
    resolvers,
  });

  const pubsub = new PubSub();

  // Hand in the schema we just created and have the
  // WebSocketServer start listening.
  const serverCleanup = useServer({ 
    schema, 
    context: async(ctx: SubscriptionContext) : Promise<GraphQLContext> => {
    if(ctx.connectionParams && ctx.connectionParams.session){
      const {session} = ctx.connectionParams;
      return {session, prisma, pubsub};
    }
    return {session: null, prisma, pubsub};
  }
  }, 
  wsServer);

  const corsOptions = {
    origin: process.env.CLIENT_ORIGIN,
    credentials: true,
  };

  const prisma = new PrismaClient();

  const server = new ApolloServer({
    schema,
    csrfPrevention: true,
    // cache: "bounded",
    plugins: [
      // Proper shutdown for the HTTP server.
      ApolloServerPluginDrainHttpServer({ httpServer }),

      // Proper shutdown for the WebSocket server.
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
    ],
  });
  await server.start();
  const PORT = 4000;
  // server.applyMiddleware({ app, cors: corsOptions });
  app.use(
    '/graphql',
    cors<cors.CorsRequest>(corsOptions),
    json(),
    expressMiddleware(server, {
      context: async ({ req }) : Promise<GraphQLContext> => {
          const session = await getSession({ req });
          return { session: session as Session, prisma: prisma as PrismaClient, pubsub};
        }
    }),
  );
  await new Promise<void>((resolve) =>
    httpServer.listen({ port: PORT }, resolve)
  );
  console.log(`🚀 Server ready at http://localhost:${PORT}graphql`);
}

main().catch((error) => console.log(error));
