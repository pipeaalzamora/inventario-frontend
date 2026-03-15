import { ToastService } from '@/shared/services/toast.service';
import { AfterViewInit, ChangeDetectionStrategy, Component, computed, ElementRef, inject, input, output, Renderer2 } from '@angular/core';
import { LayoutService } from '@/shared/services/layout.service';

export type UploadedFile = {
  name: string;
  size: number;
  type: string;
  url: string;
  createdAt: Date;
}

@Component({
  selector: 'dot-drop-file',
  imports: [],
  templateUrl: './drop-file.component.html',
  styleUrl: './drop-file.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DropFileComponent implements AfterViewInit {
  private renderer = inject(Renderer2);
  private el = inject(ElementRef);
  private toastService = inject(ToastService);
  private layoutService = inject(LayoutService);

  public maxSizeInMB = input<number>(5);
  public acceptedFormats = input<string[]>(['.pdf', '.doc', '.docx', '.xls', '.xlsx']);
  public multiple = input<boolean>(true);

  public uploadedFiles = output<FileList>();

  protected acceptedFormatsToShow = computed(() => {
    return this.acceptedFormats().map(format => format.startsWith('.') ? format.substring(1) : format);
  });

  protected isMobile = computed(() => this.layoutService.isMobile());

  protected maxSizeInBytes = computed(() => this.maxSizeInMB() * 1024 * 1024);

  private element: HTMLElement | null = null;

  constructor() {}

  ngAfterViewInit(): void {
    this.element = this.el.nativeElement.querySelector('.dot-input-file');
  }

  protected onDrop(event: DragEvent) {
    event.preventDefault();

    this.handleDroppedFiles(event.dataTransfer?.files ?? null);

    this.renderer.removeClass(this.element, 'onDragOver');
  }

  protected handleDroppedFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    if (Array.from(files).some(file => file.size > this.maxSizeInBytes())) {
      this.toastService.error(`El tamaño máximo permitido por archivo es de ${this.maxSizeInMB()} MB.`);
      return;
    }

    if (Array.from(files).some(file => !this.acceptedFormats().some(format => file.name.toLowerCase().endsWith(format.toLowerCase())))) {
      this.toastService.caution(`Los formatos permitidos son: ${this.acceptedFormatsToShow().join(', ').toLocaleUpperCase()}.`);
      return;
    }

    this.uploadedFiles.emit(files);
  }

  protected onInputChange(event: Event) {
    const input = event.target as HTMLInputElement;

    this.handleDroppedFiles(input.files);
  }

  protected onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  protected onDragEnter() {
    this.renderer.addClass(this.element, 'onDragOver');
  }

  protected onDragLeave() {
    this.renderer.removeClass(this.element, 'onDragOver');
  }
}
