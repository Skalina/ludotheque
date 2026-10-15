# Ma ludothèque

App perso de gestion de collection de jeux vidéo physiques (React + Vite). Les données sont synchronisées entre appareils via Supabase (connexion par lien magique envoyé par email).

## Lancer en local

```bash
npm install
npm run dev
```

Puis ouvre l'URL affichée (en général `http://localhost:5173`).

## Déployer gratuitement sur Vercel

1. **Crée un compte GitHub** (si pas déjà fait) sur [github.com](https://github.com).
2. **Crée un nouveau repo** sur GitHub (bouton vert "New"), nom au choix (ex: `ludotheque`), laisse-le vide (pas de README généré).
3. Depuis ce dossier, dans un terminal :
   ```bash
   git init
   git add .
   git commit -m "Premier commit"
   git branch -M main
   git remote add origin https://github.com/TON-PSEUDO/TON-REPO.git
   git push -u origin main
   ```
   (remplace l'URL par celle de ton repo, affichée sur la page GitHub après création)
4. **Crée un compte Vercel** sur [vercel.com](https://vercel.com) — connecte-toi directement avec ton compte GitHub (bouton "Continue with GitHub"), c'est le plus simple.
5. Sur Vercel, clique **"Add New Project"**, sélectionne ton repo GitHub.
6. Vercel détecte automatiquement que c'est un projet Vite — laisse les réglages par défaut, clique **"Deploy"**.
7. Après ~1 minute, ton app est en ligne sur une URL du type `ton-repo.vercel.app`.

À chaque fois que tu modifies le code et fais :
```bash
git add .
git commit -m "description du changement"
git push
```
Vercel redéploie automatiquement la nouvelle version en quelques dizaines de secondes.

## Synchronisation (Supabase)

1. Dans Supabase > SQL Editor, exécute `supabase-setup.sql`.
2. Supabase > Authentication > URL Configuration : mets l'URL Vercel en *Site URL* et ajoute `https://TON-SITE.vercel.app/**` et `http://localhost:5173/**` dans *Redirect URLs*.
3. Variables d'environnement `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` :
   - en local : fichier `.env.local` (voir `.env.example`, non versionné)
   - sur Vercel : Settings > Environment Variables, puis redéployer.
4. Une fois ton compte créé, désactive les inscriptions : Authentication > Sign In / Providers > "Allow new users to sign up".

Au premier lancement connecté, les données déjà présentes dans le navigateur (version d'avant la synchro) sont fusionnées une seule fois dans le cloud (le cloud gagne en cas d'id identique).

## Connexion (raccourci iPhone inclus)

Le lien magique ouvre Safari, pas le raccourci plein écran de l'iPhone : on s'y connectait donc... dans Safari. La connexion se fait maintenant **dans l'app**, de deux façons :

- **Mot de passe** : à définir une fois depuis le menu « ⋯ » > « Mot de passe » (depuis un appareil déjà connecté). Le trousseau iCloud le remplit ensuite. Si Supabase exige une ré-authentification, l'app demande un code reçu par email.
- **Code par email** : l'app envoie un code (6 à 10 chiffres selon ton projet) à saisir dans la page. Si l'app est relancée pendant que tu lis le mail, elle reprend à l'étape du code.

Pour que le code apparaisse dans l'email : Supabase > Authentication > Email Templates > **Magic Link**, et ajoute `{{ .Token }}` au corps du message. Exemple (code + lien) :

```html
<h2>Ta connexion à Ma ludothèque</h2>
<p>Ton code : <strong style="font-size:22px;letter-spacing:4px">{{ .Token }}</strong></p>
<p>Ou, dans ton navigateur : <a href="{{ .ConfirmationURL }}">clique ici</a>.</p>
```

Notes : un code toutes les 60 s au maximum ; l'envoi d'emails intégré à Supabase est limité en nombre par heure (pas gênant : une fois connecté, la session reste ouverte).

## Important à savoir

- Un jeu = une ligne en base ; seuls les jeux modifiés sont envoyés.
- Projet Supabase gratuit : il se met en pause après 7 jours sans requête (à réactiver à la main dans le dashboard). Ouvrir l'app au moins une fois par semaine suffit à l'éviter ; garde aussi un export de temps en temps.
- En revenant sur l'onglet, l'app récupère les modifs faites depuis un autre appareil (au plus toutes les 30 s).
- Si deux appareils modifient le *même* jeu en même temps, le dernier enregistrement gagne.
- Le bouton **Exporter** reste utile comme sauvegarde locale, et **Importer un backup** remplace toute la collection (cloud compris).
