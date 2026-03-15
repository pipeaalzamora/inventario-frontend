import { ChangeDetectionStrategy, Component, inject, effect, signal, viewChild, computed } from '@angular/core';
import { DecimalPipe } from '@angular/common';

import { PaginationController, PaginationControllerCFG } from '@/shared/paginationController';
import { ColumnDefinition } from '@/shared/components/controller/filter/filter.component';
import { PaginationComponent } from '@/shared/components/controller/pagination/pagination.component';
import { TableCaptionComponent } from '@/shared/components/controller/table-caption/table-caption.component';
import { SearchBarComponent } from '@/shared/components/controller/search-bar/search-bar.component';
import { SorterHeaderComponent } from '@/shared/components/controller/sorter-header/sorter-header.component';
import { LayoutService } from '@/shared/services/layout.service';
import { ModalComponent } from '@/shared/components/modal/modal.component';
import { UnitMeasurementService } from '@/shared/services/unit-measurement.service';
import { InputComponent } from '@/shared/components/input/input.component';
import { SelectComponent } from '@/shared/components/select/select.component';
import { form, max, maxLength, required } from '@angular/forms/signals';
import { ErrorService } from '@/shared/services/error.service';
import { UnitMeasure, UnitMatrix } from '@/shared/models/units';
import { ToastService } from '@/shared/services/toast.service';

type UnitMeasurement = UnitMeasure & {
  category?: 'mass' | 'volume' | 'package' | 'unit';
  relatedUnits?: UnitMatrix[];
};

const CONTROLLER_COMPONENTS = [
  SorterHeaderComponent,
  PaginationComponent,
  TableCaptionComponent,
  SearchBarComponent,
];

@Component({
  selector: 'dot-unit-measurement',
  imports: [
    CONTROLLER_COMPONENTS,
    ModalComponent,
    InputComponent,
    SelectComponent,
    DecimalPipe
  ],
  templateUrl: './unit-measurement.component.html',
  styleUrl: './unit-measurement.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnitMeasurementComponent {
  private unitMeasurementService = inject(UnitMeasurementService);
  private layoutService = inject(LayoutService);
  private errorService = inject(ErrorService);
  private toastService = inject(ToastService);

  protected units = signal<UnitMeasure[]>([]);
  protected selectedCategory = signal<string>('all');
  protected categories = signal<string[]>([]);

  protected baseUnits = computed<UnitMeasure[]>(() => {
    return this.units().filter(unit => unit.isBasic);
  })
  
  protected isMobile = this.layoutService.isMobile;

  protected controller = new PaginationController<UnitMeasurement>([], <PaginationControllerCFG>{
    defaultSearchColumns: ['name', 'abbreviation', 'description'],
  });

  protected columns: ColumnDefinition[] = [
    { nameToShow: 'Nombre', columnName: 'name', type: 'string' },
    { nameToShow: 'Abreviatura', columnName: 'abbreviation', type: 'string' },
    { nameToShow: 'Descripción', columnName: 'description', type: 'string' },
    { nameToShow: 'Conversión', columnName: 'conversionFactor', type: 'number' },
  ];

  private addUnitModal = viewChild<ModalComponent>('addUnitModal');

  protected unitFormModel = signal({
    name: '',
    description: '',
    abbreviation: '',
    baseUnitId: 0,
    conversionFactor: 0,
    category: '',
    //isBasic: false,
  });

  protected unitForm = form(
    this.unitFormModel,
    unitForm => {
      required(unitForm.name, {message: 'El nombre es obligatorio'});
      required(unitForm.abbreviation, {message: 'La abreviatura es obligatoria'});
      required(unitForm.baseUnitId, {message: 'La unidad base es obligatoria'});
      required(unitForm.conversionFactor, {message: 'El factor de conversión es obligatorio'});
      required(unitForm.category, {message: 'La categoría es obligatoria'});
      maxLength(unitForm.abbreviation, 10, {message: 'La abreviatura no puede superar los 10 caracteres'});
      max(unitForm.conversionFactor, 9999999, {message: 'El factor no puede ser mayor a 9,999,999'});

      this.errorService.bindServerErrors(unitForm, this.unitFormModel);
    }
  );

  constructor() {
    this.loadUnits();
    this.loadUnitsCategories();

    effect(() => {
      const filtered = this.selectedCategory() === 'all' 
        ? this.units() 
        : this.units().filter(unit => this.getUnitCategory(unit) === this.selectedCategory());
      this.controller.SetRawData(filtered);
    });

    effect(() => {
      this.unitFormModel();
      this.errorService.clearSignalErrors();
    });
  }

  //abajo del cosntructor siempre van los metodos
  async loadUnitsCategories() {
    const categories = await this.unitMeasurementService.getUnitCategories();
    this.categories.set(categories);
    console.log('Categorías de unidades cargadas:', categories);
  }
  async loadUnits() {
    const units = await this.unitMeasurementService.getUnitMeasurement();
    if (units) {
      // Cargar las conversiones para cada unidad básica
      const unitsWithConversions = await Promise.all(
        units.map(async (unit) => {
          if (unit.isBasic) {
            // Para unidades básicas, obtener sus derivadas
            const relatedUnits = await this.unitMeasurementService.getUnitsByMainUnit(unit.id);
            return {
              ...unit,
              relatedUnits: relatedUnits || []
            };
          }
          return unit;
        })
      );
      
      this.units.set(unitsWithConversions);
    }
  }



  openAddUnitModal() {
    this.addUnitModal()?.openModal();
  }

  closeAddUnitModal() {
    this.addUnitModal()?.closeModal();
    this.unitForm().reset({
      name: '',
      description: '',
      abbreviation: '',
      baseUnitId: 0,
      conversionFactor: 0,
      category: '',
    });
  }

  async onSubmit() {
    if (this.unitForm().valid()) {
      const result = await this.unitMeasurementService.createUnitMeasurement(this.unitForm);
      if (result) {
        this.closeAddUnitModal();
        // Agrega la nueva unidad al array existente
        const updatedUnits = [...this.baseUnits(), result];
        this.units.set(updatedUnits);

        this.toastService.success('Unidad de medida creada exitosamente.');
      }
    }
  }

  protected selectedBaseUnitName(): string {
    const baseUnitId = this.unitFormModel().baseUnitId;

    if (!baseUnitId || baseUnitId === 0) return '';

    const baseUnit = this.baseUnits().find(unit => unit.id === baseUnitId);

    return baseUnit ? baseUnit.name : '';
  }

  protected calculateConversionResult(): number {
    const baseUnitId = this.unitFormModel().baseUnitId;
    const conversionFactor = this.unitFormModel().conversionFactor;

    if (!conversionFactor || conversionFactor === 0) return 0;
    if (!baseUnitId || baseUnitId === 0) return 0;

    const baseUnit = this.baseUnits().find(unit => unit.id === baseUnitId);

    if (!baseUnit) return 0;

    return 1 * conversionFactor;
  }

  protected selectCategory(category: string): void {
    this.selectedCategory.set(category);
  }

  protected toggleCategory(category: string): void {
    if (this.selectedCategory() === category) {
      this.selectedCategory.set('all');
    } else {
      this.selectedCategory.set(category);
    }
  }

  protected getCategoryCount(category: string): number {
    if (category === 'all') return this.units().length;
    return this.units().filter(unit => this.getUnitCategory(unit) === category).length;
  }

  protected getUnitCategory(unit: UnitMeasurement): string {
    const name = unit.name.toLowerCase();
    if (name.includes('kilogramo') || name.includes('gramo') || name.includes('libra') || name.includes('onza')) {
      return 'mass';
    }
    if (name.includes('litro') || name.includes('mililitro') || name.includes('galón')) {
      return 'volume';
    }
    if (name.includes('saco') || name.includes('paquete') || name.includes('caja')) {
      return 'package';
    }
    return 'unit';
  }

  protected getUnitIcon(unit: UnitMeasurement): string {
    const category = this.getUnitCategory(unit);
    switch (category) {
      case 'mass': return 'fa-solid fa-scale-balanced';
      case 'volume': return 'fa-solid fa-droplet';
      case 'package': return 'fa-solid fa-boxes-stacked';
      default: return 'fa-solid fa-cube';
    }
  }

  protected getUnitCategoryClass(unit: UnitMeasurement): string {
    return this.getUnitCategory(unit);
  }

  protected getUnitCategoryLabel(unit: UnitMeasurement): string {
    const category = this.getUnitCategory(unit);
    switch (category) {
      case 'mass': return 'Masa';
      case 'volume': return 'Volumen';
      case 'package': return 'Paquetes';
      default: return 'Unidad';
    }
  }

  protected getCleanDescription(description: string): string {
    // Eliminar información de conversión (patrones como "Equivale a", "1 X =", números con unidades)
    let clean = description;
    
    // Remover patrones de conversión comunes
    clean = clean.replace(/Equivale a.*$/i, '');
    clean = clean.replace(/\d+\s*[a-zA-Z]+\s*=\s*[\d.]+.*$/i, '');
    clean = clean.replace(/\(.*\d+.*\)/g, ''); // Remover paréntesis con números
    
    // Limpiar espacios extras y puntos al final
    clean = clean.trim().replace(/\.+$/, '').trim();
    
    return clean;
  }

  protected getUnitDescription(unit: UnitMeasurement): string {
    // Descripciones personalizadas para unidades comunes
    const descriptions: Record<string, string> = {
      'kilogramo': 'Unidad de masa del Sistema Internacional',
      'kg': 'Unidad de masa del Sistema Internacional',
      'litro': 'Unidad de volumen del Sistema Internacional',
      'l': 'Unidad de volumen del Sistema Internacional',
      'gramo': 'Unidad básica de masa',
      'g': 'Unidad básica de masa',
      'mililitro': 'Unidad básica de volumen',
      'ml': 'Unidad básica de volumen',
    };

    const nameKey = unit.name.toLowerCase();
    const abbKey = unit.abbreviation.toLowerCase();
    
    if (descriptions[nameKey]) return descriptions[nameKey];
    if (descriptions[abbKey]) return descriptions[abbKey];
    
    return this.getCleanDescription(unit.description);
  }

  protected getRelevantConversion(unit: UnitMeasurement): { sourceAbbr: string; targetAbbr: string; factor: number } | null {
    if (!unit.isBasic || !unit.relatedUnits || unit.relatedUnits.length === 0) {
      return null;
    }

    const category = this.getUnitCategory(unit);
    
    // Para todas las unidades, el factor del backend significa:
    // 1 [unidad base] = factor [unidad derivada]
    // Ejemplo: si unit es "kilogramo" y relatedUnit es "gramo" con factor 1000
    // significa: 1 kg = 1000 g
    
    // Buscar la conversión más relevante según categoría
    let targetUnit: string | null = null;
    let alternativeUnit: string | null = null;
    
    switch (category) {
      case 'mass':
        // Para unidades de masa, preferir mostrar en gramos
        targetUnit = 'g';
        alternativeUnit = 'kg';
        break;
      case 'volume':
        // Para unidades de volumen, preferir mostrar en mililitros
        targetUnit = 'ml';
        alternativeUnit = 'l';
        break;
    }

    // Buscar la unidad objetivo (g o ml)
    if (targetUnit) {
      const targetConversion = unit.relatedUnits.find(related => 
        related.abbreviation.toLowerCase() === targetUnit.toLowerCase()
      );
      
      if (targetConversion) {
        // 1 [unidad base] = factor [unidad derivada]
        return { 
          sourceAbbr: unit.abbreviation, 
          targetAbbr: targetConversion.abbreviation, 
          factor: targetConversion.factor 
        };
      }
    }

    // Buscar la unidad alternativa (kg o l)
    if (alternativeUnit) {
      const alternativeConversion = unit.relatedUnits.find(related => 
        related.abbreviation.toLowerCase() === alternativeUnit.toLowerCase()
      );
      
      if (alternativeConversion) {
        // 1 [unidad base] = factor [unidad derivada]
        return { 
          sourceAbbr: unit.abbreviation, 
          targetAbbr: alternativeConversion.abbreviation, 
          factor: alternativeConversion.factor 
        };
      }
    }

    // Fallback: usar la primera conversión disponible
    const firstConv = unit.relatedUnits[0];
    return { 
      sourceAbbr: unit.abbreviation, 
      targetAbbr: firstConv.abbreviation, 
      factor: firstConv.factor 
    };
  }

}
