import { Power } from "@/auth/models/auth";

export type Profile = {
    id: string;
    profileName: string;
    description: string;
    powers: Power[]
}

export type ProfileResponse = {
    profiles: Profile[],
}

export type PowerResponse = {
    categories: PowerCategory[]
}

export type PowerCategory = {
    id: string;
    categoryName: string;
    description: string;
    ownable: boolean;
    powers: Power[];
}