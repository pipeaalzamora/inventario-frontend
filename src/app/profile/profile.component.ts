import { LinkDirective } from '@/shared/directives/link.directive';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'dot-profile',
  imports: [
    LinkDirective,
    RouterOutlet
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileComponent {

}
