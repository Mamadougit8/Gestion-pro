import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, 'gestion_scolaire.db');

// Initialize SQLite database
const sqlite = new DatabaseSync(DB_PATH);

// Initialize schema
export function initDatabase() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS configuration (
      cle TEXT PRIMARY KEY,
      valeur TEXT
    );

    CREATE TABLE IF NOT EXISTS eleves (
      id TEXT PRIMARY KEY,
      nom TEXT NOT NULL,
      matricule TEXT,
      sexe TEXT,
      date_naissance TEXT,
      lieu_naissance TEXT,
      classe TEXT NOT NULL,
      parent TEXT,
      telephone TEXT,
      adresse TEXT,
      photo TEXT,
      decision TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS enseignants (
      id TEXT PRIMARY KEY,
      nom TEXT NOT NULL,
      matiere TEXT NOT NULL,
      telephone TEXT,
      classes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS matieres (
      id TEXT PRIMARY KEY,
      classe TEXT NOT NULL,
      nom TEXT NOT NULL,
      coefficient REAL NOT NULL DEFAULT 1.0
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      eleve_id TEXT NOT NULL,
      matiere TEXT NOT NULL,
      trimestre INTEGER NOT NULL,
      type_note TEXT NOT NULL,
      note REAL NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS paiements (
      id TEXT PRIMARY KEY,
      eleve_id TEXT NOT NULL,
      montant REAL NOT NULL,
      mode TEXT NOT NULL,
      reference TEXT,
      date_paiement TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS absences (
      id TEXT PRIMARY KEY,
      date_absence TEXT NOT NULL,
      eleve_id TEXT NOT NULL,
      type TEXT NOT NULL,
      motif TEXT
    );

    CREATE TABLE IF NOT EXISTS appels (
      id TEXT PRIMARY KEY,
      date_appel TEXT NOT NULL,
      classe TEXT NOT NULL,
      statut INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS emploi_du_temps (
      classe TEXT PRIMARY KEY,
      creneaux TEXT NOT NULL,
      grille TEXT NOT NULL
    );
  `);

  // Seed default students if table is empty
  const countStmt = sqlite.prepare('SELECT COUNT(*) as count FROM eleves');
  const countResult = countStmt.get();
  if (countResult.count === 0) {
    const seedStudents = [
      { id: 'e0', nom: 'Aminata Traoré', cl: '7e année' },
      { id: 'e1', nom: 'Moussa Keïta', cl: '7e année' },
      { id: 'e2', nom: 'Fatoumata Diarra', cl: '8e année' },
      { id: 'e3', nom: 'Ibrahim Coulibaly', cl: '9e année' },
      { id: 'e4', nom: 'Mariam Sangaré', cl: '10e année' },
      { id: 'e5', nom: 'Seydou Konaté', cl: '11e LL' },
      { id: 'e6', nom: 'Awa Dembélé', cl: '11e SES' },
      { id: 'e7', nom: 'Oumar Sissoko', cl: '11e SES' },
    ];
    const insertStmt = sqlite.prepare(`
      INSERT INTO eleves (id, nom, classe) VALUES (?, ?, ?)
    `);
    for (const s of seedStudents) {
      insertStmt.run(s.id, s.nom, s.cl);
    }

    // Default school info
    const insertCfg = sqlite.prepare(`
      INSERT OR REPLACE INTO configuration (cle, valeur) VALUES (?, ?)
    `);
    insertCfg.run('ecole', 'Lycée & Collège Pro');
    insertCfg.run('an', '2026-2027');
    insertCfg.run('dir', 'Mamadou Diarra');
    insertCfg.run('pe', '2');
  }
}

// Fetch complete application state
export function getAppState() {
  const elevesRows = sqlite.prepare('SELECT * FROM eleves ORDER BY classe, nom').all();
  const eleves = elevesRows.map((r) => ({
    id: r.id,
    nom: r.nom,
    mat: r.matricule || '',
    sx: r.sexe || '',
    dn: r.date_naissance || '',
    ln: r.lieu_naissance || '',
    cl: r.classe,
    pa: r.parent || '',
    tel: r.telephone || '',
    ad: r.adresse || '',
    ph: r.photo || '',
  }));

  const dec = {};
  elevesRows.forEach((r) => {
    if (r.decision) dec[r.id] = r.decision;
  });

  const ensRows = sqlite.prepare('SELECT * FROM enseignants ORDER BY nom').all();
  const ens = ensRows.map((r) => ({
    id: r.id,
    nom: r.nom,
    mat: r.matiere,
    tel: r.telephone || '',
    cl: r.classes ? JSON.parse(r.classes) : [],
  }));

  const notesRows = sqlite.prepare('SELECT * FROM notes').all();
  const notes = {};
  notesRows.forEach((r) => {
    // Key format: id|matiere|trimestre|type
    notes[`${r.eleve_id}|${r.matiere}|${r.trimestre}|${r.type_note}`] = r.note;
  });

  const paieRows = sqlite.prepare('SELECT * FROM paiements ORDER BY id ASC').all();
  const paie = paieRows.map((r) => ({
    id: r.id,
    el: r.eleve_id,
    m: r.montant,
    mode: r.mode,
    ref: r.reference || '',
    d: r.date_paiement,
  }));

  const absRows = sqlite.prepare('SELECT * FROM absences').all();
  const abs = {};
  absRows.forEach((r) => {
    abs[`${r.date_absence}|${r.eleve_id}`] = { t: r.type, m: r.motif || '' };
  });

  const appelsRows = sqlite.prepare('SELECT * FROM appels').all();
  const appel = {};
  appelsRows.forEach((r) => {
    appel[`${r.date_appel}|${r.classe}`] = r.statut;
  });

  const matRows = sqlite.prepare('SELECT * FROM matieres').all();
  const mc = {};
  matRows.forEach((r) => {
    if (!mc[r.classe]) mc[r.classe] = {};
    mc[r.classe][r.nom] = r.coefficient;
  });

  const edtRows = sqlite.prepare('SELECT * FROM emploi_du_temps').all();
  const edt = {};
  edtRows.forEach((r) => {
    edt[r.classe] = {
      sl: JSON.parse(r.creneaux),
      c: JSON.parse(r.grille),
    };
  });

  const cfgRows = sqlite.prepare('SELECT * FROM configuration').all();
  const config = {};
  cfgRows.forEach((r) => {
    config[r.cle] = r.valeur;
  });

  return {
    eleves,
    dec,
    ens,
    notes,
    paie,
    abs,
    appel,
    mc,
    edt,
    ecole: config.ecole || 'Établissement scolaire',
    an: config.an || '2026-2027',
    dir: config.dir || '',
    pe: parseFloat(config.pe) || 2,
  };
}

// Eleve CRUD
export function saveEleve(data) {
  const stmt = sqlite.prepare(`
    INSERT INTO eleves (id, nom, matricule, sexe, date_naissance, lieu_naissance, classe, parent, telephone, adresse, photo, decision)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      nom = excluded.nom,
      matricule = excluded.matricule,
      sexe = excluded.sexe,
      date_naissance = excluded.date_naissance,
      lieu_naissance = excluded.lieu_naissance,
      classe = excluded.classe,
      parent = excluded.parent,
      telephone = excluded.telephone,
      adresse = excluded.adresse,
      photo = COALESCE(excluded.photo, eleves.photo),
      decision = COALESCE(excluded.decision, eleves.decision)
  `);
  stmt.run(
    data.id,
    data.nom,
    data.mat || null,
    data.sx || null,
    data.dn || null,
    data.ln || null,
    data.cl,
    data.pa || null,
    data.tel || null,
    data.ad || null,
    data.ph || null,
    data.decision || null
  );
}

export function updateElevePhoto(id, photoBase64) {
  sqlite.prepare('UPDATE eleves SET photo = ? WHERE id = ?').run(photoBase64, id);
}

export function updateEleveDecision(id, decision) {
  sqlite.prepare('UPDATE eleves SET decision = ? WHERE id = ?').run(decision || null, id);
}

export function deleteEleve(id) {
  sqlite.prepare('DELETE FROM eleves WHERE id = ?').run(id);
  sqlite.prepare('DELETE FROM notes WHERE eleve_id = ?').run(id);
  sqlite.prepare('DELETE FROM paiements WHERE eleve_id = ?').run(id);
  sqlite.prepare('DELETE FROM absences WHERE eleve_id = ?').run(id);
}

// Enseignant CRUD
export function saveEnseignant(data) {
  const stmt = sqlite.prepare(`
    INSERT INTO enseignants (id, nom, matiere, telephone, classes)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      nom = excluded.nom,
      matiere = excluded.matiere,
      telephone = excluded.telephone,
      classes = excluded.classes
  `);
  stmt.run(
    data.id,
    data.nom,
    data.mat,
    data.tel || null,
    JSON.stringify(data.cl || [])
  );
}

export function deleteEnseignant(id) {
  sqlite.prepare('DELETE FROM enseignants WHERE id = ?').run(id);
}

// Notes CRUD
export function saveNote(eleveId, matiere, trimestre, typeNote, note) {
  const id = `${eleveId}|${matiere}|${trimestre}|${typeNote}`;
  if (note === null || note === undefined || isNaN(note)) {
    sqlite.prepare('DELETE FROM notes WHERE id = ?').run(id);
  } else {
    const stmt = sqlite.prepare(`
      INSERT INTO notes (id, eleve_id, matiere, trimestre, type_note, note, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        note = excluded.note,
        updated_at = datetime('now')
    `);
    stmt.run(id, eleveId, matiere, parseInt(trimestre), typeNote, parseFloat(note));
  }
}

// Paiements CRUD
export function savePaiement(data) {
  const stmt = sqlite.prepare(`
    INSERT INTO paiements (id, eleve_id, montant, mode, reference, date_paiement)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    data.id,
    data.el,
    parseFloat(data.m),
    data.mode,
    data.ref || null,
    data.d
  );
}

export function deletePaiement(id) {
  sqlite.prepare('DELETE FROM paiements WHERE id = ?').run(id);
}

// Absences & Appels
export function saveAbsence(dateAbsence, eleveId, type, motif) {
  const id = `${dateAbsence}|${eleveId}`;
  if (!type) {
    sqlite.prepare('DELETE FROM absences WHERE id = ?').run(id);
  } else {
    const stmt = sqlite.prepare(`
      INSERT INTO absences (id, date_absence, eleve_id, type, motif)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        type = excluded.type,
        motif = excluded.motif
    `);
    stmt.run(id, dateAbsence, eleveId, type, motif || 'Sans motif connu');
  }
}

export function saveAppel(dateAppel, classe, statut = 1) {
  const id = `${dateAppel}|${classe}`;
  const stmt = sqlite.prepare(`
    INSERT INTO appels (id, date_appel, classe, statut)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET statut = excluded.statut
  `);
  stmt.run(id, dateAppel, classe, statut);
}

// Matières coefficients
export function saveMatiere(classe, nom, coef) {
  const id = `${classe}|${nom}`;
  const stmt = sqlite.prepare(`
    INSERT INTO matieres (id, classe, nom, coefficient)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET coefficient = excluded.coefficient
  `);
  stmt.run(id, classe, nom, parseFloat(coef));
}

export function deleteMatiere(classe, nom) {
  const id = `${classe}|${nom}`;
  sqlite.prepare('DELETE FROM matieres WHERE id = ?').run(id);
}

// Emploi du temps
export function saveEdt(classe, creneaux, grille) {
  const stmt = sqlite.prepare(`
    INSERT INTO emploi_du_temps (classe, creneaux, grille)
    VALUES (?, ?, ?)
    ON CONFLICT(classe) DO UPDATE SET
      creneaux = excluded.creneaux,
      grille = excluded.grille
  `);
  stmt.run(classe, JSON.stringify(creneaux), JSON.stringify(grille));
}

// Configuration
export function saveConfig(cle, valeur) {
  const stmt = sqlite.prepare(`
    INSERT INTO configuration (cle, valeur)
    VALUES (?, ?)
    ON CONFLICT(cle) DO UPDATE SET valeur = excluded.valeur
  `);
  stmt.run(cle, String(valeur));
}

// Bulk sync from client state
export function bulkSync(state) {
  if (!state) return;
  if (state.ecole) saveConfig('ecole', state.ecole);
  if (state.an) saveConfig('an', state.an);
  if (state.dir) saveConfig('dir', state.dir);
  if (state.pe) saveConfig('pe', state.pe);

  if (Array.isArray(state.eleves)) {
    for (const e of state.eleves) {
      saveEleve({
        ...e,
        decision: state.dec && state.dec[e.id] ? state.dec[e.id] : null,
      });
    }
  }

  if (Array.isArray(state.ens)) {
    for (const t of state.ens) {
      saveEnseignant(t);
    }
  }

  if (state.notes && typeof state.notes === 'object') {
    for (const [k, v] of Object.entries(state.notes)) {
      const parts = k.split('|');
      if (parts.length >= 4) {
        saveNote(parts[0], parts[1], parts[2], parts[3], v);
      }
    }
  }

  if (Array.isArray(state.paie)) {
    for (const p of state.paie) {
      savePaiement(p);
    }
  }

  if (state.abs && typeof state.abs === 'object') {
    for (const [k, v] of Object.entries(state.abs)) {
      const parts = k.split('|');
      if (parts.length >= 2 && v) {
        saveAbsence(parts[0], parts[1], v.t, v.m);
      }
    }
  }

  if (state.appel && typeof state.appel === 'object') {
    for (const [k, v] of Object.entries(state.appel)) {
      const parts = k.split('|');
      if (parts.length >= 2) {
        saveAppel(parts[0], parts[1], v);
      }
    }
  }

  if (state.mc && typeof state.mc === 'object') {
    for (const [classe, mats] of Object.entries(state.mc)) {
      for (const [nom, coef] of Object.entries(mats)) {
        saveMatiere(classe, nom, coef);
      }
    }
  }

  if (state.edt && typeof state.edt === 'object') {
    for (const [classe, obj] of Object.entries(state.edt)) {
      if (obj && obj.sl && obj.c) {
        saveEdt(classe, obj.sl, obj.c);
      }
    }
  }
}

// Generate standard MySQL DDL and DML dump script
export function generateMySQLDump() {
  const dateStr = new Date().toISOString();
  let sql = `-- ============================================================
-- SCRIPT DE BASE DE DONNÉES MYSQL - GESTION SCOLAIRE PRO
-- Généré le: ${dateStr}
-- Compatible avec MySQL 5.7+, MySQL 8.0+, MariaDB 10.3+
-- ============================================================

CREATE DATABASE IF NOT EXISTS \`gestion_scolaire\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE \`gestion_scolaire\`;

SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- Structure de la table \`configuration\`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS \`configuration\`;
CREATE TABLE \`configuration\` (
  \`cle\` varchar(64) NOT NULL,
  \`valeur\` text,
  PRIMARY KEY (\`cle\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Structure de la table \`eleves\`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS \`eleves\`;
CREATE TABLE \`eleves\` (
  \`id\` varchar(64) NOT NULL,
  \`nom\` varchar(128) NOT NULL,
  \`matricule\` varchar(64) DEFAULT NULL,
  \`sexe\` varchar(4) DEFAULT NULL,
  \`date_naissance\` varchar(32) DEFAULT NULL,
  \`lieu_naissance\` varchar(128) DEFAULT NULL,
  \`classe\` varchar(64) NOT NULL,
  \`parent\` varchar(128) DEFAULT NULL,
  \`telephone\` varchar(64) DEFAULT NULL,
  \`adresse\` varchar(255) DEFAULT NULL,
  \`photo\` longtext DEFAULT NULL,
  \`decision\` varchar(32) DEFAULT NULL,
  \`created_at\` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_classe\` (\`classe\`),
  KEY \`idx_matricule\` (\`matricule\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Structure de la table \`enseignants\`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS \`enseignants\`;
CREATE TABLE \`enseignants\` (
  \`id\` varchar(64) NOT NULL,
  \`nom\` varchar(128) NOT NULL,
  \`matiere\` varchar(64) NOT NULL,
  \`telephone\` varchar(64) DEFAULT NULL,
  \`classes\` text,
  \`created_at\` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Structure de la table \`matieres\`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS \`matieres\`;
CREATE TABLE \`matieres\` (
  \`id\` varchar(128) NOT NULL,
  \`classe\` varchar(64) NOT NULL,
  \`nom\` varchar(64) NOT NULL,
  \`coefficient\` decimal(4,2) NOT NULL DEFAULT 1.00,
  PRIMARY KEY (\`id\`),
  KEY \`idx_mat_classe\` (\`classe\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Structure de la table \`notes\`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS \`notes\`;
CREATE TABLE \`notes\` (
  \`id\` varchar(128) NOT NULL,
  \`eleve_id\` varchar(64) NOT NULL,
  \`matiere\` varchar(64) NOT NULL,
  \`trimestre\` int NOT NULL,
  \`type_note\` varchar(4) NOT NULL COMMENT 'c=classe, e=examen',
  \`note\` decimal(5,2) NOT NULL,
  \`updated_at\` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_note_eleve\` (\`eleve_id\`),
  KEY \`idx_note_trimestre\` (\`trimestre\`),
  CONSTRAINT \`fk_notes_eleve\` FOREIGN KEY (\`eleve_id\`) REFERENCES \`eleves\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Structure de la table \`paiements\`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS \`paiements\`;
CREATE TABLE \`paiements\` (
  \`id\` varchar(64) NOT NULL,
  \`eleve_id\` varchar(64) NOT NULL,
  \`montant\` decimal(10,2) NOT NULL,
  \`mode\` varchar(32) NOT NULL,
  \`reference\` varchar(128) DEFAULT NULL,
  \`date_paiement\` varchar(32) NOT NULL,
  \`created_at\` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_paie_eleve\` (\`eleve_id\`),
  CONSTRAINT \`fk_paie_eleve\` FOREIGN KEY (\`eleve_id\`) REFERENCES \`eleves\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Structure de la table \`absences\`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS \`absences\`;
CREATE TABLE \`absences\` (
  \`id\` varchar(128) NOT NULL,
  \`date_absence\` varchar(32) NOT NULL,
  \`eleve_id\` varchar(64) NOT NULL,
  \`type\` varchar(4) NOT NULL COMMENT 'A=Absent, R=Retard',
  \`motif\` varchar(128) DEFAULT NULL,
  PRIMARY KEY (\`id\`),
  KEY \`idx_abs_date\` (\`date_absence\`),
  KEY \`idx_abs_eleve\` (\`eleve_id\`),
  CONSTRAINT \`fk_abs_eleve\` FOREIGN KEY (\`eleve_id\`) REFERENCES \`eleves\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Structure de la table \`appels\`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS \`appels\`;
CREATE TABLE \`appels\` (
  \`id\` varchar(128) NOT NULL,
  \`date_appel\` varchar(32) NOT NULL,
  \`classe\` varchar(64) NOT NULL,
  \`statut\` tinyint NOT NULL DEFAULT 1,
  PRIMARY KEY (\`id\`),
  KEY \`idx_appel_date\` (\`date_appel\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Structure de la table \`emploi_du_temps\`
-- ------------------------------------------------------------
DROP TABLE IF EXISTS \`emploi_du_temps\`;
CREATE TABLE \`emploi_du_temps\` (
  \`classe\` varchar(64) NOT NULL,
  \`creneaux\` text NOT NULL,
  \`grille\` text NOT NULL,
  PRIMARY KEY (\`classe\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- DONNÉES ENREGISTRÉES (DUMP DML)
-- ------------------------------------------------------------
`;

  function escSql(val) {
    if (val === null || val === undefined) return 'NULL';
    return "'" + String(val).replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, (char) => {
      switch (char) {
        case '\0': return '\\0';
        case '\x08': return '\\b';
        case '\x09': return '\\t';
        case '\x1a': return '\\z';
        case '\n': return '\\n';
        case '\r': return '\\r';
        case '"':
        case "'":
        case '\\':
        case '%': return '\\' + char;
        default: return char;
      }
    }) + "'";
  }

  // Dump configuration
  const cfgs = sqlite.prepare('SELECT * FROM configuration').all();
  if (cfgs.length > 0) {
    sql += `\n-- Configuration\nINSERT INTO \`configuration\` (\`cle\`, \`valeur\`) VALUES\n`;
    sql += cfgs.map((c) => `(${escSql(c.cle)}, ${escSql(c.valeur)})`).join(',\n') + ';\n';
  }

  // Dump eleves
  const els = sqlite.prepare('SELECT * FROM eleves').all();
  if (els.length > 0) {
    sql += `\n-- Élèves (${els.length})\nINSERT INTO \`eleves\` (\`id\`, \`nom\`, \`matricule\`, \`sexe\`, \`date_naissance\`, \`lieu_naissance\`, \`classe\`, \`parent\`, \`telephone\`, \`adresse\`, \`decision\`) VALUES\n`;
    sql += els.map((e) => `(${escSql(e.id)}, ${escSql(e.nom)}, ${escSql(e.matricule)}, ${escSql(e.sexe)}, ${escSql(e.date_naissance)}, ${escSql(e.lieu_naissance)}, ${escSql(e.classe)}, ${escSql(e.parent)}, ${escSql(e.telephone)}, ${escSql(e.adresse)}, ${escSql(e.decision)})`).join(',\n') + ';\n';
  }

  // Dump enseignants
  const teachers = sqlite.prepare('SELECT * FROM enseignants').all();
  if (teachers.length > 0) {
    sql += `\n-- Enseignants (${teachers.length})\nINSERT INTO \`enseignants\` (\`id\`, \`nom\`, \`matiere\`, \`telephone\`, \`classes\`) VALUES\n`;
    sql += teachers.map((t) => `(${escSql(t.id)}, ${escSql(t.nom)}, ${escSql(t.matiere)}, ${escSql(t.telephone)}, ${escSql(t.classes)})`).join(',\n') + ';\n';
  }

  // Dump notes
  const nts = sqlite.prepare('SELECT * FROM notes').all();
  if (nts.length > 0) {
    sql += `\n-- Notes (${nts.length})\nINSERT INTO \`notes\` (\`id\`, \`eleve_id\`, \`matiere\`, \`trimestre\`, \`type_note\`, \`note\`) VALUES\n`;
    sql += nts.map((n) => `(${escSql(n.id)}, ${escSql(n.eleve_id)}, ${escSql(n.matiere)}, ${n.trimestre}, ${escSql(n.type_note)}, ${n.note})`).join(',\n') + ';\n';
  }

  // Dump paiements
  const pmts = sqlite.prepare('SELECT * FROM paiements').all();
  if (pmts.length > 0) {
    sql += `\n-- Paiements (${pmts.length})\nINSERT INTO \`paiements\` (\`id\`, \`eleve_id\`, \`montant\`, \`mode\`, \`reference\`, \`date_paiement\`) VALUES\n`;
    sql += pmts.map((p) => `(${escSql(p.id)}, ${escSql(p.eleve_id)}, ${p.montant}, ${escSql(p.mode)}, ${escSql(p.reference)}, ${escSql(p.date_paiement)})`).join(',\n') + ';\n';
  }

  // Dump absences
  const abss = sqlite.prepare('SELECT * FROM absences').all();
  if (abss.length > 0) {
    sql += `\n-- Absences (${abss.length})\nINSERT INTO \`absences\` (\`id\`, \`date_absence\`, \`eleve_id\`, \`type\`, \`motif\`) VALUES\n`;
    sql += abss.map((a) => `(${escSql(a.id)}, ${escSql(a.date_absence)}, ${escSql(a.eleve_id)}, ${escSql(a.type)}, ${escSql(a.motif)})`).join(',\n') + ';\n';
  }

  // Dump appels
  const apps = sqlite.prepare('SELECT * FROM appels').all();
  if (apps.length > 0) {
    sql += `\n-- Appels (${apps.length})\nINSERT INTO \`appels\` (\`id\`, \`date_appel\`, \`classe\`, \`statut\`) VALUES\n`;
    sql += apps.map((a) => `(${escSql(a.id)}, ${escSql(a.date_appel)}, ${escSql(a.classe)}, ${a.statut})`).join(',\n') + ';\n';
  }

  sql += `\nSET FOREIGN_KEY_CHECKS = 1;\n-- FIN DU DUMP MYSQL\n`;
  return sql;
}

// Stats for status display
export function getDbStats() {
  const tables = ['eleves', 'enseignants', 'matieres', 'notes', 'paiements', 'absences', 'appels', 'emploi_du_temps', 'configuration'];
  const counts = {};
  for (const t of tables) {
    try {
      const row = sqlite.prepare(`SELECT COUNT(*) as c FROM ${t}`).get();
      counts[t] = row.c;
    } catch {
      counts[t] = 0;
    }
  }
  return {
    engine: 'SQLite / MySQL Schema Relational Engine',
    dialect: 'SQL',
    tables: tables.length,
    counts,
    dbPath: DB_PATH,
  };
}
