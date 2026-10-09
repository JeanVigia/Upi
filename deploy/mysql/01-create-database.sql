-- Execute como root do MySQL/MariaDB.
-- Substitua a senha antes de executar e não versione uma cópia com a senha real.

CREATE DATABASE IF NOT EXISTS unipinhal
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'upi_app'@'localhost'
  IDENTIFIED BY 'TROQUE_POR_UMA_SENHA_FORTE';

GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX
  ON unipinhal.* TO 'upi_app'@'localhost';

FLUSH PRIVILEGES;
