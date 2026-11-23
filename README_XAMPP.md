# Déploiement sur XAMPP (Apache + PHP + MySQL / MariaDB)

Ce projet est prêt à fonctionner directement sous **XAMPP** avec son backend **PHP 8+ (PDO MySQL)** et sa base de données **`gestion_scolaire`**.

## 1. Démarrer XAMPP
1. Ouvrez **XAMPP Control Panel**.
2. Démarrez **Apache** et **MySQL**.

## 2. Créer / Importer la base de données XAMPP
1. Ouvrez **phpMyAdmin** à l'adresse : `http://localhost/phpmyadmin`
2. Cliquez sur l'onglet **Importer**.
3. Sélectionnez le fichier **`schema_xampp.sql`** et cliquez sur **Exécuter**.
   - La base `gestion_scolaire` et les 9 tables (`eleves`, `enseignants`, `matieres`, `notes`, `paiements`, `absences`, `appels`, `emploi_du_temps`, `configuration`) seront créées automatiquement.
   - *(Note : `php/config.php` crée également la base et les tables automatiquement au premier appel si elles n'existent pas encore.)*

## 3. Copier le projet dans `htdocs`
Copiez l'ensemble du dossier (`index.html`, `.htaccess`, `schema_xampp.sql`, et le dossier `php/`) dans :
- **Windows** : `C:\xampp\htdocs\gestion-scolaire\`
- **macOS** : `/Applications/XAMPP/htdocs/gestion-scolaire/`
- **Linux** : `/opt/lampp/htdocs/gestion-scolaire/`

## 4. Ouvrir l'application
Rendez-vous dans votre navigateur à l'adresse :
`http://localhost/gestion-scolaire/`

> **Important (Apache `mod_rewrite`)** : Sur XAMPP, `mod_rewrite` et `AllowOverride All` sont activés par défaut dans `httpd.conf`. Si `/api/*` retourne une erreur 404, vérifiez dans `httpd.conf` que `LoadModule rewrite_module modules/mod_rewrite.so` n'est pas commenté et que `<Directory ".../htdocs">` contient `AllowOverride All`.

## 5. Rubriques connectées aux tables SQL
- **Tableau de bord** → Lecture temps réel de `eleves`, `enseignants`, `notes`, `absences`, `appels`, `configuration`
- **Élèves** → Table `eleves`
- **Cartes scolaires** → Table `eleves` (colonne `photo`)
- **Enseignants** → Table `enseignants`
- **Matières** → Table `matieres`
- **Emploi du temps** → Table `emploi_du_temps`
- **Notes & Bulletins** → Tables `notes`, `matieres`, `eleves`, `absences`, `configuration`
- **Admis et redoublants** → Table `eleves` (colonne `decision`)
- **Paiements** → Table `paiements`
- **Absences** → Tables `absences` et `appels`
- **Administration** → Table `configuration` + gestion de la connexion MySQL
