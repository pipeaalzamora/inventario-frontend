import { MetaData } from "@/shared/models/apiResponse";
import { Company } from "@/shared/models/company";
import { CompanyProduct, ProductRestricted } from "@/shared/models/products";
import { Store, StoreWarehouse } from "@/shared/models/store";
import { User } from "@/shared/models/user";

export type ProductPayloadFront = Partial<CompanyProduct> & { quantity: number };

export type ProductPayload = {
  itemId: ProductPayloadFront['id'];
  quantity: ProductPayloadFront['quantity'];
};

export type RequestPayload = {
  storeId: Store['id'];
  companyId: Company['id'];
  warehouseId: StoreWarehouse['id'];
  requestType: string;
  observation: string;
  requesterId: User['id'];
  items: ProductPayload[];
}

export type Request = {
  id: string;
  displayId: string;
  storeId: Store['id'];
  storeName: Store['storeName'];
  warehouseId: StoreWarehouse['id'];
  warehouseName: StoreWarehouse['warehouseName'];
  requestType: string;
  requesterId: User['id'];
  requesterName: User['name'];
  status: RequestStatus;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export type RequestResponse = {
  items: Request[];
  metadata: MetaData;
}

export type RequestStatus = 'pending' | 'approved' | 'conflicted' | 'rejected' | 'cancelled' | 'completed';

export type RequestDetail = Request & {
  items: ProductPayload[];
  requestHistory: RequestHistory[];
  conflicts: Conflict[];
}

export type RequestHistory = {
  newStatus: RequestStatus;
  changedByName: User['name'];
  observation: string | null;
  changedAt: string | Date;
}

export type Conflict = {
  itemId: ProductRestricted['id'];
  type: ConflictType;
  detail: ConflictDetail;
}

export type ConflictType = 'max_quantity_conflict';

export type ConflictDetail = {
  currQuantity: number;
  maxQuantity: number;
}