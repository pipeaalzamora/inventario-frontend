import { ColumnDefinition, FilterComponent } from '@/shared/components/controller/filter/filter.component';
import { PaginationComponent } from '@/shared/components/controller/pagination/pagination.component';
import { SearchBarComponent } from '@/shared/components/controller/search-bar/search-bar.component';
import { SorterHeaderComponent } from '@/shared/components/controller/sorter-header/sorter-header.component';
import { TableCaptionComponent } from '@/shared/components/controller/table-caption/table-caption.component';
import { LinkDirective } from '@/shared/directives/link.directive';
import { PaginationController, PaginationControllerCFG } from '@/shared/paginationController';
import { LayoutService } from '@/shared/services/layout.service';
import { ChangeDetectionStrategy, Component, effect, inject, signal, ViewChild }  from '@angular/core';
import { ProductService, Product, ProductManagement } from '@/system/services/product.service';
import { Router } from '@angular/router';
import { ModalComponent } from '@/shared/components/modal/modal.component';
import { NoImageComponent } from 'public/default/no-image.component';
import { CompanyService } from '@/shared/services/company.service';
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
  selector: 'dot-product-management',
  imports: [CONTROLLER_COMPONENTS, LinkDirective, ModalComponent, NoImageComponent],
  templateUrl: './products.component.html',
  styleUrl: './products.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductManagementComponent {
  private layoutService = inject(LayoutService);
  protected isMobile = this.layoutService.isMobile;
  private productService = inject(ProductService);
  private companyService = inject(CompanyService);
  private router = inject(Router);

  private selectedCompany = this.companyService.selectedCompany;

  @ViewChild('selectProductTemplateModal') selectProductTemplateModal!: ModalComponent;
  protected selectedTemplateProductId = signal<string | null>(null);
  protected templateProducts = signal<Product[]>([]);

  protected controller = new PaginationController<any>([], <PaginationControllerCFG>{
    defaultSearchColumns: [ 'sku', 'productName', 'description', 'costEstimated', 'costAvg'],
  });

  protected templateController = new PaginationController<Product>([], <PaginationControllerCFG>{
    defaultSearchColumns: [ 'name', 'description' ],
  });


  protected columns: ColumnDefinition[] = [
  { nameToShow: 'SKU', columnName: 'sku', type: 'string' },
  { nameToShow: 'Nombre', columnName: 'productName', type: 'string' },
  { nameToShow: 'Descripción', columnName: 'description', type: 'string' },
  { nameToShow: 'Costo Estimado', columnName: 'costEstimated', type: 'number' },
  { nameToShow: 'Costo Promedio', columnName: 'costAvg', type: 'number' },
];

  constructor() {
    this.getTemplateProducts();

    effect(() => {
      const selectedCompany = this.selectedCompany();

      if (!selectedCompany) return;

      this.getAllProducts(selectedCompany.id);
    })
  }

  private async getAllProducts(companyId: string): Promise<void> {
    const response = await this.productService.getProductsByCompany(companyId);

    this.controller.SetRawData(response);
  }

  protected async openTemplateModal(): Promise<void> {
    const products = await this.productService.getAllProductsTemplate();
    this.templateProducts.set(products);
    this.selectProductTemplateModal.openModal();
  }

  protected selectTemplateProduct(productId: string): void {
    this.selectedTemplateProductId.set(productId);
  }

  protected navigateToProductForm(): void {
    const templateId = this.selectedTemplateProductId();
    if (templateId) {
      this.selectProductTemplateModal.closeModal();
      this.router.navigate(['/my-company/product-management/new'], {
        queryParams: { templateId }
      });
    }
  }

  protected async getTemplateProducts(): Promise<void> {
    const products = await this.productService.getAllProductsTemplate();
    this.templateController.SetRawData(products);
  }

}
