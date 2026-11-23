import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import {
  initDatabase,
  connectMySQLPool,
  saveMySQLConfigFile,
  loadSavedConfig,
  getAppState,
  saveEleve,
  updateElevePhoto,
  updateEleveDecision,
  deleteEleve,
  saveEnseignant,
  deleteEnseignant,
  saveNote,
  savePaiement,
  deletePaiement,
  saveAbsence,
  saveAppel,
  saveMatiere,
  saveClasseMatieres,
  deleteMatiere,
  saveEdt,
  saveConfig,
  bulkSync,
  getDbStats,
} from './db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use((req, res, next) => {
  if (req.path.endsWith('.db') || req.path.includes('mysql_config.json') || req.path.includes('db_settings.json')) {
    return res.status(403).end();
  }
  next();
});
app.use(express.static(__dirname));

// Initialize database connection
await initDatabase();

// 1. Database status & stats
app.get('/api/status', async (req, res) => {
  try {
    const stats = await getDbStats();
    res.json({ ok: true, stats });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 2. Full application state from database
app.get('/api/data', async (req, res) => {
  try {
    const state = await getAppState();
    res.json({ ok: true, data: state });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 2b. Database saved config
app.get('/api/database/config', (req, res) => {
  const saved = loadSavedConfig();
  res.json({
    ok: true,
    config: {
      host: saved?.host || process.env.MYSQL_HOST || 'localhost',
      port: saved?.port || parseInt(process.env.MYSQL_PORT) || 3306,
      user: saved?.user || process.env.MYSQL_USER || 'root',
      database: saved?.database || process.env.MYSQL_DATABASE || 'gestion_scolaire',
      ssl: saved?.ssl ?? (process.env.MYSQL_SSL === 'true'),
      hasPassword: Boolean(saved?.password || process.env.MYSQL_PASSWORD),
    },
  });
});

// 3. Connect to a real MySQL database dynamically
app.post('/api/database/connect-mysql', async (req, res) => {
  const { host, port, user, password, database, ssl } = req.body;
  if (!host || !user || !database) {
    return res.status(400).json({ ok: false, error: 'Veuillez renseigner l’hôte, l’utilisateur et le nom de la base de données.' });
  }

  const result = await connectMySQLPool({
    host: host.trim(),
    port: parseInt(port) || 3306,
    user: user.trim(),
    password: password || '',
    database: database.trim(),
    ssl: ssl === true || ssl === 'true',
  });

  if (result.ok) {
    saveMySQLConfigFile({
      host: host.trim(),
      port: parseInt(port) || 3306,
      user: user.trim(),
      password: password || '',
      database: database.trim(),
      ssl: ssl === true || ssl === 'true',
    });
    const state = await getAppState();
    res.json({
      ok: true,
      message: `Connecté avec succès à votre base MySQL "${database}" sur ${host} ! Les 9 tables sont vérifiées et prêtes.`,
      data: state,
    });
  } else {
    res.json({ ok: false, error: result.error });
  }
});

// 4. Test MySQL connection
app.post('/api/database/test-mysql', async (req, res) => {
  const { host, port, user, password, database, ssl } = req.body;
  const p = parseInt(port) || 3306;
  const h = (host || 'localhost').trim();
  const u = (user || 'root').trim();
  try {
    const connection = await mysql.createConnection({
      host: h,
      port: p,
      user: u,
      password: password || '',
      database: database ? database.trim() : undefined,
      ssl: ssl === true || ssl === 'true' ? { rejectUnauthorized: false } : undefined,
      connectTimeout: 6000,
    });
    await connection.ping();
    await connection.end();
    res.json({ ok: true, message: `Connexion MySQL réussie avec succès sur ${h}:${p} !` });
  } catch (err) {
    let friendly = err.message;
    if (err.code === 'ECONNREFUSED') {
      friendly = `Connexion refusée sur ${h}:${p}. Assurez-vous que le serveur MySQL est démarré et autorise les connexions réseau.`;
    } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      friendly = `Accès refusé pour '${u}'. Vérifiez le nom d'utilisateur et le mot de passe.`;
    } else if (err.code === 'ENOTFOUND') {
      friendly = `Hôte '${h}' introuvable.`;
    }
    res.json({ ok: false, error: friendly, code: err.code });
  }
});

// 5. Bulk sync
app.post('/api/sync', async (req, res) => {
  try {
    await bulkSync(req.body, Boolean(req.body?.replace));
    const updated = await getAppState();
    res.json({ ok: true, data: updated });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 6. Élèves
app.post('/api/eleves', async (req, res) => {
  try {
    await saveEleve(req.body);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/eleves/:id/photo', async (req, res) => {
  try {
    await updateElevePhoto(req.params.id, req.body.photo);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/eleves/:id/decision', async (req, res) => {
  try {
    await updateEleveDecision(req.params.id, req.body.decision);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.delete('/api/eleves/:id', async (req, res) => {
  try {
    await deleteEleve(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 7. Enseignants
app.post('/api/enseignants', async (req, res) => {
  try {
    await saveEnseignant(req.body);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.delete('/api/enseignants/:id', async (req, res) => {
  try {
    await deleteEnseignant(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 8. Matières
app.post('/api/matieres/classe', async (req, res) => {
  try {
    const { classe, matieres } = req.body;
    await saveClasseMatieres(classe, matieres);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/matieres', async (req, res) => {
  try {
    const { classe, nom, coef } = req.body;
    await saveMatiere(classe, nom, coef);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.delete('/api/matieres/:classe/:nom', async (req, res) => {
  try {
    await deleteMatiere(req.params.classe, req.params.nom);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 9. Notes
app.post('/api/notes', async (req, res) => {
  try {
    const { eleveId, matiere, trimestre, typeNote, note } = req.body;
    await saveNote(eleveId, matiere, trimestre, typeNote, note);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 10. Paiements
app.post('/api/paiements', async (req, res) => {
  try {
    await savePaiement(req.body);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.delete('/api/paiements/:id', async (req, res) => {
  try {
    await deletePaiement(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 11. Absences et Appels
app.post('/api/absences', async (req, res) => {
  try {
    const { date, eleveId, type, motif } = req.body;
    await saveAbsence(date, eleveId, type, motif);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/appels', async (req, res) => {
  try {
    const { date, classe, statut } = req.body;
    await saveAppel(date, classe, statut);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 12. Emploi du temps
app.post('/api/edt', async (req, res) => {
  try {
    const { classe, creneaux, grille } = req.body;
    await saveEdt(classe, creneaux, grille);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 13. Configuration
app.post('/api/config', async (req, res) => {
  try {
    const { cle, valeur } = req.body;
    await saveConfig(cle, valeur);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 14. Export complet du pack XAMPP + PHP (.zip)
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    t[i] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function buildZipBuffer(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name, 'utf8');
    const crc = crc32(data);
    const size = data.length;

    const local = Buffer.alloc(30 + nameBuf.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(size, 18);
    local.writeUInt32LE(size, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    nameBuf.copy(local, 30);

    localParts.push(local, data);

    const central = Buffer.alloc(46 + nameBuf.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(size, 20);
    central.writeUInt32LE(size, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    nameBuf.copy(central, 46);

    centralParts.push(central);
    offset += local.length + size;
  }

  const centralDir = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralDir.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDir, eocd]);
}

app.get('/api/export-xampp-zip', (req, res) => {
  try {
    const fileList = [
      'index.html',
      '.htaccess',
      'schema_xampp.sql',
      'README_XAMPP.md',
      'php/config.php',
      'php/api.php',
    ];
    const ctrlDir = path.join(__dirname, 'php', 'controllers');
    if (fs.existsSync(ctrlDir)) {
      for (const f of fs.readdirSync(ctrlDir)) {
        if (f.endsWith('.php')) {
          fileList.push(`php/controllers/${f}`);
        }
      }
    }

    const entries = [];
    for (const rel of fileList) {
      const full = path.join(__dirname, rel);
      if (fs.existsSync(full)) {
        entries.push({
          name: `gestion-scolaire/${rel}`,
          data: fs.readFileSync(full),
        });
      }
    }

    const zipBuf = buildZipBuffer(entries);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="gestion-scolaire-xampp-php.zip"');
    res.send(zipBuf);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`Gestion scolaire pro démarré sur http://${HOST}:${PORT}`);
});
