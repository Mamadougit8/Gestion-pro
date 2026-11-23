<?php
declare(strict_types=1);

class EnseignantController {
    public static function save(PDO $pdo, array $data): void {
        if (empty($data['id']) || empty($data['nom']) || empty($data['mat'])) {
            throw new InvalidArgumentException('Champs obligatoires manquants pour l’enseignant.');
        }

        $classesJson = json_encode($data['cl'] ?? [], JSON_UNESCAPED_UNICODE);
        $sql = 'INSERT INTO enseignants (id, nom, matiere, telephone, classes)
                VALUES (?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                  nom = VALUES(nom),
                  matiere = VALUES(matiere),
                  telephone = VALUES(telephone),
                  classes = VALUES(classes)';

        $pdo->prepare($sql)->execute([
            (string)$data['id'],
            (string)$data['nom'],
            (string)$data['mat'],
            !empty($data['tel']) ? (string)$data['tel'] : null,
            $classesJson,
        ]);
    }

    public static function delete(PDO $pdo, string $id): void {
        $pdo->prepare('DELETE FROM enseignants WHERE id = ?')->execute([$id]);
    }
}
