import { InputDirective } from '@/shared/directives/input.directive';
import { LoadingDirective } from '@/shared/directives/loading.directive';
import { ChangeDetectionStrategy, Component, effect, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@auth/services/auth.service';
import { UserAccount } from '@/auth/models/auth';
import { ToastService } from '@/shared/services/toast.service';
import appData from 'public/config';
import { LoginWrapperComponent } from '@auth/components/login-wrapper/login-wrapper.component';

@Component({
  selector: 'dot-change-password',
  imports: [
    ReactiveFormsModule,
    InputDirective,
    LoadingDirective,
    LoginWrapperComponent
],
  templateUrl: './change-password.component.html',
  styleUrl: './change-password.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChangePassword {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);

  protected showPassword = signal(false);
  protected showNewPassword = signal(false);

  protected appData = appData;

  protected email = signal<string | null>(null);
  private isLoggedIn: boolean;

  protected passwordInput = viewChild<ElementRef<HTMLInputElement>>('passwordInput');
  protected confirmPasswordInput = viewChild<ElementRef<HTMLInputElement>>('confirmPasswordInput');
  protected passLabel = viewChild<ElementRef<HTMLLabelElement>>('passLabel');

  protected userData = signal<Omit<UserAccount, 'userPassword' | 'powers'> |null>(null);

  protected newPasswordForm = this.fb.group({
    userEmail: [''],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required, Validators.minLength(8)]]
  });

  protected year = new Date().getFullYear();

  constructor() {
    effect(() => {
      const passwordInput = this.passwordInput()?.nativeElement;
      if (passwordInput) {
        passwordInput.type = this.showPassword() ? 'text' : 'password';
      }
    })

    effect(() => {
      const confirmPasswordInput = this.confirmPasswordInput()?.nativeElement;
      if (confirmPasswordInput) {
        confirmPasswordInput.type = this.showNewPassword() ? 'text' : 'password';
      }
    })

    effect(() => {
      const passLabel = this.passLabel()?.nativeElement;
      if (passLabel) {
        const input = passLabel.querySelector('input');
        if (input) {
          input.focus();
        }
      }
    })

    this.isLoggedIn = this.authService.isAuthenticated();

    if (typeof this.authService.getRecoveryData()?.email === 'string' || this.isLoggedIn) {

      this.email.set(this.authService.getRecoveryData()?.email ?? null);
  
      if (this.email()) {
        this.newPasswordForm.get('userEmail')?.setValue(this.email());
      }
      
      if (this.isLoggedIn) {
        this.userData.set(this.authService.userAccount());

        this.newPasswordForm.get('userEmail')?.setValue(this.userData()?.userEmail!);
      }
    } else {
      this.router.navigate(['/login']);
    }
  }

  protected async changePassword() {
    this.newPasswordForm.markAllAsTouched();
    if (this.newPasswordForm.invalid) return;

    const newPassword = this.newPasswordForm.value.newPassword!;
    const confirmNewPassword = this.newPasswordForm.value.confirmPassword!;

    if (newPassword !== confirmNewPassword) {
      this.toastService.show({
        title: 'Error',
        text: 'Las contraseñas no coinciden',
        icon: 'fa-solid fa-triangle-exclamation',
        type: 'danger'
      });
      return;
    }

    if (this.isLoggedIn) {
      const email = this.newPasswordForm.value.userEmail!;
      const res = await this.authService.changePassword( email, confirmNewPassword);
      
      if (res) {
        this.toastService.show({
          type: 'success',
          text: 'Contraseña actualizada con exito',
          icon: 'fa-solid fa-check'
        })

        this.clearRecoveryData();

        await this.logout();
      }

    } else {

      const res = await this.authService.changePasswordWithCode(
        this.newPasswordForm
      );

      if (res) {
        this.toastService.show({
          type: 'success',
          text: 'Contraseña actualizada con exito',
          icon: 'fa-solid fa-check'
        })

        this.clearRecoveryData();
        
        this.router.navigate(['/login']);
      }
    }
  }

  protected async logout() {
    await this.authService.logout();
  }

  private clearRecoveryData() {
    this.authService.setRecoveryData(null);
  }
}
