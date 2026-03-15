import { Component, ChangeDetectionStrategy, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '@/auth/services/auth.service';

@Component({
  selector: 'dot-welcome',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './welcome.component.html',
  styleUrl: './welcome.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WelcomeComponent {
  private authService = inject(AuthService);

  protected userName = this.authService.userAccount()?.userName;
  protected currentHour = signal<number>(new Date().getHours());
  protected greeting = computed(() => {
    const hour = this.currentHour();
    if (hour >= 5 && hour < 12) return 'Buenos días';
    if (hour >= 12 && hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  });
}
