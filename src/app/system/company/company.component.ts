import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { ColumnDefinition, FilterComponent } from '@/shared/components/controller/filter/filter.component';
import { PaginationComponent } from '@/shared/components/controller/pagination/pagination.component';
import { PaginationController, PaginationControllerCFG } from '@/shared/paginationController';
import { SearchBarComponent } from '@/shared/components/controller/search-bar/search-bar.component';
import { SorterHeaderComponent } from '@/shared/components/controller/sorter-header/sorter-header.component';
import { TableCaptionComponent } from '@/shared/components/controller/table-caption/table-caption.component';
import { Company } from '@/shared/models/company';
import { LayoutService } from '@/shared/services/layout.service';
import { LinkDirective } from '@/shared/directives/link.directive';
import { CompanyService } from './services/company.service';
import { AuthService } from '@/auth/services/auth.service';


@Component({
  selector: 'dot-company',
  imports: [
    LinkDirective,
    SorterHeaderComponent,
    SearchBarComponent,
    FilterComponent,
    PaginationComponent,
    TableCaptionComponent,
  ],
  templateUrl: './company.component.html',
  styleUrl: './company.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})

export class company {
  private ls = inject(LayoutService);
  private companyService = inject(CompanyService);
  private as = inject(AuthService);
  
  protected COMPANY_CAN_CREATE = this.as.hasPower('company:create');
  

  protected isMobile = computed(() => this.ls.isMobile());
  protected companies = signal<Company[]>([]);


  protected controller = new PaginationController<Company>([], <PaginationControllerCFG>{
    defaultSearchColumns: ['idFiscal', 'companyName', 'description'],
    sortColumn: 'createdAt',
    sortAscending: false,
    pageNumber: 1,
    pageSize: 30
  });

  protected columns: ColumnDefinition[] = [
    { nameToShow: 'Logo', columnName: 'imageLogo', type: 'string', centerCol: true, noSort: true },
    { nameToShow: 'ID Fiscal', columnName: 'idFiscal', type: 'string' },
    { nameToShow: 'Nombre', columnName: 'companyName', type: 'string' },
    { nameToShow: 'Descripción', columnName: 'description', type: 'string' },
  ];

  constructor() {
    this.fetchCompanies();

    effect(() => {
      this.controller.SetRawData(this.companies());
    });
  }

  private async fetchCompanies(): Promise<void> {
    const companies = await this.companyService.getCompanies();
    
    if (companies) {
      this.companies.set(companies);
      
    }
  }
}
