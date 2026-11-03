import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
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
  generateMySQLDump,
  getDbStats,
} from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize relational SQL tables
initDatabase();

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Serve static assets from root directory
app.use(express.static(__dirname));

// ============================================================
// API ROUTES LINKED TO EVERY RUBRIQUE
// ============================================================

// 1. Database status & stats
app.get('/api/status', (req, res) => {
  try {
    const stats = getDbStats();
    res.json({ ok: true, stats });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 2. Full application state from SQL database
app.get('/api/data', (req, res) => {
  try {
    const state = getAppState();
    res.json({ ok: true, data: state });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 3. Bulk sync / migration from client
app.post('/api/sync', (req, res) => {
  try {
    bulkSync(req.body);
    const updated = getAppState();
    res.json({ ok: true, data: updated });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 4. Élèves (rubrique Élèves, Cartes scolaires, Bulletins, Résumé)
app.post('/api/eleves', (req, res) => {
  try {
    saveEleve(req.body);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/eleves/:id/photo', (req, res) => {
  try {
    updateElevePhoto(req.params.id, req.body.photo);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/eleves/:id/decision', (req, res) => {
  try {
    updateEleveDecision(req.params.id, req.body.decision);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.delete('/api/eleves/:id', (req, res) => {
  try {
    deleteEleve(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 5. Enseignants (rubrique Enseignants)
app.post('/api/enseignants', (req, res) => {
  try {
    saveEnseignant(req.body);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.delete('/api/enseignants/:id', (req, res) => {
  try {
    deleteEnseignant(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 6. Matières (rubrique Matières et coefficients)
app.post('/api/matieres', (req, res) => {
  try {
    const { classe, nom, coef } = req.body;
    saveMatiere(classe, nom, coef);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.delete('/api/matieres/:classe/:nom', (req, res) => {
  try {
    deleteMatiere(req.params.classe, req.params.nom);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 7. Notes (rubrique Notes et Bulletins)
app.post('/api/notes', (req, res) => {
  try {
    const { eleveId, matiere, trimestre, typeNote, note } = req.body;
    saveNote(eleveId, matiere, trimestre, typeNote, note);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 8. Paiements (rubrique Paiements)
app.post('/api/paiements', (req, res) => {
  try {
    savePaiement(req.body);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.delete('/api/paiements/:id', (req, res) => {
  try {
    deletePaiement(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 9. Absences et Appels (rubrique Absences et Tableau de bord)
app.post('/api/absences', (req, res) => {
  try {
    const { date, eleveId, type, motif } = req.body;
    saveAbsence(date, eleveId, type, motif);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/appels', (req, res) => {
  try {
    const { date, classe, statut } = req.body;
    saveAppel(date, classe, statut);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 10. Emploi du temps (rubrique Emploi du temps)
app.post('/api/edt', (req, res) => {
  try {
    const { classe, creneaux, grille } = req.body;
    saveEdt(classe, creneaux, grille);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 11. Configuration générale (rubrique Administration)
app.post('/api/config', (req, res) => {
  try {
    const { cle, valeur } = req.body;
    saveConfig(cle, valeur);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 12. Export du script SQL MySQL complet (.sql)
app.get('/api/database/export-mysql', (req, res) => {
  try {
    const sqlContent = generateMySQLDump();
    res.setHeader('Content-Type', 'application/sql');
    res.setHeader('Content-Disposition', 'attachment; filename="gestion_scolaire_mysql.sql"');
    res.send(sqlContent);
  } catch (err) {
    res.status(500).send(`Erreur lors de la génération du dump MySQL: ${err.message}`);
  }
});

// 13. Test de connexion à un serveur MySQL externe
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

// Fallback direct routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/Gestion%20scolaire%20pro1.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`Serveur Gestion Scolaire Pro démarré sur http://${HOST}:${PORT}`);
  console.log(`Base de données SQL relationnelle initialisée avec succès.`);
});
