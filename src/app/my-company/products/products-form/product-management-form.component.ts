import { Component, computed, inject, OnInit, signal, effect, viewChild} from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { PaginationController, PaginationControllerCFG } from 'src/app/shared/paginationController';
import { GoBackComponent } from "@/shared/components/go-back/go-back.component";
import { SectionWrapperComponent } from "@/shared/layout/components/section-wrapper/section-wrapper.component";
import { Product, ProductService } from '@/system/services/product.service';
import {ColumnDefinition } from '@/shared/components/controller/filter/filter.component';
import { LayoutService } from '@/shared/services/layout.service';
import { NoImageComponent } from 'public/default/no-image.component';
import { DefaultSelectOption, SelectComponent } from '@/shared/components/select/select.component';
import { ModalComponent } from '@/shared/components/modal/modal.component';
import { InputDirective } from '@/shared/directives/input.directive';
import { ActivatedRoute } from '@angular/router';

export interface UnitSelectOption extends DefaultSelectOption {
  baseUnit?: string;
  conversionFactor?: number;
}

@Component({
  selector: 'app-product-management-form',
  standalone: true,
  templateUrl: './product-management-form.component.html',
  styleUrls: ['./product-management-form.component.less'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    GoBackComponent,
    SectionWrapperComponent,
    NoImageComponent,
    SelectComponent,
    ModalComponent,
    InputDirective //TODO: se creara componente de input, probable que cambie
  ]
})

export class ProductManagementFormComponent implements OnInit{

  private newUnitModalRef = viewChild<ModalComponent>('newUnitModal');
  private countUnitSelect = viewChild<SelectComponent<UnitSelectOption>>('countUnitSelect');

  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private layoutService = inject(LayoutService);
  private productService = inject(ProductService);
  private MOCK_PRODUCTS = signal<Product[]>([]);
  
  
  protected isMobile = this.layoutService.isMobile;
  protected selectedTemplate = signal<Product | null>(null);
  protected chosenTemplate = signal<any | null>(null);
  
  
  

  protected controller = new PaginationController<Product>([], <PaginationControllerCFG>{
  defaultSearchColumns: ['Nombre', 'Imagen', 'Descripción', 'Categorías', 'Códigos'],
  pageSize: 4
  });

  protected columns: ColumnDefinition[] = [
      {nameToShow: 'Nombre', columnName: 'name', type:'string'},
      {nameToShow: 'Imagen', columnName: 'image', type:'string', centerCol: true},
      {nameToShow: 'Descripción', columnName: 'description', type:'string'},
      {nameToShow: 'Categorías', columnName: 'categories', type: 'array'},
      {nameToShow: 'Códigos', columnName: 'codes', type:'array', showOnly: 'table'}
    ];

  protected UnitOptions = signal<UnitSelectOption[]>([
    // Unidades Fundamentales
    { label: 'Gramo', value: 'G', baseUnit: 'G', conversionFactor: 1000 },
    { label: 'Mililitro', value: 'ML', baseUnit: 'ML', conversionFactor: 1 },
    { label: 'Unidad', value: 'UNIT', baseUnit: 'UNIT', conversionFactor: 1 },

    // Unidades derivadas
    { label: 'Kilogramo', value: 'KG', baseUnit: 'G', conversionFactor: 1 },
    { label: 'Litro', value: 'L', baseUnit: 'ML', conversionFactor: 1000 },

    { label: '+Nuevo', value: '' }
]);

  protected baseUnitOptions = computed(() =>
    this.UnitOptions().filter(option => option.value !== '')
  );
  protected selectedInventoryUnitDisplay = signal<UnitSelectOption | null>(null);
  protected selectedCountUnitDisplay = signal<UnitSelectOption | null>(null);
  protected temporaryCountUnit = signal<UnitSelectOption | null>(null);
  
  protected triggeringUnitControlName = signal<'countUnits' | 'inventoryUnit' | null>(null);

  protected newUnitForm = this.fb.group({
    nombre: ['', Validators.required], // Nombre visible, ej: "Caja de 12"
    unidadBase: ['', Validators.required], // El 'value' de la unidad base, ej: "KG"
    factorConversion: [null as number | null, [Validators.required, Validators.min(0.0001)]]
  });


  protected productManagementForm = this.fb.group({
      productName: ['', [Validators.required]],
      sku: [''],
      estimatedCost: [0, [Validators.required, Validators.min(0)]],
      description: ['', [Validators.required]],
      isFrozen: [false],
      isSaleEnabled: [false],
      categories: [''], //Viene de plantilla de producto
      codes: [''],       //Viene de plantilla de producto
      inventoryUnit: [null as UnitSelectOption | null],
      countUnits: this.fb.array([])
    });


  constructor(){
    this.getTemplateProduct();
    
    effect(() => {
      this.controller.SetRawData(this.MOCK_PRODUCTS());
    })

  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(async params => {
    const templateId = params['templateId'];
    if (templateId) {
      // Espera a que los productos estén cargados
      if (this.MOCK_PRODUCTS().length === 0) {
        await this.getTemplateProduct();
      }
      const found = this.MOCK_PRODUCTS().find(p => p.id === templateId);
      if (found) {
        this.selectedTemplate.set(found);
        this.chosenTemplate.set(found); // Si quieres que quede fijo
      }
    }
  });
    // Si queremos que el selectedCountUnitDisplay muestre algo si hay una unidad principal
    const primaryUnit = this.countUnits.controls.find(unit => unit.get('isPrimary')?.value === true);
    if (primaryUnit) {
      const unitValue = primaryUnit.get('unitValue')?.value;
      const selectedOption = this.UnitOptions().find(option => option.value === unitValue);
      this.selectedCountUnitDisplay.set(selectedOption || null);
    }
  }

  

  addSelectedTemplate(){
    if (!this.selectedTemplate()) return;
    this.chosenTemplate.set(this.selectedTemplate());
  }

  clearChosenTemplate() {
    this.chosenTemplate.set(null);
    this.selectedTemplate.set(null);
  }

  private openNewUnitModal() {
  
  this.triggeringUnitControlName.set('countUnits');
  this.newUnitForm.reset();
  
  this.newUnitModalRef()?.openModal();
}

  unitChange(event: UnitSelectOption | null) {
  
  // Si se selecciona "+Nuevo"
  if (event && event.value === '') {
    this.openNewUnitModal(); 
    return;
  }

  // Lógica para selección normal
  if (event) {
    this.addCountUnit(event);
    this.selectedCountUnitDisplay.set(event);
  } else {
    this.selectedCountUnitDisplay.set(null);
  }
}


 inventoryUnitChange(event: UnitSelectOption | null) {
  
  if (event && event.value === '') {
    this.triggeringUnitControlName.set('inventoryUnit');
    this.openNewUnitModal();
    return;
  }

  if (event) {
    // Validar que no sea igual a ninguna unidad de conteo
    const countUnitValues = this.countUnits.controls.map(fg => fg.get('value')?.value);
    if (countUnitValues.includes(event.value)) {
      console.warn('La unidad de inventario no puede ser igual a una unidad de conteo');
      return;
    }

    this.selectedInventoryUnitDisplay.set(event);
    this.productManagementForm.get('inventoryUnit')?.setValue({
      label: event.label,
      value: event.value,
      baseUnit: event.baseUnit,
      conversionFactor: event.conversionFactor
    });
  } else {
    this.selectedInventoryUnitDisplay.set(null);
    this.productManagementForm.get('inventoryUnit')?.reset();
  }
}


 removeInventoryUnit() {
  this.selectedInventoryUnitDisplay.set(null);
  this.productManagementForm.get('inventoryUnit')?.reset();
}

 countUnitChange(event: UnitSelectOption | null) {
  
  if (event && event.value === '') {
    this.triggeringUnitControlName.set('countUnits');
    this.openNewUnitModal();
    return;
  }

  if (event) {
    this.addCountUnit(event);
  }
}


 getAvailableCountUnits(): UnitSelectOption[] {
  const inventoryValue = this.selectedInventoryUnitDisplay()?.value;
  // Obtén los valores de las unidades de conteo ya seleccionadas
  const selectedCountUnitValues = this.countUnits.controls.map(fg => fg.get('value')?.value);

  return this.UnitOptions().filter(unit => {
    // Excluir el "+Nuevo" excepto al final
    if (unit.value === '' && this.UnitOptions().indexOf(unit) !== this.UnitOptions().length - 1) {
      return false;
    }
    // Excluir la unidad de inventario
    if (inventoryValue && unit.value === inventoryValue) {
      return false;
    }
    // Excluir las unidades ya seleccionadas en countUnits
    if (selectedCountUnitValues.includes(unit.value)) {
      return false;
    }
    return true;
  });
}
  

  private async getTemplateProduct() {
    const products = await this.productService.getAllProductsTemplate();
    if (products) {
      this.MOCK_PRODUCTS.set(products);
    }
  }


  protected async saveProductManagement(): Promise<void> {
    // 1. Validar que el formulario sea válido Y que se haya elegido una plantilla
    this.productManagementForm.markAllAsTouched();
    if (this.productManagementForm.invalid || !this.chosenTemplate()) return;

    // 2. Obtener los valores del formulario y de la plantilla
    const formValue = this.productManagementForm.value;
    const template = this.chosenTemplate()!; // Sabemos que la plantilla existe por la validación

    // 3. Construir el objeto de datos COMPLETO para enviar
    const productData = {
      // Datos del formulario de gestión
      name: formValue.productName!,
      sku: formValue.sku!,
      description: formValue.description!,
      estimatedCost: formValue.estimatedCost!,
      isFrozen: formValue.isFrozen!,
      isSaleEnabled: formValue.isSaleEnabled!,
      inventoryUnit: this.selectedInventoryUnitDisplay(),
      countUnits: this.countUnits.value,

      // Datos de la PLANTILLA seleccionada
      templateId: template.id, // Guardamos la referencia a la plantilla
      image: template.image, // Usamos la imagen de la plantilla
      codes: template.codes, // <-- ¡AQUÍ ESTÁ LA CLAVE! Usamos los códigos de la plantilla
      categories: template.categories.map((cat: any) => cat.id) // <-- ¡Y AQUÍ! Usamos las categorías (como IDs)
    };

    // 4. LLAMAR AL SERVICIO PARA GUARDAR (Esta parte faltaba)
    try {
      // Asumiendo que tienes un método en tu servicio para crear este tipo de producto
      const createdProduct = await this.productService.createProductManagement(productData);
      
      if (createdProduct) {
        // this.navigateService.navigateTo('product-management'); // Descomenta para navegar
      }
    } catch (error) {
      console.error('Error al guardar el producto:', error);
    }
  }


  protected pickTemplate(product: Product) {
    if(this.selectedTemplate() && this.selectedTemplate()!.id === product.id){
      this.selectedTemplate.set(null);
      return;
    }
    this.selectedTemplate.set(product);
  }

  get countUnits(): FormArray {
  return this.productManagementForm.get('countUnits') as FormArray;
}

  addCountUnit(unit: UnitSelectOption | null) {
  if (unit && unit.value !== '') {
    // Validar que no sea igual a la unidad de inventario
    const inventoryValue = this.selectedInventoryUnitDisplay()?.value;
    if (inventoryValue === unit.value) {
      console.warn('La unidad de conteo no puede ser igual a la unidad de inventario');
      return;
    }

    const existingValues = this.countUnits.controls.map(fg => fg.get('value')?.value);
    
    if (!existingValues.includes(unit.value)) {
      const isPrimary = this.countUnits.length === 0;

      this.countUnits.push(this.fb.group({
        value: [unit.value, Validators.required],
        label: [unit.label, Validators.required],
        baseUnit: [unit.baseUnit],
        conversionFactor: [unit.conversionFactor],
        isPrimary: [isPrimary]
      }));

      if (isPrimary) {
        this.selectedCountUnitDisplay.set(unit);
      }
      
      // Reset del select
      this.temporaryCountUnit.set(null);
      this.countUnitSelect()?.reset();
    }
  }
}

  removeCountUnit(index: number) {
    this.countUnits.removeAt(index);
  }

  addNewUnit() {
  // Valida que el formulario sea válido
  if (this.newUnitForm.invalid) {
    return;
  }

  // Obtiene los valores del formulario
  const { nombre, unidadBase, factorConversion } = this.newUnitForm.value;
  
  // Generar un valor único basado en el nombre completo (no solo unidadBase)
  const valor = this.generateUniqueValue(nombre!);

  // Crea el nuevo objeto UnitSelectOption
  const newUnit: UnitSelectOption = {
    label: nombre!,
    value: valor,
    baseUnit: unidadBase!,
    conversionFactor: factorConversion!
  };

  // Validar que el valor sea único
  const existingUnit = this.UnitOptions().find(u => u.value === valor);
  if (existingUnit) {
    console.warn('Ya existe una unidad con ese código. Por favor elige un nombre diferente.');
    return;
  }

  // Agrega la nueva unidad a UnitOptions
  const currentUnits = this.UnitOptions();
  const updatedUnits = [...currentUnits.filter(u => u.value !== ''), newUnit, { label: '+Nuevo', value: '' }];
  this.UnitOptions.set(updatedUnits);

  // Agrega a la sección correspondiente
  const triggeringControl = this.triggeringUnitControlName();
  
  if (triggeringControl === 'inventoryUnit') {
    this.inventoryUnitChange(newUnit);
  } else if (triggeringControl === 'countUnits') {
    this.addCountUnit(newUnit);
  }

  // Cierra la modal
  this.newUnitModalRef()?.closeModal();

  // Resetea el formulario
  this.newUnitForm.reset();
}


private generateUniqueValue(nombre: string): string {
  // Crear un valor basado en el nombre y agregar un sufijo si es necesario
  let baseValue = nombre.toUpperCase().replace(/\s+/g, '_').substring(0, 10);
  let valor = baseValue;
  let counter = 1;

  // Si el valor ya existe, agregar un número al final
  while (this.UnitOptions().some(u => u.value === valor)) {
    valor = `${baseValue}_${counter}`;
    counter++;
  }

  return valor;
}



  protected onNewUnitModalClose() {
    this.newUnitForm.reset();
  }

}