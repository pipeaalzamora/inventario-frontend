import { AuthService } from '@/auth/services/auth.service';
import { inject, Injectable } from '@angular/core';
import { AllUserReponse, UserAccount } from '@/system/models/user';
import { FormGroup } from '@angular/forms';
import { ToastService } from '@/shared/services/toast.service';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  private toastService = inject(ToastService)
  private authService = inject(AuthService)

  constructor() { }

  public async getUsers(): Promise<UserAccount[] | null> {
    const response = await this.authService.authenticatedRequest<AllUserReponse>('users-accounts');

    if (!response.success || !response.data) return null;

    return response.data.users;
  }

  public async getUser(userId: string): Promise<UserAccount | null> {
    const response = await this.authService.authenticatedRequest<UserAccount>(`users-accounts/${userId}`);

    if (!response.success || !response.data) return null;

    return response.data;
  }

  public async createUser(form: FormGroup): Promise<UserAccount | null> {
    const prebody = form.getRawValue();

    const body = {
      userName: prebody.userName,
      userEmail: prebody.userEmail,
      description: prebody.description ?? '',
      profileIds: prebody.profilesIds
    }

    const response = await this.authService.authenticatedRequest<UserAccount>('users-accounts', 'POST', body, form);

    if (!response.success || !response.data) return null;

    this.toastService.show({
      type: 'success',
      title: 'Usuario creado con exito',
      text: `El usuario ${response.data.userName} ha sido creado correctamente`
    })

    return response.data;
  }

  public async updateUser(userId: UserAccount['id'], form: FormGroup): Promise<UserAccount | null> {
    const prebody = form.getRawValue();

    const body = {
      userName: prebody.userName,
      userEmail: prebody.userEmail,
      description: prebody.description ?? '',
      profileIds: prebody.profilesIds
    }

    const response = await this.authService.authenticatedRequest<UserAccount>(`users-accounts/${userId}`, 'PUT', body, form);

    if (!response.success || !response.data) return null;

    this.toastService.show({
      type: 'success',
      title: 'Usuario actualizado con exito',
      text: `El usuario ${response.data.userName} ha sido actualizado correctamente`
    })

    return response.data;
  }

  public async deactivateUser(userId: UserAccount['id']): Promise<boolean> {
    const response = await this.authService.authenticatedRequest<UserAccount>(`users-accounts/${userId}`, 'DELETE');

    if (!response.success) return false;

    this.toastService.show({
      type: 'success',
      title: 'Usuario desactivado con exito'
    })

    return true;
  }

  public async activateUser(userId: UserAccount['id']): Promise<boolean> {
    const response = await this.authService.authenticatedRequest<UserAccount>(`users-accounts/${userId}/activate`, 'PATCH');

    if (!response.success) return false;

    this.toastService.show({
      type: 'success',
      title: 'Usuario activado con exito'
    })

    return true;
  }
}
