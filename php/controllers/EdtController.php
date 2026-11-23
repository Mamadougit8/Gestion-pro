<?php
declare(strict_types=1);

class EdtController {
    public static function save(PDO $pdo, string $classe, mixed $creneaux, mixed $grille): void {
        if ($classe === '') {
            throw new InvalidArgumentException('Classe obligatoire pour l’emploi du temps.');
        }

        $creneauxJson = json_encode($creneaux ?? [], JSON_UNESCAPED_UNICODE);
        $grilleJson = json_encode($grille ?? new stdClass(), JSON_UNESCAPED_UNICODE);

        $sql = 'INSERT INTO emploi_du_temps (classe, creneaux, grille)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE
                  creneaux = VALUES(creneaux),
                  grille = VALUES(grille)';

        $pdo->prepare($sql)->execute([$classe, $creneauxJson, $grilleJson]);
    }
}
