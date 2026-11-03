import express from 'express';
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
    await bulkSync(req.body);
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

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`Gestion scolaire pro démarré sur http://${HOST}:${PORT}`);
});
