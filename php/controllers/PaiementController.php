<?php
declare(strict_types=1);

class PaiementController {
    public static function save(PDO $pdo, array $data): void {
        if (empty($data['id']) || empty($data['el']) || !isset($data['m'])) {
            throw new InvalidArgumentException('Données de paiement incomplètes.');
        }

        $sql = 'INSERT INTO paiements (id, eleve_id, montant, mode, reference, date_paiement)
                VALUES (?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                  montant = VALUES(montant),
                  mode = VALUES(mode),
                  reference = VALUES(reference),
                  date_paiement = VALUES(date_paiement)';

        $pdo->prepare($sql)->execute([
            (string)$data['id'],
            (string)$data['el'],
            (float)$data['m'],
            (string)($data['mode'] ?? 'Espèces'),
            !empty($data['ref']) ? (string)$data['ref'] : null,
            (string)($data['d'] ?? date('Y-m-d')),
        ]);
    }

    public static function delete(PDO $pdo, string $id): void {
        $pdo->prepare('DELETE FROM paiements WHERE id = ?')->execute([$id]);
    }
}
