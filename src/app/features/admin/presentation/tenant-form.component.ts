import { ChangeDetectionStrategy, Component, effect, inject, input, output, untracked } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { formatTelephone, telephoneSnValidator } from '../../../core/utils/telephone';
import { slugify } from '../../../core/utils/random';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { AutofocusDirective } from '../../../shared/directives/autofocus.directive';
import { TelephoneInputDirective } from '../../../shared/directives/telephone-input.directive';
import { ActionRunner } from '../../../shared/utils/action-runner';
import { AdminTenant } from '../domain/admin.models';
import { ADMIN_TENANT_REPOSITORY } from '../domain/admin.repository';

/** Création (avec période d'essai offerte) ou modification d'un tenant. */
@Component({
  selector: 'app-tenant-form',
  imports: [ReactiveFormsModule, AutofocusDirective, TelephoneInputDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="grid gap-4 sm:grid-cols-2" [formGroup]="form" (ngSubmit)="enregistrer()" novalidate>
      <div class="sm:col-span-2">
        <label class="label" for="t-name">Nom du commerce</label>
        <input id="t-name" class="input" formControlName="name" appAutofocus (input)="proposerCode()" />
        @if (form.controls.name.touched && form.controls.name.invalid) {
          <p class="field-error">Le nom est obligatoire.</p>
        }
      </div>
      <div>
        <label class="label" for="t-code">Code (identifiant unique)</label>
        <input id="t-code" class="input font-mono" formControlName="code_website" (input)="codeManuel = true" />
        @if (form.controls.code_website.touched && form.controls.code_website.invalid) {
          <p class="field-error">Le code est obligatoire.</p>
        }
      </div>
      <div>
        <label class="label" for="t-short">Nom court</label>
        <input id="t-short" class="input" formControlName="short_name" />
      </div>
      <div>
        <label class="label" for="t-wa">WhatsApp</label>
        <input id="t-wa" class="input" formControlName="phone_whatsapp" appTelephoneInput />
        @if (form.controls.phone_whatsapp.touched && form.controls.phone_whatsapp.invalid) {
          <p class="field-error">Numéro sénégalais invalide.</p>
        }
      </div>
      <div>
        <label class="label" for="t-call">Téléphone</label>
        <input id="t-call" class="input" formControlName="phone_call" appTelephoneInput />
        @if (form.controls.phone_call.touched && form.controls.phone_call.invalid) {
          <p class="field-error">Numéro sénégalais invalide.</p>
        }
      </div>
      <div>
        <label class="label" for="t-email">E-mail</label>
        <input id="t-email" type="email" class="input" formControlName="email" />
        @if (form.controls.email.touched && form.controls.email.invalid) {
          <p class="field-error">Adresse e-mail invalide.</p>
        }
      </div>
      <div>
        <label class="label" for="t-trade">Activité</label>
        <input id="t-trade" class="input" formControlName="trade" placeholder="Alimentation, quincaillerie…" />
      </div>
      <div class="sm:col-span-2">
        <label class="label" for="t-address">Adresse</label>
        <input id="t-address" class="input" formControlName="address" />
      </div>
      <div>
        <label class="label" for="t-ninea">NINEA</label>
        <input id="t-ninea" class="input" formControlName="ninea" />
      </div>
      <div>
        <label class="label" for="t-rccm">RCCM</label>
        <input id="t-rccm" class="input" formControlName="rccm" />
      </div>
      @if (!tenant()) {
        <p class="text-xs text-ink-500 sm:col-span-2">Une période d'essai est offerte à la création. Ajoutez ensuite le compte propriétaire dans Utilisateurs.</p>
      }
      <div class="flex justify-end gap-2 sm:col-span-2">
        <button type="button" class="btn btn-secondary" (click)="cancelled.emit()">Annuler</button>
        <button type="submit" class="btn btn-primary" [disabled]="action.pending()">{{ action.pending() ? 'Enregistrement…' : 'Enregistrer' }}</button>
      </div>
    </form>
  `,
})
export class TenantFormComponent {
  private readonly repo = inject(ADMIN_TENANT_REPOSITORY);
  protected readonly action = new ActionRunner(inject(ToastService));

  /** null : création */
  readonly tenant = input<AdminTenant | null>(null);
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  protected codeManuel = false;
  protected readonly form = inject(NonNullableFormBuilder).group({
    name: ['', Validators.required],
    code_website: ['', Validators.required],
    short_name: [''],
    phone_whatsapp: ['', telephoneSnValidator],
    phone_call: ['', telephoneSnValidator],
    email: ['', Validators.email],
    trade: [''],
    address: [''],
    ninea: [''],
    rccm: [''],
  });

  constructor() {
    effect(() => {
      const t = this.tenant();
      untracked(() => {
        this.codeManuel = !!t;
        this.form.reset({
          name: t?.name ?? '',
          code_website: t?.code_website ?? '',
          short_name: t?.short_name ?? '',
          phone_whatsapp: formatTelephone(t?.phone_whatsapp),
          phone_call: formatTelephone(t?.phone_call),
          email: t?.email ?? '',
          trade: t?.trade ?? '',
          address: t?.address ?? '',
          ninea: t?.ninea ?? '',
          rccm: t?.rccm ?? '',
        });
      });
    });
  }

  protected proposerCode(): void {
    if (!this.codeManuel) this.form.controls.code_website.setValue(slugify(this.form.controls.name.value).slice(0, 60));
  }

  protected enregistrer(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const payload = {
      name: v.name.trim(),
      code_website: v.code_website.trim(),
      short_name: v.short_name.trim() || null,
      phone_whatsapp: v.phone_whatsapp || null,
      phone_call: v.phone_call || null,
      email: v.email.trim() || null,
      trade: v.trade.trim() || null,
      address: v.address.trim() || null,
      ninea: v.ninea.trim() || null,
      rccm: v.rccm.trim() || null,
    };
    const t = this.tenant();
    this.action.run(t ? this.repo.update(t.id, payload) : this.repo.create(payload), {
      success: t ? `${payload.name} modifié.` : `${payload.name} créé avec sa période d'essai.`,
      onSuccess: () => this.saved.emit(),
    });
  }
}
