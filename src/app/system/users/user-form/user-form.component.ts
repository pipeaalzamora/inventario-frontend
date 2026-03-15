import { Profile } from '@/system/models/profile';
import { UserAccount } from '@/system/models/user';
import { ProfileService } from '@/system/services/profile.service';
import { UserService } from '@/system/services/user.service';
import { Power } from '@/auth/models/auth';
import { AuthService } from '@/auth/services/auth.service';
import { SearchBarComponent } from '@/shared/components/controller/search-bar/search-bar.component';
import { GoBackComponent } from '@/shared/components/go-back/go-back.component';
import { ModalComponent } from '@/shared/components/modal/modal.component';
import { DropdownComponent } from '@/shared/components/dropdown/dropdown.component';
import { InputDirective } from '@/shared/directives/input.directive';
import { LoadingDirective } from '@/shared/directives/loading.directive';
import { PaginationController, PaginationControllerCFG } from '@/shared/paginationController';
import { LayoutService } from '@/shared/services/layout.service';
import { NavigateService } from '@/shared/services/navigate.service';
import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, Renderer2, signal, viewChild, viewChildren } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { SectionWrapperComponent } from '@/shared/layout/components/section-wrapper/section-wrapper.component';

@Component({
  selector: 'dot-user-form',
  imports: [
    ReactiveFormsModule,
    InputDirective,
    SearchBarComponent,
    ModalComponent,
    MatTooltipModule,
    DropdownComponent,
    LoadingDirective,
    GoBackComponent,
    SectionWrapperComponent
  ],
  templateUrl: './user-form.component.html',
  styleUrl: './user-form.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserFormComponent {
  private router = inject(Router);
  private userService = inject(UserService);
  private profileService = inject(ProfileService);
  private navigateService = inject(NavigateService);
  private layoutService = inject(LayoutService);
  private authService = inject(AuthService);
  private renderer = inject(Renderer2);
  private fb = inject(FormBuilder);

  private userId = signal<string | null>(null);
  protected actualUser = signal<UserAccount | null>(null);
  protected profiles = signal<Profile[] | null>(null);

  protected selectedProfiles = signal<Profile[]>([]);

  protected selectedPowers = computed<number>(() => {
    let count = 0;

    for (const profile of this.selectedProfiles()) {
      if (!profile.powers) continue;

      count += profile.powers.length;
    }

    return count;
  });

  protected selectedProfilesIds = computed<string[]>(() => this.selectedProfiles().map(p => p.id));

  protected isMobile = computed(() => this.layoutService.isMobile());

  protected controller = new PaginationController<Profile>([], <PaginationControllerCFG>{
    defaultSearchColumns: ['profileName', 'description']
  });

  private profilesHtml = viewChildren<ElementRef<HTMLElement>>('profile');
  private modal = viewChild<ModalComponent>('deactivateModal');
  private deactivateEmail = viewChild<ElementRef<HTMLInputElement>>('deactivateEmail');

  protected userForm = this.fb.group({
    userName: ['', Validators.required],
    userEmail: ['', [
      Validators.required,
      Validators.email
    ]],
    description: ['', Validators.required],
    profilesIds: [[] as string[]]
  });

  protected POWER_CAN_ACTIVATE = this.authService.hasPower('user:enable-disable');

  constructor() {
    const userId = this.router.url.split('/')[this.router.url.split('/').length - 1];

    if (userId && userId !== 'new') {
      this.userId.set(userId);

      this.fetchUser(userId);
    }

    effect(() => {
      const selectedProfilesIds = this.selectedProfilesIds();

      this.userForm.get('profilesIds')?.setValue(selectedProfilesIds, { emitEvent: false });
    })

    this.fetchProfiles();
  }

  protected async fetchUser(userId: string): Promise<void> {
    if (!this.userId()) return;

    const res = await this.userService.getUser(userId);

    if (res) {
      this.actualUser.set(res);

      this.userForm.patchValue(res);

      this.selectedProfiles.set(res.profiles);
    };
  }

  protected async fetchProfiles(): Promise<void> {
    const res = await this.profileService.getProfiles() as Profile[] | null;

    if (!res) return;

    this.profiles.set(res);

    this.controller.SetRawData(res);
  }

  protected toggleSelected(checkbox: HTMLInputElement, profile: Profile): void {
    this.renderer.setProperty(checkbox, 'checked', !checkbox.checked);
    
    if (checkbox.checked) this.selectedProfiles.update(arr => [...arr, profile]);
    else this.selectedProfiles.update(arr => arr.filter(p => p.id !== profile.id));
  }

  protected removeSelectedProfile(profile: Profile): void {
    this.selectedProfiles.update(arr => arr.filter(p => p.id !== profile.id)); 

    this.profilesHtml().forEach(profileHtml => {
      const checkbox = profileHtml.nativeElement.querySelector('input[type="checkbox"]') as HTMLInputElement;

      if (checkbox.value === profile.id) {
        this.renderer.setProperty(checkbox, 'checked', false);
      }
    });
  }

  protected async saveUser(): Promise<void> {
    this.userForm.markAllAsTouched();
    if (this.userForm.invalid) return;

    if (!this.actualUser()) return await this.createUser();

    const res = await this.userService.updateUser(this.actualUser()!.id, this.userForm);

    if (res) {
      this.navigateService.push('users');
    }

  }

  private async createUser(): Promise<void> {
    const res = await this.userService.createUser(this.userForm);

    if (res) {
      this.navigateService.push('users');
    }
  }

  protected async deactivateUser(): Promise<void> {
    const emailValue = this.deactivateEmail()?.nativeElement.value;

    if (
      !this.actualUser() ||
      !emailValue || 
      emailValue !== this.actualUser()?.userEmail
    ) return;

    const res = await this.userService.deactivateUser(this.actualUser()!.id);

    if (res) {
      this.actualUser.update(user => {
        user!.available = false;
        return user;
      });
    }

    this.modal()?.closeModal();
  }

  protected activateUser(): void {
    if (!this.actualUser()) return;

    const res = this.userService.activateUser(this.actualUser()!.id);

    if (!res) return;

    this.actualUser.update(user => {
      user!.available = true;
      return user;
    });
  }

  protected mapProfilePowers(powers: Power[]): string[] {

    if (powers.length > 5) {
      return [
        powers[0].displayName, 
        powers[1].displayName,
        powers[2].displayName,
        powers[3].displayName,
        powers[4].displayName,
        `+${powers.length - 5}`
      ];
    }

    return powers.map(power => power.displayName);
  }

  // private uiHandleSelectedContainer(mode: 'hide' | 'show'): void {
  //   const selectedContainer = this.el.nativeElement.querySelector('.profiles-selected') as HTMLElement;

  //   if (mode === 'show') {
  //     this.renderer.addClass(selectedContainer, 'show');
  //   } else {
  //     this.renderer.removeClass(selectedContainer, 'show');
  //   }
  // }

  protected noCopyPaste(event: Event): void {
    event.preventDefault();
  }
}
