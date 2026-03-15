import { computed, inject, Injectable, signal, TemplateRef } from '@angular/core';
import { StreamEvent } from './notification.service';
import { NavigateService } from './navigate.service';

export type Toast = {
  id: string;
  title?: string;
  text?: string;
  type?: 'success' | 'danger' | 'caution' | 'info';
  position?: 'top-left' | 'top-right' | 'top-center' | 'bottom-left' | 'bottom-right' | 'bottom-center';
  icon?: string;
  templateRef?: TemplateRef<any>;
  duration?: number;
  method?: Function;
  buttonText?: string;
  persistent?: boolean;
  zIndex: number;
}

@Injectable({
  providedIn: 'root'
})

export class ToastService {
  private navigateService = inject(NavigateService);

  private toasts = signal<Toast[]>([]);

  public listToasts = computed<Toast[]>(() => {
    return this.toasts().sort((a, b) => { return a.zIndex + b.zIndex });
  })

  constructor() { }

  public show(toast: Omit<Toast, 'id' | 'zIndex'>): void {
    const shouldStop = this.debounceToast(500);

    if (shouldStop) {
      return;
    }

    const id = `${Date.now()}-${crypto.randomUUID()}`;
    const duration = toast.duration ?? (toast.persistent ? undefined : 5000);

    const zIndex = 2000 - this.toasts().length;

    const newToast: Toast = {
      id,
      duration,
      zIndex,
      ...toast
    }

    this.toasts.update(toasts => [...toasts, newToast]);
  }

  public clearAll(): void {
    this.toasts.set([]);
  }

  public clearToast(id: string): void {
    this.toasts.set(this.toasts().filter(toast => toast.id !== id));
  }

  private debounceToast(ms: number):boolean {
    const recentToast = this.toasts().find(t => {
      Date.now() - parseInt(t.id.split('-')[0]) < ms;
    })

    if (recentToast) {
      return true;
    }

    return false;
  }

  public containerPosition(position: Toast['position']): void {
    const toastContainer = document.querySelector('.dot-toast-container');

    if (toastContainer) {
      switch (position) {
        case 'top-left': toastContainer.classList.add('top-left'); break;
        case 'top-right': toastContainer.classList.add('top-right'); break;
        case 'top-center': toastContainer.classList.add('top-center'); break;
        case 'bottom-left': toastContainer.classList.add('bottom-left'); break;
        case 'bottom-right': toastContainer.classList.add('bottom-right'); break;
        case 'bottom-center': toastContainer.classList.add('bottom-center'); break;
      }
    }
  }

  ///////////////////////
  ///// TOAST TYPES /////
  ///////////////////////

  public success(
    toastMessage?: Toast['text'],
    toastTitle?: Toast['title'], 
    method?: Toast['method'],
    buttonText?: Toast['buttonText'],
    icon?: Toast['icon']
  ): void {
    this.show({
      title: toastTitle,
      text: toastMessage,
      type: 'success',
      method,
      buttonText,
      icon: icon ?? 'fa-solid fa-check'
    })
  }

  public error(
    toastMessage?: Toast['text'],
    toastTitle?: Toast['title'], 
    method?: Toast['method'],
    buttonText?: Toast['buttonText'],
    icon?: Toast['icon']
  ): void {
    this.show({
      title: toastTitle,
      text: toastMessage,
      type: 'danger',
      method,
      buttonText,
      icon: icon ?? 'fa-solid fa-xmark'
    });
  }

  public caution(
    toastMessage?: Toast['text'],
    toastTitle?: Toast['title'], 
    method?: Toast['method'],
    buttonText?: Toast['buttonText'],
    icon?: Toast['icon']
  ): void {
    this.show({
      title: toastTitle,
      text: toastMessage,
      type: 'caution',
      method,
      buttonText,
      icon: icon ?? 'fa-solid fa-triangle-exclamation'
    });
  }

  public info(
    toastMessage?: Toast['text'],
    toastTitle?: Toast['title'], 
    method?: Toast['method'],
    buttonText?: Toast['buttonText'],
    icon?: Toast['icon']
  ): void {
    this.show({
      title: toastTitle,
      text: toastMessage,
      type: 'info',
      method,
      buttonText,
      icon: icon ?? 'fa-solid fa-info'
    });
  }

  public requestToast(event: StreamEvent, toastTitle?: Toast['title'], toastMessage?: Toast['text']): void {
    this.show({
      title: toastTitle ?? `Se ha creado una solicitud de inventario`,
      text: toastMessage ?? `${event.payload.message}`,
      method: () => this.navigateService.push('solicitud-form', {id: event.payload.requestId!}),
      buttonText: 'Ver solicitud'
    });
  }

}
