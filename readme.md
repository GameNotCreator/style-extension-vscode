# Vira Local

Version locale de développement reconstruite à la demande de l’auteur déclaré de Vira. Elle utilise les thèmes, SVG et polices de l’installation 2026.9.5, avec un moteur JavaScript lisible nouvellement écrit. L’extension installée d’origine reste intacte.

## Installation

1. Dans VS Code, lance **Extensions: Install from VSIX…** et choisis `vira-local-1.0.0.vsix`.
2. Désactive **Vira Theme** dans ce profil, puis recharge la fenêtre si VS Code le demande.
3. Lance **Preferences: Color Theme** et choisis **Local Vira Ocean High Contrast** pour retrouver la palette utilisée comme référence.
4. La synchronisation sélectionne **Local Vira Icons Ocean** et **Local Vira Solid**. Tu peux aussi les sélectionner manuellement avec **Preferences: File Icon Theme** et **Preferences: Product Icon Theme**.

Les polices de texte, taille, zoom et réglages d’éditeur existants sont conservés. L’installation seule ne sélectionne pas un thème. Tant qu’aucun thème de couleur Local Vira n’est actif, la synchronisation ne change pas tes icônes.

## Commandes et réglages

Dans la palette de commandes, recherche **Vira Local** : choix de thème, choix d’accent, intensité, accès au style contour, réglages et visite guidée. Le bouton d’accent dans la barre d’état ouvre le sélecteur. Le sélecteur propose aussi une couleur personnalisée `#RRGGBB` et l’effacement de cette couleur.

Les 15 réglages sont disponibles sous `viraLocal.*` :

| Réglage | Valeur par défaut | Effet |
| --- | --- | --- |
| `accent` | `Teal` | 14 couleurs originales |
| `customAccent` | vide | Couleur hexadécimale prioritaire |
| `accentIntensity` | `vivid` | `soft`, `normal`, `vivid`, pour les accents prédéfinis |
| `useOutlinedIcons` | `false` | Dossiers contour ou pleins |
| `folderAccentMode` | `true` | Accent sur dossiers ouverts ; sinon glyphes des dossiers nommés |
| `useTopTabIndicator` | `false` | Indicateur d’onglet en haut |
| `syncThemesAndIcons` | `true` | Palette des icônes suivant le thème |
| `syncProductIcons` | `true` | Icônes d’interface suivant le style contour/plein |
| `showBorders` | `false` | Renforce les bordures des surfaces |
| `contrastedTabs` | `false` | Fond d’onglets inactifs assorti au panneau latéral |
| `solidLineHighlight` | `false` | Fond plein pour la ligne active |
| `hidesExplorerArrows` | `true` | Masque les chevrons des dossiers |
| `hidesShadows` | `false` | Ombres transparentes |
| `disableItalics` | `false` | Retire les italiques TextMate et sémantiques |

Les modifications s’appliquent automatiquement. Les commandes d’accent, d’intensité et de thème acceptent également une valeur en argument pour l’automatisation. Annuler un sélecteur ne modifie rien.

## Fidélité et récupération

- Les 6 690 SVG de fichiers/dossiers, les deux polices d’interface, les illustrations et les 32 définitions de thèmes sont récupérés de la copie installée. Les fichiers `templates/` et les assets d’origine sont conservés sans modification.
- Les 20 thèmes de couleur conservent leurs règles syntaxiques et sémantiques exactes. Les 54 personnalisations de couleur relevées dans la section `[Vira*]` du profil sont intégrées dans `config/captured-colors.json`, sans recopier le reste du profil. Les labels commencent par `Local Vira` afin que cet ancien bloc ne bloque pas les nouveaux accents.
- Les 14 accents et leurs trois intensités proviennent des SVG originaux, sans approximation de couleur. Les associations originales de noms, extensions et langages sont conservées.
- Pour les rares variantes d’accent absentes du paquet original (dossier gRPC), le moteur recolore le SVG original sans modifier sa géométrie. Les couleurs personnalisées utilisent la même méthode, y compris pour les deux SVG dont la couleur est exprimée en Display P3.
- Seul le JavaScript distribué, obfusqué, était disponible : les sources TypeScript et les source maps étaient absentes. Le moteur interactif est **une reconstruction**, pas une récupération du projet source original. Les fichiers des thèmes sont vérifiés ; l’équivalence pixel par pixel de tous les états interactifs avec l’exécutable original n’est pas établie.

## Fonctionnement local

Aucune dépendance npm au fonctionnement, aucun appel réseau, compte, essai, télémétrie ou validation de licence dans ce moteur. Les modules utilisés sont uniquement `vscode`, `node:fs`, `node:path` et les fichiers de configuration inclus. L’ancien exécutable n’est pas inclus dans ce VSIX. Les commandes d’activation commerciale n’ont aucune fonction dans cette version autonome.

Le moteur régénère uniquement les JSON de son propre dossier `build/themes/` et, pour les couleurs personnalisées, des SVG sous `build/generated/`. Il repart toujours des templates originaux ; désactiver une option restaure la valeur de référence. Les thèmes utilisent le mécanisme de surveillance `_watch` également présent dans la distribution récupérée. Si une future version de VS Code change ce mécanisme interne, recharger la fenêtre applique les fichiers enregistrés.

Les fichiers générés appartiennent à l’installation de l’extension : des fenêtres/profils qui partagent cette installation doivent utiliser les mêmes options visuelles, sinon la dernière configuration appliquée sera visible dans les autres fenêtres. Une installation séparée avec `--extensions-dir` permet des réglages simultanés différents.

## Modifier et reconstruire

Avec Node.js installé, depuis ce dossier :

```powershell
node scripts/build.cjs
vsce package --no-dependencies --allow-missing-repository
```

`vsce` est l’outil de packaging de développement `@vscode/vsce` ; il n’est pas nécessaire pour installer ou utiliser le VSIX fourni. Le build utilise uniquement Node.js et les fichiers locaux. `src/theme-engine.cjs` contient les transformations ; `src/extension.cjs` contient les commandes et la synchronisation.

Pour revenir au thème précédent, sélectionne-le dans VS Code puis désactive Vira Local. Aucune désinstallation de Vira ou autre extension n’est nécessaire.

## Récupérer sur un autre PC

```powershell
git clone https://github.com/GameNotCreator/style-extension-vscode.git
cd style-extension-vscode
npm run build
npx --yes @vscode/vsce package --no-dependencies
code --install-extension vira-local-1.0.0.vsix
```

Puis sélectionne un thème **Local Vira** dans VS Code. La création du VSIX demande Node.js et un accès réseau pour récupérer l’outil de packaging.
