# Cahier Bi – frontend web (Angular 21)

SaaS de suivi des dettes clients pour les boutiques au Sénégal.
Ce lot fonctionne **sans backend** : toutes les données sont en mémoire et réinitialisées au rechargement de la page.

## Lancer

```bash
npm install
npm start          # ng serve → http://localhost:4200
npm run build      # build de production (dist/cahier-bi/browser)
npm run lint       # ng lint (ESLint + règles d'accessibilité des templates)
```

Node 22.12+ requis (Angular 22 demanderait Node ≥ 22.22).

## Comptes de démonstration

Ils sont aussi proposés en un clic sur l'écran de connexion.

| Profil | Téléphone | Mot de passe |
|---|---|---|
| Administrateur | +221 70 000 00 00 | admin123 |
| Propriétaire (2 boutiques) | +221 77 123 45 67 | proprio123 |
| Gérant (Médina) | +221 77 222 33 44 | gerant123 |
| Propriétaire, abonnement expiré | +221 76 987 65 43 | expire123 |

Code OTP simulé (inscription, mot de passe oublié) : `123456`.
Menu utilisateur → « Simuler une erreur » : le prochain appel échoue (pour voir l'état d'erreur et le bouton « Réessayer »).

## Architecture

```
src/app/
  core/       auth (store, guards, jeton), boutique courante, layout, intercepteurs HTTP (inactifs),
              base en mémoire (InMemoryDb), simulateur d'API (latence 300–600 ms, erreurs)
  shared/     composants UI (data-table, stat-card, modal, confirm, toasts…), pipes, directives
  features/<feature>/
    domain/        modèles (snake_case, contrat Laravel) + interface de repository + InjectionToken
    data/          jeux de données + implémentation InMemory du repository
    presentation/  pages, composants et stores (signals)
```

Brancher le backend : écrire les `HttpXxxRepository` et remplacer `useClass` dans
`core/data/repository.providers.ts`, puis activer `provideHttpClient(withInterceptors([authInterceptor, apiErrorInterceptor]))`
dans `app.config.ts`. Les écrans ne changent pas.
