import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, viewChild } from '@angular/core';
import { UserService } from '@/system/services/user.service';
import { PaginationController, PaginationControllerCFG } from '@/shared/paginationController';
import { SorterHeaderComponent } from '@/shared/components/controller/sorter-header/sorter-header.component';
import { SearchBarComponent } from '@/shared/components/controller/search-bar/search-bar.component';
import { FilterComponent, ColumnDefinition } from '@/shared/components/controller/filter/filter.component';
import { PaginationComponent } from '@/shared/components/controller/pagination/pagination.component';
import { TableCaptionComponent } from '@/shared/components/controller/table-caption/table-caption.component';
import { DropdownComponent } from '@/shared/components/dropdown/dropdown.component';
import { LinkDirective } from '@/shared/directives/link.directive';
import { UserAccount } from '@/system/models/user';
import { Profile } from '@/system/models/profile';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '@/auth/services/auth.service';
import { LayoutService } from '@/shared/services/layout.service';
import { ModalComponent } from '@/shared/components/modal/modal.component';

const CONTROLLER_COMPONENTS = [
  SorterHeaderComponent,
  SearchBarComponent,
  FilterComponent,
  PaginationComponent,
  TableCaptionComponent,
]

@Component({
  selector: 'dot-users',
  imports: [
    DropdownComponent,
    LinkDirective,
    CONTROLLER_COMPONENTS,
    MatTooltipModule,
    ModalComponent,
  ],
  templateUrl: './users.component.html',
  styleUrl: './users.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UsersComponent {
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private layoutService = inject(LayoutService);

  protected controller = new PaginationController<UserAccount>([], <PaginationControllerCFG>{
    defaultSearchColumns: ['userName', 'userEmail', 'description', 'profiles.profileName'],
  });

  protected detailProfilesController = new PaginationController<Profile>([], <PaginationControllerCFG>{
    defaultSearchColumns: ['profileName', 'description', 'id'],
  });

  protected POWER_CAN_CREATE = this.authService.hasPower('user:create');
  protected POWER_CAN_UPDATE = this.authService.hasPower('user:update');
  protected POWER_CAN_DELETE = this.authService.hasPower('user:delete');
  protected POWER_CAN_HANDLE = this.authService.hasPower('user:update') || this.authService.hasPower('user:delete');

  protected isMobile = computed(() => this.layoutService.isMobile());

  protected selectedUser = signal<UserAccount | null>(null);

  private detailProfilesModal = viewChild<ModalComponent>('detailProfilesModal');

  protected columns: ColumnDefinition[] = [
    { nameToShow: 'Nombre', columnName: 'userName', type: 'string' },
    { nameToShow: 'Email', columnName: 'userEmail', type: 'string' },
    { nameToShow: 'Descripción', columnName: 'description', type: 'string' },
    { nameToShow: 'Disponibilidad', columnName: 'available', type: 'boolean', centerCol: true, showOnly: 'filter' },
    { nameToShow: 'Perfiles', columnName: 'profiles.profileName', type: 'array', multipleSelection: true, posibleSelections:[] },
    // { nameToShow: 'Opciones', columnName: null, type: 'entity', noSort: true, centerCol: true, showIf: this.POWER_CAN_HANDLE }
  ];

  constructor() {
    this.fetchUsers();

    effect(() => {
      const selectedUser = this.selectedUser();

      if (!selectedUser) return;

      this.detailProfilesController.SetRawData(selectedUser.profiles);
    })
  }

  private async fetchUsers(): Promise<void> {
    const response = await this.userService.getUsers();

    if (response){
      const profiles = new Set<string>();

      for (const user of response) {
        for (const profile of user.profiles) {
          profiles.add(profile.profileName);
        }
      }

      this.columns[4].posibleSelections = Array.from(profiles);

      this.controller.SetRawData(response);
    }
  }

  protected limitedProfiles(profiles: Profile[]): Profile[] {
    return profiles.slice(0, this.isMobile() ? 2 : 5);
  }

  protected selectUser(user: UserAccount): void {
    this.selectedUser.set(user);

    this.detailProfilesModal()?.openModal();
  }
} 
