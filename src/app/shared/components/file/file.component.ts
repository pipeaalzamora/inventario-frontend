import { ToastService } from '@/shared/services/toast.service';
import { ChangeDetectionStrategy, Component, effect, inject, input, OnDestroy, output, signal, untracked } from '@angular/core';
import { DropdownComponent } from '@shared/components/dropdown/dropdown.component';

type Type = {
  type: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'dot-file',
  imports: [],
  templateUrl: './file.component.html',
  styleUrl: './file.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FileComponent implements OnDestroy {
  private toastService = inject(ToastService);

  public maxSizeInMB = input<number>(5);
  public acceptedFormats = input<string[]>(['.pdf', '.doc', '.docx', '.xls', '.xlsx']);
  public multiple = input<boolean>(true);
  public types = input<Type[]>();

  public uploadedFiles = output<FileList>();

  protected actualFileName = signal<string | null>(null);

  private timeout: number | null = null;

  constructor() {
    effect(() => {
      if (this.actualFileName()) {
        if (this.timeout) {
          clearTimeout(this.timeout);
        }

        this.timeout = setTimeout(() => {
          untracked(() => this.actualFileName.set(null));
        }, 4000);
      }
    })
  }

  protected handleFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files) return this.toastService.caution('No se seleccionó ningún archivo.');

    this.actualFileName.set(input.files[0].name);

    this.uploadedFiles.emit(input.files);
  }

  ngOnDestroy(): void {
    if (!this.timeout) return;

    clearTimeout(this.timeout);
  }
}
