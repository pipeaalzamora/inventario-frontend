import { FilterCommand, PaginationController } from '@shared/paginationController';
import { ChangeDetectionStrategy, Component, computed, effect, input, viewChild } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { ModalComponent } from '@shared/components/modal/modal.component';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FilterItemComponent } from '@shared/components/controller/filter/filter-item/filter-item.component';


export type ColumnDefinition = {
    columnName: string | null;
    nameToShow: string;
    type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object' | 'entity';
    posibleSelections?: string[];
    multipleSelection?: boolean;
    maybeNull?: boolean;
    noSort?: boolean;
    centerCol?: boolean;
    showOnly?: 'filter' | 'table';
    showIf?: boolean;
    wrapHeader?: boolean;
};

export type Badge = {
    filterId: number;
    column: ColumnDefinition['columnName'];
    nameToShow: ColumnDefinition['nameToShow'];
    operator: string;
    value: string;
    caseSensitive: boolean;
    type: ColumnDefinition['type'];
};

@Component({
  selector: 'dot-filter',
  imports: [
    MatSelectModule,
    MatFormFieldModule,
    ModalComponent,
    ReactiveFormsModule,
    FilterItemComponent,
  ],
  templateUrl: './filter.component.html',
  styleUrls: [
    './filter.component.less',
    '../../../../../assets/less/components/pagination-controller.less'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FilterComponent<T> {
  controller = input.required<PaginationController<T>>();
  columns = input.required<ColumnDefinition[]>();
  noBadges = input<boolean>(false);

  protected realColumns = computed(() => {
    return this.columns().filter(c => c.showOnly !== 'table' && !c.noSort);
  })

  private modal = viewChild.required<ModalComponent>(ModalComponent);

  protected filterForm: FormGroup;

  private ISOREGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;

  protected filtersActive: number = 0;
  protected filterBadges: Badge[] = [];

  protected filterData = computed(() => this.controller().FilterData());

  constructor(private fb: FormBuilder) {

    this.filterForm = this.fb.group({
      logic: ['and'],
      filters: this.fb.array([this.createGroup()])
    });

    effect(() => {

      if (!this.controller()) return;
      if (!this.filterData().filterCommand) return;
      if (Object.values(this.filterData().filterCommand).length <= 0) return;

      if (this.filterData().triggerBy == 'controller') {

        const filterCommand = this.filterData().filterCommand;


        this.filterForm = this.convertToFormGroup(filterCommand);
        this.countActiveFilters();
        this.getFilterBadges();

      }
    });
  }

  protected openModal() {
    this.modal().openModal();

    if (this.filterForm.get('filters')?.value.length === 0) {
      this.filterForm = this.fb.group({
        logic: ['and'],
        filters: this.fb.array([this.createGroup()])
      });
    }
  }

  private createCondition(): FormGroup {
    return this.fb.group({
      id: Math.floor(Math.random() * 1000000),
      field: [''],
      operator: [''],
      value: [''],
      caseSensitive: [false]
    });
  }

  protected addGroup() {
    this.filters.push(this.createGroup());
  }

  private createGroup(): FormGroup {
    return this.fb.group({
      logic: ['and'],
      filters: this.fb.array([this.createCondition()])
    });
  }

  protected transformToFormGroup(filter: AbstractControl): FormGroup {

    return filter as FormGroup;
  }

  protected addFilter() {
    this.filters.push(
      this.createCondition()
    );
  }

  get filters(): FormArray {
    return this.filterForm.get('filters') as FormArray;
  }

  protected toggleMainLogic() {
    const newLogic = this.filterForm.get('logic')?.value === 'and' ? 'or' : 'and';
    this.filterForm.get('logic')?.setValue(newLogic);
  }

  protected applyFilters() {

    const filterCommand = this.convertToFilterCommand(this.filterForm.value);


    this.controller().Filter(filterCommand);
    this.countActiveFilters();
    this.getFilterBadges();
    this.modal().closeModal();
  }

  private convertToFilterCommand(formValue: any): FilterCommand {

    if (formValue.logic) {
      const logicKey = formValue.logic === 'and' ? '$and' : '$or';
      const filters = formValue.filters
        .map((filter: any) => this.convertToFilterCommand(filter))
        .flat()
        .filter((fc: FilterCommand) => Object.keys(fc).length > 0);

      return filters.length > 0 ? { [logicKey]: filters } : {};
    } else {
      const { field, operator, value, caseSensitive } = formValue;
      const columnType = this.realColumns().find(c => c.columnName === field)?.type;

      const operatorKey = caseSensitive ? this.operatorToSensitive(operator) : operator;

      if (!field || !operator) return {};

      if (columnType === 'array' && Array.isArray(value)) {
        return {
          $or: value.map((val: string) => ({
            [field]: {
              [operatorKey]: operatorKey !== '$null' ? val : false
            }
          }))
        };
      }

      return {
        [field]: {
          [operatorKey]: operatorKey !== '$null' ? this.parseValue(value, columnType) : true
        }
      };
    }
  }

  private convertToFormGroup(filterCommand: FilterCommand, level: number = 0): any {
    //los operadores binarios solo existen en dos niveles, si uno se encuentra en un nivel 3, es un array de opciones

    const keys = Object.keys(filterCommand);
    for (let k of keys) {

      if (k === '$and' || k === '$or') {

        const childCommands = filterCommand[k as '$and' | '$or'] as FilterCommand[];
        let childFormControls: FormGroup[] = [];

        let childLevel2Control: FormGroup[] = [];

        let ignoreNext = false;
        let i = 0;
        let _filterCommand: FilterCommand = {};

        if (level == 2) {
          let fieldName = "";
          let values: string[] = [];
          let operator = "";
          for (let c of childCommands) {
            if (fieldName == '') {
              fieldName = Object.keys(c)[0];
            }

            operator = Object.keys((c as any)[fieldName])[0];

            const value = (c as any)[fieldName][operator];
            values.push(value);
          }

          const objVal: Record<string, any> = {};
          objVal[operator] = values;


          (_filterCommand as any)[fieldName] = structuredClone(objVal);

          childFormControls.push(
            this.convertToFormGroup(structuredClone(_filterCommand))
          )

        } else {

          for (let c of childCommands) {
            if (Object.keys(_filterCommand).length <= 0) {
              _filterCommand = structuredClone(c);
            }


            const childFormControl = this.convertToFormGroup(structuredClone(_filterCommand!), level + 1);
            _filterCommand = {};

            if (childFormControl) {
              childFormControls.push(childFormControl);
            }

            i++
          }

          if (Object.keys(_filterCommand).length > 0) {
            const childFormControl = this.convertToFormGroup(structuredClone(_filterCommand), level + 1);

            if (childFormControl) {
              childFormControls.push(childFormControl);
            }
          }
        }

        if (level == 2) {
          return childFormControls[0];
        } else {

          return this.fb.group({
            logic: [k === '$and' ? 'and' : 'or'],
            filters: this.fb.array(childFormControls)
          });
        }


      } else {
        const lastFieldName = k;
        const lastFilterCommand = structuredClone(filterCommand);

        //const field = Object.keys(lastFilterCommand)[0];
        const fieldValue = (lastFilterCommand as any)[lastFieldName];

        const actualOperator = Object.keys(fieldValue)[0];
        const actualValue = fieldValue[actualOperator];

        const group = this.fb.group({
          id: [Math.floor(Math.random() * 1000000)],
          field: [lastFieldName],
          operator: [actualOperator.startsWith('$s') ? this.operatorToNormal(actualOperator) : actualOperator],
          value: [actualValue],
          caseSensitive: [actualOperator.startsWith('$s')]
        });

        return group;
      }
    }
  }

  private operatorToNormal(operator: string): string {
    const $ = operator.charAt(0);
    const operatorKeyWord = operator.slice(2);

    const res = `${$}${operatorKeyWord}`;

    return res;
  }

  private operatorToSensitive(operator: string): string {
    const $ = operator.charAt(0);
    const operatorKeyWord = operator.slice(1);

    const res = `${$}s${operatorKeyWord}`;

    return res;
  }

  private parseValue(value: any, type?: string): any {
    switch (type) {
      case 'number': return Number(value);
      case 'boolean': return true;
      case 'string': return String(value);
      case 'date': return new Date(value);
      case 'entity': return ""
      default: return value;
    }
  }

  private countActiveFilters() {
    this.filtersActive = 0;
    this.filters.controls.forEach((group: any) => {
      const filters = group.get('filters')?.value;
      if (!filters) return;

      filters.forEach((filter: any) => {
        //SOLO ENTRA AQUI SI LA COLUMNA ES DE TIPO ARRAY
        if (filter.logic) {
          filter.filters.forEach((filter: any, index: number) => {
            if (filter.field && filter.operator && index === 0) {
              this.filtersActive++;
            }
          });
        } else {
          if (filter.field && filter.operator) {
            this.filtersActive++;
          }
        }
      });
    });
  }

  private getFilterBadges(): void {
    this.filterBadges = [];
    const badges: Set<Badge> = new Set();

    this.filters.controls.forEach((group: any) => {
      const filters = group.get('filters')?.value;
      if (!filters) return;

      filters.forEach((filter: any) => {
        //SOLO ENTRA AQUI SI LA COLUMNA ES DE TIPO ARRAY
        if (filter.logic) {
          let value = '';
          let filterField = '';
          let operator = '';
          let filterId = 0;

          filter.filters.forEach((filter: any, index: number) => {
            if (filter.field && filter.operator) {
              value += `, ${filter.value}`;

              if (index === 0) {
                filterField = filter.field;
                operator = filter.operator;
                filterId = filter.id;
              }
            }
          });

          badges.add({
            filterId: filterId,
            column: filterField,
            nameToShow: this.realColumns().find(c => c.columnName === filterField)!.nameToShow,
            operator: operator,
            value: value,
            caseSensitive: filter.caseSensitive,
            type: this.realColumns().find(c => c.columnName === filterField)!.type
          });
        } else {
          if (filter.field && filter.operator) {
            let value = filter.value;

            if (value instanceof Date) value = value.toLocaleDateString();
            else if (Array.isArray(value)) value = this.badgeValueToArray(value);

            badges.add({
              filterId: filter.id,
              column: filter.field,
              nameToShow: this.realColumns().find(c => c.columnName === filter.field)!.nameToShow,
              operator: filter.operator,
              value: value,
              caseSensitive: filter.caseSensitive,
              type: this.realColumns().find(c => c.columnName === filter.field)!.type
            });
          }
        }
      });
    });

    this.filterBadges = Array.from(badges);
  }

  private mayISO8601(str: string): boolean {
    return this.ISOREGEX.test(str);
  };

  protected parseBadgeValue(value: any): string {

    if (this.mayISO8601(value) && !isNaN(Date.parse(value))) {
      const date = new Date(value);
      return date.toLocaleDateString();
    } else if (Array.isArray(value)) {
      return this.badgeValueToArray(value);
    } else if (typeof value === 'number') {
      return value.toString();
    }

    return value;
  }

  private badgeValueToArray(value: any): string {
    let res = value.slice(0, 2).join(', ');

    if (value.length > 2) res += `, +${value.length - 2}`;

    return res;
  }

  protected removeAll() {
    this.modal().closeModal();
    this.filtersActive = 0;
    this.filterBadges = [];

    this.filterForm = this.fb.group({
      logic: ['and'],
      filters: this.fb.array([this.createGroup()])
    });
    this.controller().Filter({});
  }

  protected removeBadge(filterId: Badge['filterId']) {
    let filterRemoved;

    this.filters.controls.forEach((group: AbstractControl) => {
      const groupForm = group as FormGroup;
      const filtersArray = groupForm.get('filters') as FormArray;

      for (let i = filtersArray.length - 1; i >= 0; i--) {
        const ctrlForm = filtersArray.at(i) as FormGroup;
        if (ctrlForm.get('id')?.value === filterId) {
          filtersArray.removeAt(i);
          filterRemoved = true;
        }
      }

      if (filtersArray.length === 0) {
        filtersArray.push(this.createCondition());
      }
    });

    if (!filterRemoved) return;

    this.getFilterBadges();
    this.countActiveFilters();

    if (this.filterBadges.length > 0) {
      this.controller().Filter(this.convertToFilterCommand(this.filterForm.value));
    } else {
      this.removeAll();
    }
  }

  protected parseBadgeOperator(badge: Badge): string {
    const type = badge.type;
    const operator = badge.operator;

    switch (type) {
      case 'number':
      case 'date':
        const labelsDN: Record<string, string> = {
          '$eq': 'Igual a',
          '$neq': 'No igual a',
          '$null': 'No existe',
          '$notnull': 'Existe',
        }

        return labelsDN[operator] || this.parseOperator(operator);
      case 'string':
        const labelsS: Record<string, string> = {
          '$eq': 'Igual a',
          '$neq': 'No igual a',
          '$null': 'No existe',
          '$notnull': 'Existe',
          "$contains": 'Contiene',
          "$ncontains": 'No contiene',
        }

        return labelsS[operator] || this.parseOperator(operator);

      case 'boolean':
        const labelsB: Record<string, string> = {
          '$eq': 'Sí',
          '$neq': 'No',
        }

        return labelsB[operator] || this.parseOperator(operator);

      case 'array':
        const labelsA: Record<string, string> = {
          "$contains": 'Contiene',
          "$ncontains": 'No contiene',
        }

        return labelsA[operator] || this.parseOperator(operator);

      case 'entity':
        const labelsE: Record<string, string> = {
          "$gte": 'Existe',
          "$null": 'No existe',
        }
        return labelsE[operator] || this.parseOperator(operator);
      default:
        return this.parseOperator(operator);;
    }

  }

  protected parseOperator(operator: string): string {
    const operators = {
      '$eq': 'es',
      '$neq': 'no es',
      '$gt': 'mayor que',
      '$gte': 'mayor o igual que',
      '$lt': 'menor que',
      '$lte': 'menor o igual que',
      '$contains': 'contiene',
      '$ncontains': 'no contiene',
      '$and': 'y',
      '$or': 'o',
    }

    return operators[operator as keyof typeof operators] || operator;
  }
}
