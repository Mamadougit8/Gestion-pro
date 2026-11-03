import { DatabaseSync } from 'node:sqlite';
import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, 'gestion_scolaire.db');

// Database mode: 'mysql' or 'sqlite'
let dbMode = 'sqlite';
let mysqlPool = null;
let sqliteDb = null;

// Initialize connection
export async function initDatabase() {
  const host = process.env.MYSQL_HOST;
  const user = process.env.MYSQL_USER;
  const password = process.env.MYSQL_PASSWORD || '';
  const database = process.env.MYSQL_DATABASE;
  const port = parseInt(process.env.MYSQL_PORT || '3306');
  const useSsl = process.env.MYSQL_SSL === 'true';

  if (host && user && database) {
    try {
      console.log(`Tentative de connexion au serveur MySQL ${host}:${port}/${database}...`);
      mysqlPool = mysql.createPool({
        host,
        port,
        user,
        password,
        database,
        ssl: useSsl ? { rejectUnauthorized: false } : undefined,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        connectTimeout: 8000,
        enableKeepAlive: true,
      });

      // Test connection
      const connection = await mysqlPool.getConnection();
      console.log('Connecté avec succès au serveur MySQL !');
      connection.release();

      dbMode = 'mysql';
      await initMySQLTables();
      return;
    } catch (err) {
      console.warn('Impossible de se connecter au serveur MySQL:', err.message);
      console.log('Utilisation du moteur SQL local...');
    }
  }

  // Fallback to SQLite
  dbMode = 'sqlite';
  initSQLite();
}

// ------------------------------------------------------------
// Initialisation des tables MySQL (sans aucune donnée fictive)
// ------------------------------------------------------------
async function initMySQLTables() {
  const tables = [
    `CREATE TABLE IF NOT EXISTS \`configuration\` (
      \`cle\` varchar(64) NOT NULL,
      \`valeur\` text,
      PRIMARY KEY (\`cle\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS \`eleves\` (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS \`enseignants\` (
      \`id\` varchar(64) NOT NULL,
      \`nom\` varchar(128) NOT NULL,
      \`matiere\` varchar(64) NOT NULL,
      \`telephone\` varchar(64) DEFAULT NULL,
      \`classes\` text,
      \`created_at\` datetime DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS \`matieres\` (
      \`id\` varchar(128) NOT NULL,
      \`classe\` varchar(64) NOT NULL,
      \`nom\` varchar(64) NOT NULL,
      \`coefficient\` decimal(4,2) NOT NULL DEFAULT 1.00,
      PRIMARY KEY (\`id\`),
      KEY \`idx_mat_classe\` (\`classe\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS \`notes\` (
      \`id\` varchar(128) NOT NULL,
      \`eleve_id\` varchar(64) NOT NULL,
      \`matiere\` varchar(64) NOT NULL,
      \`trimestre\` int NOT NULL,
      \`type_note\` varchar(4) NOT NULL COMMENT 'c=classe, e=examen',
      \`note\` decimal(5,2) NOT NULL,
      \`updated_at\` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`idx_note_eleve\` (\`eleve_id\`),
      KEY \`idx_note_trimestre\` (\`trimestre\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS \`paiements\` (
      \`id\` varchar(64) NOT NULL,
      \`eleve_id\` varchar(64) NOT NULL,
      \`montant\` decimal(10,2) NOT NULL,
      \`mode\` varchar(32) NOT NULL,
      \`reference\` varchar(128) DEFAULT NULL,
      \`date_paiement\` varchar(32) NOT NULL,
      \`created_at\` datetime DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`idx_paie_eleve\` (\`eleve_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS \`absences\` (
      \`id\` varchar(128) NOT NULL,
      \`date_absence\` varchar(32) NOT NULL,
      \`eleve_id\` varchar(64) NOT NULL,
      \`type\` varchar(4) NOT NULL,
      \`motif\` varchar(128) DEFAULT NULL,
      PRIMARY KEY (\`id\`),
      KEY \`idx_abs_date\` (\`date_absence\`),
      KEY \`idx_abs_eleve\` (\`eleve_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS \`appels\` (
      \`id\` varchar(128) NOT NULL,
      \`date_appel\` varchar(32) NOT NULL,
      \`classe\` varchar(64) NOT NULL,
      \`statut\` tinyint NOT NULL DEFAULT 1,
      PRIMARY KEY (\`id\`),
      KEY \`idx_appel_date\` (\`date_appel\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    `CREATE TABLE IF NOT EXISTS \`emploi_du_temps\` (
      \`classe\` varchar(64) NOT NULL,
      \`creneaux\` text NOT NULL,
      \`grille\` text NOT NULL,
      PRIMARY KEY (\`classe\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
  ];

  for (const q of tables) {
    await mysqlPool.query(q);
  }
  console.log('Tables MySQL vérifiées et prêtes (aucune donnée fictive).');
}

// ------------------------------------------------------------
// Initialisation des tables SQLite (sans aucune donnée fictive)
// ------------------------------------------------------------
function initSQLite() {
  sqliteDb = new DatabaseSync(DB_PATH);
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS configuration (cle TEXT PRIMARY KEY, valeur TEXT);
    CREATE TABLE IF NOT EXISTS eleves (id TEXT PRIMARY KEY, nom TEXT NOT NULL, matricule TEXT, sexe TEXT, date_naissance TEXT, lieu_naissance TEXT, classe TEXT NOT NULL, parent TEXT, telephone TEXT, adresse TEXT, photo TEXT, decision TEXT, created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS enseignants (id TEXT PRIMARY KEY, nom TEXT NOT NULL, matiere TEXT NOT NULL, telephone TEXT, classes TEXT, created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS matieres (id TEXT PRIMARY KEY, classe TEXT NOT NULL, nom TEXT NOT NULL, coefficient REAL NOT NULL DEFAULT 1.0);
    CREATE TABLE IF NOT EXISTS notes (id TEXT PRIMARY KEY, eleve_id TEXT NOT NULL, matiere TEXT NOT NULL, trimestre INTEGER NOT NULL, type_note TEXT NOT NULL, note REAL NOT NULL, updated_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS paiements (id TEXT PRIMARY KEY, eleve_id TEXT NOT NULL, montant REAL NOT NULL, mode TEXT NOT NULL, reference TEXT, date_paiement TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS absences (id TEXT PRIMARY KEY, date_absence TEXT NOT NULL, eleve_id TEXT NOT NULL, type TEXT NOT NULL, motif TEXT);
    CREATE TABLE IF NOT EXISTS appels (id TEXT PRIMARY KEY, date_appel TEXT NOT NULL, classe TEXT NOT NULL, statut INTEGER DEFAULT 1);
    CREATE TABLE IF NOT EXISTS emploi_du_temps (classe TEXT PRIMARY KEY, creneaux TEXT NOT NULL, grille TEXT NOT NULL);
  `);
}

// Helper query runner
async function queryAll(sql, params = []) {
  if (dbMode === 'mysql' && mysqlPool) {
    const [rows] = await mysqlPool.execute(sql, params);
    return rows;
  } else {
    return sqliteDb.prepare(sql).all(...params);
  }
}

async function executeSql(sql, params = []) {
  if (dbMode === 'mysql' && mysqlPool) {
    return await mysqlPool.execute(sql, params);
  } else {
    return sqliteDb.prepare(sql).run(...params);
  }
}

// ------------------------------------------------------------
// Lecture de l'état réel de la base (sans donnée fictive)
// ------------------------------------------------------------
export async function getAppState() {
  try {
    const elevesRows = await queryAll('SELECT * FROM eleves ORDER BY classe, nom');
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

    const ensRows = await queryAll('SELECT * FROM enseignants ORDER BY nom');
    const ens = ensRows.map((r) => ({
      id: r.id,
      nom: r.nom,
      mat: r.matiere,
      tel: r.telephone || '',
      cl: r.classes ? (typeof r.classes === 'string' ? JSON.parse(r.classes) : r.classes) : [],
    }));

    const notesRows = await queryAll('SELECT * FROM notes');
    const notes = {};
    notesRows.forEach((r) => {
      notes[`${r.eleve_id}|${r.matiere}|${r.trimestre}|${r.type_note}`] = parseFloat(r.note);
    });

    const paieRows = await queryAll('SELECT * FROM paiements ORDER BY id ASC');
    const paie = paieRows.map((r) => ({
      id: r.id,
      el: r.eleve_id,
      m: parseFloat(r.montant),
      mode: r.mode,
      ref: r.reference || '',
      d: r.date_paiement,
    }));

    const absRows = await queryAll('SELECT * FROM absences');
    const abs = {};
    absRows.forEach((r) => {
      abs[`${r.date_absence}|${r.eleve_id}`] = { t: r.type, m: r.motif || '' };
    });

    const appelsRows = await queryAll('SELECT * FROM appels');
    const appel = {};
    appelsRows.forEach((r) => {
      appel[`${r.date_appel}|${r.classe}`] = r.statut;
    });

    const matRows = await queryAll('SELECT * FROM matieres');
    const mc = {};
    matRows.forEach((r) => {
      if (!mc[r.classe]) mc[r.classe] = {};
      mc[r.classe][r.nom] = parseFloat(r.coefficient);
    });

    const edtRows = await queryAll('SELECT * FROM emploi_du_temps');
    const edt = {};
    edtRows.forEach((r) => {
      edt[r.classe] = {
        sl: typeof r.creneaux === 'string' ? JSON.parse(r.creneaux) : r.creneaux,
        c: typeof r.grille === 'string' ? JSON.parse(r.grille) : r.grille,
      };
    });

    const cfgRows = await queryAll('SELECT * FROM configuration');
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
      ecole: config.ecole || '',
      an: config.an || '',
      dir: config.dir || '',
      pe: parseFloat(config.pe) || 2,
    };
  } catch (err) {
    console.error('Erreur getAppState:', err);
    return {
      eleves: [],
      dec: {},
      ens: [],
      notes: {},
      paie: [],
      abs: {},
      appel: {},
      mc: {},
      edt: {},
      ecole: '',
      an: '',
      dir: '',
      pe: 2,
    };
  }
}

// ------------------------------------------------------------
// Opérations CRUD adaptées MySQL et SQLite
// ------------------------------------------------------------

export async function saveEleve(data) {
  if (dbMode === 'mysql') {
    const sql = `
      INSERT INTO eleves (id, nom, matricule, sexe, date_naissance, lieu_naissance, classe, parent, telephone, adresse, photo, decision)
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
        decision = COALESCE(VALUES(decision), decision)
    `;
    await executeSql(sql, [
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
      data.decision || null,
    ]);
  } else {
    const sql = `
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
    `;
    await executeSql(sql, [
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
      data.decision || null,
    ]);
  }
}

export async function updateElevePhoto(id, photoBase64) {
  await executeSql('UPDATE eleves SET photo = ? WHERE id = ?', [photoBase64, id]);
}

export async function updateEleveDecision(id, decision) {
  await executeSql('UPDATE eleves SET decision = ? WHERE id = ?', [decision || null, id]);
}

export async function deleteEleve(id) {
  await executeSql('DELETE FROM eleves WHERE id = ?', [id]);
  await executeSql('DELETE FROM notes WHERE eleve_id = ?', [id]);
  await executeSql('DELETE FROM paiements WHERE eleve_id = ?', [id]);
  await executeSql('DELETE FROM absences WHERE eleve_id = ?', [id]);
}

export async function saveEnseignant(data) {
  const classesJson = JSON.stringify(data.cl || []);
  if (dbMode === 'mysql') {
    const sql = `
      INSERT INTO enseignants (id, nom, matiere, telephone, classes)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        nom = VALUES(nom),
        matiere = VALUES(matiere),
        telephone = VALUES(telephone),
        classes = VALUES(classes)
    `;
    await executeSql(sql, [data.id, data.nom, data.mat, data.tel || null, classesJson]);
  } else {
    const sql = `
      INSERT INTO enseignants (id, nom, matiere, telephone, classes)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        nom = excluded.nom,
        matiere = excluded.matiere,
        telephone = excluded.telephone,
        classes = excluded.classes
    `;
    await executeSql(sql, [data.id, data.nom, data.mat, data.tel || null, classesJson]);
  }
}

export async function deleteEnseignant(id) {
  await executeSql('DELETE FROM enseignants WHERE id = ?', [id]);
}

export async function saveNote(eleveId, matiere, trimestre, typeNote, note) {
  const id = `${eleveId}|${matiere}|${trimestre}|${typeNote}`;
  if (note === null || note === undefined || isNaN(note)) {
    await executeSql('DELETE FROM notes WHERE id = ?', [id]);
  } else {
    if (dbMode === 'mysql') {
      const sql = `
        INSERT INTO notes (id, eleve_id, matiere, trimestre, type_note, note, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
          note = VALUES(note),
          updated_at = NOW()
      `;
      await executeSql(sql, [id, eleveId, matiere, parseInt(trimestre), typeNote, parseFloat(note)]);
    } else {
      const sql = `
        INSERT INTO notes (id, eleve_id, matiere, trimestre, type_note, note, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
          note = excluded.note,
          updated_at = datetime('now')
      `;
      await executeSql(sql, [id, eleveId, matiere, parseInt(trimestre), typeNote, parseFloat(note)]);
    }
  }
}

export async function savePaiement(data) {
  const sql = `
    INSERT INTO paiements (id, eleve_id, montant, mode, reference, date_paiement)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  await executeSql(sql, [
    data.id,
    data.el,
    parseFloat(data.m),
    data.mode,
    data.ref || null,
    data.d,
  ]);
}

export async function deletePaiement(id) {
  await executeSql('DELETE FROM paiements WHERE id = ?', [id]);
}

export async function saveAbsence(dateAbsence, eleveId, type, motif) {
  const id = `${dateAbsence}|${eleveId}`;
  if (!type) {
    await executeSql('DELETE FROM absences WHERE id = ?', [id]);
  } else {
    if (dbMode === 'mysql') {
      const sql = `
        INSERT INTO absences (id, date_absence, eleve_id, type, motif)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          type = VALUES(type),
          motif = VALUES(motif)
      `;
      await executeSql(sql, [id, dateAbsence, eleveId, type, motif || 'Sans motif connu']);
    } else {
      const sql = `
        INSERT INTO absences (id, date_absence, eleve_id, type, motif)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          type = excluded.type,
          motif = excluded.motif
      `;
      await executeSql(sql, [id, dateAbsence, eleveId, type, motif || 'Sans motif connu']);
    }
  }
}

export async function saveAppel(dateAppel, classe, statut = 1) {
  const id = `${dateAppel}|${classe}`;
  if (dbMode === 'mysql') {
    const sql = `
      INSERT INTO appels (id, date_appel, classe, statut)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE statut = VALUES(statut)
    `;
    await executeSql(sql, [id, dateAppel, classe, statut]);
  } else {
    const sql = `
      INSERT INTO appels (id, date_appel, classe, statut)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET statut = excluded.statut
    `;
    await executeSql(sql, [id, dateAppel, classe, statut]);
  }
}

export async function saveMatiere(classe, nom, coef) {
  const id = `${classe}|${nom}`;
  if (dbMode === 'mysql') {
    const sql = `
      INSERT INTO matieres (id, classe, nom, coefficient)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE coefficient = VALUES(coefficient)
    `;
    await executeSql(sql, [id, classe, nom, parseFloat(coef)]);
  } else {
    const sql = `
      INSERT INTO matieres (id, classe, nom, coefficient)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET coefficient = excluded.coefficient
    `;
    await executeSql(sql, [id, classe, nom, parseFloat(coef)]);
  }
}

export async function deleteMatiere(classe, nom) {
  const id = `${classe}|${nom}`;
  await executeSql('DELETE FROM matieres WHERE id = ?', [id]);
}

export async function saveEdt(classe, creneaux, grille) {
  const creneauxJson = JSON.stringify(creneaux);
  const grilleJson = JSON.stringify(grille);
  if (dbMode === 'mysql') {
    const sql = `
      INSERT INTO emploi_du_temps (classe, creneaux, grille)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        creneaux = VALUES(creneaux),
        grille = VALUES(grille)
    `;
    await executeSql(sql, [classe, creneauxJson, grilleJson]);
  } else {
    const sql = `
      INSERT INTO emploi_du_temps (classe, creneaux, grille)
      VALUES (?, ?, ?)
      ON CONFLICT(classe) DO UPDATE SET
        creneaux = excluded.creneaux,
        grille = excluded.grille
    `;
    await executeSql(sql, [classe, creneauxJson, grilleJson]);
  }
}

export async function saveConfig(cle, valeur) {
  if (dbMode === 'mysql') {
    const sql = `
      INSERT INTO configuration (cle, valeur)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE valeur = VALUES(valeur)
    `;
    await executeSql(sql, [cle, String(valeur)]);
  } else {
    const sql = `
      INSERT INTO configuration (cle, valeur)
      VALUES (?, ?)
      ON CONFLICT(cle) DO UPDATE SET valeur = excluded.valeur
    `;
    await executeSql(sql, [cle, String(valeur)]);
  }
}

export async function bulkSync(state) {
  if (!state) return;
  if (state.ecole) await saveConfig('ecole', state.ecole);
  if (state.an) await saveConfig('an', state.an);
  if (state.dir) await saveConfig('dir', state.dir);
  if (state.pe) await saveConfig('pe', state.pe);

  if (Array.isArray(state.eleves)) {
    for (const e of state.eleves) {
      await saveEleve({
        ...e,
        decision: state.dec && state.dec[e.id] ? state.dec[e.id] : null,
      });
    }
  }

  if (Array.isArray(state.ens)) {
    for (const t of state.ens) {
      await saveEnseignant(t);
    }
  }

  if (state.notes && typeof state.notes === 'object') {
    for (const [k, v] of Object.entries(state.notes)) {
      const parts = k.split('|');
      if (parts.length >= 4) {
        await saveNote(parts[0], parts[1], parts[2], parts[3], v);
      }
    }
  }

  if (Array.isArray(state.paie)) {
    for (const p of state.paie) {
      await savePaiement(p);
    }
  }

  if (state.abs && typeof state.abs === 'object') {
    for (const [k, v] of Object.entries(state.abs)) {
      const parts = k.split('|');
      if (parts.length >= 2 && v) {
        await saveAbsence(parts[0], parts[1], v.t, v.m);
      }
    }
  }

  if (state.appel && typeof state.appel === 'object') {
    for (const [k, v] of Object.entries(state.appel)) {
      const parts = k.split('|');
      if (parts.length >= 2) {
        await saveAppel(parts[0], parts[1], v);
      }
    }
  }

  if (state.mc && typeof state.mc === 'object') {
    for (const [classe, mats] of Object.entries(state.mc)) {
      for (const [nom, coef] of Object.entries(mats)) {
        await saveMatiere(classe, nom, coef);
      }
    }
  }

  if (state.edt && typeof state.edt === 'object') {
    for (const [classe, obj] of Object.entries(state.edt)) {
      if (obj && obj.sl && obj.c) {
        await saveEdt(classe, obj.sl, obj.c);
      }
    }
  }
}

export async function getDbStats() {
  const tables = ['eleves', 'enseignants', 'matieres', 'notes', 'paiements', 'absences', 'appels', 'emploi_du_temps', 'configuration'];
  const counts = {};
  for (const t of tables) {
    try {
      const rows = await queryAll(`SELECT COUNT(*) as c FROM ${t}`);
      counts[t] = rows[0]?.c ?? rows[0]?.['COUNT(*)'] ?? 0;
    } catch {
      counts[t] = 0;
    }
  }
  return {
    engine: dbMode === 'mysql' ? 'MySQL Server Database' : 'SQLite Database Engine',
    mode: dbMode,
    tables: tables.length,
    counts,
  };
}
