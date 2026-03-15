import { InputDirective } from '@/shared/directives/input.directive';
import { LoadingDirective } from '@/shared/directives/loading.directive';
import { AfterViewInit, ChangeDetectionStrategy, Component, effect, ElementRef, inject, Renderer2, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@auth/services/auth.service';
import { OfuscatePipe } from '@/shared/pipes/ofuscate.pipe';
import { ToastService } from '@/shared/services/toast.service';
import { ToggleThemeComponent } from '@/shared/components/toggle-theme/toggle-theme.component';
import { LoginWrapperComponent } from '@auth/components/login-wrapper/login-wrapper.component';

@Component({
  selector: 'dot-recovery',
  imports: [
    LoadingDirective,
    InputDirective,
    ReactiveFormsModule,
    RouterLink,
    OfuscatePipe,
    LoginWrapperComponent
  ],
  templateUrl: './recovery.component.html',
  styleUrl: './recovery.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Recovery implements AfterViewInit {

  private fb = inject(FormBuilder);
  private renderer = inject(Renderer2);
  private authService = inject(AuthService);
  private router = inject(Router);
  protected toastService = inject(ToastService);

  private emailCard = viewChild<ElementRef<HTMLDivElement>>('emailCard');
  private recoveryCard = viewChild<ElementRef<HTMLDivElement>>('recoveryCard');
  private scrollContainer = viewChild<ElementRef<HTMLDivElement>>('scrollContainer');

  protected timeLeft = signal(0);

  protected year = new Date().getFullYear();

  protected recoveryForm = this.fb.group({
    userEmail: ['', [ Validators.required, Validators.email ]],
  });

  protected codeForm = this.fb.group({
    // code: ['', [ Validators.required, Validators.pattern(/^.{10}$/) ]],
    code: ['', [ Validators.required, Validators.pattern(/^.{9}$/) ]],
  });

  constructor() {

    effect(() => {
      const emailCard = this.emailCard()?.nativeElement;

      if (emailCard) {
        emailCard.querySelector('input')?.focus();
      }
    })
  }

  ngAfterViewInit(): void {
    const recoveryData = this.authService.getRecoveryData();

    if (recoveryData) {
      if ( !recoveryData.email || typeof recoveryData.email != 'string' || recoveryData.email.length == 0 ) return;

      this.recoveryForm.get('userEmail')?.setValue(recoveryData.email!);
      
      this.setInitialTime(recoveryData.shouldComplete!);

      if (recoveryData.modePage === 'verify') {
        this.handleMode('verify');
      }
    }
  }

  protected async sendRecoveryEmail() {
    this.recoveryForm.markAllAsTouched();
    if (this.recoveryForm.invalid) return;

    const res = await this.authService.getRecoveryPassword(this.recoveryForm);

    if (res && res instanceof Date) {
      this.authService.setRecoveryData({ email: this.recoveryForm.get('userEmail')?.value!, shouldComplete: res, modePage: 'verify' });

      this.setInitialTime(res);

      this.handleMode('verify');
    }
  }

  protected handleMode(mode: 'verify' | 'recover') {
    const emailCard = this.emailCard()?.nativeElement;
    const recoveryCard = this.recoveryCard()?.nativeElement;

    if (!emailCard || !recoveryCard) return;

    if (mode === 'verify') {

      this.scrollContainer()!.nativeElement.scrollTo(recoveryCard.offsetWidth, 0);

      this.renderer.addClass(recoveryCard, 'show');
      this.renderer.addClass(emailCard, 'hidden');

      setTimeout(() => {
        this.recoveryCard()?.nativeElement.querySelector('input')?.focus();
      }, 380);

    } else {
      this.renderer.removeClass(recoveryCard, 'show');
      this.renderer.removeClass(emailCard, 'hidden');

      this.scrollContainer()!.nativeElement.scrollTo(0, 0);

      setTimeout(() => {
        this.emailCard()?.nativeElement.querySelector('input')?.focus();
      }, 380);
    }
  }

  protected async verifyCode() {
    this.codeForm.markAllAsTouched();
    if (this.codeForm.invalid) return;

    const res = await this.authService.verifyCode(this.recoveryForm.get('userEmail')?.value!, this.codeForm.get('code')?.value!);

    if (res && res instanceof Date) {
      this.authService.setRecoveryData({ email: this.recoveryForm.get('userEmail')?.value!, shouldComplete: null, modePage: 'recovery' });

      this.router.navigate(['/change-password']);
    }
  }

  private setInitialTime(date: Date) {

    const time = this.dateToSecondsLeft(date);
    
    this.timeLeft.set(time);

    this.startTimer();
  }

  private startTimer() {

    const interval = setInterval(() => {
      if (this.timeLeft() > 0) {
        this.timeLeft.update((time) => time - 1);
      } else {
        this.onTimerComplete();
        clearInterval(interval);
      }
    }, 1000);
  }

  private onTimerComplete() {
    this.authService.setRecoveryData({ email: undefined, shouldComplete: null, modePage: undefined });
    this.timeLeft.set(0);
  }

  private dateToSecondsLeft(date: Date): number {

    const now = new Date().getTime();
    const future = new Date(date).getTime();

    const diff = future - now;
    const secondsDiff = Math.floor(diff / 1000);

    return secondsDiff;
  }
}
