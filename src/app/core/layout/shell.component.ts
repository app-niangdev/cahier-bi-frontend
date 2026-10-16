import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { AvatarComponent } from '../../shared/components/avatar.component';
import { IconComponent, IconName } from '../../shared/components/icon.component';
import { ToastService } from '../../shared/components/toast/toast.service';
import { AuthStore } from '../auth/auth.store';
import { LogoutService } from '../auth/logout.service';
import { BoutiqueContextStore } from '../boutique/boutique-context.store';
import { ApiSimulator } from '../data/api-simulator';
import { ROLE_LABELS, Role } from '../domain/enums';

interface NavItem {
  label: string;
  short?: string;
  icon: IconName;
  link: string;
  exact?: boolean;
  roles?: Role[];
}

const APP_NAV: NavItem[] = [
  { label: 'Tableau de bord', short: 'Accueil', icon: 'dashboard', link: '/app', exact: true },
  { label: 'Clients', icon: 'users', link: '/app/clients' },
  { label: 'Dettes', icon: 'book', link: '/app/dettes' },
  { label: 'Versements', icon: 'wallet', link: '/app/versements' },
  { label: 'Rappels', icon: 'bell', link: '/app/rappels' },
  { label: 'Gérants', icon: 'user-cog', link: '/app/gerants', roles: ['PROPRIETAIRE'] },
  { label: 'Mon entreprise', icon: 'building', link: '/app/entreprise', roles: ['PROPRIETAIRE'] },
  { label: 'Mon profil', icon: 'user', link: '/app/profil' },
];

const ADMIN_NAV: NavItem[] = [
  { label: 'Tableau de bord', short: 'Accueil', icon: 'dashboard', link: '/admin', exact: true },
  { label: 'Tenants', icon: 'building', link: '/admin/tenants' },
  { label: 'Boutiques', icon: 'store', link: '/admin/boutiques' },
  { label: 'Forfaits', icon: 'package', link: '/admin/forfaits' },
  { label: 'Abonnements', icon: 'card', link: '/admin/abonnements' },
  { label: 'Utilisateurs', icon: 'users', link: '/admin/utilisateurs' },
  { label: 'Mon profil', icon: 'user', link: '/admin/profil' },
];

/**
 * Layout des espaces connectés : sidebar sur desktop,
 * drawer + barre de navigation basse sur mobile.
 */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent, AvatarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'closeMenus()' },
  template: `
    <a href="#contenu" class="sr-only z-[60] rounded bg-white px-4 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2">
      Aller au contenu
    </a>

    <div class="min-h-dvh lg:flex">
      <!-- Voile du drawer mobile -->
      @if (drawerOpen()) {
        <button
          type="button"
          class="fixed inset-0 z-40 bg-ink-900/50 lg:hidden"
          aria-label="Fermer le menu"
          (click)="drawerOpen.set(false)"
        ></button>
      }

      <!-- Sidebar (desktop) / drawer (mobile) -->
      <aside
        id="navigation"
        class="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-ink-200 bg-white transition-transform duration-200 lg:sticky lg:top-0 lg:h-dvh lg:w-64 lg:translate-x-0"
        [class.-translate-x-full]="!drawerOpen()"
        [attr.aria-label]="'Navigation principale'"
      >
        <div class="flex items-center justify-between gap-2 border-b border-ink-200 px-5 py-4">
          <a [routerLink]="homeLink()" class="flex items-center gap-2.5" (click)="drawerOpen.set(false)">
            <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-lg font-bold text-white" aria-hidden="true">B</span>
            <span>
              <span class="block leading-tight font-bold text-ink-900">Cahier Bi</span>
              <span class="block text-xs text-ink-500">{{ isAdmin() ? 'Administration' : roleLabel() }}</span>
            </span>
          </a>
          <button type="button" class="btn-ghost rounded-lg p-2 lg:hidden" aria-label="Fermer le menu" (click)="drawerOpen.set(false)">
            <app-icon name="x" />
          </button>
        </div>

        @if (!isAdmin()) {
          <div class="border-b border-ink-200 px-4 py-3">
            @if (ctx.canSwitch()) {
              <label for="boutique-select" class="mb-1 block text-xs font-medium text-ink-500">Boutique</label>
              <select id="boutique-select" class="input py-2" [value]="ctx.currentId()" (change)="selectBoutique($event)">
                @for (b of ctx.boutiques(); track b.id) {
                  <option [value]="b.id" [selected]="b.id === ctx.currentId()">{{ b.nom }}</option>
                }
              </select>
            } @else {
              <p class="text-xs font-medium text-ink-500">Boutique</p>
              <p class="flex items-center gap-2 text-sm font-semibold text-ink-800">
                <app-icon name="store" [size]="16" />
                {{ ctx.current()?.nom ?? (ctx.loading() ? 'Chargement…' : 'Aucune boutique') }}
              </p>
            }
          </div>
        }

        <nav class="flex-1 space-y-1 overflow-y-auto px-3 py-3" aria-label="Menu">
          @for (item of nav(); track item.link) {
            <a
              [routerLink]="item.link"
              routerLinkActive="bg-brand-50 font-semibold text-brand-700"
              [routerLinkActiveOptions]="{ exact: !!item.exact }"
              ariaCurrentWhenActive="page"
              class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ink-700 hover:bg-ink-100"
              (click)="drawerOpen.set(false)"
            >
              <app-icon [name]="item.icon" />
              {{ item.label }}
            </a>
          }
        </nav>

        <div class="border-t border-ink-200 p-3">
          <div class="flex items-center gap-3 px-2 py-2">
            <app-avatar [name]="nomComplet()" [size]="34" />
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-semibold text-ink-900">{{ nomComplet() }}</p>
              <p class="truncate text-xs text-ink-500">{{ roleLabel() }}</p>
            </div>
          </div>
          <button type="button" class="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ink-700 hover:bg-ink-100" (click)="logout()">
            <app-icon name="logout" />
            Déconnexion
          </button>
        </div>
      </aside>

      <div class="flex min-w-0 flex-1 flex-col">
        <header class="sticky top-0 z-30 flex items-center gap-3 border-b border-ink-200 bg-white/95 px-4 py-3 backdrop-blur lg:px-8">
          <button
            type="button"
            class="btn-ghost -ml-2 rounded-lg p-2 lg:hidden"
            aria-controls="navigation"
            [attr.aria-expanded]="drawerOpen()"
            aria-label="Ouvrir le menu"
            (click)="drawerOpen.set(true)"
          >
            <app-icon name="menu" />
          </button>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold text-ink-900 lg:text-base">
              {{ isAdmin() ? 'Administration de la plateforme' : (ctx.current()?.nom ?? 'Cahier Bi') }}
            </p>
            @if (!isAdmin() && ctx.current(); as b) {
              <p class="truncate text-xs text-ink-500">{{ b.quartier }}, {{ b.ville }}</p>
            }
          </div>

          <div class="relative">
            <button
              type="button"
              class="flex items-center gap-2 rounded-lg p-1 hover:bg-ink-100"
              aria-haspopup="true"
              aria-controls="user-menu"
              [attr.aria-expanded]="userMenuOpen()"
              (click)="userMenuOpen.set(!userMenuOpen())"
            >
              <app-avatar [name]="nomComplet()" [size]="32" />
              <span class="hidden max-w-[12rem] text-left leading-tight sm:block">
                <span class="block truncate text-sm font-semibold text-ink-900">{{ nomComplet() }}</span>
                <span class="block truncate text-xs text-ink-500">{{ roleLabel() }}</span>
              </span>
              <span class="sr-only">Menu utilisateur</span>
              <app-icon name="chevron-down" [size]="16" class="hidden text-ink-500 sm:inline-flex" />
            </button>
            @if (userMenuOpen()) {
              <div id="user-menu" class="card absolute right-0 z-50 mt-2 w-72 p-2 shadow-lg">
                <div class="border-b border-ink-100 px-3 pt-1 pb-3">
                  <p class="text-sm font-semibold text-ink-900">{{ nomComplet() }}</p>
                  <p class="text-xs text-ink-500">{{ roleLabel() }}{{ auth.tenant() ? ' · ' + auth.tenant()?.name : '' }}</p>
                </div>
                <a [routerLink]="profilLink()" class="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-ink-100" (click)="userMenuOpen.set(false)">
                  <app-icon name="user" [size]="18" /> Mon profil
                </a>
                <button type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-ink-100" (click)="simulerErreur()">
                  <app-icon name="alert" [size]="18" />
                  <span>
                    Simuler une erreur
                    <span class="block text-xs text-ink-500">Le prochain appel échouera</span>
                  </span>
                </button>
                <button type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-danger-700 hover:bg-danger-50" (click)="logout()">
                  <app-icon name="logout" [size]="18" /> Déconnexion
                </button>
              </div>
            }
          </div>
        </header>

        <main id="contenu" tabindex="-1" class="mx-auto w-full max-w-7xl flex-1 px-4 pt-6 pb-28 outline-none lg:px-8 lg:pb-10">
          <router-outlet />
        </main>
      </div>
    </div>

    <!-- Barre de navigation basse (mobile) -->
    <nav class="fixed inset-x-0 bottom-0 z-30 border-t border-ink-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label="Navigation rapide">
      <ul class="grid grid-cols-5">
        @for (item of bottomNav(); track item.link) {
          <li>
            <a
              [routerLink]="item.link"
              routerLinkActive="text-brand-700"
              [routerLinkActiveOptions]="{ exact: !!item.exact }"
              ariaCurrentWhenActive="page"
              class="flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-ink-500"
            >
              <app-icon [name]="item.icon" [size]="22" />
              {{ item.short ?? item.label }}
            </a>
          </li>
        }
        <li>
          <button
            type="button"
            class="flex w-full flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-ink-500"
            aria-controls="navigation"
            [attr.aria-expanded]="drawerOpen()"
            (click)="drawerOpen.set(true)"
          >
            <app-icon name="more" [size]="22" />
            Plus
          </button>
        </li>
      </ul>
    </nav>
  `,
})
export class ShellComponent {
  protected readonly auth = inject(AuthStore);
  protected readonly ctx = inject(BoutiqueContextStore);
  private readonly router = inject(Router);
  private readonly logoutService = inject(LogoutService);
  private readonly api = inject(ApiSimulator);
  private readonly toast = inject(ToastService);
  private readonly space = inject(ActivatedRoute).snapshot.data['space'] as 'app' | 'admin';

  protected readonly drawerOpen = signal(false);
  protected readonly userMenuOpen = signal(false);

  protected readonly isAdmin = computed(() => this.space === 'admin');
  protected readonly roleLabel = computed(() => {
    const role = this.auth.role();
    return role ? ROLE_LABELS[role] : '';
  });
  /** Prénom et nom de l'utilisateur connecté */
  protected readonly nomComplet = computed(() => {
    const user = this.auth.user();
    if (!user) return '';
    return [user.first_name, user.last_name].filter((v) => !!v).join(' ') || user.name;
  });
  protected readonly homeLink = computed(() => (this.isAdmin() ? '/admin' : '/app'));
  protected readonly profilLink = computed(() => `${this.homeLink()}/profil`);

  /** Menus adaptés au rôle : un gérant ne voit ni Gérants ni Mon entreprise. */
  protected readonly nav = computed(() => {
    const role = this.auth.role();
    const items = this.isAdmin() ? ADMIN_NAV : APP_NAV;
    return items.filter((item) => !item.roles || (role !== null && item.roles.includes(role)));
  });
  protected readonly bottomNav = computed(() => this.nav().slice(0, 4));

  constructor() {
    // Ferme les menus à chaque navigation
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.closeMenus());
  }

  protected closeMenus(): void {
    this.drawerOpen.set(false);
    this.userMenuOpen.set(false);
  }

  protected selectBoutique(event: Event): void {
    const id = Number((event.target as HTMLSelectElement).value);
    this.ctx.select(id);
    const nom = this.ctx.boutiques().find((b) => b.id === id)?.nom;
    if (nom) this.toast.info(`Boutique active : ${nom}`);
  }

  protected simulerErreur(): void {
    this.api.failNextCall.set(true);
    this.userMenuOpen.set(false);
    this.toast.info('Le prochain appel au serveur échouera : rechargez une page pour voir l’état d’erreur.');
  }

  protected logout(): void {
    this.userMenuOpen.set(false);
    this.drawerOpen.set(false);
    void this.logoutService.logout();
  }
}
