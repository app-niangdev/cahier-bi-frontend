import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { BOUTIQUE_STATUT_LABELS, BoutiqueStatut, toOptions } from '../../../core/domain/enums';
import { formatTelephone, telephoneSnValidator } from '../../../core/utils/telephone';
import { BadgeComponent } from '../../../shared/components/badge.component';
import { ConfirmService } from '../../../shared/components/confirm/confirm.service';
import { CellDirective, DataTableComponent, TableColumn } from '../../../shared/components/data-table.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state.component';
import { FilterSelectComponent } from '../../../shared/components/filter-select.component';
import { IconComponent } from '../../../shared/components/icon.component';
import { ModalComponent } from '../../../shared/components/modal.component';
import { PageHeaderComponent } from '../../../shared/components/page-header.component';
import { SearchInputComponent } from '../../../shared/components/search-input.component';
import { SkeletonComponent } from '../../../shared/components/skeleton.component';
import { Tone } from '../../../shared/components/stat-card.component';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { AutofocusDirective } from '../../../shared/directives/autofocus.directive';
import { TelephoneInputDirective } from '../../../shared/directives/telephone-input.directive';
import { TelephonePipe } from '../../../shared/pipes/telephone.pipe';
import { ActionRunner } from '../../../shared/utils/action-runner';
import { Loadable } from '../../../shared/utils/loadable';
import { AdminBoutique, AdminTenant } from '../domain/admin.models';
import { ADMIN_BOUTIQUE_REPOSITORY, ADMIN_TENANT_REPOSITORY } from '../domain/admin.repository';

const STATUT_TONES: Record<BoutiqueStatut, Tone> = { actif: 'ok', inactif: 'neutral', suspendu: 'warn' };

/** Boutiques : créées uniquement par l'administrateur, pour un tenant. */
@Component({
  selector: 'app-admin-boutiques-page',
  imports: [
    ReactiveFormsModule,
    PageHeaderComponent,
    SearchInputComponent,
    FilterSelectComponent,
    DataTableComponent,
    CellDirective,
    SkeletonComponent,
    ErrorStateComponent,
    EmptyStateComponent,
    ModalComponent,
    BadgeComponent,
    IconComponent,
    TelephoneInputDirective,
    AutofocusDirective,
    TelephonePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Boutiques" subtitle="Seul l'administrateur crée les boutiques des propriétaires">
      <button type="button" class="btn btn-primary" [disabled]="!data.data()" (click)="ouvrir(null)"><app-icon name="plus" [size]="18" /> Nouvelle boutique</button>
    </app-page-header>

    <div class="mb-4 grid gap-3 sm:grid-cols-[1fr_14rem_12rem]">
      <app-search-input label="Rechercher une boutique" placeholder="Nom, quartier, ville…" [(value)]="recherche" />
      <app-filter-select label="Tenant" allLabel="Tous les tenants" [options]="tenantOptions()" [(value)]="tenantFiltre" />
      <app-filter-select label="Statut" allLabel="Tous les statuts" [options]="statutOptions" [(value)]="statutFiltre" />
    </div>

    @if (data.initialLoading()) {
      <app-skeleton [rows]="4" />
    } @else if (data.error()) {
      <app-error-state [message]="data.error()" (retry)="data.reload()" />
    } @else if (lignes().length === 0) {
      <div class="card"><app-empty-state icon="store" title="Aucune boutique" message="Aucune boutique ne correspond à ces critères." /></div>
    } @else {
      <app-data-table caption="Liste des boutiques" [rows]="lignes()" [columns]="columns" [dimmed]="estSupprimee">
        <ng-template appCell="nom" let-b>
          <span class="font-medium text-ink-900">{{ b.nom }}</span>
          <span class="block text-xs text-ink-500">{{ lieu(b) }}</span>
        </ng-template>
        <ng-template appCell="tenant" let-b>{{ b.tenant?.name ?? '—' }}</ng-template>
        <ng-template appCell="gerants" let-b>{{ b.gerants_count ?? 0 }}</ng-template>
        <ng-template appCell="telephone" let-b>{{ (b.telephone | telephone) || '—' }}</ng-template>
        <ng-template appCell="statut" let-b>
          @if (b.deleted_at) {
            <app-badge tone="neutral">Supprimée</app-badge>
          } @else {
            <app-badge [tone]="statutTone(b.statut)">{{ statutLabel(b.statut) }}</app-badge>
          }
        </ng-template>
        <ng-template appCell="actions" let-b>
          <div class="flex flex-wrap justify-end gap-2">
            @if (b.deleted_at) {
              <button type="button" class="btn btn-secondary btn-sm" [disabled]="action.pending()" (click)="restaurer(b)">Restaurer</button>
            } @else {
              <button type="button" class="btn btn-secondary btn-sm" (click)="ouvrir(b)" [attr.aria-label]="'Modifier ' + b.nom">Modifier</button>
              <button type="button" class="btn btn-secondary btn-sm text-danger-700" [disabled]="action.pending()" (click)="supprimer(b)">Supprimer</button>
            }
          </div>
        </ng-template>
      </app-data-table>
    }

    <app-modal [open]="formOpen()" [title]="edition() ? 'Modifier la boutique' : 'Nouvelle boutique'" size="lg" (closed)="formOpen.set(false)">
      <form class="grid gap-4 sm:grid-cols-2" [formGroup]="form" (ngSubmit)="enregistrer()" novalidate>
        <div class="sm:col-span-2">
          <label class="label" for="b-tenant">Propriétaire (tenant)</label>
          <select id="b-tenant" class="input" formControlName="tenant_id" aria-describedby="b-tenant-help">
            <option [ngValue]="null" disabled>Choisir…</option>
            @for (t of tenantsActifs(); track t.id) {
              <option [ngValue]="t.id">{{ t.name }}</option>
            }
          </select>
          @if (edition()) {
            <p id="b-tenant-help" class="mt-1 text-xs text-ink-500">Une boutique ne change pas de propriétaire.</p>
          }
          @if (form.controls.tenant_id.touched && form.controls.tenant_id.invalid) {
            <p class="field-error">Choisissez le propriétaire.</p>
          }
        </div>
        <div class="sm:col-span-2">
          <label class="label" for="b-nom">Nom de la boutique</label>
          <input id="b-nom" class="input" formControlName="nom" appAutofocus />
          @if (form.controls.nom.touched && form.controls.nom.invalid) {
            <p class="field-error">Le nom est obligatoire.</p>
          }
        </div>
        <div>
          <label class="label" for="b-tel">Téléphone</label>
          <input id="b-tel" class="input" formControlName="telephone" appTelephoneInput />
          @if (form.controls.telephone.touched && form.controls.telephone.invalid) {
            <p class="field-error">Numéro sénégalais invalide.</p>
          }
        </div>
        <div>
          <label class="label" for="b-wa">WhatsApp</label>
          <input id="b-wa" class="input" formControlName="whatsapp" appTelephoneInput />
          @if (form.controls.whatsapp.touched && form.controls.whatsapp.invalid) {
            <p class="field-error">Numéro sénégalais invalide.</p>
          }
        </div>
        <div class="sm:col-span-2">
          <label class="label" for="b-adresse">Adresse</label>
          <input id="b-adresse" class="input" formControlName="adresse" />
        </div>
        <div>
          <label class="label" for="b-quartier">Quartier</label>
          <input id="b-quartier" class="input" formControlName="quartier" placeholder="Médina, Grand Yoff…" />
        </div>
        <div>
          <label class="label" for="b-ville">Ville</label>
          <input id="b-ville" class="input" formControlName="ville" list="villes" />
          <datalist id="villes">
            @for (v of villes; track v) {
              <option [value]="v"></option>
            }
          </datalist>
        </div>
        <div>
          <label class="label" for="b-statut">Statut</label>
          <select id="b-statut" class="input" formControlName="statut">
            @for (s of statutOptions; track s.value) {
              <option [value]="s.value">{{ s.label }}</option>
            }
          </select>
        </div>
        <div class="flex items-end justify-end gap-2 sm:col-span-2">
          <button type="button" class="btn btn-secondary" (click)="formOpen.set(false)">Annuler</button>
          <button type="submit" class="btn btn-primary" [disabled]="action.pending()">{{ action.pending() ? 'Enregistrement…' : 'Enregistrer' }}</button>
        </div>
      </form>
    </app-modal>
  `,
})
export class AdminBoutiquesPage {
  private readonly repo = inject(ADMIN_BOUTIQUE_REPOSITORY);
  private readonly tenants = inject(ADMIN_TENANT_REPOSITORY);
  private readonly confirm = inject(ConfirmService);
  protected readonly action = new ActionRunner(inject(ToastService));

  /** ?tenant=1 */
  readonly tenant = input<string | undefined>();

  protected readonly data = new Loadable<{ boutiques: AdminBoutique[]; tenants: AdminTenant[] }>();
  protected readonly recherche = signal('');
  protected readonly tenantFiltre = signal('');
  protected readonly statutFiltre = signal('');
  protected readonly formOpen = signal(false);
  protected readonly edition = signal<AdminBoutique | null>(null);

  protected readonly statutOptions = toOptions(BOUTIQUE_STATUT_LABELS);
  protected readonly villes = ['Dakar', 'Thiès', 'Pikine', 'Guédiawaye', 'Rufisque', 'Mbour', 'Saint-Louis', 'Kaolack', 'Touba', 'Ziguinchor'];
  protected readonly columns: TableColumn[] = [
    { key: 'nom', label: 'Boutique', mobile: 'title' },
    { key: 'tenant', label: 'Propriétaire' },
    { key: 'gerants', label: 'Gérants', align: 'right' },
    { key: 'telephone', label: 'Téléphone' },
    { key: 'statut', label: 'Statut', mobile: 'value' },
    { key: 'actions', label: 'Actions', align: 'right', mobile: 'footer' },
  ];
  protected readonly estSupprimee = (b: AdminBoutique) => !!b.deleted_at;

  protected readonly form = inject(NonNullableFormBuilder).group({
    tenant_id: [null as number | null, Validators.required],
    nom: ['', Validators.required],
    telephone: ['', telephoneSnValidator],
    whatsapp: ['', telephoneSnValidator],
    adresse: [''],
    quartier: [''],
    ville: ['Dakar'],
    statut: ['actif' as BoutiqueStatut],
  });

  protected readonly tenantOptions = computed(() => (this.data.data()?.tenants ?? []).map((t) => ({ value: String(t.id), label: t.name })));
  protected readonly tenantsActifs = computed(() => (this.data.data()?.tenants ?? []).filter((t) => !t.deleted_at || t.id === this.edition()?.tenant_id));
  protected readonly lignes = computed(() => {
    const q = this.recherche().trim().toLowerCase();
    return (this.data.data()?.boutiques ?? []).filter(
      (b) =>
        (!this.tenantFiltre() || b.tenant_id === Number(this.tenantFiltre())) &&
        (!this.statutFiltre() || b.statut === this.statutFiltre()) &&
        (!q || [b.nom, b.quartier ?? '', b.ville ?? ''].some((v) => v.toLowerCase().includes(q))),
    );
  });

  constructor() {
    this.data.load(() => forkJoin({ boutiques: this.repo.list(), tenants: this.tenants.list() }));
    effect(() => {
      const t = this.tenant();
      if (t) untracked(() => this.tenantFiltre.set(t));
    });
  }

  protected statutTone(statut: BoutiqueStatut): Tone {
    return STATUT_TONES[statut];
  }

  protected statutLabel(statut: BoutiqueStatut): string {
    return BOUTIQUE_STATUT_LABELS[statut];
  }

  protected lieu(b: AdminBoutique): string {
    return [b.quartier, b.ville].filter((v) => !!v).join(', ') || '—';
  }

  protected ouvrir(b: AdminBoutique | null): void {
    this.edition.set(b);
    this.form.reset({
      tenant_id: b?.tenant_id ?? (this.tenantFiltre() ? Number(this.tenantFiltre()) : null),
      nom: b?.nom ?? '',
      telephone: formatTelephone(b?.telephone),
      whatsapp: formatTelephone(b?.whatsapp),
      adresse: b?.adresse ?? '',
      quartier: b?.quartier ?? '',
      ville: b?.ville ?? 'Dakar',
      statut: b?.statut ?? 'actif',
    });
    if (b) this.form.controls.tenant_id.disable();
    else this.form.controls.tenant_id.enable();
    this.formOpen.set(true);
  }

  protected enregistrer(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const payload = {
      nom: v.nom.trim(),
      telephone: v.telephone || null,
      whatsapp: v.whatsapp || null,
      adresse: v.adresse.trim() || null,
      quartier: v.quartier.trim() || null,
      ville: v.ville.trim() || null,
      statut: v.statut,
    };
    const b = this.edition();
    this.action.run(b ? this.repo.update(b.id, payload) : this.repo.create({ ...payload, tenant_id: v.tenant_id as number }), {
      success: (r) => (b ? `${r.nom} modifiée.` : `${r.nom} créée.`),
      onSuccess: () => {
        this.formOpen.set(false);
        this.data.reload(true);
      },
    });
  }

  protected async supprimer(b: AdminBoutique): Promise<void> {
    const ok = await this.confirm.ask({
      title: `Supprimer ${b.nom} ?`,
      message: 'Ses gérants ne pourront plus se connecter et le propriétaire ne la verra plus. Elle pourra être restaurée.',
      confirmLabel: 'Supprimer',
    });
    if (ok) this.action.run(this.repo.delete(b.id), { success: 'Boutique supprimée.', onSuccess: () => this.data.reload(true) });
  }

  protected restaurer(b: AdminBoutique): void {
    this.action.run(this.repo.restore(b.id), { success: `${b.nom} restaurée.`, onSuccess: () => this.data.reload(true) });
  }
}
