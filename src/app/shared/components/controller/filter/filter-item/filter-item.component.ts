import { ChangeDetectionStrategy, Component, effect, ElementRef, input, output, Renderer2, signal } from '@angular/core';
import { FormGroup, FormArray, FormBuilder, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { ColumnDefinition } from '@shared/components/controller/filter/filter.component';
import { Subscription } from 'rxjs';
import { DateAdapter, provideNativeDateAdapter } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';

type OperatorDefinition = {
  value: string;
  label: string;
};

@Component({
  selector: 'dot-filter-item',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatDatepickerModule,
    MatCheckboxModule,
    MatTooltipModule
  ],
  templateUrl: './filter-item.component.html',
  styleUrls: [
    './filter-item.component.less',
    '../../../../../../assets/less/components/pagination-controller.less'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    provideNativeDateAdapter(),
  ]
})
export class FilterItemComponent {
  itemForm = input.required<FormGroup>();
  columns = input.required<ColumnDefinition[]>();
  isGroup = input<boolean>(true);
  isNestedGroup = input<boolean>(false);
  removeGroup = output();

  protected operators: OperatorDefinition[] = [];
  currentType = signal<string>('');
  private filtersSubscription?: Subscription;

  constructor(
    private fb: FormBuilder,
    private el: ElementRef,
    private renderer: Renderer2,
    private dateAdapter: DateAdapter<Date>
  ) {
    this.dateAdapter.setLocale('es-CL');
    this.dateAdapter.getFirstDayOfWeek = () => 1;

    effect(() => {
      this.updateCurrentType();
    })
  }

  ngOnInit() {
    if (!this.isGroup()) {
      this.updateOperators();
    }

    if (typeof this.filters === 'undefined' || this.filters === null) return;

    this.filtersSubscription = this.filters.valueChanges.subscribe(() => {
      if (this.filters.length === 0 && this.isNestedGroup()) {
        const parentFilters = this.itemForm().parent as FormArray;

        if (!parentFilters) return;

        const groupIndex = parentFilters.controls.findIndex(control => control === this.itemForm());

        if (groupIndex !== -1) {
          parentFilters.removeAt(groupIndex);
        }
      }
    });
  }

  ngOnDestroy() {
    if (!this.filtersSubscription) return;

    this.filtersSubscription.unsubscribe();
  }

  get filters(): FormArray {
    return this.itemForm().get('filters') as FormArray;
  }

  private updateCurrentType() {

    if (!this.isGroup()) {

      const field = this.itemForm().get('field')?.value;

      this.currentType.set(this.columns().find(c => c.columnName === field)?.type ?? '');
    }
  }

  protected addFilter() {
    this.filters.push(this.fb.group({
      id: Math.floor(Math.random() * 1000000),
      field: [''],
      operator: [''],
      value: [''],
      caseSensitive: [false]
    }));
  }

  protected addNestedGroup() {
    if (this.isNestedGroup()) return;

    this.filters.push(

      this.fb.group({
        logic: ['and'],
        filters: this.fb.array([
          this.fb.group({
            id: Math.floor(Math.random() * 1000000),
            field: [''],
            operator: [''],
            value: [''],
            caseSensitive: [false]
          })
        ])
      })

    );
  }

  protected transformToGroup(filter: AbstractControl): FormGroup {
    return filter as FormGroup;
  }

  protected removeItem(index: number) {
    this.filters.removeAt(index);
  }

  protected toggleLogic() {
    const newLogic = this.itemForm().get('logic')?.value === 'and' ? 'or' : 'and';
    this.itemForm().get('logic')?.setValue(newLogic);

    const logicButton = this.el.nativeElement.querySelector('.logic-button') as HTMLElement;

    if (logicButton) {
      this.renderer.addClass(logicButton, 'switch');
      setTimeout(() => {
        this.renderer.removeClass(logicButton, 'switch');
      }, 150);
    }
  }

  protected isItemGroup(item: FormGroup): boolean {
    return item.get('logic') !== null && !this.isNestedGroup();
  }

  protected onFieldChange() {
    if (!this.isGroup()) {
      this.updateCurrentType();
      this.itemForm().get('value')?.setValue('');
      this.updateOperators();
    }
  }

  private updateOperators() {
    const fieldControl = this.itemForm().get('field');
    if (!fieldControl?.value) return;

    const column = this.columns().find(c => c.columnName === fieldControl.value);
    if (!column) return;


    this.operators = this.getOperatorsForType(column.type);
  }

  protected checkPosibleSelections(column: ColumnDefinition): boolean {
    if (
      this.itemForm().get('field')?.value === column.columnName &&
      column.posibleSelections?.length
    ) return true;

    return false;
  }

  private getOperatorsForType(type: string): OperatorDefinition[] {
    const column = this.itemForm().get('field')?.value;
    const columnDefinition = this.columns().find(c => c.columnName === column);

    let baseOperators = [];

    if (columnDefinition?.maybeNull) {

      baseOperators = [
        { value: '$eq', label: 'Igual a' },
        { value: '$neq', label: 'No igual a' },
        { value: '$null', label: 'No existe' },
        { value: '$notnull', label: 'Existe' },
      ];

    } else {

      baseOperators = [
        { value: '$eq', label: 'Igual a' },
        { value: '$neq', label: 'No igual a' },
      ];
    }


    switch (type) {
      case 'number':
      case 'date':
        return [
          ...baseOperators,
          { value: '$gt', label: 'Mayor que' },
          { value: '$gte', label: 'Mayor o igual que' },
          { value: '$lt', label: 'Menor que' },
          { value: '$lte', label: 'Menor o igual que' }
        ];

      case 'string':
        return [
          ...baseOperators,
          { value: '$contains', label: 'Contiene' },
          { value: '$ncontains', label: 'No contiene' }
        ];

      case 'boolean':
        return [
          { value: '$eq', label: 'Sí' },
          { value: '$neq', label: 'No' }
        ];

      case 'array':
        return [
          // ...baseOperators,
          { value: '$contains', label: 'Contiene' },
          { value: '$ncontains', label: 'No contiene' }
        ];
      case 'entity':
        return [
          { value: '$gte', label: 'Existe' },
          { value: '$null', label: 'No existe' },
        ]
      default:
        return baseOperators;
    }
  }
}
