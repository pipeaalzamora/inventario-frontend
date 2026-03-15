import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'countryFlag',
})
export class CountryFlagPipe implements PipeTransform {

  /**
   * Transforma un string con formato "XX-resto" donde XX es un código de país ISO 3166-1 alpha-2
   * en un string con el emoji de la bandera seguido del resto.
   * Ejemplo: "CL-74.645.645-6" => "🇨🇱 74.645.645-6"
   */
  transform(value: string | undefined | null): string {
    if (!value || typeof value !== 'string') {
      return '';
    }

    const hyphenIndex = value.indexOf('-');
    if (hyphenIndex !== 2) {
      return value;
    }

    const countryCode = value.substring(0, 2).toUpperCase();

    if (!/^[A-Z]{2}$/.test(countryCode)) {
      return value;
    }

    const rest = value.substring(3);
    const flagEmoji = this.countryCodeToFlag(countryCode);

    return `${flagEmoji} ${rest}`;
  }

  /**
   * Convierte un código de país ISO 3166-1 alpha-2 a un emoji de bandera.
   * Utiliza Regional Indicator Symbols de Unicode.
   */
  private countryCodeToFlag(countryCode: string): string {
    const OFFSET = 127397;
    return String.fromCodePoint(
      countryCode.charCodeAt(0) + OFFSET,
      countryCode.charCodeAt(1) + OFFSET
    );
  }
}
