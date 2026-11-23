<?php
declare(strict_types=1);

class NoteController {
    public static function save(PDO $pdo, string $eleveId, string $matiere, int $trimestre, string $typeNote, mixed $note): void {
        if ($eleveId === '' || $matiere === '') {
            throw new InvalidArgumentException('Élève et matière obligatoires.');
        }

        $id = "{$eleveId}|{$matiere}|{$trimestre}|{$typeNote}";
        if ($note === null || $note === '' || !is_numeric($note)) {
            $pdo->prepare('DELETE FROM notes WHERE id = ?')->execute([$id]);
            return;
        }

        $val = max(0.0, min(20.0, (float)$note));
        $sql = 'INSERT INTO notes (id, eleve_id, matiere, trimestre, type_note, note, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE
                  note = VALUES(note),
                  updated_at = NOW()';

        $pdo->prepare($sql)->execute([$id, $eleveId, $matiere, $trimestre, $typeNote, $val]);
    }
}
