<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/controllers/SystemController.php';
require_once __DIR__ . '/controllers/EleveController.php';
require_once __DIR__ . '/controllers/EnseignantController.php';
require_once __DIR__ . '/controllers/MatiereController.php';
require_once __DIR__ . '/controllers/NoteController.php';
require_once __DIR__ . '/controllers/PaiementController.php';
require_once __DIR__ . '/controllers/AbsenceController.php';
require_once __DIR__ . '/controllers/EdtController.php';
require_once __DIR__ . '/controllers/ConfigController.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$route = trim((string)($_GET['route'] ?? ''), '/');
$segments = $route === '' ? [] : explode('/', $route);
$resource = $segments[0] ?? '';

try {
    // 1. Statut & configuration MySQL XAMPP
    if ($resource === 'status' && $method === 'GET') {
        $pdo = getDatabase();
        jsonResponse(['ok' => true, 'stats' => SystemController::getStats($pdo)]);
    }

    if ($resource === 'data' && $method === 'GET') {
        $pdo = getDatabase();
        jsonResponse(['ok' => true, 'data' => SystemController::getAppState($pdo)]);
    }

    if ($resource === 'database' && ($segments[1] ?? '') === 'config' && $method === 'GET') {
        jsonResponse(['ok' => true, 'config' => SystemController::getPublicConfig()]);
    }

    if ($resource === 'database' && ($segments[1] ?? '') === 'test-mysql' && $method === 'POST') {
        jsonResponse(SystemController::testConnection(getJsonBody()));
    }

    if ($resource === 'database' && ($segments[1] ?? '') === 'connect-mysql' && $method === 'POST') {
        jsonResponse(SystemController::connectAndSync(getJsonBody()));
    }

    if ($resource === 'sync' && $method === 'POST') {
        $pdo = getDatabase();
        $body = getJsonBody();
        SystemController::bulkSync($pdo, $body, !empty($body['replace']));
        jsonResponse(['ok' => true, 'data' => SystemController::getAppState($pdo)]);
    }

    // 2. Rubriques Élèves, Cartes scolaires & Admis/Redoublants
    if ($resource === 'eleves') {
        $pdo = getDatabase();
        if ($method === 'POST' && count($segments) === 1) {
            EleveController::save($pdo, getJsonBody());
            jsonResponse(['ok' => true]);
        }
        if ($method === 'POST' && count($segments) === 3 && $segments[2] === 'photo') {
            EleveController::updatePhoto($pdo, urldecode($segments[1]), (string)(getJsonBody()['photo'] ?? ''));
            jsonResponse(['ok' => true]);
        }
        if ($method === 'POST' && count($segments) === 3 && $segments[2] === 'decision') {
            EleveController::updateDecision($pdo, urldecode($segments[1]), (string)(getJsonBody()['decision'] ?? ''));
            jsonResponse(['ok' => true]);
        }
        if ($method === 'DELETE' && count($segments) === 2) {
            EleveController::delete($pdo, urldecode($segments[1]));
            jsonResponse(['ok' => true]);
        }
    }

    // 3. Rubrique Enseignants
    if ($resource === 'enseignants') {
        $pdo = getDatabase();
        if ($method === 'POST' && count($segments) === 1) {
            EnseignantController::save($pdo, getJsonBody());
            jsonResponse(['ok' => true]);
        }
        if ($method === 'DELETE' && count($segments) === 2) {
            EnseignantController::delete($pdo, urldecode($segments[1]));
            jsonResponse(['ok' => true]);
        }
    }

    // 4. Rubrique Matières
    if ($resource === 'matieres') {
        $pdo = getDatabase();
        if ($method === 'POST' && ($segments[1] ?? '') === 'classe') {
            $body = getJsonBody();
            MatiereController::saveClasse($pdo, (string)($body['classe'] ?? ''), $body['matieres'] ?? []);
            jsonResponse(['ok' => true]);
        }
        if ($method === 'POST' && count($segments) === 1) {
            $body = getJsonBody();
            MatiereController::save($pdo, (string)($body['classe'] ?? ''), (string)($body['nom'] ?? ''), (float)($body['coef'] ?? 1));
            jsonResponse(['ok' => true]);
        }
        if ($method === 'DELETE' && count($segments) === 3) {
            MatiereController::delete($pdo, urldecode($segments[1]), urldecode($segments[2]));
            jsonResponse(['ok' => true]);
        }
    }

    // 5. Rubrique Notes & Bulletins
    if ($resource === 'notes' && $method === 'POST') {
        $pdo = getDatabase();
        $body = getJsonBody();
        NoteController::save(
            $pdo,
            (string)($body['eleveId'] ?? ''),
            (string)($body['matiere'] ?? ''),
            (int)($body['trimestre'] ?? 1),
            (string)($body['typeNote'] ?? 'c'),
            $body['note'] ?? null
        );
        jsonResponse(['ok' => true]);
    }

    // 6. Rubrique Paiements
    if ($resource === 'paiements') {
        $pdo = getDatabase();
        if ($method === 'POST' && count($segments) === 1) {
            PaiementController::save($pdo, getJsonBody());
            jsonResponse(['ok' => true]);
        }
        if ($method === 'DELETE' && count($segments) === 2) {
            PaiementController::delete($pdo, urldecode($segments[1]));
            jsonResponse(['ok' => true]);
        }
    }

    // 7. Rubrique Absences & Appels
    if ($resource === 'absences' && $method === 'POST') {
        $pdo = getDatabase();
        $body = getJsonBody();
        AbsenceController::saveAbsence(
            $pdo,
            (string)($body['date'] ?? ''),
            (string)($body['eleveId'] ?? ''),
            (string)($body['type'] ?? ''),
            (string)($body['motif'] ?? '')
        );
        jsonResponse(['ok' => true]);
    }

    if ($resource === 'appels' && $method === 'POST') {
        $pdo = getDatabase();
        $body = getJsonBody();
        AbsenceController::saveAppel(
            $pdo,
            (string)($body['date'] ?? ''),
            (string)($body['classe'] ?? ''),
            (int)($body['statut'] ?? 1)
        );
        jsonResponse(['ok' => true]);
    }

    // 8. Rubrique Emploi du temps
    if ($resource === 'edt' && $method === 'POST') {
        $pdo = getDatabase();
        $body = getJsonBody();
        EdtController::save($pdo, (string)($body['classe'] ?? ''), $body['creneaux'] ?? [], $body['grille'] ?? []);
        jsonResponse(['ok' => true]);
    }

    // 9. Rubrique Administration / Configuration
    if ($resource === 'config' && $method === 'POST') {
        $pdo = getDatabase();
        $body = getJsonBody();
        ConfigController::save($pdo, (string)($body['cle'] ?? ''), (string)($body['valeur'] ?? ''));
        jsonResponse(['ok' => true]);
    }

    jsonResponse(['ok' => false, 'error' => 'Route API introuvable : ' . $route], 404);
} catch (Throwable $e) {
    jsonResponse(['ok' => false, 'error' => $e->getMessage()], 500);
}
