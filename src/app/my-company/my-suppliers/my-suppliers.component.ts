import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, viewChild } from '@angular/core';
import { ColumnDefinition, FilterComponent } from '@/shared/components/controller/filter/filter.component';
import { PaginationComponent } from '@/shared/components/controller/pagination/pagination.component';
import { PaginationController, PaginationControllerCFG } from '@/shared/paginationController';
import { SearchBarComponent } from '@/shared/components/controller/search-bar/search-bar.component';
import { SorterHeaderComponent } from '@/shared/components/controller/sorter-header/sorter-header.component';
import { TableCaptionComponent } from '@/shared/components/controller/table-caption/table-caption.component';
import { CompanyService } from '@/shared/services/company.service';
import { LayoutService } from '@/shared/services/layout.service';
import { SupplierResume } from '@/my-company/supplier/models/supplier';
import { ModalComponent } from '@/shared/components/modal/modal.component';
import { CanComponentDeactivate } from '@/shared/guards/canDeactivate.guard';
import { SupplierService } from '@/my-company/supplier/services/supplier.service';
import { DropdownComponent } from '@/shared/components/dropdown/dropdown.component';

@Component({
  selector: 'dot-my-suppliers',
  imports: [
    SorterHeaderComponent,
    SearchBarComponent,
    FilterComponent,
    PaginationComponent,
    TableCaptionComponent,
    ModalComponent,
    DropdownComponent
  ],
  templateUrl: './my-suppliers.component.html',
  styleUrl: './my-suppliers.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MySuppliersComponent implements CanComponentDeactivate {
  private cs = inject(CompanyService);
  private selectcompany = this.cs.selectedCompany;
  private ls = inject(LayoutService);
  private supplierService = inject(SupplierService);
  
  protected addModal = viewChild.required<ModalComponent>('addModal');
  protected confirmCloseModal = viewChild<ModalComponent>('confirmCloseModal');
  protected preventNavigationModal = viewChild<ModalComponent>('preventNavigationModal');
  protected confirmDeleteModal = viewChild<ModalComponent>('confirmDeleteModal');
  
  private continueWithoutSaving = false;
  private supplierToDelete: string | null = null;
  
  protected isMobile = computed(() => this.ls.isMobile());
  protected mySuppliers = signal<SupplierResume[]>([]);
  protected allSuppliers = signal<SupplierResume[]>([]);
  protected selectedSuppliers = signal<SupplierResume[]>([]);
  protected pendingSuppliers = signal<SupplierResume[]>([]);
  protected pendingToSave = signal<boolean>(false);
  
  protected availableSuppliers = computed(() => {
    const myIds = this.mySuppliers().map(s => s.id);
    const pendingIds = this.pendingSuppliers().map(s => s.id);
    return this.allSuppliers().filter(s => !myIds.includes(s.id) && !pendingIds.includes(s.id));
  });

  protected controller = new PaginationController<SupplierResume>([], <PaginationControllerCFG>{
    defaultSearchColumns: ['idFiscal', 'supplierName', 'description'],
    sortColumn: 'supplierName',
    sortAscending: true,
    pageNumber: 1,
    pageSize: 10
  });

  protected modalController = new PaginationController<SupplierResume>([], <PaginationControllerCFG>{
    defaultSearchColumns: ['idFiscal', 'supplierName', 'description'],
    sortColumn: 'supplierName',
    sortAscending: true,
    pageNumber: 1,
    pageSize: 10
  });

  protected columns: ColumnDefinition[] = [
    { nameToShow: 'RUT', columnName: 'idFiscal', type: 'string' },
    { nameToShow: 'Nombre', columnName: 'supplierName', type: 'string' },
    { nameToShow: 'Descripción', columnName: 'description', type: 'string' },
    { nameToShow: 'Dirección', columnName: 'fiscalAddress', type: 'string' },
    { nameToShow: 'Correo', columnName: 'email', type: 'string' },
    // { nameToShow: 'Eliminar', columnName: null, type: 'string', noSort: true, centerCol: true },
  ];

  protected modalColumns: ColumnDefinition[] = [
    { nameToShow: 'RUT', columnName: 'idFiscal', type: 'string' },
    { nameToShow: 'Nombre', columnName: 'supplierName', type: 'string' },
    { nameToShow: 'Descripción', columnName: 'description', type: 'string' },
    { nameToShow: 'Correo', columnName: 'email', type: 'string' , showOnly: 'filter'},
    { nameToShow: 'Dirección', columnName: 'fiscalAddress', type: 'string', showOnly: 'filter' },
  ];

  constructor() {
    effect(() => { 
      if (!this.selectcompany()) return;
      this.fetchSuppliers();
    });

    effect(() => {
      const combined = [...this.mySuppliers(), ...this.pendingSuppliers()];
      this.controller.SetRawData(combined);
    });

    effect(() => {
      this.modalController.SetRawData(this.availableSuppliers());
    });
  }
  
  private async fetchSuppliers(): Promise<void> {
    const companyId = this.selectcompany()?.id;
    if (!companyId) return;

    const [allSuppliers, mySuppliers] = await Promise.all([
      this.supplierService.getAll(),
      this.supplierService.getAllByCompanyID(companyId)
    ]);

    this.allSuppliers.set(allSuppliers);
    this.mySuppliers.set(mySuppliers);
  }

  protected openAddModal(): void {
    this.selectedSuppliers.set([]);
    this.addModal().openModal();
  }

  protected handleCloseAddModal(): void {
    if (this.selectedSuppliers().length > 0) {
      this.pendingToSave.set(true);
    }
    this.selectedSuppliers.set([]);
    this.addModal().closeModal();
  }

  protected async saveAllChanges(): Promise<void> {
    if (!this.pendingToSave()) return;

    const companyId = this.selectcompany()?.id;
    if (!companyId) return;
    
    const existingIds = this.mySuppliers().map(s => s.id);
    const newIds = this.pendingSuppliers().map(s => s.id);
    const allSupplierIds = [...existingIds, ...newIds];

    const updatedSuppliers = await this.supplierService.assignSuppliersToCompany(
      companyId,
      allSupplierIds
    );

    if (updatedSuppliers) {
      this.mySuppliers.set(updatedSuppliers);
      this.pendingSuppliers.set([]);
    }

    this.pendingToSave.set(false);
  }

  public canDeactivate(): boolean {
    if (this.continueWithoutSaving || !this.pendingToSave()) return true;

    this.preventNavigationModal()?.openModal();
    return false;
  }

  protected confirmExitWithoutSaving(): void {
    this.continueWithoutSaving = true;
    this.preventNavigationModal()?.closeModal();
    window.history.back();
  }

  protected cancelNavigation(): void {
    this.preventNavigationModal()?.closeModal();
  }

  protected toggleSupplier(supplier: SupplierResume): void {
    const current = this.selectedSuppliers();
    const index = current.findIndex(s => s.id === supplier.id);
    
    if (index >= 0) {
      this.selectedSuppliers.set(current.filter(s => s.id !== supplier.id));
      this.pendingSuppliers.update(list => list.filter(s => s.id !== supplier.id));
    } else {
      
      const fullSupplier = this.allSuppliers().find(s => s.id === supplier.id);
      if (!fullSupplier) return;
      
      this.selectedSuppliers.set([...current, fullSupplier]);
      this.pendingSuppliers.update(list => [...list, fullSupplier]);
    }
  }

  protected isSelected(supplierId: string): boolean {
    return this.selectedSuppliers().some(s => s.id === supplierId);
  }

  protected openRemoveModal(supplierId: string): void {
    this.supplierToDelete = supplierId;
    this.confirmDeleteModal()?.openModal();
  }

  protected async confirmRemoveSupplier(): Promise<void> {
    if (!this.supplierToDelete) return;

    const companyId = this.selectcompany()?.id;
    if (!companyId) return;

    const updatedSuppliers = await this.supplierService.unassignSupplierFromCompany(companyId, this.supplierToDelete);
    
    if (updatedSuppliers) {
      this.mySuppliers.set(updatedSuppliers);
    }

    this.supplierToDelete = null;
    this.confirmDeleteModal()?.closeModal();
  }

  protected cancelRemoveSupplier(): void {
    this.supplierToDelete = null;
    this.confirmDeleteModal()?.closeModal();
  }

  protected async removeSupplier(supplierId: string): Promise<void> {
    this.openRemoveModal(supplierId);
  }
}
