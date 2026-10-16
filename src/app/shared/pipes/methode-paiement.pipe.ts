import { Pipe, PipeTransform } from '@angular/core';
import { METHODE_PAIEMENT_LABELS, MethodePaiement } from '../../core/domain/enums';

@Pipe({ name: 'methodePaiement' })
export class MethodePaiementPipe implements PipeTransform {
  transform(value: MethodePaiement | null | undefined): string {
    return value ? METHODE_PAIEMENT_LABELS[value] : '';
  }
}
