import { Profile } from "./profile"

export type AllUserReponse = {
    users: UserAccount[]
}

export type UserAccount = {
    id: string,
    userName: string,
    userEmail: string,
    userPassword: string,
    description: string | null,
    available: boolean,
    deletedAt: Date | null,
    createdAt: Date,
    updatedAt: Date | null,
    isNewAccount: boolean,
    profiles: Profile[],
}