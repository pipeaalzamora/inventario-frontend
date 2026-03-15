import { FileReceipt, ItemReceipt, ReceiptDetail } from '@/request/models/receipt';
import { GoodsReceiptService } from '@/request/services/goods-receipt.service';
import { ColumnDefinition, FilterComponent } from '@/shared/components/controller/filter/filter.component';
import { SearchBarComponent } from '@/shared/components/controller/search-bar/search-bar.component';
import { SorterHeaderComponent } from '@/shared/components/controller/sorter-header/sorter-header.component';
import { TableCaptionComponent } from '@/shared/components/controller/table-caption/table-caption.component';
import { DropFileComponent } from '@/shared/components/drop-file/drop-file.component';
import { GoBackComponent } from '@/shared/components/go-back/go-back.component';
import { ModalComponent } from '@/shared/components/modal/modal.component';
import { RadioGroup } from '@/shared/components/radio-group-buttons/radio-group-buttons.component';
import { LinkDirective } from '@/shared/directives/link.directive';
import { SectionWrapperComponent } from '@/shared/layout/components/section-wrapper/section-wrapper.component';
import { PaginationController, PaginationControllerCFG } from '@/shared/paginationController';
import { ClpCurrencyPipe } from '@/shared/pipes/clp-currency.pipe';
import { LayoutService } from '@/shared/services/layout.service';
import { NavigateService } from '@/shared/services/navigate.service';
import { DatePipe, NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, viewChild } from '@angular/core';
import { DomSanitizer, SafeResourceUrl, SafeUrl } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { InputDirective } from "@/shared/directives/input.directive";
import { CopyClipboardButtonComponent } from '@/shared/components/copy-clipboard-button/copy-clipboard-button.component';

const CONTROLLER_COMPONENTS = [
  SearchBarComponent,
  FilterComponent,
  SorterHeaderComponent,
  TableCaptionComponent
]

@Component({
  selector: 'dot-goods-receipt-detail',
  imports: [
    CONTROLLER_COMPONENTS,
    SectionWrapperComponent,
    ClpCurrencyPipe,
    DropFileComponent,
    ModalComponent,
    DatePipe,
    GoBackComponent,
    LinkDirective,
    NgOptimizedImage,
    InputDirective,
    CopyClipboardButtonComponent,
    // FileComponent,
    // RadioGroupButtonsComponent,
],
  templateUrl: './goods-receipt-detail.component.html',
  styleUrl: './goods-receipt-detail.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GoodsReceiptDetailComponent {
  private router = inject(Router);
  private receiptService = inject(GoodsReceiptService);
  private sanitizer = inject(DomSanitizer);
  private layoutService = inject(LayoutService);
  private navigateService = inject(NavigateService);

  protected actualReceipt = signal<ReceiptDetail | null>(null);

  protected folioNumberInvoice = signal<string>('');
  protected folioNumberGuide = signal<string>('');

  protected products = computed<ItemReceipt[]>(() => this.actualReceipt()?.items || []);
  protected documents = computed<FileReceipt[]>(() => this.actualReceipt()?.files || []);

  protected someDiff = computed<boolean>(() => {
    return this.products().some(product => product.difference !== 0);
  })

  protected hasInvoiceFileType = computed<boolean>(() => {
    return this.actualReceipt()?.files.some(file => file.fileRole === 'invoice') || false;
  })

  protected hasGuideFileType = computed<boolean>(() => {
    return this.actualReceipt()?.files.some(file => file.fileRole === 'guide') || false;
  })

  protected isMobile = computed(() => this.layoutService.isMobile());

  protected TAX_AMOUNT = 19;

  protected subtotalAmount = computed<number>(() => {
    return this.products().reduce((acc, item) => acc + item.subtotal, 0);
  })

  protected taxAmount = computed<number>(() => {
    return this.products().reduce((acc, item) => acc + item.taxTotal, 0);
  });

  protected totalAmount = computed<number>(() => {
    return this.subtotalAmount() + this.taxAmount();
  })

  protected actualFilePreview: FileReceipt | null = null;

  private filePreviewModal = viewChild<ModalComponent>('filePreviewModal');

  protected selectedFileType: 'invoice' | 'guide' | 'other' = 'invoice';
  
  protected filesTypesToUpload: RadioGroup[] = [
    { type: 'invoice', label: 'Factura', icon: 'fa-solid fa-file-invoice', disabled: this.hasInvoiceFileType() },
    { type: 'guide', label: 'Guía de despacho', icon: 'fa-solid fa-truck-ramp-box', disabled: this.hasGuideFileType() },
    { type: 'other', label: 'Otro', icon: 'fa-solid fa-ellipsis' },
  ]

  protected controller = new PaginationController<ItemReceipt>([], <PaginationControllerCFG>{
    defaultSearchColumns: ['productName, purchaseUnit, quantity'],
  })

  protected columns: ColumnDefinition[] = [
    { columnName: 'productName', nameToShow: 'Producto', type: 'string' },
    { columnName: 'purchaseUnit', nameToShow: 'U. Medida', type: 'string', centerCol:true,  },
    { columnName: 'quantity', nameToShow: 'Cantidad', type: 'number', centerCol:true, },
    { columnName: 'difference', nameToShow: 'Diferencia', type: 'number', centerCol:true, },
    { columnName: 'unitPrice', nameToShow: 'Precio Unitario', type: 'number', centerCol:true, },
    { columnName: 'subtotal', nameToShow: 'Subtotal', type: 'number', centerCol:true, },
    { columnName: 'taxTotal', nameToShow: 'Impuesto', type: 'number', centerCol:true, },
    { columnName: 'status', nameToShow: 'Estado', type: 'string', showOnly: 'filter' },
  ];

  constructor() {
    const receiptId = this.router.url.split('/').pop();

    if (receiptId) { 
      this.getReceiptDetail(receiptId);
    }

    effect(() => {
      this.controller.SetRawData(this.products());
    });
  }

  private async getReceiptDetail(receiptId: string):Promise<void> {
    const response = await this.receiptService.getDetailGoodsReceipt(receiptId);

    if (!response) return;

    this.actualReceipt.set(response);
  }

  protected getProductById(id: ItemReceipt['id']):ItemReceipt | undefined {
    return this.products().find(product => product.id === id);
  }

  protected async completeReceipt():Promise<void> {
    const body = {
      invoiceFolio: this.folioNumberInvoice(),
      invoiceGuide: this.folioNumberGuide()
    }
    const response = await this.receiptService.completeReceipt(this.actualReceipt()!.id, body);

    if (!response) return;

    this.actualReceipt.set(response);

    this.navigateService.replace('request')
  }

  protected async fixDifferences():Promise<void> {
    const response = await this.receiptService.fixDifferences(this.actualReceipt()!.id);

    if (!response) return;

    this.actualReceipt.set(response);

    this.navigateService.replace('request')
  }

  protected setFolioNumber(event: Event, folio: 'invoice' | 'guide'): void {
    const value = (event.target as HTMLInputElement).value;

    if (folio === 'invoice') {
      this.folioNumberInvoice.set(value);
    } else if (folio === 'guide') {
      this.folioNumberGuide.set(value);
    }
  }

  /////////////////////
  /// FILES HANDLER ///
  /////////////////////

  protected onSelectFileType(type: RadioGroup): void {
    this.selectedFileType = type.type as 'invoice' | 'guide' | 'other';
  }

  protected async onFilesUploaded(files: FileList):Promise<void> {
    const filesArray = Array.from(files);

    const formData = new FormData();

    filesArray.forEach(file => {
      formData.append('file', file, file.name);
    });

    const response = await this.receiptService.uploadFiles(this.actualReceipt()!.id, formData, this.selectedFileType);
    
    if (!response) return;

    this.selectedFileType = 'other';
    
    this.actualReceipt.set(response);
  }

  protected async deleteFile(file: FileReceipt):Promise<void> {
    const response = await this.receiptService.deleteFile(this.actualReceipt()!.id, file.id);

    if (!response) return;

    this.actualReceipt.set(response);
  }

  protected async downloadFile(file: FileReceipt):Promise<void> {
    const a = document.createElement('a');

    a.href = file.fileUrl;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  protected isImage(fileType: string):boolean {
    return fileType.split('/')[0] === 'image';
  }

  protected safeResourceUrl(url: string): SafeUrl | SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  // protected uploadEvidence(event: Event, product: ItemReceipt):void {
  //   event.preventDefault();
  //   event.stopPropagation();

  //   const input = event.target as HTMLInputElement;

  //   if (!input.files || input.files.length === 0) return;

  //   const file = input.files[0];
  // }

  // private getFileSize(size: number):string {
  //   if (size < 1024) return `${size} B`;
  //   else if (size >= 1024 && size < 1048576) return `${(size / 1024).toFixed(1)} KB`;
  //   else if (size >= 1048576) return `${(size / 1048576).toFixed(1)} MB`;
  //   return '';
  // }

  protected previewImage(preview: FileReceipt):void {
    this.actualFilePreview = preview;

    this.filePreviewModal()?.openModal();
  }

  protected eraseImagePreview():void {
    setTimeout(() => {
      this.actualFilePreview = null;
    }, 300);
  }
}
