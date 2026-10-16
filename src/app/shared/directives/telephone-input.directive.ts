import { Directive, inject } from '@angular/core';
import { NgControl } from '@angular/forms';
import { formatTelephone, nationalNumber } from '../../core/utils/telephone';

/**
 * Champ téléphone sénégalais : clavier numérique sur mobile et mise en forme
 * « +221 7X XXX XX XX » à la sortie du champ.
 */
@Directive({
  selector: 'input[appTelephoneInput]',
  host: {
    type: 'tel',
    inputmode: 'tel',
    autocomplete: 'tel',
    placeholder: '+221 7X XXX XX XX',
    '(blur)': 'formatter()',
  },
})
export class TelephoneInputDirective {
  private readonly control = inject(NgControl, { self: true });

  protected formatter(): void {
    const value = this.control.value as string | null;
    if (value && nationalNumber(value)) this.control.control?.setValue(formatTelephone(value));
  }
}
