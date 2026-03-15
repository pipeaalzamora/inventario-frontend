export type CompaniesResponse = {
    companies: Company[]
}

export type Company = {
    id: string;
    countryId: number;
    city?: string;
    email?: string;
    commune?: string;
    idFiscal?: string;
    fiscalDataId?: string;
    companyName: string;
    description: string;
    imageLogo: string;
    fiscalData?: FiscalData;
    createdAt: string | Date;
    updatedAt: string | Date;
    fiscalName?: string;
}

export type FiscalData = {
    id: string;
    idFiscal: string;
    fiscalName: string;
    fiscalAddress: string;
    fiscalState: string;
    fiscalCity: string;
    email: string;
}