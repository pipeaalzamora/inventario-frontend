import { PurchaseOrderDetail } from '@/request/models/purchase-order';
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '@env/environment';

export type PurchasePost = {
  purchaseId: string;
  observation: string;
  items: ProductPost[];
}

export type ProductPost = {
  itemId: string;
  accepted: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ManageOcService {
  private router = inject(Router)

  private readonly api = environment.api;

  constructor() { }

  public async getPurchaseByToken(token: string):Promise<PurchaseOrderDetail | null> {
    if (!token || token === '') {
      this.router.navigateByUrl('supplier-manage-oc/token-expired');
      return null;
    }

    const response = await fetch(`${this.api}/supplier-oc?token=${token}`);

    if (response.status === 403) {
      this.router.navigateByUrl('supplier-manage-oc/error?code=403');
      return null;
    }

    if (response.status === 404) {
      this.router.navigateByUrl('supplier-manage-oc/error');
      return null;
    }

    if (response.status === 400) {
      this.router.navigateByUrl('supplier-manage-oc/token-expired');
      return null;
    }

    if (!response.ok) return null

    return await response.json()
  }

  public async postPurchaseByToken(token: string, body: PurchasePost): Promise<void> {
    if (!token || token === '') {
      this.router.navigateByUrl('supplier-manage-oc/token-expired');
      return;
    }

    const response = await fetch(`${this.api}/supplier-oc?token=${token}`, {
      method: 'POST',
      body: JSON.stringify(body)
    });

    if (response.status === 403) {
      this.router.navigateByUrl('supplier-manage-oc/error?code=403');
      return;
    }

    if (response.status === 404) {
      this.router.navigateByUrl('supplier-manage-oc/error');
      return;
    }

    if (response.status === 400 || !response.ok) {
      this.router.navigateByUrl('supplier-manage-oc/token-expired');
      return;
    }

    this.router.navigateByUrl('supplier-manage-oc/success');
  }
}
