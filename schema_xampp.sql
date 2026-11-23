-- ============================================================
-- BASE DE DONNÉES XAMPP (MySQL / MariaDB) - GESTION SCOLAIRE PRO
-- Importable directement dans phpMyAdmin (http://localhost/phpmyadmin)
-- Compatible : XAMPP (MariaDB 10.4+ / MySQL 5.7+ / MySQL 8.0+)
-- ============================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";
SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS `gestion_scolaire`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `gestion_scolaire`;

SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- 1. Rubrique Administration & Configuration
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `configuration` (
  `cle` varchar(64) NOT NULL,
  `valeur` text DEFAULT NULL,
  PRIMARY KEY (`cle`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `configuration` (`cle`, `valeur`) VALUES
  ('ecole', ''),
  ('an', ''),
  ('dir', ''),
  ('pe', '2');

-- ------------------------------------------------------------
-- 2. Rubriques Élèves, Cartes scolaires & Admis/Redoublants
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `eleves` (
  `id` varchar(64) NOT NULL,
  `nom` varchar(128) NOT NULL,
  `matricule` varchar(64) DEFAULT NULL,
  `sexe` varchar(4) DEFAULT NULL,
  `date_naissance` varchar(32) DEFAULT NULL,
  `lieu_naissance` varchar(128) DEFAULT NULL,
  `classe` varchar(64) NOT NULL,
  `parent` varchar(128) DEFAULT NULL,
  `telephone` varchar(64) DEFAULT NULL,
  `adresse` varchar(255) DEFAULT NULL,
  `photo` longtext DEFAULT NULL,
  `decision` varchar(32) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_eleves_classe` (`classe`),
  KEY `idx_eleves_matricule` (`matricule`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 3. Rubrique Enseignants
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `enseignants` (
  `id` varchar(64) NOT NULL,
  `nom` varchar(128) NOT NULL,
  `matiere` varchar(64) NOT NULL,
  `telephone` varchar(64) DEFAULT NULL,
  `classes` text DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 4. Rubrique Matières & Coefficients
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `matieres` (
  `id` varchar(128) NOT NULL,
  `classe` varchar(64) NOT NULL,
  `nom` varchar(64) NOT NULL,
  `coefficient` decimal(4,2) NOT NULL DEFAULT 1.00,
  PRIMARY KEY (`id`),
  KEY `idx_matieres_classe` (`classe`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 5. Rubriques Notes & Bulletins
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `notes` (
  `id` varchar(128) NOT NULL,
  `eleve_id` varchar(64) NOT NULL,
  `matiere` varchar(64) NOT NULL,
  `trimestre` int NOT NULL,
  `type_note` varchar(4) NOT NULL COMMENT 'c=classe, e=examen',
  `note` decimal(5,2) NOT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notes_eleve` (`eleve_id`),
  KEY `idx_notes_trimestre` (`trimestre`),
  CONSTRAINT `fk_notes_eleve_xampp` FOREIGN KEY (`eleve_id`) REFERENCES `eleves` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 6. Rubrique Paiements de scolarité
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `paiements` (
  `id` varchar(64) NOT NULL,
  `eleve_id` varchar(64) NOT NULL,
  `montant` decimal(10,2) NOT NULL,
  `mode` varchar(32) NOT NULL,
  `reference` varchar(128) DEFAULT NULL,
  `date_paiement` varchar(32) NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_paiements_eleve` (`eleve_id`),
  CONSTRAINT `fk_paiements_eleve_xampp` FOREIGN KEY (`eleve_id`) REFERENCES `eleves` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 7. Rubrique Absences
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `absences` (
  `id` varchar(128) NOT NULL,
  `date_absence` varchar(32) NOT NULL,
  `eleve_id` varchar(64) NOT NULL,
  `type` varchar(4) NOT NULL COMMENT 'A=Absent, R=Retard',
  `motif` varchar(128) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_absences_date` (`date_absence`),
  KEY `idx_absences_eleve` (`eleve_id`),
  CONSTRAINT `fk_absences_eleve_xampp` FOREIGN KEY (`eleve_id`) REFERENCES `eleves` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 8. Rubrique Appels du jour
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `appels` (
  `id` varchar(128) NOT NULL,
  `date_appel` varchar(32) NOT NULL,
  `classe` varchar(64) NOT NULL,
  `statut` tinyint NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `idx_appels_date` (`date_appel`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 9. Rubrique Emploi du temps
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `emploi_du_temps` (
  `classe` varchar(64) NOT NULL,
  `creneaux` text NOT NULL,
  `grille` text NOT NULL,
  PRIMARY KEY (`classe`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
