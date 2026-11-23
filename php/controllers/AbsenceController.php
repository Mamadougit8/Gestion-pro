<?php
declare(strict_types=1);

class AbsenceController {
    public static function saveAbsence(PDO $pdo, string $dateAbsence, string $eleveId, string $type, string $motif): void {
        if ($dateAbsence === '' || $eleveId === '') {
            throw new InvalidArgumentException('Date et élève obligatoires.');
        }

        $id = "{$dateAbsence}|{$eleveId}";
        if ($type === '') {
            $pdo->prepare('DELETE FROM absences WHERE id = ?')->execute([$id]);
            return;
        }

        $sql = 'INSERT INTO absences (id, date_absence, eleve_id, type, motif)
                VALUES (?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                  type = VALUES(type),
                  motif = VALUES(motif)';

        $pdo->prepare($sql)->execute([
            $id,
            $dateAbsence,
            $eleveId,
            $type,
            $motif !== '' ? $motif : 'Sans motif connu',
        ]);
    }

    public static function saveAppel(PDO $pdo, string $dateAppel, string $classe, int $statut = 1): void {
        if ($dateAppel === '' || $classe === '') {
            throw new InvalidArgumentException('Date et classe obligatoires.');
        }

        $id = "{$dateAppel}|{$classe}";
        $sql = 'INSERT INTO appels (id, date_appel, classe, statut)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE statut = VALUES(statut)';

        $pdo->prepare($sql)->execute([$id, $dateAppel, $classe, $statut]);
    }
}
