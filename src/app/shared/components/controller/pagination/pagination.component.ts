import { LoadingDirective } from '@/shared/directives/loading.directive';
import { MetaData } from '@/shared/models/apiResponse';
import { PaginationController } from '@/shared/paginationController';
import { LayoutService } from '@/shared/services/layout.service';
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { DropdownComponent } from '@shared/components/dropdown/dropdown.component';

@Component({
  selector: 'dot-pagination',
  imports: [
    DropdownComponent,
    LoadingDirective,
  ],
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PaginationComponent<T> {
  public controller = input<PaginationController<T>>();
  public metadata = input<MetaData>();

  private layoutService = inject(LayoutService);

  public changePage = output<number>();

  protected isMobile = computed(() => this.layoutService.isMobile());

  protected currentPage = computed<number>(() => {
    if (typeof this.metadata() !== 'undefined') return this.metadata()!.page;
    else if (typeof this.controller() !== 'undefined') return this.controller()!.GetData().currentPage;
    return 1;
  });

  protected pageSize = computed(() => {
    if (typeof this.metadata() !== 'undefined') return this.metadata()?.size;

    return this.controller()?.GetData()?.pageSize;
  });

  protected totalPages = computed(() => {
    if (typeof this.metadata() !== 'undefined') {
      if (this.metadata()?.total! < this.metadata()?.size!) return 1;
      return Math.ceil( this.metadata()?.total! / this.metadata()?.size! );
    }

    return Math.ceil( this.controller()?.GetData()?.totalItems! / this.controller()?.GetData()?.pageSize! );
  });

  protected totalItems = computed(() => {
    if (typeof this.metadata() !== 'undefined') return this.metadata()?.total;

    return this.controller()?.GetData()?.totalItems
  });

  protected itemBefore = computed<number | null>(() => {
    if(
      !this.currentPage() ||
      this.currentPage()! <= 2
    ) return null;
    return this.currentPage()! - 1;
  });

  protected itemAfter = computed<number | null>(() => {
    if( 
      !this.currentPage() ||
      this.currentPage()! >= this.totalPages()! - 1
    ) return null;
    return this.currentPage()! + 1;
  });

  protected itemsAfterNotShown = computed<number[] | null>(() => {
    const itemAfter = this.itemAfter();
    const totalPages = this.totalPages();

    if (
      itemAfter == null ||
      totalPages == null ||
      itemAfter === totalPages - 1
    ) {
      return null;
    }

    const start = itemAfter + 1;
    const end = totalPages;

    return Array.from({ length: end - start }, (_, i) => start + i);
  });  

  protected itemsBeforeNotShown = computed<number[] | null>(() => {
    const itemBefore = this.itemBefore();
    const totalPages = this.totalPages();

    if (
      itemBefore == null ||
      totalPages == null ||
      itemBefore === 2
    ) {
      return null;
    }

    const start = 2;
    const end = itemBefore;

    return Array.from({ length: end - start }, (_, i) => start + i);
  });

  constructor() {}

  protected nextPage() { 
    if (typeof this.metadata() !== 'undefined') {
      if(!this.metadata()?.hasNextPage) return;

      this.changePage.emit(this.currentPage() + 1);
      return;

    } else if (typeof this.controller() !== 'undefined') {
      this.controller()?.SetPage(this.currentPage() + 1, this.controller()?.GetData()?.pageSize!);
    }
  }

  protected prevPage() {
    if (typeof this.metadata() !== 'undefined') {
      if(!this.metadata()?.hasPreviousPage) return;

      this.changePage.emit(this.currentPage() - 1);
    } else if (typeof this.controller() !== 'undefined') {
      this.controller()?.SetPage(this.currentPage() - 1, this.controller()?.GetData()?.pageSize!);
    }
  }

  protected firstPage(): void { 
    if (typeof this.controller() !== 'undefined') {
      this.controller()?.SetPage(1, this.controller()?.GetData()?.pageSize!);
    } else if (typeof this.metadata() !== 'undefined' && this.currentPage() !== 1) {
      this.changePage.emit(1);
    }
  }

  protected lastPage(): void { 
    if (typeof this.controller() !== 'undefined') {
      this.controller()?.SetPage(this.totalPages()!, this.controller()?.GetData()?.pageSize!);
    } else if (typeof this.metadata() !== 'undefined' && this.currentPage() !== this.totalPages()) {
      this.changePage.emit(this.totalPages()!);
    }
  }

  protected goToPage( page: number ): void { 
    if (typeof this.controller() !== 'undefined') {
      this.controller()?.SetPage(page, this.controller()?.GetData()?.pageSize!);
    } else if (typeof this.metadata() !== 'undefined' && this.currentPage() !== page) {
      this.changePage.emit(page);
    }
  }
}