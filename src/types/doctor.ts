export interface Doctor {
    id: string;
    uid?: string; // Some collections might use uid
    name: string;
    profileImage: string;
    aboutMe: string;
    worksAt: string;
    numExp: number;
    currentState: string;
    currentCity: string;
    consultationFees: number;
    averageRating: number;
    knownLanguages: string[];
    specialization: string;
    isAccountVerified?: boolean;
}
