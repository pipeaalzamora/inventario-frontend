import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'phoneNumber'
})
export class PhoneNumberPipe implements PipeTransform {

  transform(value: string): string {
    const onlyNumbers = value.replace(/\D/g, '');

    let formatedValue = '';

    if (onlyNumbers.length !== 11) formatedValue = value;
    else
      formatedValue = `+${onlyNumbers.slice(0, 2)} ${onlyNumbers.slice(2, 3)} ${onlyNumbers.slice(3, 7)} ${onlyNumbers.slice(7, 11)}`;

    return formatedValue;
  }
}
