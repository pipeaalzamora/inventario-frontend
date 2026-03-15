import { ToggleThemeComponent } from '@/shared/components/toggle-theme/toggle-theme.component';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LogoComponent } from 'public/logo';

@Component({
  selector: 'dot-login-wrapper',
  imports: [
    LogoComponent,
    ToggleThemeComponent,
    RouterLink,
  ],
  templateUrl: './login-wrapper.component.html',
  styleUrl: './login-wrapper.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginWrapperComponent {

}
