<?php
declare(strict_types=1);

class ConfigController {
    public static function save(PDO $pdo, string $cle, string $valeur): void {
        if ($cle === '') {
            throw new InvalidArgumentException('Clé de configuration obligatoire.');
        }

        $sql = 'INSERT INTO configuration (cle, valeur)
                VALUES (?, ?)
                ON DUPLICATE KEY UPDATE valeur = VALUES(valeur)';

        $pdo->prepare($sql)->execute([$cle, $valeur]);
    }
}
