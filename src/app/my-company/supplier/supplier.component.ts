import { ColumnDefinition, FilterComponent } from '@/shared/components/controller/filter/filter.component';
import { PaginationComponent } from '@/shared/components/controller/pagination/pagination.component';
import { SearchBarComponent } from '@/shared/components/controller/search-bar/search-bar.component';
import { SorterHeaderComponent } from '@/shared/components/controller/sorter-header/sorter-header.component';
import { TableCaptionComponent } from '@/shared/components/controller/table-caption/table-caption.component';
import { LinkDirective } from '@/shared/directives/link.directive';
import { PaginationController } from '@/shared/paginationController';
import { LayoutService } from '@/shared/services/layout.service';
import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { SupplierService } from './services/supplier.service';
import { SupplierResume } from './models/supplier';
import { ClRutPipe } from '@/shared/pipes/cl-rut.pipe';
import { DropdownComponent } from '@/shared/components/dropdown/dropdown.component';

const CONTROLLER_COMPONENTS = [
  SorterHeaderComponent,
  SearchBarComponent,
  FilterComponent,
  PaginationComponent,
  TableCaptionComponent,
  DropdownComponent
]

@Component({
  selector: 'dot-supplier',
  imports: [
    CONTROLLER_COMPONENTS,
    LinkDirective,
    ClRutPipe,
  ],
  templateUrl: './supplier.component.html',
  styleUrl: './supplier.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SupplierComponent {
  private layoutService = inject(LayoutService);
  private supplierService = inject(SupplierService);

  protected isMobile = this.layoutService.isMobile;

  private suppliers = signal<SupplierResume[]>([]);

  protected POWER_CAN_CREATE = true; //TODO: permisos
  protected POWER_CAN_EDIT = true; //TODO: permisos

  protected controller = new PaginationController<SupplierResume>([], {
    defaultSearchColumns: ['supplierName', 'supplierEmail', 'description'],
  });

  protected columns: ColumnDefinition[] = [
    { nameToShow: 'RUT', columnName: 'idFiscal', type: 'string' },
    { nameToShow: 'Nombre', columnName: 'supplierName', type: 'string' },
    { nameToShow: 'Descripción', columnName: 'description', type: 'string' },
    // { nameToShow: 'Opciones', columnName: null, type: 'string', noSort: true, centerCol: true },
  ]

  constructor() {
    this.getSuppliers();

    effect(() => {
      this.controller.SetRawData(this.suppliers());
    })
  }

  private async getSuppliers(): Promise<void> {
    const response = await this.supplierService.getAll();

    if (!response) return;

    this.suppliers.set(response);
  }
}
