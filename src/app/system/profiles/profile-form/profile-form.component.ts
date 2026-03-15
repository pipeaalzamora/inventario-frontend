import { PowerCategory, Profile } from '@/system/models/profile';
import { ProfileService } from '@/system/services/profile.service';
import { Power } from '@/auth/models/auth';
import { SearchBarComponent } from '@/shared/components/controller/search-bar/search-bar.component';
import { ModalComponent } from '@/shared/components/modal/modal.component';
import { OnScrollToolbarComponent } from '@/shared/layout/components/on-scroll-toolbar/on-scroll-toolbar.component';
import { InputDirective } from '@/shared/directives/input.directive';
import { PaginationController, PaginationControllerCFG } from '@/shared/paginationController';
import { LayoutService } from '@/shared/services/layout.service';
import { NavigateService } from '@/shared/services/navigate.service';
import { ChangeDetectionStrategy, Component, computed, effect, inject, Renderer2, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { Router } from '@angular/router';
import { GoBackComponent } from "@/shared/components/go-back/go-back.component";
import { NgTemplateOutlet } from '@angular/common';
import { DropdownComponent } from '@/shared/components/dropdown/dropdown.component';

@Component({
  selector: 'dot-profile-form',
  imports: [
    ReactiveFormsModule,
    InputDirective,
    SearchBarComponent,
    ModalComponent,
    MatExpansionModule,
    DropdownComponent,
    OnScrollToolbarComponent,
    GoBackComponent,
    NgTemplateOutlet
],
  templateUrl: './profile-form.component.html',
  styleUrl: './profile-form.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileFormComponent {

  private profileService = inject(ProfileService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private navigateService = inject(NavigateService);
  private renderer = inject(Renderer2);
  private layoutService = inject(LayoutService);

  protected controller = new PaginationController<PowerCategory>([], <PaginationControllerCFG>{
    defaultSearchColumns: [
      'categories.categoryName', 
      'categories.description',
      'powers.powerName',
      'powers.description'
    ],
  });

  private powers = signal<PowerCategory[]>([]);
  private profileId = signal<string | null>(null);
  protected actualProfile = signal<Profile | null>(null);
  protected selectedPowers = signal<Power[]>([]);
  protected selectedPowersIds = computed(() => {
    return this.selectedPowers().map(p => p.id);
  });

  protected totalPowers = computed(() => {
    return this.powers().reduce((acc, category) => acc + category.powers.length, 0);
  })

  protected isMobile = computed(() => this.layoutService.isMobile());

  protected profileForm = this.fb.group({
    profileName: ['', Validators.required],
    description: ['', Validators.required],
    powerIds: [[] as Power['id'][]]
  });

  constructor() {

    const profileId = this.router.url.split('/')[this.router.url.split('/').length - 1];

    if (profileId && profileId !== 'new') {
      this.profileId.set(profileId);

      this.fetchProfile(profileId);
    }

    effect(() => {
      this.profileForm.patchValue({
        powerIds: this.selectedPowersIds()
      })
    })

    effect(() => {
      this.controller.SetRawData(this.powers());
    })

    this.fetchPowers();

  }

  private async fetchProfile(profileId: string): Promise<void> {
    if (!this.profileId()) return;

    const res = await this.profileService.getProfile(profileId);

    if (res) {
      this.actualProfile.set(res);

      this.profileForm.patchValue({
        profileName: res.profileName,
        description: res.description
      });

      this.selectedPowers.set(res.powers);
    }
  }

  private async fetchPowers(): Promise<void> {
    const res = await this.profileService.getPowers();

    if (res) {
      this.powers.set(res);
    }
  }

  protected async saveProfile(): Promise<void> {
    this.profileForm.markAllAsTouched();
    if (this.profileForm.invalid) return;

    if (!this.actualProfile()) return await this.createProfile();

    const res = await this.profileService.updateProfile(this.actualProfile()!.id, this.profileForm);

    if (res) {
      this.navigateService.push('profiles');
    }
  }

  private async createProfile(): Promise<void> {
    const res = await this.profileService.createProfile(this.profileForm);

    if (res) {
      this.navigateService.push('profiles');
    }
  }

  protected selectPower(power: Power, checkbox: HTMLInputElement): void {
    this.renderer.setProperty(checkbox, 'checked', !checkbox.checked);

    if (checkbox.checked) {
      this.selectedPowers.update(powers => [...powers, power]);
    } else {
      this.selectedPowers.update(powers => powers.filter(p => p.id !== power.id));
    }
  }

  protected unselectPower(power: Power): void {
    this.selectedPowers.update(powers => powers.filter(p => p.id !== power.id));
  }

  protected async deleteProfile(): Promise<void> {
    if (!this.profileId()) return;

    const res = await this.profileService.deleteProfile(this.profileId()!);

    if (res) {
      this.navigateService.push('profiles');
    }
  }

  protected ownablePower(powerId: Power['id']): boolean {
    for (const p of this.powers()) {
      if (!p.ownable) continue;

      for (const pow of p.powers) {
        if (pow.id === powerId) return true;
      }
    }

    return false
  }

}
