import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal, viewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { GoBackComponent } from '@/shared/components/go-back/go-back.component';
import { DropFileComponent } from '@/shared/components/drop-file/drop-file.component';
import { LayoutService } from '@/shared/services/layout.service';
import { InputDirective } from '@/shared/directives/input.directive';
import { SectionWrapperComponent } from '@/shared/layout/components/section-wrapper/section-wrapper.component';
import { CanComponentDeactivate } from '@/shared/guards/canDeactivate.guard';
import { ModalComponent } from '@/shared/components/modal/modal.component';
import { ToastService } from '@/shared/services/toast.service';
import { CompanyService } from '@/system/company/services/company.service';
import { AuthService } from '@/auth/services/auth.service';
import { CompanyService as companyshared} from '@/shared/services/company.service';


@Component({
  selector: 'dot-company-form',
  imports: [
    ReactiveFormsModule,
    GoBackComponent,
    DropFileComponent,
    InputDirective,
    SectionWrapperComponent,
    ModalComponent,
  ],
  templateUrl: './form.component.html',
  styleUrl: './form.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CompanyFormComponent implements CanComponentDeactivate, OnInit {
  private fb = inject(FormBuilder);
  private r = inject(ActivatedRoute);
  private ls = inject(LayoutService);
  private router = inject(Router);
  private ts = inject(ToastService);
  private cs = inject(CompanyService);
  private as = inject(AuthService);
  private companyService2 = inject(companyshared);
  
  protected COMPANY_CAN_UPDATE = this.as.hasPower('company:update');

  


  protected isMobile = computed(() => this.ls.isMobile());
 
  protected companyId = signal<string | null>(null);
  protected logoPreview = signal<string | null>(null);
  protected uploadedLogoFile = signal<File | null>(null);
  protected hasNewLogo = signal<boolean>(false);
  protected isEditMode = signal<boolean>(false);
  protected isViewMode = signal<boolean>(true);

  private preventLossModal = viewChild<ModalComponent>('preventLossModal');
  private continueWithoutSaving: boolean = false;
  private backupFormData: string = '';
  private pendingRoute: string = '';

  protected Company: FormGroup = this.fb.group({
    companyName: ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
    idFiscal: ['', [Validators.required]],
    fiscalName: ['', [Validators.required]],
    fiscalAddress: ['', [Validators.required]],
    fiscalState: ['', [Validators.required]],
    fiscalCity: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    imageLogo: [''],
  })

  constructor() {
    this.backupFormData = JSON.stringify(this.Company.value);
  }

  async ngOnInit(): Promise<void> {
    const id = this.r.snapshot.paramMap.get('id');
    if (id) {
      this.companyId.set(id);
      this.isEditMode.set(true);
      this.isViewMode.set(true);
      await this.loadCompanyData(id);
      this.Company.disable();
    } else {
      this.isEditMode.set(false);
      this.isViewMode.set(false);
    }
    this.backupFormData = JSON.stringify(this.Company.value);
  }

  private async loadCompanyData(id: string): Promise<void> {
    const company = await this.cs.getCompanyById(id);

    if (!company) {
      this.ts.error('Compañía no encontrada', 'Error');
      this.router.navigate(['/company']);
      return;
    }

    this.Company.patchValue({
      companyName: company.companyName || '',
      description: company.description || '',
      idFiscal: company.fiscalData?.idFiscal || '',
      fiscalName: company.fiscalData?.fiscalName || company.fiscalName || '',
      fiscalAddress: company.fiscalData?.fiscalAddress || '',
      fiscalState: company.fiscalData?.fiscalState || company.commune || '',
      fiscalCity: company.fiscalData?.fiscalCity || company.city || '',
      email: company.fiscalData?.email || company.email || '',
      imageLogo: company.imageLogo || '',
    });
    
    this.Company.get('idFiscal')?.disable();
    
    if (company.imageLogo) {
      this.logoPreview.set(company.imageLogo);
    }

    this.backupFormData = JSON.stringify(this.Company.value);
  }

  protected enableEditMode(): void {
    this.isViewMode.set(false);
    this.Company.enable();
    this.Company.get('idFiscal')?.disable();
  }

  protected cancelEdit(): void {
    this.isViewMode.set(true);
    this.Company.disable();

    this.Company.patchValue(JSON.parse(this.backupFormData));
    
    const originalData = JSON.parse(this.backupFormData);
    if (originalData.imageLogo) {
      this.logoPreview.set(originalData.imageLogo);
    } else {
      this.logoPreview.set(null);
    }
    this.uploadedLogoFile.set(null);
  }

protected onFileSelected(files: FileList): void {
  if (!files || files.length === 0) return;

  const file = files[0]
  this.uploadedLogoFile.set(file);
  this.hasNewLogo.set(true);

  const reader = new FileReader();
  reader.onload = (e) => {
    this.logoPreview.set(e.target?.result as string);
  };
  reader.readAsDataURL(file);
  this.Company.patchValue({ imageLogo: file.name });

  this.ts.success('Logo cargado', 'Éxito');
}
  protected clearLogo(): void {
    this.uploadedLogoFile.set(null);
    this.logoPreview.set(null);
    this.hasNewLogo.set(false);
    this.Company.patchValue({ imageLogo: '' });
  }

  public canDeactivate(nextRoute: string): boolean {
    if (this.continueWithoutSaving) return true;

    const hasChanges = JSON.stringify(this.Company.value) !== this.backupFormData || this.uploadedLogoFile() !== null;
    
    if (!hasChanges) return true;

    this.pendingRoute = nextRoute;
    this.preventLossModal()?.openModal();
    return false;
  }

  protected handleConfirmExit(): void {
    this.continueWithoutSaving = true;
    this.preventLossModal()?.closeModal();
    this.router.navigateByUrl(this.pendingRoute);
  }

  protected async onSubmit(): Promise<void> {
    if (this.Company.invalid) {
      this.Company.markAllAsTouched();
      
      if (this.Company.get('companyName')?.hasError('required')) {
        this.ts.error('El nombre de la compañía es requerido');
        return;
      }
      if (this.Company.get('companyName')?.hasError('minlength')) {
        this.ts.error('El nombre debe tener al menos 3 caracteres');
        return;
      }
      if (this.Company.get('idFiscal')?.hasError('required')) {
        this.ts.error('El ID Fiscal es requerido');
        return;
      }
      if (this.Company.get('fiscalName')?.hasError('required')) {
        this.ts.error('El nombre fiscal es requerido');
        return;
      }
      if (this.Company.get('fiscalAddress')?.hasError('required')) {
        this.ts.error('La dirección fiscal es requerida');
        return;
      }
      if (this.Company.get('email')?.hasError('required')) {
        this.ts.error('El email es requerido');
        return;
      }
      if (this.Company.get('email')?.hasError('email')) {
        this.ts.error('El email es inválido');
        return;
      }
      if (this.Company.get('fiscalCity')?.hasError('required')) {
        this.ts.error('La ciudad es requerida');
        return;
      }
      if (this.Company.get('fiscalState')?.hasError('required')) {
        this.ts.error('La comuna es requerida');
        return;
      }
      
      this.ts.error('Por favor completa todos los campos requeridos');
      return;
    }

    if (!this.uploadedLogoFile() && !this.isEditMode()) {
      this.ts.error('Debes subir un logo');
      return;
    }

    if (this.isEditMode()) {
      const logoFile = this.uploadedLogoFile() || new File([], '');
      
      const result = await this.cs.updateCompany(
        this.companyId()!,
        this.Company,
        logoFile,
        this.hasNewLogo()
      );

      if (result) {
        await this.loadCompanyData(this.companyId()!);
        await this.companyService2.getAllCompanies();
        this.isViewMode.set(true);
        this.Company.disable();
        this.hasNewLogo.set(false);
        this.backupFormData = JSON.stringify(this.Company.value);
        this.ts.success('Se editó la compañía');
      }
    } else {
      const result = await this.cs.createCompany(
        this.Company,
        this.uploadedLogoFile()!
      );

      if (result) {
        await this.companyService2.getAllCompanies();
        this.continueWithoutSaving = true;
        this.ts.success('Se creó la compañía');
        this.router.navigate(['/company']);
      }
    }
  }
}

