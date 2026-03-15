import { SearchBarComponent } from '@/shared/components/controller/search-bar/search-bar.component';
import { GoBackComponent } from '@/shared/components/go-back/go-back.component';
import { ModalComponent } from '@/shared/components/modal/modal.component';
import { NumericInputComponent } from '@/shared/components/numeric-input/numeric-input.component';
import { SectionWrapperComponent } from '@/shared/layout/components/section-wrapper/section-wrapper.component';
import { PaginationController, PaginationControllerCFG } from '@/shared/paginationController';
import { LayoutService } from '@/shared/services/layout.service';
import { CurrencyPipe, DatePipe, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, OnDestroy, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NoImageComponent } from 'public/default/no-image.component';
import { PercentageBarComponent } from "@/shared/components/percentage-bar/percentage-bar.component";
import { CountService } from '@/inventory/services/count.service';
import { CountDetail, CountItem, UnitCount } from '@/inventory/models/count';
import { UnitMeasuresPipe } from '@/shared/pipes/unit-measures.pipe';
import { NavigateService } from '@/shared/services/navigate.service';
import { CanComponentDeactivate } from '@/shared/guards/canDeactivate.guard';
import { AuthService } from '@/auth/services/auth.service';
import { HumanDatePipe } from '@/shared/pipes/human-date.pipe';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DropdownComponent } from '@/shared/components/dropdown/dropdown.component';
import { RadioGroupButtonsComponent } from '@/shared/components/radio-group-buttons/radio-group-buttons.component';
import { DropFileComponent } from '@/shared/components/drop-file/drop-file.component';
import { 
  DECISION_OPTIONS, 
  REASON_OPTIONS, 
  ReconciliationProduct, 
  RadioGroupOption,
  generateMockReconciliationData,
  DecisionImpact
} from '@/inventory/models/reconciliation';
import { ImageService, ImageConversionError } from '@/shared/services/image.service';
import { ToastService } from '@/shared/services/toast.service';
import { InputComponent } from '@/shared/components/input/input.component';

@Component({
  selector: 'dot-assigned-count',
  imports: [
    SectionWrapperComponent,
    NgTemplateOutlet,
    GoBackComponent,
    SearchBarComponent,
    NoImageComponent,
    NumericInputComponent,
    NgTemplateOutlet,
    ModalComponent,
    PercentageBarComponent,
    UnitMeasuresPipe,
    ModalComponent,
    HumanDatePipe,
    MatTooltipModule,
    DatePipe,
    DropdownComponent,
    RadioGroupButtonsComponent,
    FormsModule,
    CurrencyPipe,
    DropFileComponent,
    InputComponent,
],
  templateUrl: './assigned-count.component.html',
  styleUrl: './assigned-count.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AssignedCountComponent implements CanComponentDeactivate, OnDestroy {
  private router = inject(Router);
  private layoutService = inject(LayoutService);
  private countService = inject(CountService);
  private navigateService = inject(NavigateService);
  private authService = inject(AuthService);
  private imageService = inject(ImageService);
  private toastService = inject(ToastService);

  protected selectedProduct = signal<CountItem | null>(null);

  protected actualCount = signal<CountDetail | null>(null);

  protected currentUser = this.authService.userAccount;

  protected countProducts = computed<CountItem[]>(() => {
    const count = this.actualCount();

    if (!count) return [];

    return count.countItems
  });

  protected userEdited = computed<boolean>(() => {
    const count = this.actualCount();

    if (!count) return false;

    return JSON.stringify(count) !== this.backupCountData;
  });

  protected productsUncompleted = computed<CountItem[]>(() => {
    return this.countProducts().filter(item => !item.completed);
  });

  protected shouldReadonly = computed<boolean>(() => {
    const count = this.actualCount();

    if (!count) return true;

    if (
      (count.status === 'in_progress' || count.status === 'pending') && 
      count.assignedTo !== this.currentUser()?.id
    ) return true;

    if (count.scheduledAt && !this.isNowBefore(count.scheduledAt)) return true;

    return count.status === 'completed' || count.status === 'cancelled' || count.status === 'rejected' || count.status === 'pending';
  });

  protected currentCountedProductsPercentage = computed<number>(() => {
    const products = this.countProducts();

    if (products.length === 0) return 0;

    const countedProducts = products.filter(item => item.completed).length || 0;
    const totalProducts = products.length;

    return Math.floor((countedProducts / totalProducts) * 100);
  });

  private selectedProductModal = viewChild<ModalComponent>('selectedProductModal');
  private preventLossModal = viewChild<ModalComponent>('preventLossModal');
  private reconciliationModal = viewChild<ModalComponent>('reconciliationModal');
  private confirmReconciliationModal = viewChild<ModalComponent>('confirmReconciliationModal');
  private incidenceModal = viewChild<ModalComponent>('incidenceModal');
  private viewIncidenceModal = viewChild<ModalComponent>('viewIncidenceModal');

  protected isMobile = this.layoutService.isMobile;

  private continueWithoutSaving: boolean = false;

  private backupCountData: string = '';

  protected CAN_REJECT_COUNT = true; // TODO: permisos

  // Reconciliation state
  protected readonly DECISION_OPTIONS = DECISION_OPTIONS;
  protected readonly REASON_OPTIONS = REASON_OPTIONS;

  protected reconciliationProducts = computed<ReconciliationProduct[]>(() => {
    const count = this.actualCount();
    if (!count || count.status !== 'completed') return [];
    
    // Generate mock reconciliation data for all products
    return this.countProducts().map((item, index) => generateMockReconciliationData(item, index));
  });

  protected hasReconciliationPending = computed<boolean>(() => {
    return this.actualCount()?.status === 'completed' && this.reconciliationProducts().length > 0;
  });

  protected selectedReconciliationProduct = signal<ReconciliationProduct | null>(null);
  protected selectedDecision = signal<RadioGroupOption | undefined>(undefined);
  protected selectedReason = signal<RadioGroupOption | undefined>(undefined);
  protected reasonComment = signal<string>('');

  // Incidence state
  protected selectedProductForIncidence = signal<CountItem | null>(null);
  protected incidencePhoto = signal<File | null>(null);
  protected incidencePhotoPreview = signal<string | null>(null);
  protected incidenceObservation = signal<string>('');
  protected productsWithIncidence = new Map<string, boolean>();
  private productIncidenceData = new Map<string, { file: File; previewUrl: string; observation: string }>();
  private removedIncidencePhotos = new Set<string>(); // Rastrear fotos eliminadas intencionalmente
  
  // View incidence state (para visualizar incidencias guardadas desde backend)
  protected selectedProductForViewIncidence = signal<CountItem | null>(null);

  protected canConfirmReconciliation = computed<boolean>(() => {
    const decision = this.selectedDecision();
    if (!decision) return false;
    
    // If decision is reconcile_transit, no reason is required
    if (decision.type === 'reconcile_transit') return true;
    
    // Otherwise, both decision and reason are required
    return this.selectedReason() !== undefined;
  });

  protected decisionImpact = computed<DecisionImpact | null>(() => {
    const product = this.selectedReconciliationProduct();
    const decision = this.selectedDecision();

    if (!product || !decision) return null;

    const impact: DecisionImpact = {
      description: '',
      stockChange: 0,
      costImpact: 0,
      riskLevel: 'consistent',
      affectedReports: []
    };

    switch (decision.type) {
      case 'reconcile_transit':
        impact.description = 'Se confirmará que el stock físico es correcto y se ajustará el tránsito pendiente.';
        impact.stockChange = 0;
        impact.costImpact = 0;
        impact.riskLevel = 'consistent';
        impact.affectedReports = ['Informe de tránsito', 'Conciliación'];
        break;
      case 'adjust_inventory':
        impact.description = product.difference > 0 
          ? `Se registrará un ingreso de ${Math.abs(product.difference)} unidades al inventario.`
          : `Se registrará una salida de ${Math.abs(product.difference)} unidades del inventario.`;
        impact.stockChange = product.difference;
        impact.costImpact = product.totalCostImpact;
        impact.riskLevel = Math.abs(product.differencePercentage) > 10 ? 'critical_risk' : 'requires_decision';
        impact.affectedReports = ['Kardex', 'Valorización', 'Balance de inventario'];
        break;
      case 'mark_pending':
        impact.description = 'El producto quedará bloqueado para movimientos hasta que se resuelva la diferencia.';
        impact.stockChange = 0;
        impact.costImpact = 0;
        impact.riskLevel = 'requires_decision';
        impact.affectedReports = ['Productos bloqueados', 'Pendientes de revisión'];
        break;
    }

    return impact;
  });

  protected controller = new PaginationController<CountItem>([], <PaginationControllerCFG>{
    defaultSearchColumns: ['productName', 'productSku'],
  })

  constructor() {

    const countId = this.router.url.split('/').pop();

    if (countId) {
      this.getActualCount(countId);
    }

    effect(() => {
      this.controller.SetRawData(this.countProducts());
    });
  }

  public canDeactivate(posibleRoute: string) : boolean | Promise<boolean> {
    if (!this.userEdited() || this.continueWithoutSaving) return true;

    this.preventLossModal()?.openModal(posibleRoute);
    return false;
  }

  protected async handlePreventNavigation(urlRoute: string, byPass: boolean = false): Promise<void> {
    if (byPass) this.continueWithoutSaving = true;
    else await this.saveDraft();
    
    this.preventLossModal()?.closeModal();
    this.router.navigateByUrl(urlRoute);
  }

  private async getActualCount(countId: string): Promise<void> {
    const response = await this.countService.getCountDetailById(countId);

    if (!response) return;

    if (
      response.status === 'un_assigned' || 
      (
        (response.status === 'in_progress' || response.status === 'pending') && 
        (
          response.assignedTo !== this.currentUser()?.id &&
          response.createdBy !== this.currentUser()?.id
        )
      )
    ) {
      this.navigateService.push('inventory');
      return;
    }

    // Sincronizar incidencias del backend con el Map en memoria
    response.countItems.forEach(item => {
      if (item.incidenceImageUrl) {
        this.productsWithIncidence.set(item.productId, true);
      }
    });

    this.actualCount.set(response);
    this.backupCountData = JSON.stringify(response);
  }

  protected async initCount(): Promise<void> {
    const count = this.actualCount();

    if (!count) return;

    const response = await this.countService.startCount(count.id);

    if (!response) return;

    this.actualCount.update(count => {
      if (!count) return count;

      return {
        ...count,
        status: 'in_progress'
      };
    })

    this.backupCountData = JSON.stringify(this.actualCount());
  }

  protected toggleProductSelection(product: CountItem): void {
    if (this.shouldReadonly()) return;

    if (this.isMobile()) {
      this.selectedProductModal()?.openModal();
      this.selectedProduct.set(product);
      return;
    }

    if (this.selectedProduct()?.productId === product.productId) {
      this.selectedProduct.set(null);
      return;
    }

    this.selectedProduct.set(product);
  }

  protected countChange(unitCountId: UnitCount['unitId'], newQuantity: number): void {
    const actualProduct = this.selectedProduct();

    if (!actualProduct) return;

    this.actualCount.update(count => {
      if (!count) return count;

      const newCount = {
        ...count,
        countItems: count.countItems.map(item => {
          if (item.productId === actualProduct.productId) {
            const updatedItem = {
              ...item,
              unitsCount: item.unitsCount.map(uc => {
                if (uc.unitId === unitCountId) {
                  return { ...uc, count: newQuantity }
                }
                return uc;
              })
            };

            this.selectedProduct.set(updatedItem);
            return updatedItem;
          }
          return item;
        })
      };

      return newCount;
    });
  }

  protected totalProductCount(product: CountItem): number {
    if (!product) return 0;

    return product.unitsCount.reduce((acc, item) => {
      const unitTotal = item.count / item.factor;

      return acc + Number(unitTotal.toFixed(3));
    }, 0)
  }

  protected completeProductCount(product: CountItem, event: Event): void {
    if (!product) return;
    
    event.stopPropagation();

    const checked = (event.target as HTMLInputElement).checked;

    const updatedProduct = {
      ...product,
      completed: checked
    };

    this.actualCount.update(count => {
      if (!count) return count;

      return {
        ...count,
        countItems: count.countItems.map(item => {
          if (item.productId === product.productId) {
            return updatedProduct;
          }
          return item;
        })
      }
    });

    if (this.selectedProduct()?.productId === product.productId) {
      this.selectedProduct.set(updatedProduct);
    }
  }

  protected async saveDraft(): Promise<void> {
    if (this.shouldReadonly()) return;

    const currentCount = this.actualCount();

    if (!currentCount) return;

    const body = {
      storeId: currentCount.storeId,
      warehouseId: currentCount.warehouseId,
      items: currentCount.countItems.map(item => ({
        productId: item.productId,
        unitsCount: item.unitsCount,
        completed: item.completed,
        // Incluir campos de incidencia si existen
        ...(item.incidenceImageUrl && { 
          incidenceImageUrl: item.incidenceImageUrl 
        }),
        ...(item.incidenceObservation !== undefined && item.incidenceObservation !== null && { 
          incidenceObservation: item.incidenceObservation 
        })
      })) || []
    }

    await this.countService.saveDraft(this.actualCount()!.id, body);    

    this.backupCountData = JSON.stringify(currentCount);
    this.actualCount.set(structuredClone(currentCount));
  }

  protected async completeCount(): Promise<void> {
    if (this.shouldReadonly()) return;

    const body = {
      storeId: this.actualCount()?.storeId,
      warehouseId: this.actualCount()?.warehouseId,
      items: this.actualCount()?.countItems.map(item => ({
        productId: item.productId,
        unitsCount: item.unitsCount,
        completed: item.completed,
        // Incluir campos de incidencia si existen
        ...(item.incidenceImageUrl && { 
          incidenceImageUrl: item.incidenceImageUrl 
        }),
        ...(item.incidenceObservation !== undefined && item.incidenceObservation !== null && { 
          incidenceObservation: item.incidenceObservation 
        })
      })) || []
    };

    const response = await this.countService.completeCount(this.actualCount()!.id, body);

    if (!response) return;

    this.continueWithoutSaving = true;

    this.navigateService.push('inventory');
  }

  protected async rejectCount(): Promise<void> {
    if (this.actualCount()?.status !== 'completed') return;

    const response = await this.countService.rejectCount(this.actualCount()!.id);

    if (!response) return;

    this.navigateService.push('inventory');
  }

  protected isNowBefore(countDate: string | Date | null): boolean {
    if (!countDate) return false;

    const now = new Date().getTime();
    const scheduledDate = new Date(countDate).getTime();

    return now > scheduledDate;
  }

  // Reconciliation methods
  protected openReconciliationModal(product: ReconciliationProduct): void {
    this.selectedReconciliationProduct.set(product);
    this.selectedDecision.set(undefined);
    this.selectedReason.set(undefined);
    this.reasonComment.set('');
    this.reconciliationModal()?.openModal();
  }

  protected closeReconciliationModal(): void {
    this.selectedReconciliationProduct.set(null);
    this.selectedDecision.set(undefined);
    this.selectedReason.set(undefined);
    this.reasonComment.set('');
    this.reconciliationModal()?.closeModal();
  }

  protected onDecisionChange(option: RadioGroupOption): void {
    this.selectedDecision.set(option);
    // Clear reason when switching to reconcile_transit since it's not needed
    if (option.type === 'reconcile_transit') {
      this.selectedReason.set(undefined);
      this.reasonComment.set('');
    }
  }

  protected onReasonChange(option: RadioGroupOption): void {
    this.selectedReason.set(option);
  }

  protected openConfirmReconciliation(): void {
    if (!this.canConfirmReconciliation()) return;
    this.confirmReconciliationModal()?.openModal();
  }

  protected async confirmReconciliation(): Promise<void> {
    const product = this.selectedReconciliationProduct();
    const decision = this.selectedDecision();
    const reason = this.selectedReason();

    if (!product || !decision) return;
    // Reason is optional for reconcile_transit
    if (decision.type !== 'reconcile_transit' && !reason) return;

    // TODO: Call service to submit reconciliation decision
    console.log('Reconciliation submitted:', {
      productId: product.productId,
      decision: decision.type,
      reason: reason?.type ?? 'N/A',
      comment: this.reasonComment()
    });

    this.confirmReconciliationModal()?.closeModal();
    this.closeReconciliationModal();
  }

  protected getSeverityBadgeClass(severity: ReconciliationProduct['diagnosisSeverity']): string {
    switch (severity) {
      case 'consistent': return 'success';
      case 'requires_decision': return 'caution';
      case 'critical_risk': return 'danger';
      default: return 'secondary';
    }
  }

  protected getSeverityLabel(severity: ReconciliationProduct['diagnosisSeverity']): string {
    switch (severity) {
      case 'consistent': return 'Consistente';
      case 'requires_decision': return 'Requiere decisión';
      case 'critical_risk': return 'Riesgo crítico';
      default: return 'Desconocido';
    }
  }

  protected getMovementTypeIcon(type: string): string {
    switch (type) {
      case 'entrada': return 'fa-solid fa-arrow-down';
      case 'salida': return 'fa-solid fa-arrow-up';
      case 'ajuste': return 'fa-solid fa-sliders';
      case 'conteo': return 'fa-solid fa-clipboard-check';
      case 'venta': return 'fa-solid fa-shopping-cart';
      case 'compra': return 'fa-solid fa-truck';
      case 'transferencia': return 'fa-solid fa-arrows-left-right';
      default: return 'fa-solid fa-circle';
    }
  }

  protected getMovementTypeLabel(type: string): string {
    switch (type) {
      case 'entrada': return 'Entrada';
      case 'salida': return 'Salida';
      case 'ajuste': return 'Ajuste';
      case 'conteo': return 'Conteo';
      case 'venta': return 'Venta';
      case 'compra': return 'Compra';
      case 'transferencia': return 'Transferencia';
      default: return type;
    }
  }

  // Incidence methods
  protected openIncidenceModal(product: CountItem): void {
    this.selectedProductForIncidence.set(product);
    
    // Verificar si la foto fue eliminada intencionalmente
    const wasRemoved = this.removedIncidencePhotos.has(product.productId);
    
    // Prioridad 1: Restaurar datos guardados en memoria si existen
    const savedData = this.productIncidenceData.get(product.productId);
    if (savedData) {
      this.incidencePhoto.set(savedData.file);
      this.incidencePhotoPreview.set(savedData.previewUrl);
      this.incidenceObservation.set(savedData.observation);
      // Si se restauró desde memoria, la foto ya no está eliminada
      this.removedIncidencePhotos.delete(product.productId);
    } else if (product.incidenceImageUrl && !wasRemoved) {
      // Prioridad 2: Cargar datos del backend si existen y NO fueron eliminados
      // La foto viene como URL del backend, no como File
      this.incidencePhoto.set(null);
      this.incidencePhotoPreview.set(product.incidenceImageUrl);
      this.incidenceObservation.set(product.incidenceObservation || '');
    } else {
      // No hay datos previos o la foto fue eliminada
      this.incidencePhoto.set(null);
      this.incidencePhotoPreview.set(null);
      this.incidenceObservation.set(product.incidenceObservation || '');
    }
    
    this.incidenceModal()?.openModal();
  }

  protected closeIncidenceModal(): void {
    // No revocar la URL si está guardada en productIncidenceData
    const product = this.selectedProductForIncidence();
    const previewUrl = this.incidencePhotoPreview();
    
    if (previewUrl && product) {
      const savedData = this.productIncidenceData.get(product.productId);
      // Solo revocar si no está guardada (es decir, es una nueva foto que no se guardó)
      if (!savedData || savedData.previewUrl !== previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    }
    
    this.selectedProductForIncidence.set(null);
    this.incidencePhoto.set(null);
    this.incidencePhotoPreview.set(null);
    this.incidenceObservation.set('');
    this.incidenceModal()?.closeModal();
  }

  protected onIncidencePhotoSelected(files: FileList): void {
    if (!files || files.length === 0) {
      this.clearIncidencePhoto();
      return;
    }

    const file = files[0];
    const product = this.selectedProductForIncidence();
    const currentPreviewUrl = this.incidencePhotoPreview();

    // Revoke previous preview URL if exists and is different from saved one
    if (currentPreviewUrl) {
      const savedData = product ? this.productIncidenceData.get(product.productId) : null;
      // Solo revocar si no está guardada o es diferente
      if (!savedData || savedData.previewUrl !== currentPreviewUrl) {
        URL.revokeObjectURL(currentPreviewUrl);
      }
    }

    // Create new preview URL
    const previewUrl = URL.createObjectURL(file);
    this.incidencePhoto.set(file);
    this.incidencePhotoPreview.set(previewUrl);
  }

  protected clearIncidencePhoto(): void {
    const product = this.selectedProductForIncidence();
    const previewUrl = this.incidencePhotoPreview();
    
    if (previewUrl) {
      // Revocar URL solo si no está guardada en productIncidenceData
      const savedData = product ? this.productIncidenceData.get(product.productId) : null;
      if (!savedData || savedData.previewUrl !== previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    }
    
    this.incidencePhoto.set(null);
    this.incidencePhotoPreview.set(null);
    
    // Limpiar datos guardados si existen
    if (product) {
      this.productIncidenceData.delete(product.productId);
      this.productsWithIncidence.delete(product.productId);
      
      // Si había foto del backend, marcar como eliminada intencionalmente
      if (product.incidenceImageUrl) {
        this.removedIncidencePhotos.add(product.productId);
      }
    }
  }

  protected hasIncidencePhoto(productId: string): boolean {
    return this.productsWithIncidence.get(productId) ?? false;
  }

  protected hasSavedIncidence(product: CountItem): boolean {
    return !!(product.incidenceImageUrl || product.incidenceObservation);
  }

  // Método unificado para verificar si tiene incidencia (memoria o backend)
  protected hasIncidence(product: CountItem): boolean {
    return (this.productsWithIncidence.get(product.productId) ?? false) 
      || !!(product.incidenceImageUrl || product.incidenceObservation);
  }

  // Método para obtener el texto del badge de incidencia según el estado
  protected getIncidenceBadgeText(product: CountItem): string {
    const wasRemoved = this.removedIncidencePhotos.has(product.productId);
    const hasPhoto = (this.productsWithIncidence.get(product.productId) ?? false) 
      || (!!product.incidenceImageUrl && !wasRemoved);
    const hasObservation = !!(product.incidenceObservation && product.incidenceObservation.trim() !== '');

    // Verificar si hay datos en memoria también
    const savedData = this.productIncidenceData.get(product.productId);
    const hasPhotoInMemory = !!(savedData && savedData.file);
    const hasObservationInMemory = !!(savedData && savedData.observation && savedData.observation.trim() !== '');

    // Combinar datos de backend y memoria
    const finalHasPhoto = hasPhoto || hasPhotoInMemory;
    const finalHasObservation = hasObservation || hasObservationInMemory;

    if (finalHasPhoto && finalHasObservation) {
      return 'Foto y Observación adjuntada';
    } else if (finalHasPhoto) {
      return 'Foto adjuntada';
    } else if (finalHasObservation) {
      return 'Observación adjuntada';
    }

    return 'Foto adjuntada'; // Por defecto, aunque no debería llegar aquí si hasIncidence es true
  }

  // Método para obtener la clase CSS del badge de incidencia según el estado
  protected getIncidenceBadgeClass(product: CountItem): string {
    const text = this.getIncidenceBadgeText(product);
    if (text === 'Observación adjuntada') {
      return 'incidence-status-text observation-only';
    } else if (text === 'Foto y Observación adjuntada') {
      return 'incidence-status-text full-incidence';
    }
    return 'incidence-status-text photo-only';
  }

  // Método para verificar si tiene foto de incidencia
  protected hasIncidencePhotoForIcon(product: CountItem): boolean {
    const wasRemoved = this.removedIncidencePhotos.has(product.productId);
    const hasPhoto = (this.productsWithIncidence.get(product.productId) ?? false) 
      || (!!product.incidenceImageUrl && !wasRemoved);
    
    const savedData = this.productIncidenceData.get(product.productId);
    const hasPhotoInMemory = !!(savedData && savedData.file);
    
    return hasPhoto || hasPhotoInMemory;
  }

  protected async saveIncidence(): Promise<void> {
    // Obtener datos del signal
    const product = this.selectedProductForIncidence();
    let photo = this.incidencePhoto();
    const observation = this.incidenceObservation();

    if (!product) return;

    // Si no hay foto adjuntada nueva, verificar si hay foto guardada
    if (!photo) {
      // Prioridad 1: Foto guardada en memoria
      const savedData = this.productIncidenceData.get(product.productId);
      if (savedData && savedData.file) {
        photo = savedData.file;
      } else if (product.incidenceImageUrl) {
        // Prioridad 2: Foto guardada en backend
        // Verificar si la foto fue eliminada intencionalmente
        const wasRemoved = this.removedIncidencePhotos.has(product.productId);
        
        // Actualizar estado local primero
        this.actualCount.update(count => {
          if (!count) return count;
          
          return {
            ...count,
            countItems: count.countItems.map(item => {
              if (item.productId === product.productId) {
                return {
                  ...item,
                  // Si la foto fue eliminada, poner null, sino mantener la URL
                  incidenceImageUrl: wasRemoved ? null : item.incidenceImageUrl,
                  incidenceObservation: observation || null
                };
              }
              return item;
            })
          };
        });
        
        // Crear payload
        const payload: any[] = [{
          idProducto: product.productId,
          incidencias: {
            observaciones: observation || '',
          },
          cantidades: product.unitsCount
        }];

        // Si la foto fue eliminada intencionalmente, enviar imagen: null
        if (wasRemoved) {
          payload[0].incidencias.imagen = null;
        }
        // Si no fue eliminada, no incluir imagen (el backend mantendrá la existente)

        try {
          const countId = this.actualCount()?.id;
          if (!countId) {
            this.toastService.error('No se pudo obtener el ID del conteo');
            return;
          }

          console.log('Incidencia payload (solo observación):', payload);

          // Enviar al endpoint de incidencias solo con observación
          const response = await this.countService.saveIncidence(countId, payload);
          if (!response) {
            this.toastService.error('Error al actualizar la observación');
            return;
          }

          // Recargar el conteo del backend para sincronizar los datos
          await this.getActualCount(countId);

          // Si la foto fue eliminada, limpiar la marca
          if (wasRemoved) {
            this.removedIncidencePhotos.delete(product.productId);
            this.productsWithIncidence.delete(product.productId);
          }

          // Actualizar también el Map en memoria si existe
          const currentSavedData = this.productIncidenceData.get(product.productId);
          if (currentSavedData) {
            this.productIncidenceData.set(product.productId, {
              ...currentSavedData,
              observation: observation || ''
            });
          }
          
          this.closeIncidenceModal();
          return;
        } catch (error) {
          this.toastService.error('Error al actualizar la observación');
          console.error('Error al actualizar observación:', error);
          return;
        }
      } else {
        // No hay foto previa ni nueva
        this.toastService.error('Debe adjuntar una foto de evidencia');
        return;
      }
    }

    try {
      // Convertir imagen a base64
      const base64Complete = await this.imageService.ConvertFileToBase64String(photo, 2);
      
      // Extraer mimeType
      const mimeType = this.imageService.GetMimeTypeFromBase64(base64Complete);
      
      // Obtener base64 sin prefijo para enviar al backend
      const base64WithoutPrefix = this.imageService.GetBase64WithoutPrefix(base64Complete);

      // Crear payload según formato requerido
      const payload = [{
        idProducto: product.productId,
        incidencias: {
          observaciones: observation || '',
          imagen: base64WithoutPrefix,
          mimeType: mimeType || 'image/jpeg'
        },
        cantidades: product.unitsCount
      }];

      console.log('Incidencia payload:', payload);

      // Obtener el ID del conteo actual
      const countId = this.actualCount()?.id;
      if (!countId) {
        this.toastService.error('No se pudo obtener el ID del conteo');
        return;
      }

      // Enviar al backend
      const response = await this.countService.saveIncidence(countId, payload);
      if (!response) {
        this.toastService.error('Error al guardar la incidencia');
        return;
      }

      // Recargar el conteo del backend para obtener la URL de la imagen guardada
      await this.getActualCount(countId);

      // Guardar los datos de la incidencia para poder restaurarlos al abrir el modal nuevamente
      const previewUrl = this.incidencePhotoPreview();
      if (previewUrl && photo) {
        this.productIncidenceData.set(product.productId, {
          file: photo,
          previewUrl: previewUrl,
          observation: observation || ''
        });
        // Si se adjunta nueva foto, la foto ya no está eliminada
        this.removedIncidencePhotos.delete(product.productId);
      }

      // Marcar que este producto tiene foto adjuntada
      this.productsWithIncidence.set(product.productId, true);

      this.closeIncidenceModal();
    } catch (error) {
      if (error instanceof ImageConversionError) {
        this.toastService.error(error.message);
      } else {
        this.toastService.error('Error al procesar la imagen. Por favor, intente nuevamente.');
        console.error('Error al guardar incidencia:', error);
      }
    }
  }

  // View incidence methods (para visualizar incidencias guardadas desde backend)
  protected openViewIncidenceModal(product: CountItem): void {
    this.selectedProductForViewIncidence.set(product);
    this.viewIncidenceModal()?.openModal();
  }

  protected closeViewIncidenceModal(): void {
    this.selectedProductForViewIncidence.set(null);
    this.viewIncidenceModal()?.closeModal();
  }


  protected setIncidenceObservation(observation: string | number): void {
    this.incidenceObservation.set(observation as string);
  }

  ngOnDestroy(): void {
    this.continueWithoutSaving = false;
    // Clean up all photo preview URLs
    if (this.incidencePhotoPreview()) {
      URL.revokeObjectURL(this.incidencePhotoPreview()!);
    }
    
    // Revoke all saved preview URLs
    this.productIncidenceData.forEach((data) => {
      if (data.previewUrl) {
        URL.revokeObjectURL(data.previewUrl);
      }
    });
    this.productIncidenceData.clear();
  }
}
