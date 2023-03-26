import { ParticipantPopulated } from "./types";

export const isUserInConversationParticipants = 
    (
        participants: Array<ParticipantPopulated>,
        userId: string
    ): boolean => {

        return !!participants.find(participant => participant.userId === userId);
}