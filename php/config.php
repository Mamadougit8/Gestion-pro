<?php
declare(strict_types=1);

/**
 * Configuration PDO MySQL pour XAMPP (Gestion scolaire pro)
 * Par défaut sur XAMPP : hôte 127.0.0.1, port 3306, utilisateur root, mot de passe vide.
 */

define('DB_SETTINGS_FILE', __DIR__ . '/db_settings.json');

function getDbConfig(): array {
    $saved = [];
    if (file_exists(DB_SETTINGS_FILE)) {
        $raw = file_get_contents(DB_SETTINGS_FILE);
        $parsed = json_decode($raw ?: '', true);
        if (is_array($parsed)) {
            $saved = $parsed;
        }
    }

    return [
        'host' => (string)($saved['host'] ?? getenv('MYSQL_HOST') ?: '127.0.0.1'),
        'port' => (int)($saved['port'] ?? (getenv('MYSQL_PORT') ?: 3306)),
        'database' => (string)($saved['database'] ?? getenv('MYSQL_DATABASE') ?: 'gestion_scolaire'),
        'user' => (string)($saved['user'] ?? getenv('MYSQL_USER') ?: 'root'),
        'password' => (string)(array_key_exists('password', $saved) ? $saved['password'] : (getenv('MYSQL_PASSWORD') ?: '')),
        'ssl' => (bool)($saved['ssl'] ?? (getenv('MYSQL_SSL') === 'true')),
    ];
}

function saveDbConfig(array $cfg): void {
    file_put_contents(
        DB_SETTINGS_FILE,
        json_encode([
            'host' => $cfg['host'],
            'port' => (int)$cfg['port'],
            'user' => $cfg['user'],
            'password' => $cfg['password'],
            'database' => $cfg['database'],
            'ssl' => (bool)($cfg['ssl'] ?? false),
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
    );
}

function createPdoConnection(?array $override = null, bool $withDatabase = true): PDO {
    $cfg = $override ? array_merge(getDbConfig(), $override) : getDbConfig();
    $host = trim((string)$cfg['host']) ?: '127.0.0.1';
    $port = (int)($cfg['port'] ?: 3306);
    $user = trim((string)$cfg['user']) ?: 'root';
    $pass = (string)($cfg['password'] ?? '');
    $db = trim((string)$cfg['database']) ?: 'gestion_scolaire';

    $dsn = "mysql:host={$host};port={$port};charset=utf8mb4";
    if ($withDatabase && $db !== '') {
        $dsn .= ";dbname={$db}";
    }

    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
        PDO::ATTR_TIMEOUT => 5,
    ];

    if (!empty($cfg['ssl'])) {
        $options[PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT] = false;
    }

    return new PDO($dsn, $user, $pass, $options);
}

function ensureXamppSchema(PDO $pdo): void {
    $queries = [
        "CREATE TABLE IF NOT EXISTS `configuration` (
            `cle` varchar(64) NOT NULL,
            `valeur` text DEFAULT NULL,
            PRIMARY KEY (`cle`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS `eleves` (
            `id` varchar(64) NOT NULL,
            `nom` varchar(128) NOT NULL,
            `matricule` varchar(64) DEFAULT NULL,
            `sexe` varchar(4) DEFAULT NULL,
            `date_naissance` varchar(32) DEFAULT NULL,
            `lieu_naissance` varchar(128) DEFAULT NULL,
            `classe` varchar(64) NOT NULL,
            `parent` varchar(128) DEFAULT NULL,
            `telephone` varchar(64) DEFAULT NULL,
            `adresse` varchar(255) DEFAULT NULL,
            `photo` longtext DEFAULT NULL,
            `decision` varchar(32) DEFAULT NULL,
            `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            KEY `idx_eleves_classe` (`classe`),
            KEY `idx_eleves_matricule` (`matricule`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS `enseignants` (
            `id` varchar(64) NOT NULL,
            `nom` varchar(128) NOT NULL,
            `matiere` varchar(64) NOT NULL,
            `telephone` varchar(64) DEFAULT NULL,
            `classes` text DEFAULT NULL,
            `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS `matieres` (
            `id` varchar(128) NOT NULL,
            `classe` varchar(64) NOT NULL,
            `nom` varchar(64) NOT NULL,
            `coefficient` decimal(4,2) NOT NULL DEFAULT 1.00,
            PRIMARY KEY (`id`),
            KEY `idx_matieres_classe` (`classe`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS `notes` (
            `id` varchar(128) NOT NULL,
            `eleve_id` varchar(64) NOT NULL,
            `matiere` varchar(64) NOT NULL,
            `trimestre` int NOT NULL,
            `type_note` varchar(4) NOT NULL,
            `note` decimal(5,2) NOT NULL,
            `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            KEY `idx_notes_eleve` (`eleve_id`),
            KEY `idx_notes_trimestre` (`trimestre`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS `paiements` (
            `id` varchar(64) NOT NULL,
            `eleve_id` varchar(64) NOT NULL,
            `montant` decimal(10,2) NOT NULL,
            `mode` varchar(32) NOT NULL,
            `reference` varchar(128) DEFAULT NULL,
            `date_paiement` varchar(32) NOT NULL,
            `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            KEY `idx_paiements_eleve` (`eleve_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS `absences` (
            `id` varchar(128) NOT NULL,
            `date_absence` varchar(32) NOT NULL,
            `eleve_id` varchar(64) NOT NULL,
            `type` varchar(4) NOT NULL,
            `motif` varchar(128) DEFAULT NULL,
            PRIMARY KEY (`id`),
            KEY `idx_absences_date` (`date_absence`),
            KEY `idx_absences_eleve` (`eleve_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS `appels` (
            `id` varchar(128) NOT NULL,
            `date_appel` varchar(32) NOT NULL,
            `classe` varchar(64) NOT NULL,
            `statut` tinyint NOT NULL DEFAULT 1,
            PRIMARY KEY (`id`),
            KEY `idx_appels_date` (`date_appel`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS `emploi_du_temps` (
            `classe` varchar(64) NOT NULL,
            `creneaux` text NOT NULL,
            `grille` text NOT NULL,
            PRIMARY KEY (`classe`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
    ];

    foreach ($queries as $sql) {
        $pdo->exec($sql);
    }
}

function getDatabase(?array $override = null): PDO {
    static $cached = null;
    if ($cached !== null && $override === null) {
        return $cached;
    }

    $cfg = $override ? array_merge(getDbConfig(), $override) : getDbConfig();
    $dbName = preg_replace('/[^a-zA-Z0-9_]/', '', (string)$cfg['database']) ?: 'gestion_scolaire';

    try {
        $bootstrap = createPdoConnection($cfg, false);
        $bootstrap->exec("CREATE DATABASE IF NOT EXISTS `{$dbName}` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    } catch (Throwable $e) {
        // Ignorer si l'utilisateur n'a accès qu'à une base préexistante
    }

    $pdo = createPdoConnection($cfg, true);
    ensureXamppSchema($pdo);

    if ($override === null) {
        $cached = $pdo;
    }
    return $pdo;
}

function jsonResponse(array $payload, int $statusCode = 200): void {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function getJsonBody(): array {
    $raw = file_get_contents('php://input');
    if (!$raw) {
        return $_POST ?: [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}
