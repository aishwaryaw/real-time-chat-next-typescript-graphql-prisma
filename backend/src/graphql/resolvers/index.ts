import userResolvers from "./users";
import conversationResolvers from './conversations';
import messageResolvers from './messages';
import scalarResolvers from './scalars';
import merge from 'lodash.merge';

const resolvers = merge({}, userResolvers, conversationResolvers, messageResolvers,scalarResolvers);


export default resolvers;