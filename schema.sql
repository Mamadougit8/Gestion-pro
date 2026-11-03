-- ============================================================
-- SCRIPT DE BASE DE DONNÉES MYSQL - GESTION SCOLAIRE PRO
-- Compatible : MySQL 5.7+, MySQL 8.0+, MariaDB 10.3+, phpMyAdmin
-- ============================================================

CREATE DATABASE IF NOT EXISTS `gestion_scolaire` 
  DEFAULT CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE `gestion_scolaire`;

SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- 1. Table: configuration
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `configuration`;
CREATE TABLE `configuration` (
  `cle` varchar(64) NOT NULL,
  `valeur` text,
  PRIMARY KEY (`cle`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 2. Table: eleves
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `eleves`;
CREATE TABLE `eleves` (
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
  KEY `idx_classe` (`classe`),
  KEY `idx_matricule` (`matricule`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 3. Table: enseignants
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `enseignants`;
CREATE TABLE `enseignants` (
  `id` varchar(64) NOT NULL,
  `nom` varchar(128) NOT NULL,
  `matiere` varchar(64) NOT NULL,
  `telephone` varchar(64) DEFAULT NULL,
  `classes` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 4. Table: matieres
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `matieres`;
CREATE TABLE `matieres` (
  `id` varchar(128) NOT NULL,
  `classe` varchar(64) NOT NULL,
  `nom` varchar(64) NOT NULL,
  `coefficient` decimal(4,2) NOT NULL DEFAULT 1.00,
  PRIMARY KEY (`id`),
  KEY `idx_mat_classe` (`classe`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 5. Table: notes
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `notes`;
CREATE TABLE `notes` (
  `id` varchar(128) NOT NULL,
  `eleve_id` varchar(64) NOT NULL,
  `matiere` varchar(64) NOT NULL,
  `trimestre` int NOT NULL,
  `type_note` varchar(4) NOT NULL COMMENT 'c=classe, e=examen',
  `note` decimal(5,2) NOT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_note_eleve` (`eleve_id`),
  KEY `idx_note_trimestre` (`trimestre`),
  CONSTRAINT `fk_notes_eleve` FOREIGN KEY (`eleve_id`) REFERENCES `eleves` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 6. Table: paiements
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `paiements`;
CREATE TABLE `paiements` (
  `id` varchar(64) NOT NULL,
  `eleve_id` varchar(64) NOT NULL,
  `montant` decimal(10,2) NOT NULL,
  `mode` varchar(32) NOT NULL,
  `reference` varchar(128) DEFAULT NULL,
  `date_paiement` varchar(32) NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_paie_eleve` (`eleve_id`),
  CONSTRAINT `fk_paie_eleve` FOREIGN KEY (`eleve_id`) REFERENCES `eleves` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 7. Table: absences
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `absences`;
CREATE TABLE `absences` (
  `id` varchar(128) NOT NULL,
  `date_absence` varchar(32) NOT NULL,
  `eleve_id` varchar(64) NOT NULL,
  `type` varchar(4) NOT NULL COMMENT 'A=Absent, R=Retard',
  `motif` varchar(128) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_abs_date` (`date_absence`),
  KEY `idx_abs_eleve` (`eleve_id`),
  CONSTRAINT `fk_abs_eleve` FOREIGN KEY (`eleve_id`) REFERENCES `eleves` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 8. Table: appels
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `appels`;
CREATE TABLE `appels` (
  `id` varchar(128) NOT NULL,
  `date_appel` varchar(32) NOT NULL,
  `classe` varchar(64) NOT NULL,
  `statut` tinyint NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `idx_appel_date` (`date_appel`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 9. Table: emploi_du_temps
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `emploi_du_temps`;
CREATE TABLE `emploi_du_temps` (
  `classe` varchar(64) NOT NULL,
  `creneaux` text NOT NULL,
  `grille` text NOT NULL,
  PRIMARY KEY (`classe`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
