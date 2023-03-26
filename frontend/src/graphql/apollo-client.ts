import { ApolloClient, InMemoryCache} from '@apollo/client';
import { HttpLink, split } from '@apollo/client/core';
import { createClient } from 'graphql-ws';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { getSession } from 'next-auth/react'

const httpLink = new HttpLink({
    uri: 'http://localhost:4000/graphql',
    credentials: "include" 
});

const wsLink = typeof window != "undefined" ?  new GraphQLWsLink(createClient({
  url: 'ws://localhost:4000/graphql/subscriptions',
  connectionParams: async() =>({
    session : await getSession()
  })
})): null;


// The split function takes three parameters:
//
// * A function that's called for each operation to execute
// * The Link to use for an operation if the function returns a "truthy" value
// * The Link to use for an operation if the function returns a "falsy" value
const link = typeof window != "undefined" && wsLink != null ? split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  httpLink,
): httpLink;


const client = new ApolloClient({
    link,
    cache: new InMemoryCache(),
  });

export default client;