import { ModalComponent } from '@/shared/components/modal/modal.component';
import { NotificationComponent } from '@/shared/components/notification/notification.component';
import { NotificationService } from '@/shared/services/notification.service';
import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, Renderer2, signal, viewChild } from '@angular/core';

@Component({
  selector: 'dot-notification-container',
  imports: [
    ModalComponent,
    NotificationComponent
  ],
  templateUrl: './notification-container.component.html',
  styleUrl: './notification-container.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationContainerComponent {

  protected notificationService = inject(NotificationService);
  private renderer = inject(Renderer2);

  protected newNotifications = computed(() => this.notificationService.newNotifications());
  protected totalNewNotifications = computed(() => this.notificationService.totalNewNotifications());
  protected notifications = computed(() => this.notificationService.notifications());
  protected isLoadingMore = computed(() => this.notificationService.moreLoading());

  protected mode = signal<'all' | 'unread'>('unread');

  private notReadButton = viewChild<ElementRef<HTMLButtonElement>>('notReadButton');
  private allButton = viewChild<ElementRef<HTMLButtonElement>>('allButton');

  private readonly THRESHOLD = 100;

  private alreadyFetchedInitial = signal<boolean>(false);
  private alreadyFetchedInitialAll = signal<boolean>(false);

  constructor() {}

  protected async loadMore(event: Event) {
    const target = event.target as HTMLElement;

    if (!target) return;

    if (target.scrollTop + target.clientHeight >= target.scrollHeight - this.THRESHOLD) {
      await this.notificationService.getNotifications(this.mode());
    }
  }

  protected toggleMode(mode: 'all' | 'unread') {
    this.mode.set(mode);

    if (mode === 'all') this.initialAllFetch();

    this.allButton()!.nativeElement.disabled = true;
    this.notReadButton()!.nativeElement.disabled = true;

    const mainContainer = document.querySelector('.notifications-container') as HTMLElement;
    const newNotificationsContainer = document.querySelector('.new-notifications') as HTMLElement;
    const allNotificationsContainer = document.querySelector('.all-notifications') as HTMLElement;

    if (mode === 'all') {
      this.renderer.addClass(newNotificationsContainer, 'unshow');

      this.renderer.addClass(allNotificationsContainer, 'show');
      mainContainer.scrollTo(mainContainer.scrollWidth, 0);

      setTimeout(() => {
        this.allButton()!.nativeElement.disabled = false;
        this.notReadButton()!.nativeElement.disabled = false;
      }, 400);

    } else {
      this.renderer.removeClass(allNotificationsContainer, 'show');

      this.renderer.removeClass(newNotificationsContainer, 'unshow');
      mainContainer.scrollLeft = 0;

      setTimeout(() => {
        this.allButton()!.nativeElement.disabled = false;
        this.notReadButton()!.nativeElement.disabled = false;
      }, 400);
    }
  }

  protected fetchNotifications() {
    if (this.alreadyFetchedInitial()) return;
    this.alreadyFetchedInitial.set(true);
    this.notificationService.getNotifications('unread');
  }

  protected initialAllFetch() {
    if (this.alreadyFetchedInitialAll()) return;
    this.alreadyFetchedInitialAll.set(true);
    this.notificationService.getNotifications('all');
  }

  protected markAllAsRead() {
    this.notificationService.markNotification('all');
  }
}
