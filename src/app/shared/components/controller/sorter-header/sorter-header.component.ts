import { ChangeDetectionStrategy, Component, computed, effect, input, model, output, TemplateRef } from '@angular/core';
import { PaginationController } from '@/shared/paginationController';
import { ColumnDefinition } from '@shared/components/controller/filter/filter.component';
import { LoadingDirective } from '@/shared/directives/loading.directive';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgTemplateOutlet } from '@angular/common';

@Component({
  selector: 'dot-sorter-header',
  imports: [
    LoadingDirective,
    MatTooltipModule,
    NgTemplateOutlet
  ],
  templateUrl: './sorter-header.component.html',
  styleUrls: [
    './sorter-header.component.less',
    '../../../../../assets/less/components/pagination-controller.less'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SorterHeaderComponent<T> {
  controller = input<PaginationController<T>>();
  headers = input<ColumnDefinition[]>([]);
  ascMode = model<boolean>(true);
  sortColumnName = model<string>('');
  minimalist = input<boolean>(false);
  withBulkCheckbox = input<boolean>(false);
  checkboxValue = input<boolean>(false);
  headerTopTemplate = input<TemplateRef<any> | null>(null);
  bulkCheckboxChecked = output<boolean>();
  // Nuevo output para emitir el evento de orden
  sortChange = output<{ column: string, asc: boolean }>();

  private filterData = computed(() => this.controller()?.FilterData() );

  constructor() {
    if (this.headers().length > 0) {
      if (this.sortColumnName() == '' && this.headers()[0].columnName) {
        this.sortColumnName.set(this.headers()[0].columnName!);
      }
    }

    effect(() => {
      const filterData = this.filterData();
      if (!this.controller?.() || !filterData) return;

      if (filterData.triggerBy === 'controller') {
        this.sortColumnName.set(filterData.sortColumn);
        this.ascMode.set(filterData.sortAscending);
      }
    })
  }

  protected changeOrder(columnName: string): void {        

  if (this.sortColumnName() == columnName) {
    this.ascMode.set(!this.ascMode());
  } else {
    this.sortColumnName.set(columnName);
    this.ascMode.set(true);
  }

  if (typeof this.controller() !== 'undefined') {
    this.controller()!.Sort(columnName, this.ascMode());
  } else {
    this.sortChange.emit({ column: columnName, asc: this.ascMode() });
  }
}

  protected checkBoxChange(event: Event):void {
    const checked = (event.target as HTMLInputElement).checked;
    this.bulkCheckboxChecked.emit(checked);
  }
}
