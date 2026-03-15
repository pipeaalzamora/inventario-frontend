import { InputDirective } from '@/shared/directives/input.directive';
import { LoadingDirective } from '@/shared/directives/loading.directive';
import { NavigateService } from '@/shared/services/navigate.service';
import { ChangeDetectionStrategy, Component, effect, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { RouterLink } from '@angular/router';
import { AuthService } from '@auth/services/auth.service';
import { LoginWrapperComponent } from '@auth/components/login-wrapper/login-wrapper.component';

@Component({
  selector: 'dot-login',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    InputDirective,
    LoadingDirective,
    RouterLink,
    LoginWrapperComponent
],
  templateUrl: './login.component.html',
  styleUrl: './login.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Login {
  private fb = inject(FormBuilder);
  private navigateService = inject(NavigateService);
  private authService = inject(AuthService);

  protected showPassword = signal(false);

  protected passwordInput = viewChild<ElementRef<HTMLInputElement>>('passwordInput');
  protected emailLabel = viewChild<ElementRef<HTMLLabelElement>>('emailLabel');

  protected loginForm = this.fb.group({
    userEmail: ['', [Validators.required]],
    password: ['', [Validators.required]]
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
      const emailLabel = this.emailLabel()?.nativeElement;
      if (emailLabel) {
        const input = emailLabel.querySelector('input');
        if (input) {
          input.focus();
        }
      }
    })

    effect(() => {
      if (this.authService.isAuthenticated()) return this.navigateService.push('/');
    })
  }
  
  protected async login() {
    this.loginForm.markAllAsTouched();
    if (this.loginForm.invalid) return;

    const res = await this.authService.login(
      this.loginForm
    )

    if( res ){
      const urlBeforeLogin = this.authService.getBeforeRedirect();

      if( typeof urlBeforeLogin != 'undefined' && urlBeforeLogin != null ) {
        this.navigateService.push( urlBeforeLogin );
      } else {
        this.navigateService.push('/');
      }
    }
  }

}
