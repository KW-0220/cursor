-- SME LoanFlow MySQL schema（亦由 src/lib/db/mysql.ts 自動 ensure）
-- Charset: utf8mb4

CREATE DATABASE IF NOT EXISTS sme_loanflow
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE sme_loanflow;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name_zh VARCHAR(255) NULL,
  phone VARCHAR(64) NULL,
  id_number VARCHAR(128) NULL,
  profile_completed TINYINT(1) NOT NULL DEFAULT 0,
  role VARCHAR(32) NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(64) NOT NULL,
  applicant_name_zh VARCHAR(255) NOT NULL,
  applicant_name_en VARCHAR(255) NOT NULL,
  id_number VARCHAR(128) NOT NULL,
  phone VARCHAR(64) NOT NULL,
  email VARCHAR(255) NOT NULL,
  title VARCHAR(128) NOT NULL,
  relation VARCHAR(64) NOT NULL,
  company_name_zh VARCHAR(255) NOT NULL,
  company_name_en VARCHAR(255) NOT NULL,
  br_number VARCHAR(64) NOT NULL,
  cr_number VARCHAR(64) NOT NULL,
  founded_at VARCHAR(32) NOT NULL,
  company_type VARCHAR(128) NOT NULL,
  industry VARCHAR(128) NOT NULL,
  address VARCHAR(512) NOT NULL,
  employees INT NOT NULL DEFAULT 0,
  website VARCHAR(512) NULL,
  contact_person VARCHAR(255) NOT NULL,
  source VARCHAR(64) NULL,
  notes TEXT NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_customers_email_br (email, br_number),
  KEY idx_customers_updated (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
