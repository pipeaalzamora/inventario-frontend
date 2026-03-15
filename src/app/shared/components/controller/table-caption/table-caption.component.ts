import { PaginationController } from '@shared/paginationController';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MetaData } from '@/shared/models/apiResponse';

@Component({
  selector: 'dot-table-caption',
  imports: [],
  templateUrl: './table-caption.component.html',
  styles: [`
    :host {
      display: contents;

      &.no-table {
        display: flex;
      }

      &.center {
        justify-content: center;
        text-align: center;
        align-items: center;
      }
    }

    caption {
      position: sticky;
      left:0;

      &.center {
        width: 100% !important;
        max-width: calc(100vw - 6rem);
        text-align: center !important;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.no-table]': 'noTable()',
    '[class.center]': 'center()',
  }
})
export class TableCaptionComponent<T> {
  public controller = input<PaginationController<T>>();
  public metadata = input<MetaData>();
  public center = input<boolean>(false);
  public noTable = input<boolean>(false);

  protected from = computed<number>(() => {
    if (typeof this.controller() !== 'undefined') {
      return ( this.controller()!.GetData().currentPage - 1 ) * this.controller()!.GetData().pageSize + 1;
    }

    else if (typeof this.metadata() !== 'undefined') {
      return ( this.metadata()!.page - 1) * this.metadata()!.size + 1;
    }

    return 0;
  });

  protected to = computed<number>(() => {
    if (typeof this.controller() !== 'undefined') {

      return ( this.controller()!.GetData().currentPage * this.controller()!.GetData().pageSize ) > this.controller()!.GetData().totalItems ?
        this.controller()!.GetData().totalItems :
        this.controller()!.GetData().currentPage * this.controller()!.GetData().pageSize;

    } else if (typeof this.metadata() !== 'undefined') {

      return ( this.metadata()!.page * this.metadata()!.size ) > this.metadata()!.total ?
        this.metadata()!.total :
        this.metadata()!.page * this.metadata()!.size;
    }

    return 0;
  });

  protected total = computed<number>(() => {
    if (typeof this.controller() !== 'undefined') {
      return this.controller()!.GetData().totalItems;
    } else if (typeof this.metadata() !== 'undefined') {
      return this.metadata()!.total;
    }

    return 0;
  });
}
