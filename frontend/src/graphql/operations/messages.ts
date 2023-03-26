/* eslint-disable import/no-anonymous-default-export */
import { gql } from '@apollo/client';

export const messsageFields = `
    id
    sender {
        id
        username
    }
    body
    createdAt
`

export default {
   Queries : { 
    messages : gql`
    query Messages($conversationId:String!){
        messages(conversationId: $conversationId){
            ${messsageFields}
            }
        }
    `
   },
   Mutations: {
    sendMessage: gql`
    mutation SendMessage($id:String!, $conversationId: String!, $senderId: String!, $body: String!){
        sendMessage(id:$id, conversationId: $conversationId,senderId: $senderId,body: $body)
    }
    `
   },

   Subscription: {
    messageSent: gql`
    subscription MessageSent($conversationId:String!){
        messageSent(conversationId: $conversationId){
            ${messsageFields}
        }
    }
    `
   }

}