import { AuthService } from '@/auth/services/auth.service';
import { inject, Injectable, signal } from '@angular/core';
import { Company, CompaniesResponse } from '@/shared/models/company';
import { FormGroup } from '@angular/forms';
import { environment } from 'src/environments/environment';
import { ErrorService } from '@/shared/services/error.service';

@Injectable({
  providedIn: 'root'
})
export class CompanyService {
  private authService = inject(AuthService);
  private errorService = inject(ErrorService);

  private readonly api: string = environment.api;

  public companies = signal<Company[]>([]);

  constructor() { }
  
  public async getCompanies(): Promise<Company[] | null> {
    const response = await this.authService.authenticatedRequest<CompaniesResponse>('companies','GET');

    if (!response.success || !response.data) return null;

    this.companies.set(response.data.companies);
    return response.data.companies;
  }

  
  public async getCompanyById(id: string): Promise<Company | null> {
    const response = await this.authService.authenticatedRequest<Company>(`companies/${id}`,
      'GET'
    );

    if (!response.success || !response.data) return null;

    return response.data;
  }

  public async createCompany(form: FormGroup, ImageLogo: File): Promise<Company | null> {
    const prebody = form.getRawValue();
    
    const formData = new FormData();
    formData.append('companyName', prebody.companyName);
    formData.append('description', prebody.description || '');
    formData.append('idFiscal', prebody.idFiscal || '');
    formData.append('fiscalName', prebody.fiscalName || '');
    formData.append('fiscalAddress', prebody.fiscalAddress || '');
    formData.append('fiscalState', prebody.fiscalState || '');
    formData.append('fiscalCity', prebody.fiscalCity || '');
    formData.append('email', prebody.email || '');
    formData.append('imageLogo', ImageLogo);
    formData.append('isNewLogo', 'true');

    try {
      const headers = this.authService.getHeaderToken();

      const response = await fetch(`${this.api}/companies`, {
        method: 'POST',
        headers: headers,
        body: formData
        
      });

      const data = await response.json();

      
      
      if (!response.ok) {
        this.errorService.validateParamErrorsGroup(data,form)
        return null;
      }

      this.companies.update(companies => [...companies, data]);
      
      return data;

    } catch (error) {
      this.errorService.launch500ErrorToast();
      return null;
    }
  }

  public async updateCompany(id: string, form: FormGroup, ImageLogo: File, isNewLogo: boolean): Promise<Company | null> {
    const prebody = form.getRawValue();
      
    const formData = new FormData();
    formData.append('companyName', prebody.companyName);
    formData.append('description', prebody.description || '');
    formData.append('idFiscal', prebody.idFiscal || '');
    formData.append('fiscalName', prebody.fiscalName || '');
    formData.append('fiscalAddress', prebody.fiscalAddress || '');
    formData.append('fiscalState', prebody.fiscalState || '');
    formData.append('fiscalCity', prebody.fiscalCity || '');
    formData.append('email', prebody.email || '');
    formData.append('imageLogo', ImageLogo);
    formData.append('isNewLogo', isNewLogo.toString());
  
    try {
      const headers = this.authService.getHeaderToken();
      



      const response = await fetch(`${this.api}/companies/${id}`, {
        method: 'POST',
        headers: headers,     
        body: formData
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      
      this.companies.update(companies => 
        companies.map(c => c.id === id ? data : c)
      );
      
      return data;

    } catch (error) {
      return null;
    }
  }

}
