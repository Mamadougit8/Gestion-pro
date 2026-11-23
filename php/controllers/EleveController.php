<?php
declare(strict_types=1);

class EleveController {
    public static function save(PDO $pdo, array $data): void {
        if (empty($data['id']) || empty($data['nom']) || empty($data['cl'])) {
            throw new InvalidArgumentException('Champs obligatoires manquants pour l’élève.');
        }

        $sql = 'INSERT INTO eleves (id, nom, matricule, sexe, date_naissance, lieu_naissance, classe, parent, telephone, adresse, photo, decision)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                  nom = VALUES(nom),
                  matricule = VALUES(matricule),
                  sexe = VALUES(sexe),
                  date_naissance = VALUES(date_naissance),
                  lieu_naissance = VALUES(lieu_naissance),
                  classe = VALUES(classe),
                  parent = VALUES(parent),
                  telephone = VALUES(telephone),
                  adresse = VALUES(adresse),
                  photo = COALESCE(VALUES(photo), photo),
                  decision = COALESCE(VALUES(decision), decision)';

        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            (string)$data['id'],
            (string)$data['nom'],
            !empty($data['mat']) ? (string)$data['mat'] : null,
            !empty($data['sx']) ? (string)$data['sx'] : null,
            !empty($data['dn']) ? (string)$data['dn'] : null,
            !empty($data['ln']) ? (string)$data['ln'] : null,
            (string)$data['cl'],
            !empty($data['pa']) ? (string)$data['pa'] : null,
            !empty($data['tel']) ? (string)$data['tel'] : null,
            !empty($data['ad']) ? (string)$data['ad'] : null,
            !empty($data['ph']) ? (string)$data['ph'] : null,
            !empty($data['decision']) ? (string)$data['decision'] : null,
        ]);
    }

    public static function updatePhoto(PDO $pdo, string $id, string $photo): void {
        $stmt = $pdo->prepare('UPDATE eleves SET photo = ? WHERE id = ?');
        $stmt->execute([$photo !== '' ? $photo : null, $id]);
    }

    public static function updateDecision(PDO $pdo, string $id, string $decision): void {
        $stmt = $pdo->prepare('UPDATE eleves SET decision = ? WHERE id = ?');
        $stmt->execute([$decision !== '' ? $decision : null, $id]);
    }

    public static function delete(PDO $pdo, string $id): void {
        $pdo->prepare('DELETE FROM notes WHERE eleve_id = ?')->execute([$id]);
        $pdo->prepare('DELETE FROM paiements WHERE eleve_id = ?')->execute([$id]);
        $pdo->prepare('DELETE FROM absences WHERE eleve_id = ?')->execute([$id]);
        $pdo->prepare('DELETE FROM eleves WHERE id = ?')->execute([$id]);
    }
}
