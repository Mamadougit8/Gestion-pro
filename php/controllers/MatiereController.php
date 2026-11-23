<?php
declare(strict_types=1);

class MatiereController {
    public static function save(PDO $pdo, string $classe, string $nom, float $coef): void {
        if ($classe === '' || $nom === '') {
            throw new InvalidArgumentException('Classe et nom de matière obligatoires.');
        }

        $id = "{$classe}|{$nom}";
        $sql = 'INSERT INTO matieres (id, classe, nom, coefficient)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE coefficient = VALUES(coefficient)';

        $pdo->prepare($sql)->execute([$id, $classe, $nom, max(0.5, $coef)]);
    }

    public static function saveClasse(PDO $pdo, string $classe, array $matieres): void {
        if ($classe === '') {
            throw new InvalidArgumentException('Classe obligatoire.');
        }

        $pdo->prepare('DELETE FROM matieres WHERE classe = ?')->execute([$classe]);
        foreach ($matieres as $nom => $coef) {
            self::save($pdo, $classe, (string)$nom, (float)$coef);
        }
    }

    public static function delete(PDO $pdo, string $classe, string $nom): void {
        $id = "{$classe}|{$nom}";
        $pdo->prepare('DELETE FROM matieres WHERE id = ?')->execute([$id]);
    }
}
