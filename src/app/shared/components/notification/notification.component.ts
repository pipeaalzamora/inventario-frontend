import { HumanDateShortPipe } from '@/shared/pipes/human-date-short.pipe';
import { LayoutService } from '@/shared/services/layout.service';
import { NotificationService, StreamEvent } from '@/shared/services/notification.service';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'dot-notification',
  imports: [
    HumanDateShortPipe,
    MatTooltipModule
  ],
  templateUrl: './notification.component.html',
  styleUrl: './notification.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationComponent {
  private notificationService = inject(NotificationService);
  protected layoutService = inject(LayoutService);

  notification = input.required<StreamEvent>();

  protected markAsRead() {
    this.notificationService.markNotification([this.notification().id]);
  }

  protected markAsUnread() {
    this.notificationService.markNotification([this.notification().id], false);
  }
}
