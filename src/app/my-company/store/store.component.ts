import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { ColumnDefinition, FilterComponent } from '@/shared/components/controller/filter/filter.component';
import { PaginationComponent } from '@/shared/components/controller/pagination/pagination.component';
import { PaginationController, PaginationControllerCFG } from '@/shared/paginationController';
import { SearchBarComponent } from '@/shared/components/controller/search-bar/search-bar.component';
import { SorterHeaderComponent } from '@/shared/components/controller/sorter-header/sorter-header.component';
import { TableCaptionComponent } from '@/shared/components/controller/table-caption/table-caption.component';
import { Store } from '@/shared/models/store';
import { LinkDirective } from '@/shared/directives/link.directive';
import { CompanyService } from '@/shared/services/company.service';
import { StoreService } from './services/store.service';
import { LayoutService } from '@/shared/services/layout.service';
import { AuthService } from '@/auth/services/auth.service';
import { DropdownComponent } from '@/shared/components/dropdown/dropdown.component';


@Component({
  selector: 'dot-store',
  imports: [
    LinkDirective,
    SorterHeaderComponent,
    SearchBarComponent,
    FilterComponent,
    PaginationComponent,
    TableCaptionComponent,
    DropdownComponent
  ],
  templateUrl: './store.component.html',
  styleUrl: './store.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})

export class StoreComponent {
  private cs = inject(CompanyService)
  private selectcompany = this.cs.selectedCompany
  private storeService = inject(StoreService)
  private ls = inject(LayoutService)
  private as = inject(AuthService)
  
  protected STORE_CAN_CREATE = this.as.hasPower('store:create');

  protected isMobile = computed(() => this.ls.isMobile());
  protected stores = this.storeService.stores;


  protected controller = new PaginationController<Store>([], <PaginationControllerCFG>{
    defaultSearchColumns: ['storeName', 'description', 'storeAddress', 'idCostCenter'],
    sortColumn: 'createdAt',
    sortAscending: false,
    pageNumber: 1,
    pageSize: 10
  });

  protected columns: ColumnDefinition[] = [
    { nameToShow: 'Nombre', columnName: 'storeName', type: 'string' },
    { nameToShow: 'Descripción', columnName: 'description', type: 'string' },
    { nameToShow: 'Dirección', columnName: 'storeAddress', type: 'string' },
    { nameToShow: 'Centro de Costo', columnName: 'idCostCenter', type: 'string' },
    //{ nameToShow: 'Proveedores', columnName: 'supplierCount', type: 'number', centerCol: true },
  ];

  /*
  protected getSupplierCount(store: Store): number {
    return store.supplierApplied?.length || 0;
  }

  protected getAvailableSuppliers(store: Store): number {
    return store.supplierApplied?.filter(s => s.available).length || 0;
  }
  */

  constructor() {
     effect(() => { 
      if (!this.selectcompany()) return    
      this.fetchStores(this.selectcompany()!.id)
    }) 

    effect(() => {
      this.controller.SetRawData(this.stores());
    });
  }
  
  private async fetchStores(companyId:string): Promise<void> {
    await this.storeService.getStores(companyId);
  }
}
