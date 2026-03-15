import { ChangeDetectionStrategy, Component, inject, ChangeDetectorRef } from '@angular/core';
import { FilterComponent, ColumnDefinition } from '@/shared/components/controller/filter/filter.component'
import { PaginationController, PaginationControllerCFG } from '@/shared/paginationController';
import { SorterHeaderComponent } from '@/shared/components/controller/sorter-header/sorter-header.component';
import { SearchBarComponent } from '@/shared/components/controller/search-bar/search-bar.component';
import { PaginationComponent } from '@/shared/components/controller/pagination/pagination.component';
import { TableCaptionComponent } from '@/shared/components/controller/table-caption/table-caption.component';
import { LayoutService } from '@/shared/services/layout.service';
import { LinkDirective } from '@/shared/directives/link.directive';
import { ProductService, Product, Category, Code } from '@/system/services/product.service';
import { NoImageComponent } from 'public/default/no-image.component';
import { AuthService } from '@/auth/services/auth.service';
import { DropdownComponent } from '@/shared/components/dropdown/dropdown.component';


const CONTROLLER_COMPONENTS = [
  SorterHeaderComponent,
  SearchBarComponent,
  FilterComponent,
  PaginationComponent,
  TableCaptionComponent,
  NoImageComponent,
  DropdownComponent
]

@Component({
  selector: 'dot-product',
  imports: [CONTROLLER_COMPONENTS, LinkDirective],
  templateUrl: './template-product.component.html',
  styleUrl: './template-product.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductComponent {
  private layoutService = inject(LayoutService);
  private productService = inject(ProductService);
  private authService = inject(AuthService);
  protected isMobile = this.layoutService.isMobile;
  private cdr = inject(ChangeDetectorRef);

  protected controller = new PaginationController<Product>([], <PaginationControllerCFG>{
    defaultSearchColumns: ['name', 'sku', 'image', 'description', 'categories', 'codes'],
  });

  protected CAN_CREATE_PRODUCT = this.authService.hasPower('template_product:create');
  protected CAN_UPDATE_PRODUCT = this.authService.hasPower('template_product:update');


  protected columns: ColumnDefinition[] = [
    { nameToShow: 'Nombre', columnName: 'name', type: 'string' },
    { nameToShow: 'SKU', columnName: 'sku', type: 'string' },
    { nameToShow: 'Imagen', columnName: 'image', type: 'entity' },
    { nameToShow: 'Descripción', columnName: 'description', type: 'string' },
    { nameToShow: 'Categorías', columnName: 'categories', type: 'array', centerCol: true, multipleSelection: true, posibleSelections: [] },
    { nameToShow: 'Códigos', columnName: 'codes', type: 'array', multipleSelection: true, posibleSelections: [] , showOnly: 'table'},
    // { nameToShow: 'Opciones', columnName: null, type: 'entity', noSort: true, centerCol: true, showIf: this.CAN_UPDATE_PRODUCT }
  ];

  constructor() {
    this.loadProducts();
    this.loadFilterOptions();
  }

  protected skuOf(product: Product): string {
    if (!product) return '-';
    return (product.sku && String(product.sku).trim() !== '') ? product.sku : '-';
  }


  // private getTemplateProduct() {
  //   const products = this.productService.getTemplateProduct();
  //   this.MOCK_PRODUCTS.set(products);
  // }

  private async loadFilterOptions(): Promise<void> {
    const categories = await this.productService.getAllCategories();
    const categoryColumn = this.columns.find(c => c.columnName === 'categories');
    if (categoryColumn) {
      categories.map(cat => ({
        label: cat.name,
        value: cat.id
      }));
    }
    this.cdr.markForCheck();
  }

  private async loadProducts(): Promise<void> {
    const products = await this.productService.getAllProductsTemplate();
    const validProducts = (products ?? []).filter(p => p && p.id);
    this.controller.SetRawData(validProducts);
    this.cdr.markForCheck();
  }

}
