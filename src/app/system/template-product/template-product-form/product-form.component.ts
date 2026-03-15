import { GoBackComponent } from '@/shared/components/go-back/go-back.component';
import { InputDirective } from '@/shared/directives/input.directive';
import { SectionWrapperComponent } from '@/shared/layout/components/section-wrapper/section-wrapper.component';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnDestroy, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, FormArray, Validators, FormsModule, FormGroup } from '@angular/forms';
import { Router, ActivatedRoute} from '@angular/router';
import { ProductService, Product, Category, Code, CodeType, CategoryForm } from '@/system/services/product.service';
import { NavigateService } from '@/shared/services/navigate.service';
import { LayoutService } from '@/shared/services/layout.service';
import { ErrorService } from '@/shared/services/error.service';
import { DropFileComponent } from '@/shared/components/drop-file/drop-file.component';
import { ModalComponent } from '@/shared/components/modal/modal.component';
import { SearchBarComponent } from '@/shared/components/controller/search-bar/search-bar.component';
import { PaginationController, PaginationControllerCFG } from '@/shared/paginationController';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BytesFormatPipe } from '@/shared/pipes/bytes-format.pipe';
import { DatePipe } from '@angular/common';
import { InputComponent } from "@/shared/components/input/input.component";
import { form, Field, required } from '@angular/forms/signals';


@Component({
  selector: 'dot-product-form',
  imports: [
    FormsModule,
    SearchBarComponent,
    ReactiveFormsModule,
    InputDirective,
    GoBackComponent,
    SectionWrapperComponent,
    DropFileComponent,
    ModalComponent,
    BytesFormatPipe,
    DatePipe,
    InputComponent,
    Field
  ],
  templateUrl: './product-form.component.html',
  styleUrl: './product-form.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductFormComponent implements OnDestroy {
  //inyecciones
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private productService = inject(ProductService);
  private navigateService = inject(NavigateService);
  private layoutService = inject(LayoutService);
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);
  private errorService = inject(ErrorService);
  private allCodeTypes = signal<CodeType[]>([]);
  private allCategories = signal<Category[]>([]);

  protected areCodeTypesLoaded = computed(() => this.allCodeTypes().length > 0);

  protected uploadedFile = signal<File | null>(null);
  protected imageRemoved = signal<boolean>(false);
  
  protected previewImageObjectUrl: string | null = null;

  //declaración de referencia para modal
  protected previewImageModal = viewChild<ModalComponent>('previewImageModal');
  protected createCategoryModal = viewChild<ModalComponent>('createCategoryModal');

  // Signal para mantener un registro de los tipos de código seleccionados en el FormArray
  protected selectedCodeTypes = signal<Set<string>>(new Set<string>());
  private productId = signal<string | null>(null);
  protected actualProduct = signal<Product | null>(null);
  protected isMobile = computed(() => this.layoutService.isMobile());

  // Signal para las categorías seleccionadas (almacena IDs)
  protected selectedCategories = signal<Set<number>>(new Set());

  protected displayedCategories = computed(() => {
    const all = this.allCategories();
    const selectedIds = this.selectedCategories();
    return all.filter(cat => selectedIds.has(cat.id));
  });

  protected imageStatus: 'actual' | 'pendiente' = 'actual';


  // Crear el controller para las categorías en la modal
  protected controller =
    new PaginationController<Category>([], <PaginationControllerCFG>{
      defaultSearchColumns: ['name'],
      slicedMode: false
    });

  // Modelo del formulario de crear categoría
  protected readonly categoryFormModel = signal<CategoryForm>({
    name: '',
    description: '',
    available: true
  });

  // Signal Form para crear categoría
  protected categoryForm = form(
    this.categoryFormModel,
    categoryForm => {
      required(categoryForm.name, { message: 'El nombre de la categoría es obligatorio.' });
      
      this.errorService.bindServerErrors(categoryForm, this.categoryFormModel);
    }
  );

  shortFileName(name: string): string {
  if (!name) return '';
    return name.length > 14 ? name.slice(0, 10) + '..' : name;
  }

  
  private getFilenameFromUrl(url: string): string {
    if (!url) return '';
    try {
      // Decodifica la URL para manejar caracteres especiales (ej. espacios como %20)
      const decodedUrl = decodeURIComponent(url);
      // Divide la URL por '/' y toma el último segmento.
      return decodedUrl.substring(decodedUrl.lastIndexOf('/') + 1);
    } catch (e) {
      // En caso de una URL malformada, devuelve un nombre genérico.
      return 'archivo.jpg';
    }
  }

  protected displayedImageName = computed(() => {
    const uploaded = this.uploadedFile();
    const existingProduct = this.actualProduct();

    // Prioridad 1: Si hay un archivo subido localmente, usar su nombre.
    if (uploaded) {
      return uploaded.name;
    }
    // Prioridad 2: Si no, y estamos editando un producto con imagen, extraer el nombre de la URL.
    if (existingProduct && existingProduct.image) {
      return this.getFilenameFromUrl(existingProduct.image);
    }
    // Si no hay nada, devolver una cadena vacía.
    return '';
  });

  // helpers para el FormArray de códigos
  protected get codes(): FormArray<FormGroup> { // Tipado más específico para FormArray
    return this.productForm.get('codes') as FormArray<FormGroup>;
  }

  protected addCode(initial?: { id?: number | null; name: string; value: string }): void {
    let defaultName = initial?.name;
    let defaultId = initial?.id;

    // Si no se proporciona un nombre inicial, buscar el primer tipo disponible
    if (!defaultName) {
      const currentlySelected = this.selectedCodeTypes();
      const availableTypes = this.allCodeTypes().filter(type => !currentlySelected.has(type.name)); // <-- CAMBIO
      if (availableTypes.length > 0) {
        const firstAvailableType = availableTypes[0]; 
        defaultName = availableTypes[0].name;
        defaultId = firstAvailableType.id;
      } else {
        defaultName = '';
      }
    }

    const newCodeGroup = this.fb.group({
      id: [defaultId ?? null],
      name: [defaultName, Validators.required],
      value: [initial?.value ?? '', Validators.required]
    });

    this.codes.push(newCodeGroup);
  }

  protected removeCode(index: number): void {
    this.codes.removeAt(index);
    // La suscripción a valueChanges se encargará de actualizar selectedCodeTypes automáticamente.
  }

  // Método para obtener los tipos de código disponibles para un selector específico
  protected getAvailableCodeTypes(currentCodeFormGroup: FormGroup): CodeType[] {
    const currentSelectedTypesSet = this.selectedCodeTypes();
    const currentTypeInThisRow = currentCodeFormGroup.get('name')?.value;

    return this.allCodeTypes().filter(type =>
      // Incluir el tipo si no está seleccionado en ningún otro lugar, O si es el tipo actualmente seleccionado en esta fila
      !currentSelectedTypesSet.has(type.name) || type.name === currentTypeInThisRow
    );
  }

  // ===== MÉTODOS PARA CATEGORÍAS =====
  // metodo para verificar si una categoría está seleccionada
  protected isSelectedCategory(categoryId: number): boolean {
    return this.selectedCategories().has(categoryId);
  }


  protected toggleSelectCategory(category: Category): void {

    const selected = new Set(this.selectedCategories());

    if (selected.has(category.id)) {
      selected.delete(category.id);
    } else {
      selected.add(category.id);
    }

    this.selectedCategories.set(selected);
    this.productForm.get('categoryIds')?.setValue(Array.from(selected));

  }

  
  protected removeCategory(categoryId: number): void {
    const selected = new Set(this.selectedCategories());
    selected.delete(categoryId);
    this.selectedCategories.set(selected);
    this.productForm.get('categoryIds')?.setValue(Array.from(selected));
    this.productForm.get('categoryIds')?.markAsTouched();
  }

  protected async createCategory(): Promise<void> {
    if (this.categoryForm().invalid()) return;

    const formData = this.categoryFormModel();
    const res = await this.productService.createCategory(formData);
    
    if (res) {
      // Cerrar el modal PRIMERO (siguiendo el patrón de unit-measurement)
      this.createCategoryModal()?.closeModal();
      
      // Luego actualizar las categorías
      const updatedCategories = [...this.allCategories(), res];
      this.allCategories.set(updatedCategories);
      this.controller.SetRawData(updatedCategories);
    }
  }

  protected resetCategoryForm(): void {
    this.categoryFormModel.set({
      name: '',
      description: '',
      available: true
    });
  }

  // Método para obtener el icono de una categoría basado en su nombre completo
  protected getCategoryIcon(categoryName: string): string {
    const name = categoryName.toLowerCase();
    
    // Carnes y pescados (debe incluir ambas palabras)
    if (name.includes('carne') && name.includes('pescado')) {
      return 'fa-solid fa-drumstick-bite';
    }
    
    // Verduras y frutas (debe incluir ambas palabras)
    if (name.includes('verdura') && name.includes('fruta')) {
      return 'fa-solid fa-carrot';
    }
    
    // Lácteos
    if (name.includes('lácteo') || name.includes('lacteo')) {
      return 'fa-solid fa-cheese';
    }
    
    // Bebidas
    if (name.includes('bebida')) {
      return 'fa-solid fa-wine-bottle';
    }
    
    // Panadería
    if (name.includes('panadería') || name.includes('panaderia')) {
      return 'fa-solid fa-bread-slice';
    }
    
    // Granos y cereales
    if (name.includes('grano') && name.includes('cereal')) {
      return 'fa-solid fa-wheat-awn';
    }
    
    // Conservas y enlatados
    if (name.includes('conserva') && name.includes('enlatado')) {
      return 'fa-solid fa-jar';
    }
    
    // Condimentos y especias
    if (name.includes('condimento') && name.includes('especia')) {
      return 'fa-solid fa-pepper-hot';
    }
    
    // Congelados (este sí está solo)
    if (name.includes('congelado')) {
      return 'fa-solid fa-snowflake';
    }
    
    // Limpieza
    if (name.includes('limpieza')) {
      return 'fa-solid fa-spray-can-sparkles';
    }
    
    // Secos y despensa
    if (name.includes('seco') && name.includes('despensa')) {
      return 'fa-solid fa-cookie';
    }
    
    // Default icon
    return 'fa-solid fa-tag';
  }

  // Método para obtener el color de una categoría basado en su nombre completo
  protected getCategoryColor(categoryName: string): string {
    const name = categoryName.toLowerCase();
    
    if (name.includes('carne') && name.includes('pescado')) return '#e74c3c';
    if (name.includes('verdura') && name.includes('fruta')) return '#27ae60';
    if (name.includes('lácteo') || name.includes('lacteo')) return '#3498db';
    if (name.includes('bebida')) return '#9b59b6';
    if (name.includes('panadería') || name.includes('panaderia')) return '#e67e22';
    if (name.includes('grano') && name.includes('cereal')) return '#d4a017';
    if (name.includes('conserva') && name.includes('enlatado')) return '#95a5a6';
    if (name.includes('condimento') && name.includes('especia')) return '#c0392b';
    if (name.includes('congelado')) return '#5dade2';
    if (name.includes('limpieza')) return '#1abc9c';
    if (name.includes('seco') && name.includes('despensa')) return '#8b6914';
    
    return '#34495e';
  }

  
 productForm = this.fb.group({
    name: [''],
    sku: [''],
    estimatedCost: [null as number | null],
    description: [''],
    imagePreview: [''],
    image: [null as File | string | null],
    codes: this.fb.array<FormGroup>([], [Validators.minLength(1)]),
    categoryIds: [[] as number[]],
  });

  private async loadInitialData(): Promise<void> {
    try {
      // 1. Intenta obtener los tipos de código
      const [codeTypes, categories] = await Promise.all([
        this.productService.getCodeTypes(),
        this.productService.getAllCategories() // <-- AÑADIDO: Llama al nuevo método
      ]);
      
      // 2. Si tiene éxito, actualiza el signal
      this.allCodeTypes.set(codeTypes);
      this.allCategories.set(categories);
      this.controller = new PaginationController<Category>(categories, {
        defaultSearchColumns: ['name'],
        slicedMode: false
      });

    } catch (error) {
      // 3. Si ocurre un error, lo veremos aquí en la consola
      console.error('Error al cargar los tipos de código:', error);
    }
  }

  constructor() {
    this.loadInitialData();
    // Extraer ID de la URL (patrón UserForm)
    const productId = this.route.snapshot.paramMap.get('id');

    if (productId && productId !== 'new') {
      this.productId.set(productId);
      this.fetchProduct(productId);
    }

    // NUEVO: Suscribirse a los cambios en el FormArray 'codes'
    this.codes.valueChanges.pipe(
      takeUntilDestroyed(this.destroyRef) // Limpieza automática de la suscripción
    ).subscribe((codes: {id: number, name: string; value: string }[]) => {
      const currentSelections = new Set<string>();
      codes.forEach(code => {
        if (code.name) {
          currentSelections.add(code.name);
        }
      });
      this.selectedCodeTypes.set(currentSelections);
    });

  }


  
  private updateSelectedCodeTypesInternal(): void {
    const currentSelections = new Set<string>();
    this.codes.controls.forEach(control => {
      const nombreControl = control.get('name');
      if (nombreControl && nombreControl.value) {
        currentSelections.add(nombreControl.value);
      }
    });
    this.selectedCodeTypes.set(currentSelections);
  }


  // Fetch del producto actual
  protected async fetchProduct(productId: string): Promise<void> {
    if (!this.productId()) return;
    const res = await this.productService.getProduct(productId);
    if (res) {
      this.actualProduct.set(res);

      const categoryIds = new Set(res.categories.map(cat => cat.id));
      this.selectedCategories.set(categoryIds);

      this.productForm.patchValue({
        name: res.name,
        sku: res.sku,
        estimatedCost: typeof res.estimatedCost === 'number' ? res.estimatedCost : null,
        description: res.description,
        imagePreview: res.image,
        categoryIds: res.categories.map(cat => cat.id),
      });
      // Rellenar FormArray de códigos
      this.codes.clear();
      if (res.codes && Array.isArray(res.codes)) {
        for (const c of res.codes) {
          this.addCode({ id: c.id, name: c.name, value: c.value });
        }
      }

      this.updateSelectedCodeTypesInternal();
      if (res.image) {
        this.setPreviewFromUrl(res.image);
        this.imageStatus = 'actual';
      }
      this.imageRemoved.set(false);
    }
  }


  // Save: Detecta crear vs editar
  protected async saveProduct(): Promise<void> {
    this.productForm.markAllAsTouched();
    if (this.productForm.invalid) return;

    if (!this.uploadedFile() && this.actualProduct()?.image && !this.imageRemoved()) {
      this.productForm.get('image')?.setValue(this.actualProduct()!.image);
    }

    if (!this.actualProduct()) {
      return await this.createProduct();
    }
    const isNewImage = !!this.uploadedFile() || this.imageRemoved();

    const res = await this.productService.updateProduct(
      this.actualProduct()!.id, 
      this.productForm,
      isNewImage // <-- Aquí pasamos el flag
    );

   
    if (res) {
      this.navigateService.push('product');
    }
  }

  private async createProduct(): Promise<void> {
    await this.productService.createProduct(this.productForm);
    // No redirigir automáticamente, permanecer en el formulario
  }



  protected onFileDropped(files: FileList | null | undefined): void {
    const file = files?.item(0);
    if (!file) {
      this.removeImage();
      return;
    }
    this.productForm.get('image')?.setValue(file);

    // Revocar cualquier ObjectURL previo si existe
    if (this.previewImageObjectUrl) {
      URL.revokeObjectURL(this.previewImageObjectUrl);
      this.previewImageObjectUrl = null;
    }

    // Crear nueva ObjectURL
    const newObjectUrl = URL.createObjectURL(file);

    // Actualizar signals/propiedades con lógica de View Transitions
    if (!document.startViewTransition) {
      this.uploadedFile.set(file); // Guarda el objeto File real
      this.previewImageObjectUrl = newObjectUrl; // Guarda la URL para la vista previa
    } else {
      document.startViewTransition(() => {
        this.uploadedFile.set(file);
        this.previewImageObjectUrl = newObjectUrl;
        this.imageStatus = 'pendiente';
      });
    }
    this.imageRemoved.set(false);

    // Guardar en el form (si usas productImg para enviar la URL)
    this.productForm.get('imagePreview')?.setValue(newObjectUrl);
  }

  
  protected removeImage(): void {
    if (!this.uploadedFile() && !this.previewImageObjectUrl) return; // No hay nada que eliminar

    if (this.previewImageObjectUrl) {
      URL.revokeObjectURL(this.previewImageObjectUrl);
      this.previewImageObjectUrl = null;
    }

    // Limpiar signals/propiedades con lógica de View Transitions
    if (!document.startViewTransition) {
      this.uploadedFile.set(null);
      this.previewImageObjectUrl = null;
    } else {
      document.startViewTransition(() => {
        this.uploadedFile.set(null);
        this.previewImageObjectUrl = null;
      });
    }

    this.productForm.get('imagePreview')?.setValue('');
    this.productForm.get('image')?.setValue(null);
    this.productForm.get('image')?.markAsTouched();
    this.imageRemoved.set(true);
  }


  // Si recibes productImg que es una URL remota, la pones directamente en currentFile (actualizado)
  private setPreviewFromUrl(url: string): void {
    // Revocar cualquier ObjectURL existente
    if (this.previewImageObjectUrl) {
      URL.revokeObjectURL(this.previewImageObjectUrl);
      this.previewImageObjectUrl = null;
    }

    this.uploadedFile.set(null); // Una URL remota no es un objeto File local
    this.previewImageObjectUrl = url; // Establece la URL para la vista previa
    this.productForm.get('imagePreview')?.setValue(url);
  }


  // Limpieza del ObjectURL al destruir el componente tras cambiar de ruta (actualizado)
  ngOnDestroy(): void {
    if (this.previewImageObjectUrl && this.previewImageObjectUrl.startsWith('blob:')) { // Solo revocar si es una ObjectURL
      URL.revokeObjectURL(this.previewImageObjectUrl);
    }
  }
}
