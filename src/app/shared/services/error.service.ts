import { effect, inject, Injectable, Signal, signal } from '@angular/core';
import { ErrorParam } from '@shared/models/apiResponse';
import { ToastService } from './toast.service';
import { AbstractControl, FormGroup } from '@angular/forms';
import { FieldTree, SchemaPathTree, validate, ValidationError } from '@angular/forms/signals';

@Injectable({
  providedIn: 'root'
})
export class ErrorService {

  private toastService = inject(ToastService);

  public signalErrorsParams = signal<Record<string, ValidationError>>({});

  constructor() {}

  public offControl(control : AbstractControl) {    
    control.setErrors({invalid : null})
    control.updateValueAndValidity();
  }

  public onControl(message: string, control: AbstractControl){
    control.markAsTouched();
    control.setErrors( {invalid : message });
  }

  public resetErrorsGroup(group : FormGroup){
    const controls = group.controls;
    for(let ctr in controls)
      this.offControl( controls[ctr])
  }

  public validateParamErrorsGroup<T>( errors : ErrorParam[], group? : FormGroup | FieldTree<T> ){                
    let errNotMatches : ErrorParam[] = [];

    if (group && !this.isFormGroup(group as FieldTree<any>)) {
      this.handleSignalFormErrors<T>(errors, group as FieldTree<T>);
      return;
    }

    if (!Array.isArray(errors)) {
      this.toastService.show({
        text : this.handleUnknownError(errors),
        type : 'danger'
      });
      return;
    }

    let match = false;
    for( let err of errors ) { 
      if( !match ) errNotMatches.push( err );
    }

    let _message = '';
    if(  errNotMatches.length > 0 ){
      for( let err of errNotMatches ){
        const errMessage = this.capitalizeFirstLetter(err.message);
        _message += "\n" + errMessage ;
      }    
    }

    if( _message != '' ) {
      this.toastService.show({
        text : _message,
        type : 'danger'
      });
    }
  }

  public has(errors : ErrorParam[]) : boolean{
    if( errors.length > 0 )
      return true

    return false;
  }

  private capitalizeFirstLetter(message: string):string {
    return message.charAt(0).toUpperCase() + message.slice(1);
  }

  public launch500ErrorToast(): void {
    this.toastService.show({
      title: 'Error',
      text: 'Ocurrió un error inesperado al comunicarse con el servidor',
      icon: 'fa-solid fa-triangle-exclamation',
      type: 'danger'
    });
  }

  public launch403ErrorToast(): void {
    this.toastService.show({
      title: 'Acceso denegado',
      text: 'No tienes permisos para realizar esta acción',
      icon: 'fa-solid fa-triangle-exclamation',
      type: 'danger'
    });
  }

  public paramHasError(param: string): ValidationError | null {
    const errors = this.signalErrorsParams();

    if (param in errors) {
      return errors[param];
    }
    
    return null;
  }

  private isFormGroup(obj: FormGroup | FieldTree<any>): obj is FormGroup {
    return obj && typeof obj === 'object' && 'controls' in obj;
  }

  public clearSignalErrors(): void {
    this.signalErrorsParams.update(errors => {
      const newObj = {...errors};
      const errorsCopy = Object.entries(newObj);

      if (errorsCopy.length === 0) {
        return errors;
      }

      for (const error of errorsCopy) {
        const kind = error[1].kind;
        if (kind === 'server') {
          delete newObj[error[0]];
        }
      }

      return newObj;
    })
  }

  public bindServerErrors<T extends Record<string, any>>(
    schemaPath: SchemaPathTree<T>,
    formModel: Signal<T>
  ): void {
    const modelKeys = Object.keys(formModel()) as string[];
    
    for (const key of modelKeys) {
      const field = (schemaPath as Record<string, any>)[key];
      
      if (field) {
        validate(field, () => {
          const error = this.paramHasError(key);
          return error;
        });
      }
    }
  }

  private handleSignalFormErrors<T>(errors: ErrorParam[], form: FieldTree<T>): void {
    let errNotMatches: ErrorParam[] = [];

    for (const error of errors) {
      const { param, message } = error;

      if (!param) {
        errNotMatches.push(error);
        continue;
      }

      const keys = form().value() as Record<string, any>;

      const data: ValidationError = {
        kind: 'server',
        message: this.capitalizeFirstLetter(message),
      };

      if (param in keys) {
        this.signalErrorsParams.update(current => {
          const newObj = {...current, [param]: data};
          return newObj;
        });
      }
    }

    if (errNotMatches.length > 0) {
      let toastMessage = '';
      for (const err of errNotMatches) {
        const errMessage = this.capitalizeFirstLetter(err.message);
        toastMessage += '\n' + errMessage;
      }

      this.toastService.show({
        text: toastMessage.trim(),
        type: 'danger'
      });
    }
  }

  private handleUnknownError(err: unknown): string {
    if (err instanceof Error) {
      return err.message;
    } else if (typeof err === 'string') {
      return err;
    } else if (err && typeof err === 'object' && 'error' in err ) {
      return (err as { error: string }).error;
    } else if (typeof err === 'object' && err) {
      return JSON.stringify(err);
    } 
    return 'Error desconocido';
  }
}
