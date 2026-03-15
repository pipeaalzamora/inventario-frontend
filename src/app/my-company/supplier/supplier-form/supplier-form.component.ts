import { GoBackComponent } from '@/shared/components/go-back/go-back.component';
import { SectionWrapperComponent } from '@/shared/layout/components/section-wrapper/section-wrapper.component';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { Contact, ProductEditForm, QuickProductPriceChange, SupplierDetail, SupplierFormType } from '@/my-company/supplier/models/supplier';
import { ModalComponent } from '@/shared/components/modal/modal.component';
import { email, maxLength, minLength, pattern, required, form, Field} from '@angular/forms/signals';
import { Router } from '@angular/router';
import { SupplierService } from '@/my-company/supplier/services/supplier.service';
import { ProductsService } from '@/shared/services/products.service';
import { PhoneNumberPipe } from '@/shared/pipes/phone-number.pipe';
import { PaginationController, PaginationControllerCFG } from '@/shared/paginationController';
import { SearchBarComponent } from '@/shared/components/controller/search-bar/search-bar.component';
import { SorterHeaderComponent } from '@/shared/components/controller/sorter-header/sorter-header.component';
import { ColumnDefinition, FilterComponent } from '@/shared/components/controller/filter/filter.component';
import { TableCaptionComponent } from '@/shared/components/controller/table-caption/table-caption.component';
import { PaginationComponent } from '@/shared/components/controller/pagination/pagination.component';
import { LayoutService } from '@/shared/services/layout.service';
import { NgOptimizedImage, NgTemplateOutlet, SlicePipe } from '@angular/common';
import { NoImageComponent } from 'public/default/no-image.component';
import { AccordionComponent } from '@/shared/components/accordion/accordion.component';
import { ProductTemplate, SupplierProductForm, SupplierProductFormPriceInt } from '@/shared/models/products';
import { SelectComponent } from '@/shared/components/select/select.component';
import { MatTooltipModule } from '@angular/material/tooltip';
import { InputComponent } from '@/shared/components/input/input.component';
import { ClpCurrencyPipe } from '@/shared/pipes/clp-currency.pipe';
import { CountryFlagPipe } from '@/shared/pipes/country-flag.pipe';
import { ErrorService } from '@/shared/services/error.service';
import { UnitMeasure } from '@/shared/models/units';

const CONTROLLER_COMPONENTS = [
  SearchBarComponent,
  SorterHeaderComponent,
  TableCaptionComponent,
  PaginationComponent,
]

@Component({
  selector: 'dot-supplier-form',
  imports: [
    GoBackComponent,
    SectionWrapperComponent,
    ModalComponent,
    PhoneNumberPipe,
    CONTROLLER_COMPONENTS,
    NgOptimizedImage,
    NoImageComponent,
    AccordionComponent,
    SelectComponent,
    MatTooltipModule,
    SlicePipe,
    InputComponent,
    ClpCurrencyPipe,
    CountryFlagPipe,
    Field,
    NgTemplateOutlet,
    FilterComponent
],
  templateUrl: './supplier-form.component.html',
  styleUrl: './supplier-form.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SupplierFormComponent {
  private router = inject(Router);
  private layoutService = inject(LayoutService);
  private supplierService = inject(SupplierService);
  private productService = inject(ProductsService);
  private errorService = inject(ErrorService);

  private readonly contactFormModel = signal({
    name: '',
    email: '',
    phone: '',
    description: '',
  });

  protected contactForm = form(
    this.contactFormModel,
    contactForm => {
      required(contactForm.name, { message: 'El nombre es obligatorio.' });

      required(contactForm.email, { message: 'El email es obligatorio.' });
      email(contactForm.email, { message: 'El email no es válido.' });

      required(contactForm.phone, { message: 'El teléfono es obligatorio.' });
      minLength(contactForm.phone, 8, { message: 'Debe tener al menos 8 dígitos.' });
      maxLength(contactForm.phone, 8, { message: 'Debe tener máximo 8 dígitos.' });
      pattern(contactForm.phone, /^[0-9]{8}$/, { message: 'Solo se permiten números.' });

      this.errorService.bindServerErrors(contactForm, this.contactFormModel);
    }
  );

  private readonly supplierFormModel = signal<SupplierFormType>({
    name: '',
    description: '',
    idFiscal: '',
    fiscalName: '',
    email: '',
    fiscalAddress: '',
    fiscalCity: '',
    fiscalState: '',
    available: true,
  })

  protected supplierForm = form(
    this.supplierFormModel,
    supplierForm => {
      required(supplierForm.name, { message: 'El nombre del proveedor es obligatorio.' });

      required(supplierForm.idFiscal, { message: 'El RUT es obligatorio.' });
      maxLength(supplierForm.idFiscal, 12, { message: 'El RUT es obligatorio.' });
      pattern(supplierForm.idFiscal, /^(\d{1,2}\.?\d{3}\.?\d{3})-([\dkK])$/, { message: 'El RUT no es válido.' });

      required(supplierForm.fiscalName, { message: 'El nombre fiscal es obligatorio.' });

      required(supplierForm.email, { message: 'El email fiscal es obligatorio.' });
      email(supplierForm.email, { message: 'El email fiscal no es válido.' });

      required(supplierForm.fiscalAddress, { message: 'La dirección fiscal es obligatoria.' });

      required(supplierForm.fiscalCity, { message: 'La ciudad fiscal es obligatoria.' });

      this.errorService.bindServerErrors(supplierForm, this.supplierFormModel);
    }
  )

  protected readonly productEditFormModel = signal<ProductEditForm>({
    name: '',
    sku: '',
    price: '',
    description: '',
    categories: [],
    codes: [],
    unitId: 0,
    available: true,
  });

  protected productEditForm = form(
    this.productEditFormModel,
    productForm => {
      required(productForm.name, { message: 'El nombre del producto es obligatorio.' });
      required(productForm.price, { message: 'El precio del producto es obligatorio.' });
      required(productForm.unitId, { message: 'La unidad de medida es obligatoria.' });

      this.errorService.bindServerErrors(productForm, this.productEditFormModel);
    }
  );

  protected selectedContacts = signal<Contact[]>([]);
  protected selectedContactId = signal<Contact['id'] | null>(null);
  protected selectedProducts = signal<SupplierProductForm[]>([]);

  protected actualSupplier = signal<SupplierDetail | null>(null);

  protected editProductPriceMode = signal<boolean>(false);

  protected productPriceToEdit = signal<Map<string, QuickProductPriceChange>>(new Map());

  private selectedProductsIds = computed<Set<SupplierProductForm['productId']>>(() => {
    return new Set(this.selectedProducts().map(p => p.productId));
  });

  private contactRutHandler = computed(() => this.supplierFormModel().idFiscal);
  private contactPhoneHandler = computed(() => this.contactFormModel().phone);

  private handlePaginationSize = computed<number>(() => {
    if (this.isDesktop()) {
      return 10;
    } else if (this.isLaptop()) {
      return 6;
    } else {
      return 5;
    }
  })

  protected getUnitNameById = computed(() => {
    return (unitId: number) => {
      const unit = this.unitsMeasures().find(u => u.id === unitId);
      return unit?.name ?? '';
    };
  });

  protected selectedProductToEdit = signal<SupplierProductForm | null>(null);
  protected isEditProductMode = signal<boolean>(false);

  protected isEditMode = signal<boolean>(false);

  protected templateProducts = signal<ProductTemplate[]>([]);

  protected filteredTemplateProducts = computed(() => {
    const selectedIds = this.selectedProductsIds();
    return this.templateProducts().filter(template => !selectedIds.has(template.id));
  });

  protected isMobile = this.layoutService.isMobile;
  protected isLaptop = this.layoutService.isLaptop;
  protected isDesktop = this.layoutService.isDesktop;

  private contactModal = viewChild<ModalComponent>('contactFormModal');
  private delecteContactModal = viewChild<ModalComponent>('deleteContactModal');
  private deleteProductModal = viewChild<ModalComponent>('deleteProductModal');
  private productEditModal = viewChild<ModalComponent>('productEditModal');
  private editSupplierModal = viewChild<ModalComponent>('editSupplierModal');
  private editProductPriceModal = viewChild<ModalComponent>('editProductPriceModal');
  private unitSelect = viewChild<SelectComponent<UnitMeasure>>('unitSelect');
  private contactPhoneInput = viewChild<InputComponent>('contactPhoneInput');
  private suppRutInput = viewChild<InputComponent>('suppRutInput');

  protected unitsMeasures = signal<UnitMeasure[]>([]);

  protected unitSearchBy: keyof UnitMeasure = 'name';

  protected columns: ColumnDefinition[] = [];

  protected controller = new PaginationController<ProductTemplate>([], <PaginationControllerCFG>{
    defaultSearchColumns: ['name', 'categories.name', 'codes.name'],
    sortAscending: true,
    sortColumn: 'name',
  });

  protected templateProductColumns: ColumnDefinition[] = [
    { columnName: 'name', nameToShow: 'Nombre', type: 'string' },
    { columnName: 'description', nameToShow: 'Descripción', type: 'string' },
  ];

  protected productsController = new PaginationController<SupplierProductForm>([], <PaginationControllerCFG>{
    defaultSearchColumns: ['name', 'sku', 'description'],
    pageSize: this.handlePaginationSize()
  });

  protected productColumns: ColumnDefinition[] = [
    { columnName: 'sku', nameToShow: 'SKU', type: 'string' },
    { columnName: 'name', nameToShow: 'Nombre', type: 'string' },
    { columnName: 'price', nameToShow: 'Precio', type: 'string' },
    { columnName: 'baseUnit', nameToShow: 'U. Medida Base', type: 'string' },
    { columnName: 'description', nameToShow: 'Descripción', type: 'string' },
    { columnName: null, nameToShow: 'Opciones', type: 'string', centerCol: true, noSort: true },
  ] ;

  constructor() {
    const supplierId = this.router.url.split('/').pop();

    // ...existing code...
    
    if (supplierId && supplierId !== 'new') {
      this.isEditMode.set(true);
      this.getUnitsMeasures();
      this.getActualSupplier(supplierId);
      this.getProductsTemplate();
    } else {
      // Cargar plantillas de productos también en modo creación
      this.getProductsTemplate();
      this.getUnitsMeasures();
    }

    effect(() => {
      const currentRut = this.contactRutHandler()

      if (!currentRut) return;

      let cleanedValue = currentRut.replace(/[^0-9kK]/g, '').toUpperCase();
      let formattedValue = '';

      cleanedValue = cleanedValue.slice(0, 9);

      const kIndex = cleanedValue.indexOf('K');

      if (kIndex !== -1 && kIndex !== cleanedValue.length - 1) {
        cleanedValue = cleanedValue.replace(/K/g, '');
      }
      
      if (cleanedValue.length > 1) {
        const body = cleanedValue.slice(0, -1);
        const dv = cleanedValue.slice(-1);
        const bodyWithDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

        formattedValue = `${bodyWithDots}-${dv}`;
      } else {
        formattedValue = cleanedValue;
      }

      if (formattedValue === currentRut) return;

      untracked(() => {
        this.supplierFormModel.update(supplierForm => ({
          ...supplierForm,
          idFiscal: formattedValue,
        }));

        this.suppRutInput()?.setValue(formattedValue);
      })
    });

    effect(() => {
      const currentPhone = this.contactPhoneHandler()

      if (!currentPhone) return;

      let cleanedValue = currentPhone.replace(/[^0-9]/g, '');

      cleanedValue = cleanedValue.slice(0, 8);

      if (cleanedValue === currentPhone) return;

      untracked(() => {
        this.contactFormModel.update(contactForm => ({
          ...contactForm,
          phone: cleanedValue,
        }));

        this.contactPhoneInput()?.setValue(cleanedValue);
      });
    });

    effect(() => {
      const value = this.supplierFormModel();

      this.errorService.clearSignalErrors();
    })

    effect(() => {
      const value = this.productEditFormModel();

      this.errorService.clearSignalErrors();
    })

    effect(() => {
      this.controller.SetRawData(this.filteredTemplateProducts());
    })

    effect(() => {
      this.productsController.SetRawData(this.selectedProducts());
    })

    effect(() => {
      this.productsController.SetPageSize(this.handlePaginationSize());
    })

    effect(() => {
      const isBulkPriceMode = this.editProductPriceMode();

      if (!isBulkPriceMode) return;

      untracked(() => this.productsController.SetSliceMode(false));
    })
  }

  protected async getUnitsMeasures() {
    const response = await this.supplierService.getUnitsMeasures();

    if (!response) return;

    this.unitsMeasures.set(response);
  }

  protected async addContact() {
    this.contactForm().markAsTouched();
    if (this.contactForm().invalid()) return;

    if (this.isEditMode()) {
      if (this.selectedContactId()) {
        await this.updateContactEditMode(this.selectedContactId()!);
        return;
      } else {
        await this.createContactEditMode();
        return;
      }
    }

    if (this.selectedContactId()) {
      this.updateContact(this.selectedContactId() as Contact['id']);
      return;
    }

    const newContact: Contact = this.contactForm().value() as Contact;

    newContact.phone = `+569${newContact.phone}`;

    newContact.id = crypto.randomUUID();

    this.selectedContacts.update(contacts => [...contacts, newContact]);
    this.contactForm().reset();

    this.contactModal()?.closeModal();
  }

  private async createContactEditMode() {
    const formValue = this.contactForm().value() as Contact;

    const newContact: Contact = {
      ...formValue,
      phone: `+569${formValue.phone}`,
    };

    this.contactModal()?.enableButton('ok');

    const response = await this.supplierService.addContactToExistentSupplier(this.actualSupplier()!, this.contactForm, newContact);

    if (!response) {
      this.contactModal()?.disableButton('ok');
      return;
    };

    this.actualSupplier.set(response);
    this.selectedContacts.set(response.contacts);

    this.contactModal()?.closeModal();
  }

  private async updateContactEditMode(contactId: Contact['id']): Promise<void> {
    const formValue = this.contactForm().value() as Contact;

    const updatedContact: Contact = {
      id: contactId,
      name: formValue.name,
      email: formValue.email,
      phone: `+569${formValue.phone}`,
      description: formValue.description,
    }

    this.contactModal()?.disableButton('ok');

    const response = await this.supplierService.editContactOfExistentSupplier(this.actualSupplier()!, this.contactForm, updatedContact);

    if (!response) {
      this.contactModal()?.enableButton('ok');
      return;
    };

    this.actualSupplier.set(response);
    this.selectedContacts.set(response.contacts);

    this.contactModal()?.closeModal();
  };

  protected openEditContactModal(contact: Contact) {
    this.selectedContactId.set(contact.id);

    this.contactModal()?.openModal();

    this.contactForm().setControlValue({
      name: contact.name,
      email: contact.email,
      phone: contact.phone.slice(4),
      description: contact.description,
    });
  }

  protected updateContact(contactId: Contact['id']) {
    const formValue = this.contactForm().value() as Contact;

    this.selectedContacts.update(contacts => {
      return contacts.map(c => {
        if (c.id === contactId) {
          return {
            ...c,
            name: formValue.name,
            email: formValue.email,
            phone: `+569${formValue.phone}`,
          };
        }
        return c;
      });
    });

    this.contactForm().reset();
    this.selectedContactId.set(null);
    this.contactModal()?.closeModal();
  }

  protected removeContact(contactId: Contact['id']) {
    requestAnimationFrame(() => this.selectedContacts.update(contacts => contacts.filter(c => c.id !== contactId)));

    this.delecteContactModal()?.closeModal();
  }

  private async getActualSupplier(supplierId: SupplierDetail['id']): Promise<void> {
    const response = await this.supplierService.getSupplierById(supplierId);

    if (!response) return;

    this.actualSupplier.set(response);
    this.selectedContacts.set(response.contacts);
    this.selectedProducts.set(response.products);
  }

  protected openEditSupplierModal(): void {
    const actualSupplier = this.actualSupplier();

    if (!actualSupplier) return;

    this.supplierForm().setControlValue({
      name: actualSupplier.name,
      description: actualSupplier.description,
      idFiscal: actualSupplier.fiscalData.idFiscal,
      fiscalName: actualSupplier.fiscalData.fiscalName,
      email: actualSupplier.fiscalData.email,
      fiscalAddress: actualSupplier.fiscalData.fiscalAddress,
      fiscalCity: actualSupplier.fiscalData.fiscalCity,
      fiscalState: actualSupplier.fiscalData.fiscalState,
      available: actualSupplier.available,
    });

    this.editSupplierModal()?.openModal();
  }

  protected async submitEditSupplierForm(): Promise<void> {
    this.supplierForm().markAsTouched();
    if (this.supplierForm().invalid() || !this.actualSupplier()) return;

    this.editSupplierModal()?.disableButton('ok');

    const actualSupplierId = this.actualSupplier()!.id;

    const response = await this.supplierService.updateSupplier(actualSupplierId, this.supplierForm, this.selectedContacts());

    if (!response) {
      this.editSupplierModal()?.enableButton('ok');
      return;
    };

    this.actualSupplier.set(response);
    this.selectedContacts.set(response.contacts);

    this.editSupplierModal()?.closeModal();
  }

  protected resetEditSupplierForm(): void {
    this.supplierForm().reset({
      name: '',
      description: '',
      idFiscal: '',
      fiscalName: '',
      email: '',
      fiscalAddress: '',
      fiscalCity: '',
      fiscalState: '',
      available: true,
    });
  }

  protected editProduct(product: SupplierProductForm): void {
    this.isEditProductMode.set(true);

    this.openEditProductModal(product);
  }

  protected openEditProductModal(product: SupplierProductForm): void {
    // Buscar la plantilla correspondiente para obtener la imagen
    const template = this.templateProducts().find(t => t.id === product.productId);
    
    // Establecer el producto con la imagen de la plantilla si existe
    this.selectedProductToEdit.set({
      ...product,
      image: template?.image || product.image
    });
  
    this.productEditForm().reset();
  
    this.productEditFormModel.update(form => {
      return {
        ...form,
        name: product.name,
        sku: product.sku,
        description: product.description,
        price: product.price,
        unitId: product.unit ?? 5,
        available: product.available,
      }
    });
  
    this.productEditModal()?.openModal();
  }

  private async getProductsTemplate(): Promise<void> {
    const response = await this.productService.getProductsTemplate();

    if (!response) return;

    this.templateProducts.set(response);
  }

  /// productos ///
  protected selectProduct(product: ProductTemplate): void {
    if (this.isSelected(product.id)) return;

    const newProduct: SupplierProductForm = {
      ...product,
      productId: product.id,
      sku: '',
      price: '',
      unitId: 0,
      unitName: '',
      available: true,
    };

    delete (newProduct as any).id;

    this.openEditProductModal(newProduct);
  }

  protected async saveEditedProduct(): Promise<void> {
    if (!this.selectedProductToEdit()) return;

    this.productEditForm.unitId().markAsTouched();

    if (this.productEditForm().invalid()) return;

    const formValue = this.productEditForm().value();
    const selectedUnit = this.unitsMeasures().find(u => u.id === formValue.unitId);

    const newProduct: SupplierProductFormPriceInt = {
      ...this.selectedProductToEdit()!,
      name: formValue.name!,
      sku: formValue.sku!,
      description: formValue.description!,
      price: Number(formValue.price!),
      unit: formValue.unitId!,
      unitId: formValue.unitId!,
      unitName: selectedUnit?.name ?? '',
      available: formValue.available!,
    };

    let response;

    this.productEditModal()?.disableButton('ok');

    if (this.isEditProductMode()) {
      response = await this.editProdcuctToBack(newProduct);
    } else {
      response = await this.createProductToBack(newProduct);
    }

    if (!response) {
      this.productEditModal()?.enableButton('ok');
      return;
    }

    this.productEditModal()?.closeModal();
  }

  protected async editProdcuctToBack(newProduct: SupplierProductFormPriceInt): Promise<boolean> {
    if (!this.actualSupplier()) return false;

    const response = await this.supplierService.editSupplierProduct(this.actualSupplier()!.id, this.productEditForm, newProduct);

    if (!response) return false;

    this.selectedProducts.update(products => {
      return products.map(p => {
        if (p.productId === response!.productId) {
          return {
            ...p,
            name: response!.name,
            sku: response!.sku,
            description: response!.description,
            price: String(response!.price),
            unitId: response!.unit!,
            unit: response!.unit!,
            unitName: response!.unitName,
            available: response!.available,
          };
        }
        return p;
      });
    });

    return true;
  }

  protected async createProductToBack(newProduct: SupplierProductFormPriceInt): Promise<boolean> {
    if (!this.actualSupplier()) return false;

    const response = await this.supplierService.createSupplierProduct(this.actualSupplier()!.id, this.productEditForm, newProduct);

    if (!response) return false;

    this.selectedProducts.set(response.products);

    return true;
  }

  protected async removeProduct(productId: string): Promise<void> {
    if (!this.actualSupplier()) return;

    this.deleteProductModal()?.disableButton('ok');

    const response = await this.supplierService.deleteSupplierProduct(this.actualSupplier()!.id, productId);

    if (!response) {
      this.deleteProductModal()?.enableButton('ok');
      return;
    }

    this.selectedProducts.update(products => {
      return products.filter(p => p.productId !== productId);
    });

    this.deleteProductModal()?.closeModal();
  }

  protected setProductUnitMeasure(unitMeasure: UnitMeasure | null): void {
    if (!this.selectedProductToEdit()) return;

    const actualProductId = this.selectedProductToEdit()!.productId;

    this.selectedProducts.update(products => {
      return products.map(p => {
        if (p.productId === actualProductId) {
          return {
            ...p,
            unitName: unitMeasure ? unitMeasure.name : '',
            unit: unitMeasure ? unitMeasure.id : 0,
          };
        }
        return p;
      });
    });

    this.productEditFormModel.update(form => {
      return {
        ...form,
        baseUnit: unitMeasure ? unitMeasure.name : '',
        unitId: unitMeasure ? unitMeasure.id : 0,
      }
    });
  }

  protected togglePagination(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;

    
    this.productsController.SetSliceMode(!checked);
  }

  protected isSelected(productId: SupplierProductForm['productId']): boolean {
    return this.selectedProductsIds().has(productId);
  }

  protected resetFormProduct(): void {
    this.productEditForm().reset({
      name: '',
      sku: '',
      price: '',
      description: '',
      categories: [],
      codes: [],
      unitId: 0,
      available: true,
    });

    this.unitSelect()?.reset();
    this.selectedProductToEdit.set(null);
    this.isEditProductMode.set(false);
  }

  protected quickChangePriceProduct(productId: SupplierProductForm['productId'], productName: string, oldPrice: string, newPrice: string | number): void {

    if (oldPrice == newPrice) {
      this.productPriceToEdit.update(products => {
        const newMap = new Map(products);
        newMap.delete(productId);
        
        return newMap;
      });
      return;
    };

    const priceChange: QuickProductPriceChange = {productId, productName, newPrice: Number(newPrice), oldPrice: Number(oldPrice)};

    this.productPriceToEdit.update(products => {
      const newMap = new Map(products);
      newMap.set(productId, priceChange);

      return newMap;
    })
  }

  protected async saveQuickEditedPrices(): Promise<void> {
    if (this.productPriceToEdit().size === 0) return;

    const priceChanges = Array.from(this.productPriceToEdit().values());

    this.editProductPriceModal()?.disableButton('ok');
  
    const responseM = await this.supplierService.bulkPriceUpdate(this.actualSupplier()!.id, priceChanges);

    if (!responseM) {
      this.editProductPriceModal()?.enableButton('ok');
      return;
    }

    this.selectedProducts.update(products => {
      return products.map(product => {
        const updatedProduct = responseM!.find(p => p.productId === product.productId);
        if (updatedProduct) {
          return {
            ...product,
            price: String(updatedProduct.price),
          };
        }
        return product;
      });
    });

    this.editProductPriceMode.set(false);
    this.productPriceToEdit.set(new Map());

    this.editProductPriceModal()?.closeModal();
  }

  protected cancelQuickEditPrices(): void {
    this.productPriceToEdit.set(new Map());

    this.editProductPriceMode.set(false);
  }

  protected async submitSupplierForm(): Promise<void> {
    this.supplierForm().markAsTouched();
    if (this.supplierForm().invalid() || this.selectedContacts().length === 0) return;

    const response = await this.supplierService.createSupplier(this.supplierForm, this.selectedContacts());

    if (!response) return;

    this.isEditMode.set(true);
    this.actualSupplier.set(response);
  }

}
