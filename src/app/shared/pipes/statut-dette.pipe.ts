import { Pipe, PipeTransform } from '@angular/core';
import { DETTE_STATUT_LABELS, DetteStatut } from '../../core/domain/enums';

@Pipe({ name: 'statutDette' })
export class StatutDettePipe implements PipeTransform {
  transform(value: DetteStatut | null | undefined): string {
    return value ? DETTE_STATUT_LABELS[value] : '';
  }
}
