# real-time-chat-next-typescript-graphql-prisma

Built a real-time chat application with nextjs-typescript, graphql tied up with apollo-client and apollo-server, mongodb and prisma.

1. User can login with gmail's oauth provider which has been implemented using next-auth.
2. User can create single-person as well as group chats.
3. User can send and receive real-time messages.
4. User can edit a chat by adding or removing chat participants.
5. User can leave a chat or delete a chat.

All the chat updates take place real-time with the use of graphql subscriptions and optimistic modifications of apollo cache.
