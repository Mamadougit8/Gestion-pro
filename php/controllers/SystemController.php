<?php
declare(strict_types=1);

class SystemController {
    private static array $tables = [
        'eleves',
        'enseignants',
        'matieres',
        'notes',
        'paiements',
        'absences',
        'appels',
        'emploi_du_temps',
        'configuration',
    ];

    public static function getPublicConfig(): array {
        $cfg = getDbConfig();
        return [
            'host' => $cfg['host'],
            'port' => $cfg['port'],
            'user' => $cfg['user'],
            'database' => $cfg['database'],
            'ssl' => $cfg['ssl'],
            'hasPassword' => $cfg['password'] !== '',
        ];
    }

    public static function getStats(PDO $pdo): array {
        $cfg = getDbConfig();
        $counts = [];
        foreach (self::$tables as $table) {
            try {
                $stmt = $pdo->query("SELECT COUNT(*) AS c FROM `{$table}`");
                $row = $stmt->fetch();
                $counts[$table] = (int)($row['c'] ?? 0);
            } catch (Throwable $e) {
                $counts[$table] = 0;
            }
        }

        return [
            'engine' => 'PHP PDO / MySQL XAMPP',
            'mode' => 'mysql',
            'isMySQL' => true,
            'isPHP' => true,
            'mySQLConfig' => [
                'host' => $cfg['host'],
                'port' => $cfg['port'],
                'user' => $cfg['user'],
                'database' => $cfg['database'],
                'ssl' => $cfg['ssl'],
            ],
            'tables' => count(self::$tables),
            'counts' => $counts,
        ];
    }

    public static function getAppState(PDO $pdo): array {
        $elevesRows = $pdo->query('SELECT * FROM eleves ORDER BY classe, nom')->fetchAll();
        $eleves = [];
        $dec = [];
        foreach ($elevesRows as $r) {
            $eleves[] = [
                'id' => $r['id'],
                'nom' => $r['nom'],
                'mat' => $r['matricule'] ?? '',
                'sx' => $r['sexe'] ?? '',
                'dn' => $r['date_naissance'] ?? '',
                'ln' => $r['lieu_naissance'] ?? '',
                'cl' => $r['classe'],
                'pa' => $r['parent'] ?? '',
                'tel' => $r['telephone'] ?? '',
                'ad' => $r['adresse'] ?? '',
                'ph' => $r['photo'] ?? '',
            ];
            if (!empty($r['decision'])) {
                $dec[$r['id']] = $r['decision'];
            }
        }

        $ensRows = $pdo->query('SELECT * FROM enseignants ORDER BY nom')->fetchAll();
        $ens = [];
        foreach ($ensRows as $r) {
            $classes = $r['classes'] ? json_decode((string)$r['classes'], true) : [];
            $ens[] = [
                'id' => $r['id'],
                'nom' => $r['nom'],
                'mat' => $r['matiere'],
                'tel' => $r['telephone'] ?? '',
                'cl' => is_array($classes) ? $classes : [],
            ];
        }

        $notesRows = $pdo->query('SELECT * FROM notes')->fetchAll();
        $notes = [];
        foreach ($notesRows as $r) {
            $notes["{$r['eleve_id']}|{$r['matiere']}|{$r['trimestre']}|{$r['type_note']}"] = (float)$r['note'];
        }

        $paieRows = $pdo->query('SELECT * FROM paiements ORDER BY id ASC')->fetchAll();
        $paie = [];
        foreach ($paieRows as $r) {
            $paie[] = [
                'id' => $r['id'],
                'el' => $r['eleve_id'],
                'm' => (float)$r['montant'],
                'mode' => $r['mode'],
                'ref' => $r['reference'] ?? '',
                'd' => $r['date_paiement'],
            ];
        }

        $absRows = $pdo->query('SELECT * FROM absences')->fetchAll();
        $abs = [];
        foreach ($absRows as $r) {
            $abs["{$r['date_absence']}|{$r['eleve_id']}"] = [
                't' => $r['type'],
                'm' => $r['motif'] ?? '',
            ];
        }

        $appelRows = $pdo->query('SELECT * FROM appels')->fetchAll();
        $appel = [];
        foreach ($appelRows as $r) {
            $appel["{$r['date_appel']}|{$r['classe']}"] = (int)$r['statut'];
        }

        $matRows = $pdo->query('SELECT * FROM matieres')->fetchAll();
        $mc = [];
        foreach ($matRows as $r) {
            if (!isset($mc[$r['classe']])) {
                $mc[$r['classe']] = [];
            }
            $mc[$r['classe']][$r['nom']] = (float)$r['coefficient'];
        }

        $edtRows = $pdo->query('SELECT * FROM emploi_du_temps')->fetchAll();
        $edt = [];
        foreach ($edtRows as $r) {
            $sl = json_decode((string)$r['creneaux'], true);
            $c = json_decode((string)$r['grille'], true);
            $edt[$r['classe']] = [
                'sl' => is_array($sl) ? $sl : [],
                'c' => is_array($c) ? $c : new stdClass(),
            ];
        }

        $cfgRows = $pdo->query('SELECT * FROM configuration')->fetchAll();
        $config = [];
        foreach ($cfgRows as $r) {
            $config[$r['cle']] = $r['valeur'];
        }

        return [
            'eleves' => $eleves,
            'dec' => empty($dec) ? new stdClass() : $dec,
            'ens' => $ens,
            'notes' => empty($notes) ? new stdClass() : $notes,
            'paie' => $paie,
            'abs' => empty($abs) ? new stdClass() : $abs,
            'appel' => empty($appel) ? new stdClass() : $appel,
            'mc' => empty($mc) ? new stdClass() : $mc,
            'edt' => empty($edt) ? new stdClass() : $edt,
            'ecole' => $config['ecole'] ?? '',
            'an' => $config['an'] ?? '',
            'dir' => $config['dir'] ?? '',
            'pe' => isset($config['pe']) && (float)$config['pe'] > 0 ? (float)$config['pe'] : 2,
        ];
    }

    public static function testConnection(array $input): array {
        $host = trim((string)($input['host'] ?? '127.0.0.1'));
        $port = (int)($input['port'] ?? 3306);
        $user = trim((string)($input['user'] ?? 'root'));
        $password = (string)($input['password'] ?? '');
        $database = trim((string)($input['database'] ?? ''));
        $ssl = !empty($input['ssl']) && $input['ssl'] !== 'false';

        try {
            $pdo = createPdoConnection([
                'host' => $host,
                'port' => $port,
                'user' => $user,
                'password' => $password,
                'database' => $database,
                'ssl' => $ssl,
            ], $database !== '');
            $pdo->query('SELECT 1');
            return ['ok' => true, 'message' => "Connexion MySQL XAMPP réussie sur {$host}:{$port} !"];
        } catch (Throwable $e) {
            return ['ok' => false, 'error' => $e->getMessage()];
        }
    }

    public static function connectAndSync(array $input): array {
        $host = trim((string)($input['host'] ?? '127.0.0.1'));
        $port = (int)($input['port'] ?? 3306);
        $user = trim((string)($input['user'] ?? 'root'));
        $password = (string)($input['password'] ?? '');
        $database = trim((string)($input['database'] ?? 'gestion_scolaire'));
        $ssl = !empty($input['ssl']) && $input['ssl'] !== 'false';

        if ($host === '' || $user === '' || $database === '') {
            return ['ok' => false, 'error' => 'Veuillez renseigner l’hôte, l’utilisateur et le nom de la base de données.'];
        }

        try {
            $cfg = [
                'host' => $host,
                'port' => $port,
                'user' => $user,
                'password' => $password,
                'database' => $database,
                'ssl' => $ssl,
            ];
            $pdo = getDatabase($cfg);
            saveDbConfig($cfg);
            return [
                'ok' => true,
                'message' => "Connecté avec succès à la base MySQL \"{$database}\" sur {$host} via PHP PDO !",
                'data' => self::getAppState($pdo),
            ];
        } catch (Throwable $e) {
            return ['ok' => false, 'error' => $e->getMessage()];
        }
    }

    public static function bulkSync(PDO $pdo, array $state, bool $replace = false): void {
        if ($replace) {
            $pdo->exec('SET FOREIGN_KEY_CHECKS = 0');
            foreach (['notes', 'paiements', 'absences', 'appels', 'emploi_du_temps', 'matieres', 'enseignants', 'eleves', 'configuration'] as $t) {
                $pdo->exec("DELETE FROM `{$t}`");
            }
            $pdo->exec('SET FOREIGN_KEY_CHECKS = 1');
        }

        if (isset($state['ecole'])) ConfigController::save($pdo, 'ecole', (string)$state['ecole']);
        if (isset($state['an'])) ConfigController::save($pdo, 'an', (string)$state['an']);
        if (isset($state['dir'])) ConfigController::save($pdo, 'dir', (string)$state['dir']);
        if (isset($state['pe'])) ConfigController::save($pdo, 'pe', (string)$state['pe']);

        if (!empty($state['eleves']) && is_array($state['eleves'])) {
            $dec = is_array($state['dec'] ?? null) ? $state['dec'] : [];
            foreach ($state['eleves'] as $e) {
                $e['decision'] = $dec[$e['id'] ?? ''] ?? null;
                EleveController::save($pdo, $e);
            }
        }

        if (!empty($state['ens']) && is_array($state['ens'])) {
            foreach ($state['ens'] as $t) {
                EnseignantController::save($pdo, $t);
            }
        }

        if (!empty($state['notes']) && is_array($state['notes'])) {
            foreach ($state['notes'] as $k => $v) {
                $parts = explode('|', (string)$k);
                if (count($parts) >= 4) {
                    NoteController::save($pdo, $parts[0], $parts[1], (int)$parts[2], $parts[3], $v);
                }
            }
        }

        if (!empty($state['paie']) && is_array($state['paie'])) {
            foreach ($state['paie'] as $p) {
                PaiementController::save($pdo, $p);
            }
        }

        if (!empty($state['abs']) && is_array($state['abs'])) {
            foreach ($state['abs'] as $k => $v) {
                $parts = explode('|', (string)$k);
                if (count($parts) >= 2 && is_array($v)) {
                    AbsenceController::saveAbsence($pdo, $parts[0], $parts[1], (string)($v['t'] ?? ''), (string)($v['m'] ?? ''));
                }
            }
        }

        if (!empty($state['appel']) && is_array($state['appel'])) {
            foreach ($state['appel'] as $k => $v) {
                $parts = explode('|', (string)$k);
                if (count($parts) >= 2) {
                    AbsenceController::saveAppel($pdo, $parts[0], $parts[1], (int)$v);
                }
            }
        }

        if (!empty($state['mc']) && is_array($state['mc'])) {
            foreach ($state['mc'] as $classe => $mats) {
                if (is_array($mats)) {
                    MatiereController::saveClasse($pdo, (string)$classe, $mats);
                }
            }
        }

        if (!empty($state['edt']) && is_array($state['edt'])) {
            foreach ($state['edt'] as $classe => $obj) {
                if (is_array($obj) && isset($obj['sl'], $obj['c'])) {
                    EdtController::save($pdo, (string)$classe, $obj['sl'], $obj['c']);
                }
            }
        }
    }
}
