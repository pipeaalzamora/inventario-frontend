import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, HostListener, inject, input, model, output, Renderer2, signal, untracked, viewChild } from '@angular/core';
import { Field, FieldTree } from '@angular/forms/signals';
import { ModalComponent } from '@shared/components/modal/modal.component';
import { debounceTime, filter, fromEvent } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ErrorService } from '@shared/services/error.service';
import { MatTooltipModule } from '@angular/material/tooltip';

export type DefaultSelectOption = {
  label: string;
  value: any;
}

@Component({
  selector: 'dot-select',
  imports: [ModalComponent, Field, MatTooltipModule],
  templateUrl: './select.component.html',
  styleUrl: './select.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.disabled]': 'disabled()',
    '[class.full-width]': 'fullWidth()',
    '[class.has-error]': 'showErrors()',
  }
})
export class SelectComponent<T extends Record<string, any>, K = T[keyof T]> {
  private renderer = inject(Renderer2);
  private errorService = inject(ErrorService);
  private elementRef = inject(ElementRef);

  // Signal Form
  field = input<FieldTree<string | number>>();

  options = input.required<T[]>();
  searchBy = input.required<keyof T>();
  returnKey = input<keyof T | null>(null);
  disabled = input<boolean>(false);
  withoutInput = input<boolean>(false);
  compact = input<boolean>(false);
  label = input<string>('Seleccionar');
  placeholder = input<string>('Buscar...');
  icon = input<string>('fa-solid fa-chevron-down');
  
  // Legacy: no Signal Form
  selected = model<T | K | null>(null);
  changeOption = output<T | null>();
  
  labelBackgroundColor = input<string>('');
  fullWidth = input<boolean>(false);
  confirmSwitch = input<boolean>(false);
  confirmSwitchCallback = input<() => void>(() => {});
  confirmSwitchText = input<string | null>(null);
  withNullOption = input<boolean>(false);
  multiSelect = input<boolean>(false);
  
  selectedMultiple = model<T[]>([]);
  changeMultipleOptions = output<T[]>();

  protected optionsShown = signal<boolean>(false);

  private searchTerm = signal<string>('');

  protected fieldErrors = computed<any[]>(() => {
    const fieldValue = this.field();
    if (fieldValue) {
      return fieldValue().errors();
    }
    return [];
  });

  protected showErrors = computed(() => {
    const fieldValue = this.field();
    if (fieldValue) {
      return fieldValue().touched() && fieldValue().invalid();
    }
    return false;
  });

  protected fieldTouched = computed(() => {
    const fieldValue = this.field();
    if (fieldValue) {
      return fieldValue().touched();
    }
    return false;
  });

  protected fieldInvalid = computed(() => {
    const fieldValue = this.field();
    if (fieldValue) {
      return fieldValue().invalid();
    }
    return false;
  });

  protected isFieldDisabled = computed(() => {
    const fieldValue = this.field();
    if (fieldValue) {
      return fieldValue().disabled();
    }
    return this.disabled();
  });

  protected isNumericField = computed(() => {
    const fieldValue = this.field();
    if (!fieldValue) return false;
    const val = fieldValue().value();
    return typeof val === 'number';
  });

  protected fieldString = computed(() => this.field() as unknown as FieldTree<string>);
  protected fieldNumber = computed(() => this.field() as unknown as FieldTree<number>);

  protected filteredOptions = computed<T[]>(() => {
    const search = this.searchTerm().toLowerCase().trim();
    const options = this.options();

    if (!search) return options;

    return options.filter(option => {
      const value = String(option[this.searchBy()]).toLowerCase();
      return value.includes(search);
    });
  })

  protected selectedOption = computed<K | null | string>(() => {
    const searchBy = this.searchBy();
    const returnKey = this.returnKey();

    if (!searchBy) return null;

    const selected = this.field() ? this.field()?.().value() : this.selected();

    if (!selected) return null;

    const selectedValue = selected as T | K | null;
    
    if (this.isObjectOfT(selectedValue)) {
      return selectedValue[searchBy] as K;
    }
    
    if (returnKey) {
      const fullObject = this.options().find(option => option[returnKey] === selectedValue);
      if (fullObject) {
        return fullObject[searchBy] as K;
      }
    }
    
    return selectedValue as K;
  });

  private inputEl = viewChild<ElementRef<HTMLInputElement>>('input');
  private labelEl = viewChild<ElementRef<HTMLElement>>('labelEl');
  private optionsContainerEl = viewChild<ElementRef<HTMLElement>>('optionsContainerEl');
  private switchSupplierModal = viewChild<ModalComponent>('switchSupplierModal');
  private fieldMirrorEl = viewChild<ElementRef<HTMLInputElement>>('fieldMirror');

  @HostListener('document:click', ['$event']) 
  onClick(event: MouseEvent) {
    if (!this.optionsShown()) return;

    const clickedInside = this.elementRef.nativeElement.contains(event.target as Node);
    if (!clickedInside) {
      this.toggleOptions(false);
    }
  }

  constructor() {

    fromEvent(document, 'scroll', { passive: true }).pipe(
      takeUntilDestroyed(),
      filter(() => this.optionsShown()),
      debounceTime(50)
    ).subscribe(() => {
      this.hideOptions();
    });

    effect(() => {
      const selected = this.selected();

      if (selected) {
        untracked(() => {
          if (this.isObjectOfT(selected)) {
            untracked(() => this.select(selected));
          } else {
            const fullObject: T | undefined = this.options().find(option => option[this.searchBy()] === selected);
  
            if (fullObject) untracked(() => this.select(fullObject));
          }
          
          this.renderer.addClass(this.labelEl()?.nativeElement, 'has-value');
        });

        return;
      }

      untracked(() => {
        this.renderer.removeClass(this.labelEl()?.nativeElement, 'has-value');
      });
    });

    effect(() => {
      const fieldValue = this.field();
      const currentValue = this.field()?.().value();

      if (fieldValue && currentValue) {
        untracked(() => {
          this.renderer.addClass(this.labelEl()?.nativeElement, 'has-value');
        });
        return;
      }

      if (fieldValue && !currentValue) {
        untracked(() => {
          this.renderer.removeClass(this.labelEl()?.nativeElement, 'has-value');
        });
      }
    });

    effect(() => {
      const untrackedSelected = untracked(() => this.selected());

      if (untrackedSelected) return;

      const selectedMultiple = this.selectedMultiple();

      if (selectedMultiple && selectedMultiple.length > 0) {
        untracked(() => this.renderer.addClass(this.labelEl()?.nativeElement, 'has-value'));
        return;
      }

      untracked(() => this.renderer.removeClass(this.labelEl()?.nativeElement, 'has-value'));
    });
  }

  protected select(value: T | null, changedByUser: boolean = false): void {
    if (!changedByUser) return this.changeSelection(value);

    if (this.confirmSwitch() && this.confirmSwitchCallback()) {
      this.toggleOptions(false);
      return this.switchSupplierModal()?.openModal(value);
    }

    this.changeSelectionByUser(value);
  }

  protected changeSelection(value: T | null): void {
    this.toggleOptions(false);
    const fieldRef = this.field();
    if (fieldRef) {
      const keyToReturn = this.returnKey() || this.searchBy();
      const fieldValue = value ? (value as T)[keyToReturn] : '';
      const mirror = this.fieldMirrorEl()?.nativeElement;
      if (mirror) {
        mirror.value = String(fieldValue ?? '');
        mirror.dispatchEvent(new Event('input', { bubbles: true }));
      }
      return;
    }

    untracked(() => {
      if (this.returnKey() && value) {
        this.selected.set((value as T)[this.returnKey() as keyof T] as any);
      } else {
        this.selected.set(value);
      }
    });
  }

  protected changeSelectionByUser(value: T | null): void {
    this.toggleOptions(false);
    const fieldRef = this.field();
    if (fieldRef) {
      const keyToReturn = this.returnKey() || this.searchBy();
      const fieldValue = value ? (value as T)[keyToReturn] : '';
      const mirror = this.fieldMirrorEl()?.nativeElement;
      if (mirror) {
        mirror.value = String(fieldValue ?? '');
        mirror.dispatchEvent(new Event('input', { bubbles: true }));
      }
      
      fieldRef().markAsTouched();
      this.errorService.clearSignalErrors();
      return;
    }

    untracked(() => {
      if (this.returnKey() && value) {
        this.selected.set((value as T)[this.returnKey() as keyof T] as any);
      } else {
        this.selected.set(value);
      }
      this.changeOption.emit(value);
    });
  }

  protected selectMultiple(option: T): void {
    const currentSelected = this.selectedMultiple();
    const searchBy = this.searchBy();
    const isAlreadySelected = currentSelected.some(item => item[searchBy] === option[searchBy]);

    let newSelected: T[];

    if (isAlreadySelected) {
      newSelected = currentSelected.filter(item => item[searchBy] !== option[searchBy]);
    } else {
      newSelected = [...currentSelected, option];
    }

    untracked(() => {
      this.selectedMultiple.set(newSelected);
      
      if (this.returnKey()) {
        const mappedValues = newSelected.map(item => (item as T)[this.returnKey() as keyof T]);
        this.changeMultipleOptions.emit(mappedValues as any);
      } else {
        this.changeMultipleOptions.emit(newSelected);
      }
    });
  }

  protected removeMultiple(option: T, event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();

    const currentSelected = this.selectedMultiple();
    const searchBy = this.searchBy();
    const newSelected = currentSelected.filter(item => item[searchBy] !== option[searchBy]);

    untracked(() => {
      this.selectedMultiple.set(newSelected);
      
      if (this.returnKey()) {
        const mappedValues = newSelected.map(item => (item as T)[this.returnKey() as keyof T]);
        this.changeMultipleOptions.emit(mappedValues as any);
      } else {
        this.changeMultipleOptions.emit(newSelected);
      }
    });
  }

  protected filterOptions(event: Event): void {
    if (this.withoutInput()) return;

    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
  }

  protected toggleOptions(show: boolean, event?: Event): void {
    if (this.disabled()) return;

    event?.preventDefault();

    if (show) {
      this.showOptions();
      return;
    }

    this.hideOptions();
  }

  private showOptions(): void {

    requestAnimationFrame(() => this.ajustOptionsPosition());

    this.optionsShown.set(true);

    const animation = this.optionsContainerEl()?.nativeElement.animate([
      { opacity: '0', transform: 'translateY(-1rem) scale(.98)' },
      { opacity: '1', transform: 'translateY(0) scale(1)' }
    ], {
      duration: 180,
      easing: 'ease-out',
    });

    animation?.finished.then(() => this.inputEl()?.nativeElement.focus());
  }

  private hideOptions(): void {
    const animation = this.optionsContainerEl()?.nativeElement.animate([
      { opacity: '1', transform: 'translateY(0) scale(1)' },
      { opacity: '0', transform: 'translateY(-1rem) scale(.98)' }
    ], {
      duration: 180,
      easing: 'ease-in',
    });

    animation?.finished.then(() => {
      this.optionsShown.set(false);

      if (!this.withoutInput()) {
        this.searchTerm.set('');
        this.inputEl()!.nativeElement.value = '';
      }
    })
    .catch(() => {
      this.optionsShown.set(false);

      if (!this.withoutInput()) {
        this.searchTerm.set('');
        this.inputEl()!.nativeElement.value = '';
      }
    });
  }

  protected isOptionEquals(option: T | null): boolean {
    if (this.multiSelect()) {
      if (!option) return false;

      const selectedMultiple = this.selectedMultiple();
      const searchBy = this.searchBy();
      return selectedMultiple.some(item => item[searchBy] === option[searchBy]);
    }

    const selected = this.field() ? this.field()?.().value() : this.selected();
    const selectedValue = selected as T | K | null;

    if (!option && !selectedValue) return true;

    if (!selectedValue) return false;

    if (!option) return false;

    if (this.isObjectOfT(selectedValue)) {
      return option[this.searchBy()] === selectedValue[this.searchBy()];
    } else {
      // If we have returnKey, compare using returnKey instead of searchBy
      const keyToCompare = this.returnKey() || this.searchBy();
      return option[keyToCompare] === selectedValue;
    }
  }

  private ajustOptionsPosition(): void {
    const windowHeight = window.innerHeight;
    const labelRect = this.labelEl()?.nativeElement.getBoundingClientRect();
    const optionsContainer = this.optionsContainerEl()?.nativeElement;

    if (!optionsContainer || !labelRect ) return;

    const heightLabel = labelRect?.height || 0;
    const containerHeight = optionsContainer?.offsetHeight || 0;

    const negativeTotal = (heightLabel + containerHeight) * -1;

    const bottomPosition = labelRect.bottom + 5;

    //this.renderer.setStyle(optionsContainer, 'top', `${labelRect.bottom}px`);
    //this.renderer.setStyle(optionsContainer, 'left', `${labelRect.left}px`);
    
    this.renderer.setStyle(optionsContainer, 'width', `${labelRect.width}px`);
    //TODO: FIX para que no se salga de la pantalla a los lados
    if (windowHeight < (bottomPosition + containerHeight)) {
      this.renderer.setStyle(optionsContainer, 'margin-top', `${negativeTotal}px`);
    } else {
      this.renderer.setStyle(optionsContainer, 'margin-top', `0px`);
    }
    
    //solo cuando esta abajo
    

    // const windowHeight = window.innerHeight;
    // const optionsContainer = this.optionsContainerEl()?.nativeElement;
    // const labelRect = this.labelEl()?.nativeElement.getBoundingClientRect();
    
    // if (!optionsContainer || !labelRect) return;

    // let GAP = 5;

    // const topPosition = labelRect.bottom + GAP;
    
    
    // const optionsHeight = optionsContainer.offsetHeight;
    
    // const spaceBelow = windowHeight - labelRect.bottom;
    // const shouldOpenUpwards = spaceBelow < optionsHeight && labelRect.top > optionsHeight;

    // const hola = optionsContainer.getBoundingClientRect();

    // if (shouldOpenUpwards) {
    //   GAP += 5;

    //   const topPositionUpwards = labelRect.top - optionsHeight - GAP;

    //   this.renderer.setStyle(optionsContainer, 'top', `${topPositionUpwards}px`);

    // } else {

    //   //this.renderer.setStyle(optionsContainer, 'top', `${topPosition}px`);
    // }

   
  }

  private isObjectOfT(value: T | K | null): value is T {
    if (!value) return false;

    const searchBy = this.searchBy();

    return typeof value === 'object' && searchBy in value;
  }

  public reset(): void {
    this.selected.set(null);
    this.selectedMultiple.set([]);
  }

  public selectValue(value: T | K | null): void {
    if (this.isObjectOfT(value)) {
      this.changeSelectionByUser(value);
      return;
    }
    
    const fullObject: T | undefined = this.options().find(option => option[this.searchBy()] === value);

    if (fullObject) {
      this.changeSelectionByUser(fullObject);
    } else {
      this.changeSelectionByUser(null);
    }
  }

  protected getErrorsTooltip(): string {
    if (!this.showErrors()) return '';
    
    const errors = this.fieldErrors();

    let tooltip = '';

    for (const error of errors) {
      tooltip += `- ${error.message}.\n`;
    }

    return tooltip.trim();
  }
}