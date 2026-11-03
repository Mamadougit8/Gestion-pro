import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import {
  initDatabase,
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

// 3. Bulk sync
app.post('/api/sync', async (req, res) => {
  try {
    await bulkSync(req.body);
    const updated = await getAppState();
    res.json({ ok: true, data: updated });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 4. Élèves
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

// 5. Enseignants
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

// 6. Matières
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

// 7. Notes
app.post('/api/notes', async (req, res) => {
  try {
    const { eleveId, matiere, trimestre, typeNote, note } = req.body;
    await saveNote(eleveId, matiere, trimestre, typeNote, note);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 8. Paiements
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

// 9. Absences et Appels
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

// 10. Emploi du temps
app.post('/api/edt', async (req, res) => {
  try {
    const { classe, creneaux, grille } = req.body;
    await saveEdt(classe, creneaux, grille);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 11. Configuration
app.post('/api/config', async (req, res) => {
  try {
    const { cle, valeur } = req.body;
    await saveConfig(cle, valeur);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 12. Test de connexion à un serveur MySQL
app.post('/api/database/test-mysql', async (req, res) => {
  const { host, port, user, password, database } = req.body;
  try {
    const connection = await mysql.createConnection({
      host: host || 'localhost',
      port: parseInt(port) || 3306,
      user: user || 'root',
      password: password || '',
      database: database || undefined,
      connectTimeout: 4000,
    });
    await connection.ping();
    await connection.end();
    res.json({ ok: true, message: 'Connexion MySQL réussie !' });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`Gestion scolaire pro démarré sur http://${HOST}:${PORT}`);
});
