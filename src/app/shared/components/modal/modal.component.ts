import { ErrorService } from '@/shared/services/error.service';
import { LayoutService } from '@/shared/services/layout.service';
import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, HostListener, inject, input, output, Renderer2, signal, TemplateRef, viewChild, viewChildren } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { tap } from 'rxjs';

type ModalParams = {
  okParams: any;
  anotherParams: any;
};

@Component({
  selector: 'dot-modal',
  imports: [
    NgTemplateOutlet
  ],
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModalComponent {
  private router = inject(Router);
  private renderer = inject(Renderer2);
  private layoutService = inject(LayoutService);
  private errorService = inject(ErrorService);
  private destroyRef = inject(DestroyRef);

  isLateral = input<boolean>(false);
  tittleText = input<string>('Atención');
  okText = input<string>('Ok');
  cancelText = input<string>('Cancelar');
  withCancel = input<boolean>(false);
  showCancelInSteps = input<boolean[]>([]);
  footerRef = input<TemplateRef<any>>();
  headerRef = input<TemplateRef<any>>();
  noFooter = input<boolean>(false);
  bodyWithScroll = input<boolean>(false);
  // New dynamic step system
  steps = input<TemplateRef<any>[]>([]);
  canLeaveStep = input<boolean[]>([]);
  stepButtonTexts = input<string[]>(['Siguiente', 'Aplicar']);
  // Legacy support for simple modals
  disabledIf = input<boolean>(false);
  cancelDefaultSecondBody = input<boolean>(false);
  modalType = input<'default' | 'success' | 'caution' | 'danger'>('default');
  longModal = input<boolean>(false);

  callback = output<any | void>();
  cancelCallback = output<any | void>();
  onClose = output();
  onOpen = output();
  scrolling = output<Event>();

  protected isOpen = signal(false);
  protected isMobile = computed(() => this.layoutService.isMobile());
  protected disabledOkButton = signal(false);
  protected disabledCancelButton = signal(false);
  protected currentStep = signal<number>(0);
  protected finalStep = computed<number>(() => {
    return this.steps().length; // Returns 0 if no steps, or the count of additional steps
  });
  protected isOnFinalStep = computed(() => this.currentStep() === this.finalStep());
  protected shouldDisableOk = computed(() => {
    const step = this.currentStep();
    const stepsArray = this.steps();
    const canLeaveArray = this.canLeaveStep();

    if (this.disabledOkButton()) return true;

    // For multi-step modals, check if we can leave the current step
    if (stepsArray.length > 0) {
      const canLeave = canLeaveArray[step] ?? true;
      return !canLeave;
    }

    // For simple modals (no steps), use legacy disabledIf
    return this.disabledIf();
  });
  protected shouldShowCancel = computed(() => {
    const step = this.currentStep();
    const stepsArray = this.steps();
    const showCancelArray = this.showCancelInSteps();

    // For simple modals (no steps), use withCancel
    if (stepsArray.length === 0) {
      return this.withCancel();
    }

    // For multi-step modals, check if cancel should show in current step
    // If showCancelInSteps[step] is defined, use it; otherwise fall back to withCancel
    const showInStep = showCancelArray[step];
    return showInStep !== undefined ? showInStep : this.withCancel();
  });
  protected okTextComputed = computed(() => {
    const stepsArray = this.steps();
    const step = this.currentStep();
    const buttonTexts = this.stepButtonTexts();

    // Multi-step modal: use array-based button texts
    if (stepsArray.length > 0) {
      return buttonTexts[step] ?? (step === stepsArray.length ? 'Aplicar' : 'Siguiente');
    }

    // Simple modal: use okText
    return this.okText();
  });

  private modalBackdrop = viewChild<ElementRef<HTMLDivElement>>('modalBackdrop');
  private modal = viewChild<ElementRef<HTMLDivElement>>('modal');
  private modalBody = viewChild<ElementRef<HTMLDivElement>>('modalPrimaryBody');
  private stepBodies = viewChildren<ElementRef<HTMLDivElement>>('stepBody');

  private params: ModalParams = {
    okParams: undefined,
    anotherParams: undefined
  };

  private isComponentDestroyed: boolean = false;

  protected clickDown?: HTMLElement; 

  constructor() {
    this.router.events.pipe(
      tap(() => {
        this.closeModal();
      }),
      takeUntilDestroyed()
    ).subscribe();

    this.destroyRef.onDestroy(() => {
      this.isComponentDestroyed = true;
    });
  }

  @HostListener('document:keydown', ['$event']) 
  onKeydownHandler(event: KeyboardEvent) {
    if(event.key === 'Escape' && this.isOpen()) this.closeModal();
    else if (event.key === 'Enter' && this.isOpen()) this.successModal();
    else return;

    event.preventDefault();
  }

  public openModal<T = any, K = any>(okParams?: T, cancelParams?: K)  {
    if (this.isOpen()) return;

    (document.activeElement as HTMLElement)?.blur();

    this.layoutService.openModal();

    const modalBackdropEl = this.modalBackdrop()?.nativeElement;
    const modalEl = this.modal()?.nativeElement;

    if (!modalBackdropEl || !modalEl) return;

    this.renderer.appendChild(document.body, modalBackdropEl);

    const modalParams: ModalParams = {
      okParams: okParams,
      anotherParams: cancelParams
    };
    
    this.params = modalParams as ModalParams;

    this.popAnimationModal(modalEl, modalBackdropEl);
  }

  public closeModal() {
    if (!this.isOpen()) return;

    const modalBackdropEl = this.modalBackdrop()?.nativeElement;
    const modalEl = this.modal()?.nativeElement;

    if (!modalEl || !modalBackdropEl) return;

    this.closeAnimationModal(modalEl, modalBackdropEl);
  }

  protected handleDown(event: MouseEvent) {
    event.stopPropagation();
    event.stopImmediatePropagation();

    this.clickDown = event.target as HTMLElement;
  }

  protected handleUp(event: MouseEvent) {
    event.stopPropagation();
    event.stopImmediatePropagation();

    if (event.button !== 0) return;

    const target = event.target as HTMLElement;

    if (this.clickDown === this.modal()?.nativeElement) return;

    if (target === this.clickDown && target === this.modalBackdrop()?.nativeElement) this.closeModal();
  }

  protected successModal() {
    const stepsArray = this.steps();
    const step = this.currentStep();
    const canLeaveArray = this.canLeaveStep();

    // Multi-step modal logic
    if (stepsArray.length > 0 && !this.cancelDefaultSecondBody()) {
      const canLeave = canLeaveArray[step] ?? true;
      
      // Cannot proceed if current step validation fails
      if (!canLeave) return;
      
      // If not on final step, advance to next step
      if (step < stepsArray.length) {
        this.goToStep(step + 1);
        return;
      }
    }

    // Emit callback on final step or simple modal
    if (typeof this.params.okParams != 'undefined')
      this.callback.emit(this.params.okParams);
    else
      this.callback.emit('');
  }

  public canNavigateToStep(targetStep: number): boolean {
    const stepsArray = this.steps();
    const currentStep = this.currentStep();
    const canLeaveArray = this.canLeaveStep();

    // Cannot navigate to non-existent step
    if (targetStep < 0 || targetStep > stepsArray.length) return false;

    // Always allow navigating backward
    if (targetStep < currentStep) return true;

    // For forward navigation, check if we can leave all intermediate steps
    for (let i = currentStep; i < targetStep; i++) {
      const canLeave = canLeaveArray[i] ?? true;
      if (!canLeave) return false;
    }

    return true;
  }

  protected handleCancel() {
    if(typeof this.params.anotherParams != "undefined")
      this.cancelCallback.emit( this.params.anotherParams );
    else
      this.cancelCallback.emit('');
  }

  public disableButton(type: 'ok' | 'cancel'): void {
    if (type === 'ok') {
      this.disabledOkButton.set(true);
    } else if (type === 'cancel') {
      this.disabledCancelButton.set(true);
    }
  }

  public enableButton(type: 'ok' | 'cancel'): void {
    if (type === 'ok') {
      this.disabledOkButton.set(false);
    } else if (type === 'cancel') {
      this.disabledCancelButton.set(false);
    }
  }

  public toggleButton(type: 'ok' | 'cancel'): void {
    if (type === 'ok') {
      this.disabledOkButton.update(state => !state);
    } else if (type === 'cancel') {
      this.disabledCancelButton.update(state => !state);
    }
  }

  onScroll($event: Event) {
    this.scrolling.emit($event);
  }

  public goToStep(step: number) {
    // Validate navigation is allowed
    if (!this.canNavigateToStep(step)) return;

    const mainBody = this.modalBody()?.nativeElement;
    const stepBodiesArray = this.stepBodies();

    if (!mainBody) return;

    // Reset all bodies: hide main body and all step bodies
    this.renderer.removeClass(mainBody, 'hide');
    stepBodiesArray.forEach((bodyRef: ElementRef<HTMLDivElement>) => {
      this.renderer.removeClass(bodyRef.nativeElement, 'show');
    });

    // Show the requested step
    if (step === 0) {
      // Step 0 is the main body (ng-content), already visible
      this.currentStep.set(step);
      return;
    }

    // For steps 1+, hide main body and show corresponding step body
    const stepBodyIndex = step - 1; // Array is 0-indexed, steps are 1-indexed
    const targetStepBody = stepBodiesArray[stepBodyIndex];
    
    if (targetStepBody) {
      this.renderer.addClass(mainBody, 'hide');
      this.renderer.addClass(targetStepBody.nativeElement, 'show');
      this.currentStep.set(step);
    }
  }

  private popAnimationModal(modal: HTMLDivElement, backdrop: HTMLDivElement): void {
    const isLateral = this.isLateral() && !this.isMobile();

    backdrop.animate(
      [
        { opacity: '0', visibility: 'visible', pointerEvents: 'none' },
        { opacity: '1', visibility: 'visible', pointerEvents: 'auto' }
      ],
      {
        duration: 220,
        easing: 'ease-in-out',
        fill: 'forwards'
      }
    );

    const animationModal = modal.animate(
      [
        { 
          transform: isLateral ? 'translateX(0)' : 'translateY(2rem) scale(0.97)', 
          opacity: '0' 
        },
        { 
          transform: isLateral ? 'translateX(-41rem)' : 'translateY(0) scale(1)', 
          opacity: '1' 
        }
      ],
      {
        duration: 220,
        easing: 'ease-in-out',
        fill: 'forwards'
      }
    );

    animationModal.finished.then(() => {
      if (this.isComponentDestroyed) return;
      this.isOpen.set(true);
      this.onOpen.emit();
    }).catch(() => {
      if (this.isComponentDestroyed) return;
      this.isOpen.set(true);
      this.onOpen.emit();
    });
  }

  private closeAnimationModal(modal: HTMLDivElement, backdrop: HTMLDivElement): void {
    const isLateral = this.isLateral() && !this.isMobile();
    
    backdrop.animate(
      [
        { opacity: '1', visibility: 'visible', pointerEvents: 'auto' },
        { opacity: '0', visibility: 'hidden', pointerEvents: 'none' }
      ],
      {
        duration: 220,
        easing: 'ease-in-out',
        fill: 'forwards'
      }
    );
    
    const animation = modal.animate(
      [
        {
          transform: isLateral ? 'translateX(-41rem)' : 'translateY(0) scale(1)',
          opacity: '1'
        },
        {
          transform: isLateral ? 'translateX(0)' : 'translateY(2rem) scale(0.97)',
          opacity: '0'
        }
      ],
      {
        duration: 220,
        easing: 'ease-in-out',
        fill: 'forwards'
      }
    );

    animation.finished.then(() => {
      if (this.isComponentDestroyed) {
        this.layoutService.closeModal();
        return;
      };
      this.isOpen.set(false);
      this.layoutService.closeModal();
      this.errorService.clearSignalErrors();
      this.disabledOkButton.set(false);
      this.disabledCancelButton.set(false);
      this.goToStep(0);
      this.onClose.emit();

      this.renderer.removeChild(document.body, backdrop);
    }).catch(() => {
      if (this.isComponentDestroyed) {
        this.layoutService.closeModal();
        return;
      };
      this.isOpen.set(false);
      this.layoutService.closeModal();
      this.errorService.clearSignalErrors();
      this.disabledOkButton.set(false);
      this.disabledCancelButton.set(false);
      this.goToStep(0);
      this.onClose.emit();

      this.renderer.removeChild(document.body, backdrop);
    });
  }
}
