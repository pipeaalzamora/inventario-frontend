import { ProductPayloadFront, RequestDetail } from '@/request/models/request';
import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NoImageComponent } from 'public/default/no-image.component';

@Component({
  selector: 'dot-product-list',
  imports: [
    NgOptimizedImage,
    NoImageComponent,
  ],
  templateUrl: './product-list.component.html',
  styleUrl: './product-list.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductListComponent {
  public products = input.required<ProductPayloadFront[]>();
  public readonly = input<boolean>(false);
  public isMobile = input<boolean>(false);
  public actualRequest = input<RequestDetail | null>();

  public deleteProduct = output<ProductPayloadFront>();
  public updatedProducts = output<ProductPayloadFront[]>();

  protected increment(product: ProductPayloadFront): void {
    if (this.readonly()) return;
    const updatedProducts = this.products().map(p => p.id === product.id ? {...p, quantity: p.quantity + 1} : p);

    this.updatedProducts.emit(updatedProducts);
  }

  protected decrement(product: ProductPayloadFront): void {
    if (this.readonly()) return;
    if (product.quantity === 1) return this.deleteProduct.emit(product);

    const updatedProducts = this.products().map(p => p.id === product.id ? {...p, quantity: p.quantity - 1} : p);

    this.updatedProducts.emit(updatedProducts);
  }

  protected handleInput(event: Event, product: ProductPayloadFront): void {
    const value = (event.target as HTMLInputElement).valueAsNumber || 1;

    if (
      value < 1 ||
      isNaN(value)
    ) return this.deleteProduct.emit(product);

    const updatedProducts = this.products().map(p => p.id === product.id ? {...p, quantity: value} : p);

    this.updatedProducts.emit(updatedProducts);
  }

  protected handleBlur(event: Event, product: ProductPayloadFront): void {
    const value = (event.target as HTMLInputElement).valueAsNumber;

    if (
      value < 1 ||
      isNaN(value)
    ) return this.deleteProduct.emit(product);
  }

  protected findProductInRequest(product: ProductPayloadFront): boolean {
    if (!this.actualRequest()) return false;

    return this.actualRequest()?.items.some(i => i.itemId === product.id) || false;
  }

}
