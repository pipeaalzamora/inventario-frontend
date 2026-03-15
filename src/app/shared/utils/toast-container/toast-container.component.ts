import { ToastService } from '@/shared/services/toast.service';
import { ToastComponent } from '@/shared/components/toast/toast.component';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

@Component({
  selector: 'dot-toast-container',
  imports: [
    ToastComponent
  ],
  template:`
    <div class="dot-toast-container">
      @for (toast of toastService.listToasts(); track toast.id) {
        <dot-toast [toast]="toast"></dot-toast>
      }
    </div>
  `,
  styleUrl: './toast-container.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ToastContainerComponent {
  protected toastService = inject(ToastService);
}
