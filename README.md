# WHITE SAYY — boutique en ligne

Ce dépôt contient l’application WHITE SAYY reliée à Lovable et la page de boutique qu’elle affiche. La route d’accueil `/` charge `public/white-sayy.html` dans le cadre plein écran défini par `src/routes/index.tsx`.

## Où modifier le site

- **Page de boutique active** — `public/white-sayy.html` : catalogue, accueil, avis, administration et interactions de la boutique. C’est le fichier à modifier pour les changements visibles dans le storefront.
- **Cadre de l’application** — `src/routes/index.tsx` : métadonnées et affichage de la page HTML active. Conserver son chemin `/white-sayy.html` si le fichier est déplacé.
- **API et intégrations** — `src/routes/api/`, `src/integrations/supabase/` et `src/lib/` : serveur, commandes, paiement et données.
- **Données et migrations** — `drizzle/` et `supabase/`.
- **Ancienne page** — `archive/white-sayy-legacy.html` : copie de référence non utilisée par l’application ni incluse dans la sortie publique. La page active reste dans `public/`.

## Développement et vérification

Prérequis : Node.js et npm. Depuis la racine du dépôt :

```sh
npm install
npm run dev
```

Avant de pousser une modification, lancer si possible :

```sh
npm test
npm run build
```

Les sorties générées (`.output/`, `.wrangler/`, `node_modules/`) ne sont pas des fichiers source et restent ignorées par Git.

## Synchronisation et publication

Le dépôt est relié au projet Lovable. Les commits poussés sur `main` se synchronisent avec l’éditeur, mais la mise en ligne sur le domaine public peut encore nécessiter la publication depuis Lovable. Ne pas réécrire l’historique publié (pas de force-push, rebase ou amend de commits déjà poussés).

## Variables d’environnement

Les variables Supabase côté navigateur utilisent une clé **publishable**. Ne jamais ajouter de mot de passe, clé `service_role` ou autre secret privé dans le HTML, le code client ou un dépôt public ; gérer les secrets serveur dans l’environnement prévu à cet effet.
