# Ma ludothèque

App perso de gestion de collection de jeux vidéo physiques (React + Vite). Toutes les données sont stockées dans le `localStorage` du navigateur — pas de backend, pas de base de données.

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

## Important à savoir

- Les données vivent dans le navigateur où tu utilises l'app (pas de synchronisation entre appareils).
- Utilise le bouton **Exporter** régulièrement pour avoir un fichier de sauvegarde en local, au cas où.
- Si tu changes de navigateur ou d'ordinateur, utilise **Importer un backup** pour retrouver ta collection à partir d'un export précédent.
