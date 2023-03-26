# real-time-chat-next-typescript-graphql-prisma

Built a real-time chat application with nextjs-typescript, graphql tied up with apollo-client and apollo-server, mongodb and prisma.

1. User can login with gmail's oauth provider which has been implemented using next-auth.
2. User can create single-person as well as group chats with admin functionality.
3. User can send and receive real-time messages.
4. User can edit a chat by adding or removing chat participants if he/she is an admin.
5. User can leave a chat or delete a chat, if this user is an admin then he/should select next admin and then leave a chat.

All the chat updates take place real-time with the use of graphql subscriptions and optimistic modifications of apollo cache.
