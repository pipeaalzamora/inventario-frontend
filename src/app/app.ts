import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Storage } from './shared/services/storage.service';
import { ToastContainerComponent } from './shared/utils/toast-container/toast-container.component';
import { NotificationService, StreamEvent } from './shared/services/notification.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { tap } from 'rxjs';
import { ToastService } from './shared/services/toast.service';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    ToastContainerComponent
],
  templateUrl: './app.html',
  styleUrl: './app.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App implements OnInit {
  private storageService = inject(Storage);
  private notificationsService = inject(NotificationService);
  private toastService = inject(ToastService);

  constructor() {
    this.notificationsService.lastEvent.pipe(
      takeUntilDestroyed(),
      tap((value) => {
        if (!value) return;

        if (value.notificationType === 'inventory_request') return this.requestNotificationToast(value);

        this.showNotificationToast(value)
      })
    ).subscribe()
  }

  ngOnInit(): void {
    this.storageService.getItem('dark-mode') ? document.body.classList.add('dark-mode') : document.body.classList.remove('dark-mode');
  }

  private showNotificationToast(event: StreamEvent) {
    const date = new Date(event.payload.timestamp).toLocaleString();

    this.toastService.show({
      title: `Event ${event.id}`,
      text: `${event.payload.message} ${date}`,
    });
  }

  private requestNotificationToast(event: StreamEvent) {
    const eventType = event.payload.event;

    const requestTypes: Record<string, () => void> =  {
      'created': () => this.toastService.requestToast(event, 'Se ha creado una solicitud de inventario'),
      'status_changed': () => this.toastService.requestToast(event, 'Se ha actualizado el estado de una solicitud de inventario'),
      'approved': () => this.toastService.requestToast(event, 'Se ha aprobado una solicitud de inventario'),
      'updated': () => this.toastService.requestToast(event, 'Se ha actualizado una solicitud de inventario')
    }

    requestTypes[eventType]();
  }
}
