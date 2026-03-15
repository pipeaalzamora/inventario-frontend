import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'clpCurrency'
})
export class ClpCurrencyPipe implements PipeTransform {

  transform(value: number | string | undefined): string {
    let numericValue: number = 0;

    if (value === undefined) return '';
    else if (typeof value === 'string') numericValue = parseInt(value);
    else if (typeof value === 'number') numericValue = value;

    if (isNaN(numericValue)) return '';

    return numericValue.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' });
  }

}
