import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { SidebarComponent } from './sidebar/sidebar.component';
import { NavHeaderComponent } from './nav-header/nav-header.component';
import { RouterOutlet } from '@angular/router';
import { LayoutService } from '@shared/services/layout.service';

@Component({
  selector: 'dot-layout',
  imports: [
    SidebarComponent,
    NavHeaderComponent,
    RouterOutlet
  ],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LayoutComponent {
  private layoutService = inject(LayoutService);

  protected isSidebarOpen = computed(() => this.layoutService.isSidebarOpen());
  protected isMobile = computed(() => this.layoutService.isMobile());
}
