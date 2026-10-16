import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state.component';
import { SkeletonComponent } from '../../shared/components/skeleton.component';
import { BoutiqueContextStore } from './boutique-context.store';

/** Affiché à la place d'une page quand aucune boutique de travail n'est disponible. */
@Component({
  selector: 'app-no-boutique',
  imports: [EmptyStateComponent, ErrorStateComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (ctx.loading()) {
      <app-skeleton />
    } @else if (ctx.error()) {
      <app-error-state title="Impossible de charger vos boutiques" [message]="ctx.error()" (retry)="ctx.load()" />
    } @else {
      <div class="card">
        <app-empty-state
          icon="store"
          title="Aucune boutique pour le moment"
          message="Les boutiques sont créées par l'administrateur de Cahier Bi. Contactez le support pour ouvrir votre première boutique."
        />
      </div>
    }
  `,
})
export class NoBoutiqueComponent {
  protected readonly ctx = inject(BoutiqueContextStore);
}
