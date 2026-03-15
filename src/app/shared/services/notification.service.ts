import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { environment } from '@env/environment';
import { BehaviorSubject } from 'rxjs';
import { MetaData } from '@shared/models/apiResponse';
import { AuthService } from '@/auth/services/auth.service';

export type PayloadEvent = {
  event: EventType;
  message: string;
  requestId?: string;
  timestamp: Date;
}

export type StreamEvent = {
  id: string;
  from: string | null;
  to: string | null;
  readAt: Date | null;
  sendAt: Date;
  notificationType: NotificationType;
  payload: PayloadEvent;
}

export type NotificationType = "inventory_request";
export type EventType = "created" | "updated" | "approved" | "status_changed";

export type HistoricalNotifications = {
  items: StreamEvent[];
  metadata: MetaData;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  private abortController?: AbortController;
  private reader?: ReadableStreamDefaultReader;

  private authService = inject(AuthService);

  public connectionStatus = signal<'disconnected' | 'connecting' | 'connected' | 'error' | 'loading'>('disconnected');
  public isLoading = computed(() => this.connectionStatus() === 'loading');

  public moreLoading = signal<boolean>(false);
  
  private eventsMap = signal<Map<string, StreamEvent>>(new Map());
  
  public events = computed(() => Array.from(this.eventsMap().values()));

  public newNotifications = computed(() => {
    return this.events().filter(n => !n.readAt);
  });

  public notifications = computed(() => {
    return this.events().sort((a, b) => {
      const aDate = new Date(a.sendAt).getTime();
      const bDate = new Date(b.sendAt).getTime();
      return bDate - aDate;
    });
  });

  public totalNotifications = signal<number>(0);
  public totalNewNotifications = signal<number>(0);
  public lastEvent = new BehaviorSubject<StreamEvent | null>(null);

  private hasMoreTotal = signal<boolean>(true);
  private hasMoreUnread = signal<boolean>(true);
  private pageTotal = signal<number>(1);
  private pageUnread = signal<number>(1);

  private isMarkingRead = false;

  constructor() {
    effect(() => {
      if (this.authService.isAuthenticated()) {
        this.init();
        this.getTotalNewNotifications();
      }
    })
  }

  public async init(): Promise<void> {
    try {
      this.connectionStatus.set('loading');
      await this.connect();
    } catch (error) {
      this.connectionStatus.set('error');
      console.error('Error inicializando servicio:', error);
    } finally {
      this.connectionStatus.set('disconnected');
    }
  }

  private async connect(): Promise<void> {
    if (!this.authService.isAuthenticated()) return;

    this.disconnect();
    
    this.connectionStatus.set('connecting');
    this.abortController = new AbortController();

    try {
      const response = await fetch(`${environment.api}/notifications/subscribe`, {
        method: 'GET',
        keepalive: true,
        cache: 'no-cache',
        headers: {
          ...this.authService.getHeaderToken()
        },
        signal: this.abortController.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No body in response');
      }

      this.connectionStatus.set('connected');
      this.reader = response.body.getReader();
      
      await this.processStream();

    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error en streaming:', error);
        this.connectionStatus.set('error');
        
        setTimeout(() => {
          if (this.connectionStatus() === 'error' && this.authService.isAuthenticated()) {
            this.init();
          }
        }, 5000);
      }
    }
  }

  private async processStream(): Promise<void> {
    if (!this.reader) return;

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await this.reader.read();
        
        if (done) {
          if (this.connectionStatus() === 'connected') {
            this.connectionStatus.set('error');
            setTimeout(() => this.init(), 2000);
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          this.processSSELine(line);
        }
      }
    } catch (error) {
      console.error('Error procesando stream:', error);
      this.connectionStatus.set('error');
    }
  }

  private processSSELine(line: string): void {
    
    line = line.trim();
    
    if (line === '' || line === "data: ping" || line === "data:") {
      return;
    }

    if (line.startsWith('data:')) {
      const data = line.substring(5);
      const event = this.parseEventData(data);
      
      this.addEvent(event);
      this.lastEvent.next(event);
    }
  }

  public disconnect(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
    
    if (this.reader) {
      this.reader.cancel();
      this.reader = undefined;
    }
    
    this.connectionStatus.set('disconnected');
  }

  public clearEvents(): void {
    this.eventsMap.set(new Map());
    this.lastEvent.next(null);
    this.totalNotifications.set(0);
    this.pageTotal.set(1);
    this.pageUnread.set(1);
    this.hasMoreTotal.set(true);
    this.hasMoreUnread.set(true);
  }

  public async getNotifications(mode: 'all' | 'unread' = 'all'): Promise<void> {
    if (this.moreLoading()) return;

    if (mode === 'all' && !this.hasMoreTotal()) return;
    else if (mode === 'unread' && !this.hasMoreUnread()) return;

    try {
      this.moreLoading.set(true);

      const page = mode === 'all' ? this.pageTotal() : this.pageUnread();

      const response = await this.authService.authenticatedRequest<HistoricalNotifications>(
        `notifications?page=${page}&size=30${ mode === 'unread' ? '&filter={\"wasRead\": false}' : ''}`,
        'GET',
        undefined,
        undefined,
        undefined,
        { skipLoading: true }
      );

      if (!response.success || !response.data) {
        return;
      }

      const currentMap = this.eventsMap();

      response.data?.items.forEach(notification => {
        if (!currentMap.has(notification.id)) {
          currentMap.set(notification.id, notification);
        }
      });

      this.eventsMap.set(new Map(currentMap));

      this.totalNotifications.set(response.data?.metadata.total);
      
      if ( mode === 'all') {

        this.pageTotal.set(page + 1);

        if (!response.data.metadata.hasNextPage) this.hasMoreTotal.set(false);

      } else if ( mode === 'unread') {

        this.pageUnread.set(page + 1);

        if (!response.data.metadata.hasNextPage) this.hasMoreUnread.set(false);
      }
      
    } catch (error) {
      console.error('Error cargando eventos históricos:', error);
      this.eventsMap.set(new Map());

    } finally {
      this.moreLoading.set(false);
    }
  }

  private async getTotalNewNotifications(): Promise<void> {
    try {
      const response = await this.authService.authenticatedRequest<HistoricalNotifications>(
        `notifications?page=1&size=1&filter={\"wasRead\": false}`
      );

      if (!response.success || !response.data) {
        return;
      }

      this.totalNewNotifications.set(response.data?.metadata.total || 0);
    } catch (error) {
      console.error('Error cargando notificaciones iniciales:', error);
    }
  }

  public async markNotification(ids: string[] | 'all', isRead: boolean = true): Promise<void> {
    if (this.isMarkingRead) return;
    
    try {
      this.isMarkingRead = true;

      const idsToMark = Array.isArray(ids) ? ids : this.events().filter(n => !n.readAt).map(n => n.id);

      if (idsToMark.length === 0) return;

      const payload = {
        notificationIds: idsToMark,
        wasRead: isRead
      }

      const response = await this.authService.authenticatedRequest<HistoricalNotifications>(
        `notifications/mark-as-read`,
        'POST',
        payload
      );

      if (!response.success) {
        return;
      }

      if (ids === 'all') this.getTotalNewNotifications();
      this.updateLocalNotificationsAsRead(idsToMark, isRead);
      
    } catch (error) {
      console.error('Error marcando notificaciones como leídas:', error);

    } finally {
      this.isMarkingRead = false;
    }
  }

  private updateLocalNotificationsAsRead(ids: string[], isRead: boolean): void {
    
    const currentMap = this.eventsMap();

    if (isRead) {
      this.totalNewNotifications.update(total => total - 1);
    } else {
      this.totalNewNotifications.update(total => total + 1);
    }
    
    ids.forEach(id => {
      const notification = currentMap.get(id);
      
      if (notification) {
        
        const updatedNotification: StreamEvent = {
          ...notification,
          readAt: isRead ? new Date() : null
        };

        currentMap.set(id, updatedNotification);
      }
    });
    
    this.eventsMap.set(new Map(currentMap));
  }

  private parseEventData(data: string): StreamEvent {
    return JSON.parse(data);
  }

  private addEvent(event: StreamEvent): void {
    const currentMap = this.eventsMap();
    
    if (!currentMap.has(event.id)) {
      const newMap = new Map(currentMap);
      newMap.set(event.id, event);
      this.eventsMap.set(newMap);
      
      this.totalNotifications.update(total => total + 1);
      this.totalNewNotifications.update(total => total + 1);
    }
  }
}