# WHITE SAYY — boutique en ligne

Ce dépôt contient l’application WHITE SAYY reliée à Lovable et la page de boutique qu’elle affiche. La route d’accueil `/` charge `public/white-sayy.html` dans le cadre plein écran défini par `src/routes/index.tsx`.

## Où modifier le site

- **Boutique active** — `public/white-sayy.html` : accueil, catalogue, navigation, avis, administration et interactions visibles.
- **Cadre de l’application** — `src/routes/index.tsx` : métadonnées et chargement de la boutique active. Conserver le chemin `/white-sayy.html`.
- **API serveur** — `src/routes/api/public/` : boutique publiée, commandes, avis, administration et paiements.
- **Sécurité et intégrations** — `src/lib/shop-server.server.ts` et `src/integrations/supabase/`.
- **Données et migrations** — `drizzle/migrations/` et `supabase/`.
- **Ancienne page** — `archive/white-sayy-legacy.html` : copie de référence inactive.

## Développement et vérification

Prérequis : Node.js et npm. Depuis la racine du dépôt :

```sh
npm install
npm run dev
npm test
npm run build
```

Les sorties générées (`.output/`, `.wrangler/`, `node_modules/`) restent ignorées par Git.

## Configuration de production

Configurer les secrets uniquement dans l’environnement serveur Lovable, jamais dans le HTML, le dépôt ou une variable `VITE_*` :

- `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` pour les opérations serveur sur la boutique, les commandes et les avis.
- `ADMIN_EMAIL` et `ADMIN_PASSWORD_HASH` pour l’accès admin. Le hash attendu est un SHA-256 de `e-mail-minuscule|mot-de-passe` ; ne stocker ni envoyer le mot de passe brut dans le dépôt.
- `STRIPE_SECRET_KEY` et `STRIPE_WEBHOOK_SECRET` si les paiements Stripe sont activés.
- `RESEND_API_KEY` pour les e-mails de confirmation après paiement Stripe ; définir aussi `MAIL_FROM` avec une adresse d’expédition vérifiée dans Resend avant la production. Sans ces secrets, les commandes et webhooks continuent de fonctionner, mais aucun e-mail transactionnel n’est envoyé.
- `LOVABLE_DB_MIGRATION_URL` dans l’environnement de migration sécurisé pour `drizzle-kit`.

Avant le lancement, appliquer les migrations dans l’ordre, notamment `drizzle/migrations/0002_reviews_and_stock_finalization.sql`. Depuis un shell sûr où `LOVABLE_DB_MIGRATION_URL` est déjà fourni :

```sh
npx drizzle-kit migrate
```

La migration ajoute la boîte d’avis privée, sa fonction d’approbation et la finalisation idempotente du paiement et du stock. Ne pas appliquer la migration depuis un environnement non vérifié.

Pour Stripe, configurer aussi le webhook vers `/api/public/stripe-webhook` et abonner ce webhook aux événements `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed` et `checkout.session.expired`.

## Checklist avant d’accepter des commandes

1. Configurer et tester Stripe, ou renseigner au minimum un canal de commande/contact (e-mail, Instagram ou lien de paiement externe) dans l’administration. Sans cela, le checkout reste volontairement fermé et ne crée pas de fausse commande.
2. Vérifier un achat de test complet : confirmation Stripe, mise à jour du statut, décrément du stock et, si Resend est configuré, réception des e-mails client et boutique. Vérifier séparément l’arrivée des avis dans la boîte de modération.
3. Remplacer les mentions légales modèle par les informations exactes de l’éditeur et vérifier les règles de livraison, les prix et chaque stock.
4. Vérifier que le compte admin fonctionne après configuration des secrets et que les avis peuvent être approuvés depuis un autre appareil.
5. Tester les commandes manuelles : le client transmet le récapitulatif par le canal configuré ; l’admin confirme le paiement avant de marquer l’expédition.

Les commandes manuelles ne sont pas considérées comme payées automatiquement et n’envoient pas les e-mails de confirmation Stripe. Les comptes clients ne sont pas encore des services synchronisés : le compte et les favoris restent enregistrés sur l’appareil du visiteur. Les liens e-mail de contact ouvrent un brouillon dans le logiciel de messagerie choisi et ne l’envoient pas automatiquement.

## Synchronisation et publication

Le dépôt est relié au projet Lovable. Les commits poussés sur `main` se synchronisent avec l’éditeur, mais la mise en ligne sur le domaine public peut encore nécessiter une publication depuis Lovable. Ne pas réécrire l’historique publié (pas de force-push, rebase ou amend de commits déjà poussés).
