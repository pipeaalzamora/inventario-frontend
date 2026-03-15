import { AuthService } from '@/auth/services/auth.service';
import { inject, Injectable } from '@angular/core';
import { PowerCategory, PowerResponse, Profile, ProfileResponse } from '@/system/models/profile';
import { FormGroup } from '@angular/forms';
import { ToastService } from '@/shared/services/toast.service';
import { Power } from '@/auth/models/auth';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {

  private authService = inject(AuthService);
  private toastService = inject(ToastService);

  constructor() { }

  public async getProfiles(noPowers: boolean = true): Promise<{res: Profile[], powers: string[]} | null | Profile[]> {
    const response = await this.authService.authenticatedRequest<ProfileResponse>('profile-accounts');

    if (!response.success || !response.data) return null;

    if (noPowers) return response.data.profiles as Profile[];

    const powers = new Set<string>();

    for (const profile of response.data.profiles) {
      for( const power of profile.powers) {
        powers.add(power.displayName);
      }
    }

    return {res: response.data.profiles, powers: Array.from(powers)} as {res: Profile[], powers: string[]};
  }

  public async getProfile(profileId: string): Promise<Profile | null> {
    const response = await this.authService.authenticatedRequest<Profile>(`profile-accounts/${profileId}`);

    if (!response.success || !response.data) return null;

    return response.data;
  }

  public async getPowers(): Promise<PowerCategory[] | null> {
    const response = await this.authService.authenticatedRequest<PowerResponse>('profile-accounts/powers');

    if (!response.success || !response.data) return null;

    return response.data.categories;
  }

  public async updateProfile(profileId: string, form: FormGroup): Promise<Profile | null> {
    const body = form.getRawValue() as Profile;

    const response = await this.authService.authenticatedRequest<Profile>(`profile-accounts/${profileId}`, 'PUT', body, form);

    if (!response.success || !response.data) return null;

    this.toastService.show({
      type: 'success',
      title: `Perfil ${body.profileName} actualizado correctamente`,
    });

    return response.data;
  }

  public async deleteProfile(profileId: string): Promise<boolean> {
    const response = await this.authService.authenticatedRequest(`profile-accounts/${profileId}`, 'DELETE');

    if (!response.success) return false;

    this.toastService.show({
      type: 'success',
      title: 'Perfil eliminado correctamente',
    });

    return true;
  }

  public async createProfile(form: FormGroup): Promise<Profile | null> {
    const body = form.getRawValue() as Profile;

    const response = await this.authService.authenticatedRequest<Profile>('profile-accounts', 'POST', body, form);

    if (!response.success || !response.data) return null;

    this.toastService.show({
      type: 'success',
      title: `Perfil ${body.profileName} creado correctamente`,
    });

    return response.data;
  }
}
