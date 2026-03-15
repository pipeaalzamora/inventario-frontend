// export type Count = {
//     id: string;
//     displayId: string;
//     storeId: string;
//     storeName: string;
//     companyId: string;
//     warehouseId: string;
//     warehouseName: string;
//     assignedTo: string | null;
//     assignedToName: string | null;
//     scheduledAt: Date | null;
//     completedAt: Date | null;
//     createdBy: string;
//     createdByName: string;
//     createdAt: string | Date;
//     updatedAt: string | Date;
//     movementTrackId: string;
//     status: CountStatus;
//     totalItems: number;
//     completedItems: number;
// }

export type Count = {
    id: string;
    displayId: string;
    storeId: string;
    storeName: string;
    companyId: string;
    warehouseId: string;
    warehouseName: string;
    createdBy: string;
    createdByName: string;
    assignedTo: string | null;
    assignedToName: string | null;
    status: CountStatus;
    scheduledAt: Date ;
    completedAt: Date | string | null;
    createdAt: Date | string;
    updatedAt: Date | string;
    movementTrackId: string;
    countItems?: CountMetaData[];
    metaData: CountMetaData[];
}

export type CountMetaData = {
    productId: string;
    completed: boolean;
    total: number;
    unitsCount: UnitCount[];
}

export type CountDetail = Omit<Count, 'countItems'> & {
    countItems: CountItem[];
}

export type CountStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'un_assigned' | 'rejected';

export type CountItem = {
    productId: string;
    productName: string;
    productSku: string;
    productImage: string | null;
    completed: boolean;
    unitsCount: UnitCount[];
    // Campos para incidencias guardadas desde el backend
    incidenceImageUrl?: string | null;
    incidenceObservation?: string | null;
}

export type UnitCount = {
    unitId: number;
    unitAbv: string;
    count: number;
    factor: number;
}