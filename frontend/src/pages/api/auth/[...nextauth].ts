import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient();


export default NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    session({session, token, user}){
      // session {
      //   user: {
      //     name: 'Aishwarya Walawalkar',
      //     email: 'aishwaryawalawalkar@gmail.com',
      //     image: 'https://lh3.googleusercontent.com/a/AGNmyxZm-w46_HZ1Mov9AkgpxZChw4WVtobE0C0VStiv=s96-c'
      //   },
      //   expires: '2023-04-04T15:37:05.990Z'
      // }
      // user {
      //   id: '6404b7200b3f1641d65ced47',
      //   username: null,
      //   name: 'Aishwarya Walawalkar',
      //   email: 'aishwaryawalawalkar@gmail.com',
      //   emailVerified: null,
      //   image: 'https://lh3.googleusercontent.com/a/AGNmyxZm-w46_HZ1Mov9AkgpxZChw4WVtobE0C0VStiv=s96-c'
      // }
      // session - next auth session proeprty which contains name, image and email in user and expires in
      // user: user coming from prisma
      return {...session, user:{...session.user, ...user}}
    }
  }
})