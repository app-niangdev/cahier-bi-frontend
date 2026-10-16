import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, forkJoin } from 'rxjs';
import { AuthStore } from '../../../core/auth/auth.store';
import { ROLE_LABELS, Role, toOptions } from '../../../core/domain/enums';
import { formatTelephone, telephoneSnValidator } from '../../../core/utils/telephone';
import { AvatarComponent } from '../../../shared/components/avatar.component';
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
import { AdminBoutique, AdminTenant, AdminUser, UserAcces } from '../domain/admin.models';
import { ADMIN_BOUTIQUE_REPOSITORY, ADMIN_REPOSITORY, ADMIN_TENANT_REPOSITORY } from '../domain/admin.repository';

const ROLE_TONES: Record<Role, Tone> = { ADMIN: 'danger', PROPRIETAIRE: 'brand', GERANT: 'info' };

@Component({
  selector: 'app-admin-utilisateurs-page',
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
    AvatarComponent,
    IconComponent,
    TelephoneInputDirective,
    AutofocusDirective,
    TelephonePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Utilisateurs" subtitle="Administrateurs, propriétaires et gérants">
      <button type="button" class="btn btn-primary" [disabled]="!data.data()" (click)="ouvrir(null)"><app-icon name="plus" [size]="18" /> Ajouter</button>
    </app-page-header>

    <div class="mb-4 grid gap-3 sm:grid-cols-[1fr_12rem_12rem]">
      <app-search-input label="Rechercher un utilisateur" placeholder="Nom, téléphone, e-mail…" [(value)]="recherche" />
      <app-filter-select label="Rôle" allLabel="Tous les rôles" [options]="roles" [(value)]="roleFiltre" />
      <app-filter-select label="Statut" allLabel="Tous" [options]="statuts" [(value)]="statutFiltre" />
    </div>

    @if (data.initialLoading()) {
      <app-skeleton [rows]="6" />
    } @else if (data.error()) {
      <app-error-state [message]="data.error()" (retry)="data.reload()" />
    } @else if (lignes().length === 0) {
      <div class="card"><app-empty-state icon="users" title="Aucun utilisateur" message="Aucun compte ne correspond à ces critères." /></div>
    } @else {
      <app-data-table caption="Liste des utilisateurs" [rows]="lignes()" [columns]="columns" [dimmed]="estInactif">
        <ng-template appCell="name" let-u>
          <span class="flex items-center gap-3">
            <app-avatar [name]="u.full_name" [size]="32" />
            <span>
              <span class="block font-medium text-ink-900">{{ u.full_name }}</span>
              <span class="block text-xs text-ink-500">{{ u.role?.name === 'ADMIN' ? u.email : (u.phone_one | telephone) }}</span>
            </span>
          </span>
        </ng-template>
        <ng-template appCell="role" let-u>
          @if (u.role) {
            <app-badge [tone]="roleTone(u.role.name)">{{ roleLabel(u.role.name) }}</app-badge>
          }
        </ng-template>
        <ng-template appCell="rattachement" let-u>{{ rattachement(u) }}</ng-template>
        <ng-template appCell="status" let-u>
          @if (u.deleted_at) {
            <app-badge tone="neutral">Supprimé</app-badge>
          } @else {
            <span class="flex flex-wrap gap-1">
              <app-badge [tone]="u.status ? 'ok' : 'neutral'">{{ u.status ? 'Actif' : 'Désactivé' }}</app-badge>
              @if (u.must_change_password) {
                <app-badge tone="warn">Mot de passe provisoire</app-badge>
              }
            </span>
          }
        </ng-template>
        <ng-template appCell="actions" let-u>
          <div class="flex flex-wrap justify-end gap-2">
            @if (u.deleted_at) {
              <button type="button" class="btn btn-secondary btn-sm" [disabled]="action.pending()" (click)="restaurer(u)">Restaurer</button>
            } @else {
              <button type="button" class="btn btn-secondary btn-sm" (click)="ouvrir(u)" [attr.aria-label]="'Modifier ' + u.full_name">Modifier</button>
              @if (u.id !== auth.user()?.id) {
                <button type="button" class="btn btn-secondary btn-sm" [disabled]="action.pending()" (click)="basculer(u)">
                  {{ u.status ? 'Désactiver' : 'Activer' }}
                </button>
              }
              <button type="button" class="btn btn-secondary btn-sm" [disabled]="action.pending()" (click)="reinitialiser(u)">Réinitialiser l'accès</button>
              @if (u.id !== auth.user()?.id) {
                <button type="button" class="btn btn-secondary btn-sm text-danger-700" [disabled]="action.pending()" (click)="supprimer(u)">Supprimer</button>
              }
            }
          </div>
        </ng-template>
      </app-data-table>
    }

    <app-modal [open]="formOpen()" [title]="edition() ? 'Modifier l’utilisateur' : 'Ajouter un utilisateur'" size="lg" (closed)="formOpen.set(false)">
      <form class="grid gap-4 sm:grid-cols-2" [formGroup]="form" (ngSubmit)="enregistrer()" novalidate>
        <div>
          <label class="label" for="u-first">Prénom</label>
          <input id="u-first" class="input" formControlName="first_name" appAutofocus />
          @if (form.controls.first_name.touched && form.controls.first_name.invalid) {
            <p class="field-error">Le prénom est obligatoire.</p>
          }
        </div>
        <div>
          <label class="label" for="u-last">Nom</label>
          <input id="u-last" class="input" formControlName="last_name" />
          @if (form.controls.last_name.touched && form.controls.last_name.invalid) {
            <p class="field-error">Le nom est obligatoire.</p>
          }
        </div>
        <div>
          <label class="label" for="u-role">Rôle</label>
          <select id="u-role" class="input" formControlName="role" aria-describedby="u-role-help">
            @for (r of roles; track r.value) {
              <option [value]="r.value">{{ r.label }}</option>
            }
          </select>
          @if (edition()?.role?.name === 'GERANT') {
            <p id="u-role-help" class="mt-1 text-xs text-ink-500">Le rôle d'un gérant ne change pas.</p>
          }
        </div>
        <div>
          <label class="label" for="u-tel">{{ valeurs().role === 'ADMIN' ? 'Téléphone' : 'Numéro WhatsApp (identifiant)' }}</label>
          <input id="u-tel" class="input" formControlName="phone_one" appTelephoneInput />
          @if (form.controls.phone_one.touched && form.controls.phone_one.invalid) {
            <p class="field-error">Numéro sénégalais invalide.</p>
          }
        </div>
        <div [class.sm:col-span-2]="valeurs().role === 'ADMIN'">
          <label class="label" for="u-email">E-mail{{ valeurs().role === 'ADMIN' ? ' (identifiant)' : ' (facultatif)' }}</label>
          <input id="u-email" type="email" class="input" formControlName="email" />
          @if (form.controls.email.touched && form.controls.email.invalid) {
            <p class="field-error">{{ valeurs().role === 'ADMIN' ? 'L’e-mail est obligatoire pour un administrateur.' : 'Adresse e-mail invalide.' }}</p>
          }
        </div>
        @if (valeurs().role === 'PROPRIETAIRE') {
          <div>
            <label class="label" for="u-tenant">Compte (tenant)</label>
            <select id="u-tenant" class="input" formControlName="tenant_id">
              <option [ngValue]="null" disabled>Choisir…</option>
              @for (t of tenantsActifs(); track t.id) {
                <option [ngValue]="t.id">{{ t.name }}</option>
              }
            </select>
            @if (form.controls.tenant_id.touched && form.controls.tenant_id.invalid) {
              <p class="field-error">Choisissez le compte.</p>
            }
          </div>
        }
        @if (valeurs().role === 'GERANT') {
          <div>
            <label class="label" for="u-boutique">Boutique</label>
            <select id="u-boutique" class="input" formControlName="boutique_id">
              <option [ngValue]="null" disabled>Choisir…</option>
              @for (b of boutiquesActives(); track b.id) {
                <option [ngValue]="b.id">{{ b.nom }} ({{ b.tenant?.name }})</option>
              }
            </select>
            @if (form.controls.boutique_id.touched && form.controls.boutique_id.invalid) {
              <p class="field-error">Choisissez la boutique.</p>
            }
          </div>
        }
        @if (!edition()) {
          <p class="text-xs text-ink-500 sm:col-span-2">
            Un mot de passe provisoire est généré. Propriétaire et gérant confirment leur numéro par un code WhatsApp à la première connexion.
          </p>
        }
        <div class="flex justify-end gap-2 border-t border-ink-100 pt-4 sm:col-span-2">
          <button type="button" class="btn btn-secondary" (click)="formOpen.set(false)">Annuler</button>
          <button type="submit" class="btn btn-primary" [disabled]="action.pending()">{{ edition() ? 'Enregistrer' : 'Créer le compte' }}</button>
        </div>
      </form>
    </app-modal>

    <app-modal [open]="acces() !== null" title="Mot de passe provisoire" (closed)="acces.set(null)">
      @if (acces(); as a) {
        <p class="text-sm text-ink-700">
          Communiquez ce mot de passe à <strong>{{ a.user.full_name }}</strong>
          ({{ a.user.role?.name === 'ADMIN' ? a.user.email : (a.user.phone_one | telephone) }}). Il devra le changer à sa prochaine connexion.
        </p>
        <p class="mt-3 rounded-lg bg-ink-50 p-4 text-center font-mono text-xl font-bold">{{ a.mot_de_passe_provisoire }}</p>
        <div class="mt-4 flex justify-end"><button type="button" class="btn btn-primary" (click)="acces.set(null)">J'ai noté</button></div>
      }
    </app-modal>
  `,
})
export class AdminUtilisateursPage {
  private readonly repo = inject(ADMIN_REPOSITORY);
  private readonly tenants = inject(ADMIN_TENANT_REPOSITORY);
  private readonly boutiques = inject(ADMIN_BOUTIQUE_REPOSITORY);
  private readonly confirm = inject(ConfirmService);
  protected readonly auth = inject(AuthStore);
  protected readonly action = new ActionRunner(inject(ToastService));

  protected readonly data = new Loadable<{ users: AdminUser[]; tenants: AdminTenant[]; boutiques: AdminBoutique[] }>();
  protected readonly recherche = signal('');
  protected readonly roleFiltre = signal('');
  protected readonly statutFiltre = signal('');
  protected readonly formOpen = signal(false);
  protected readonly edition = signal<AdminUser | null>(null);
  protected readonly acces = signal<UserAcces | null>(null);

  protected readonly roles = toOptions(ROLE_LABELS);
  protected readonly statuts = [
    { value: 'actif', label: 'Actifs' },
    { value: 'inactif', label: 'Désactivés' },
    { value: 'provisoire', label: 'Mot de passe provisoire' },
    { value: 'supprime', label: 'Supprimés' },
  ];
  protected readonly columns: TableColumn[] = [
    { key: 'name', label: 'Utilisateur', mobile: 'title' },
    { key: 'role', label: 'Rôle', mobile: 'value' },
    { key: 'rattachement', label: 'Rattachement' },
    { key: 'status', label: 'Statut' },
    { key: 'actions', label: 'Actions', align: 'right', mobile: 'footer' },
  ];
  protected readonly estInactif = (u: AdminUser) => !!u.deleted_at || !u.status;

  protected readonly form = inject(NonNullableFormBuilder).group({
    first_name: ['', Validators.required],
    last_name: ['', Validators.required],
    phone_one: ['', [Validators.required, telephoneSnValidator]],
    email: ['', Validators.email],
    role: ['GERANT' as Role],
    tenant_id: [null as number | null],
    boutique_id: [null as number | null],
  });
  protected readonly valeurs = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  protected readonly tenantsActifs = computed(() => (this.data.data()?.tenants ?? []).filter((t) => !t.deleted_at));
  protected readonly boutiquesActives = computed(() => (this.data.data()?.boutiques ?? []).filter((b) => !b.deleted_at));
  protected readonly lignes = computed(() => {
    const q = this.recherche().trim().toLowerCase();
    const chiffres = q.replace(/\D/g, '');
    const statut = this.statutFiltre();
    return (this.data.data()?.users ?? []).filter(
      (u) =>
        (!this.roleFiltre() || u.role?.name === this.roleFiltre()) &&
        (!statut ||
          (statut === 'supprime' && !!u.deleted_at) ||
          (statut === 'actif' && !u.deleted_at && u.status) ||
          (statut === 'inactif' && !u.deleted_at && !u.status) ||
          (statut === 'provisoire' && !u.deleted_at && u.must_change_password)) &&
        (!q ||
          u.full_name.toLowerCase().includes(q) ||
          (u.email ?? '').toLowerCase().includes(q) ||
          (chiffres.length >= 2 && u.phone_one.includes(chiffres))),
    );
  });

  constructor() {
    this.data.load(() => forkJoin({ users: this.repo.users(), tenants: this.tenants.list(), boutiques: this.boutiques.list() }));
  }

  protected roleTone(role: Role): Tone {
    return ROLE_TONES[role];
  }

  protected roleLabel(role: Role): string {
    return ROLE_LABELS[role];
  }

  protected rattachement(u: AdminUser): string {
    if (u.role?.name === 'ADMIN') return 'Plateforme';
    if (u.role?.name === 'GERANT') return u.boutique ? `${u.boutique.nom}${u.tenant ? ' · ' + u.tenant.name : ''}` : '—';
    return u.tenant?.name ?? '—';
  }

  protected ouvrir(u: AdminUser | null): void {
    this.edition.set(u);
    this.form.reset({
      first_name: u?.first_name ?? '',
      last_name: u?.last_name ?? '',
      phone_one: formatTelephone(u?.phone_one),
      email: u?.email ?? '',
      role: u?.role?.name ?? 'GERANT',
      tenant_id: u?.tenant_id ?? null,
      boutique_id: u?.boutique_id ?? null,
    });
    if (u?.role?.name === 'GERANT') this.form.controls.role.disable();
    else this.form.controls.role.enable();
    this.formOpen.set(true);
  }

  protected enregistrer(): void {
    const v = this.form.getRawValue();
    // Règles de StoreUserRequest selon le rôle
    const { email, tenant_id, boutique_id } = this.form.controls;
    email.setValidators(v.role === 'ADMIN' ? [Validators.required, Validators.email] : Validators.email);
    tenant_id.setValidators(v.role === 'PROPRIETAIRE' ? Validators.required : null);
    boutique_id.setValidators(v.role === 'GERANT' ? Validators.required : null);
    [email, tenant_id, boutique_id].forEach((c) => c.updateValueAndValidity());
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const payload = {
      first_name: v.first_name,
      last_name: v.last_name,
      phone_one: v.phone_one,
      email: v.email || null,
      phone_two: this.edition()?.phone_two ?? null,
      address: this.edition()?.address ?? null,
      role: v.role,
      tenant_id: v.tenant_id,
      boutique_id: v.boutique_id,
    };
    const u = this.edition();
    if (u) {
      this.action.run(this.repo.updateUser(u.id, payload), {
        success: (r) => `${r.full_name} modifié.`,
        onSuccess: () => this.enregistre(),
      });
    } else {
      this.action.run(this.repo.createUser(payload), {
        success: (r) => `Compte de ${r.user.full_name} créé.`,
        onSuccess: (r) => {
          this.enregistre();
          this.acces.set(r);
        },
      });
    }
  }

  protected async basculer(u: AdminUser): Promise<void> {
    if (u.status) {
      const ok = await this.confirm.ask({ title: `Désactiver ${u.full_name} ?`, message: 'Ses sessions sont fermées et il ne pourra plus se connecter.', confirmLabel: 'Désactiver' });
      if (!ok) return;
    }
    this.run(this.repo.toggleUser(u.id), (r) => `${r.full_name} est ${r.status ? 'activé' : 'désactivé'}.`);
  }

  protected async reinitialiser(u: AdminUser): Promise<void> {
    const ok = await this.confirm.ask({
      title: `Réinitialiser l'accès de ${u.full_name} ?`,
      message: 'Un mot de passe provisoire remplacera le mot de passe actuel et ses sessions seront fermées.',
      confirmLabel: 'Réinitialiser',
      danger: false,
    });
    if (ok) this.action.run(this.repo.resetUserAccess(u.id), { onSuccess: (r) => {
      this.acces.set(r);
      this.data.reload(true);
    } });
  }

  protected async supprimer(u: AdminUser): Promise<void> {
    const ok = await this.confirm.ask({
      title: `Supprimer ${u.full_name} ?`,
      message: 'Le compte ne pourra plus se connecter. Il pourra être restauré.',
      confirmLabel: 'Supprimer',
    });
    if (ok) this.run(this.repo.deleteUser(u.id), () => 'Utilisateur supprimé.');
  }

  protected restaurer(u: AdminUser): void {
    this.run(this.repo.restoreUser(u.id), () => `${u.full_name} a été restauré.`);
  }

  private enregistre(): void {
    this.formOpen.set(false);
    this.data.reload(true);
  }

  private run<T>(source: Observable<T>, message: (r: T) => string): void {
    this.action.run(source, { success: message, onSuccess: () => this.data.reload(true) });
  }
}
