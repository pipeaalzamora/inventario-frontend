import { ColumnDefinition, FilterComponent } from '@/shared/components/controller/filter/filter.component';
import { PaginationComponent } from '@/shared/components/controller/pagination/pagination.component';
import { SearchBarComponent } from '@/shared/components/controller/search-bar/search-bar.component';
import { SorterHeaderComponent } from '@/shared/components/controller/sorter-header/sorter-header.component';
import { TableCaptionComponent } from '@/shared/components/controller/table-caption/table-caption.component';
import { PaginationController, PaginationControllerCFG } from '@/shared/paginationController';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, viewChild } from '@angular/core';
import { Profile } from '@/system/models/profile';
import { ProfileService } from '@/system/services/profile.service';
import { LinkDirective } from '@/shared/directives/link.directive';
import { ModalComponent } from '@/shared/components/modal/modal.component';
import { DropdownComponent } from '@/shared/components/dropdown/dropdown.component';
import { AuthService } from '@/auth/services/auth.service';
import { LayoutService } from '@/shared/services/layout.service';
import { Power } from '@/auth/models/auth';

const CONTROLLER_COMPONENTS = [
  SorterHeaderComponent,
  SearchBarComponent,
  FilterComponent,
  PaginationComponent,
  TableCaptionComponent,
]

@Component({
  selector: 'dot-profiles',
  imports: [
    CONTROLLER_COMPONENTS,
    LinkDirective,
    ModalComponent,
    DropdownComponent,
  ],
  templateUrl: './profiles.component.html',
  styleUrl: './profiles.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfilesComponent {
  private profileService = inject(ProfileService);
  private authService = inject(AuthService);
  private layoutService = inject(LayoutService);

  protected POWER_CAN_CREATE = this.authService.hasPower('profile:create');
  protected POWER_CAN_UPDATE = this.authService.hasPower('profile:update');
  protected POWER_CAN_DELETE = this.authService.hasPower('profile:delete');
  protected POWER_CAN_HANDLE = this.authService.hasPower('profile:update') || this.authService.hasPower('profile:delete');

  protected profiles = signal<Profile[]>([]);
  protected selectedProfile = signal<Profile | null>(null);

  private deleteModal = viewChild<ModalComponent>('deleteModal');
  private profilePowersModal = viewChild<ModalComponent>('profilePowersModal');

  protected isMobile = computed(() => this.layoutService.isMobile());

  protected controller = new PaginationController<Profile>([], <PaginationControllerCFG>{
    defaultSearchColumns: ['profileName', 'description', 'id', 'powers.displayName', 'powers.categoryId', 'powers.id'],
  });

  protected detailPowersController = new PaginationController<Power>([], <PaginationControllerCFG>{
    defaultSearchColumns: ['displayName', 'categoryId', 'id'],
  });

  protected columns: ColumnDefinition[] = [
    { nameToShow: 'ID', columnName: 'id', type: 'string', showOnly: 'filter' },
    { nameToShow: 'Nombre', columnName: 'profileName', type: 'string' },
    { nameToShow: 'Descripción', columnName: 'description', type: 'string' },
    { nameToShow: 'Permisos', columnName: 'powers.displayName', type: 'array', multipleSelection: true, posibleSelections:[] },
    // { nameToShow: 'Opciones', columnName: null, type: 'entity', noSort: true, centerCol: true, showIf: this.POWER_CAN_HANDLE },
  ];

  constructor() { 
    this.fetchProfiles();

    effect(() => {
      const profiles = this.profiles();

      this.controller.SetRawData(profiles);
    })

    effect(() => {
      const selectedProfile = this.selectedProfile();

      if (!selectedProfile) return;

      this.detailPowersController.SetRawData(selectedProfile.powers);
    })
  }

  private async fetchProfiles(): Promise<void> {
    const res = await this.profileService.getProfiles(false) as {res: Profile[], powers: string[]} | null;

    if (res) {
      this.profiles.set(res.res);

      this.columns[3].posibleSelections = res.powers;
    }
  }

  protected async deleteProfile(profileId: string): Promise<void> {
    const res = await this.profileService.deleteProfile(profileId);

    if (res) {
      this.profiles.update(profiles => profiles.filter(p => p.id !== profileId));
    }

    this.deleteModal()?.closeModal();
  }

  protected limitedPowers(powers: Power[]): Power[] {
    return powers.slice(0, this.isMobile() ? 3 : 5);
  }

  protected selectProfile(profile: Profile): void {
    this.selectedProfile.set(profile);

    this.profilePowersModal()?.openModal();
  }
}
