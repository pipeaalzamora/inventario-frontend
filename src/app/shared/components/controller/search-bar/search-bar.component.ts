import { PaginationController } from '@shared/paginationController'; 
import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, input, output, Renderer2, signal, untracked, viewChild} from '@angular/core';
import { InputDirective } from '@/shared/directives/input.directive';
import { LayoutService } from '@/shared/services/layout.service';
import { NgStyle } from '@angular/common';

@Component({
  selector: 'dot-search',
  imports: [
    InputDirective,
    NgStyle
  ],
  templateUrl: './search-bar.component.html',
  styleUrls: [
    './search-bar.component.less',
    '../../../../../assets/less/components/pagination-controller.less'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchBarComponent<T> {
  private layoutService = inject(LayoutService);
  private renderer = inject(Renderer2);

  protected isMobile = computed(() => this.layoutService.isMobile());

  public controller = input<PaginationController<T>>();
  public placeholder = input<string>('Buscar');
  public align = input<'flex-start' | 'center' | 'flex-end'>('flex-end');
  public noCollapse = input<boolean>(false);
  public customLabelColor = input<string>('background-3');
  public fullWidth = input<boolean>(false);
  public searchValue = output<string>();

  protected hasValue = signal<boolean>(false);

  private labelEl = viewChild<ElementRef<HTMLLabelElement>>('labelElement');
  protected inputEl = viewChild<ElementRef<HTMLInputElement>>('inputElement');

  private filterData = computed(() => {
  const ctrl = this.controller();
  return ctrl ? ctrl.FilterData() : null;
});

  constructor() {
    effect(() => {
    const filterData = this.filterData();
    
    if (!filterData) return;
    
    if (filterData.triggerBy == 'controller') {
      untracked(() => {
        this.hasValue.set(filterData.searchValue.length > 0);
        this.inputEl()!.nativeElement.value = filterData.searchValue;
      });
    }
  })

    effect(() => {
      const fullWidth = this.fullWidth();

      if (fullWidth) untracked(() => this.renderer.addClass(this.labelEl()?.nativeElement, 'full-width'));
    })
  }

  protected search(event: Event): void {
    const value = (event.target as HTMLInputElement).value;

    if (value.length < 1) //return this.hasValue.set(false);
      return this.eraseValue();

    this.hasValue.set(true);

    const ctrl = this.controller();
    if (ctrl) {
      ctrl.Search(value, 'searchBar');
    } else {
      // Limpiar el valor de búsqueda igual que en PaginationController
      const cleanedValue = this.cleanSearchString(value);
      this.searchValue.emit(cleanedValue);
    }
  }

  protected eraseValue(): void {
    this.hasValue.set(false);
    this.inputEl()!.nativeElement.value = '';

    const ctrl = this.controller();
    if (ctrl) {
      ctrl.Search('', 'searchBar');
    } else {
      this.searchValue.emit('');
    }
  }

  private cleanSearchString(value: string): string {
  return value.trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}
  
}
