import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'clRut',
})
export class ClRutPipe implements PipeTransform {

  transform(value: string): string {
    if (!value) return '';

    const cleanRut = value.replace(/[.\-]/g, '');

    if (cleanRut.length < 2) return value;

    const dv = cleanRut.slice(-1);
    const number = cleanRut.slice(0, -1);

    const dottedNumber = number.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    return `${dottedNumber}-${dv}`;
  }

}
