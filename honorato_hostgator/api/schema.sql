-- ====================================================================
-- HONORATO DRINKERIA - ESTRUTURA DO BANCO DE DADOS (MYSQL / HOSTGATOR)
-- Versão: 1.0 (Plano M / cPanel / phpMyAdmin)
-- ====================================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "-03:00";

-- --------------------------------------------------------
-- 1. Tabela: products (Cardápio e Estoque de Drinks/Itens)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `products` (
  `id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `category` VARCHAR(50) NOT NULL,
  `description` TEXT NULL,
  `ingredients_json` TEXT NULL,
  `recipe_ingredients_json` TEXT NULL,
  `tasting_notes` TEXT NULL,
  `volume` VARCHAR(50) NULL,
  `alcohol_content` VARCHAR(50) NULL,
  `price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `stock` INT NOT NULL DEFAULT 0,
  `min_stock_alert` INT NOT NULL DEFAULT 0,
  `unit` VARCHAR(20) NOT NULL DEFAULT 'un',
  `image_url` LONGTEXT NULL,
  `is_available` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 2. Tabela: bottles (Estoque de Garrafas e Destilados do Bar)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `bottles` (
  `id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `category` VARCHAR(50) NOT NULL,
  `bottle_capacity_ml` INT NOT NULL DEFAULT 750,
  `open_bottle_current_ml` INT NOT NULL DEFAULT 750,
  `sealed_bottles_count` INT NOT NULL DEFAULT 0,
  `min_bottles_alert` INT NOT NULL DEFAULT 1,
  `cost_per_bottle` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `unit_label` VARCHAR(20) NOT NULL DEFAULT 'ml',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 3. Tabela: comandas (Comandas Numeradas do Salão e Balcão)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `comandas` (
  `id` VARCHAR(64) NOT NULL,
  `number` INT NOT NULL,
  `identifier` VARCHAR(100) NOT NULL,
  `customer_name` VARCHAR(150) NULL,
  `status` ENUM('aberta', 'fechando', 'paga', 'cancelada') NOT NULL DEFAULT 'aberta',
  `opened_at` DATETIME NOT NULL,
  `closed_at` DATETIME NULL,
  `notes` TEXT NULL,
  `include_service_charge` TINYINT(1) NOT NULL DEFAULT 1,
  `service_charge_percent` INT NOT NULL DEFAULT 10,
  `payment_method` VARCHAR(50) NULL,
  `total_paid` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX (`number`),
  INDEX (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 4. Tabela: comanda_items (Itens de Cada Comanda)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `comanda_items` (
  `id` VARCHAR(64) NOT NULL,
  `comanda_id` VARCHAR(64) NOT NULL,
  `product_id` VARCHAR(64) NOT NULL,
  `product_name` VARCHAR(255) NOT NULL,
  `unit_price` DECIMAL(10,2) NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `notes` TEXT NULL,
  `added_at` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  INDEX (`comanda_id`),
  CONSTRAINT `fk_comanda_items` FOREIGN KEY (`comanda_id`) REFERENCES `comandas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 5. Tabela: transactions (Fluxo Financeiro do Caixa / PDV)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `transactions` (
  `id` VARCHAR(64) NOT NULL,
  `comanda_id` VARCHAR(64) NULL,
  `comanda_number` INT NULL,
  `type` ENUM('comanda_fechada', 'venda_balcao', 'suprimento', 'sangria') NOT NULL,
  `description` VARCHAR(255) NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `service_charge_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `payment_method` VARCHAR(50) NOT NULL,
  `payment_splits_json` TEXT NULL,
  `amount_received` DECIMAL(10,2) NULL,
  `change_given` DECIMAL(10,2) NULL,
  `items_summary_json` TEXT NULL,
  `timestamp` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  INDEX (`timestamp`),
  INDEX (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 6. Tabela: cash_register (Estado Atual do Caixa)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `cash_register` (
  `id` INT NOT NULL DEFAULT 1,
  `is_open` TINYINT(1) NOT NULL DEFAULT 1,
  `opened_at` DATETIME NOT NULL,
  `initial_cash` DECIMAL(10,2) NOT NULL DEFAULT 300.00,
  `current_cash_balance` DECIMAL(10,2) NOT NULL DEFAULT 300.00,
  `total_revenue` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `total_service_charge` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `by_payment_method_json` TEXT NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 7. Tabela: daily_closing_reports (Relatórios A4 Fechados)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `daily_closing_reports` (
  `id` VARCHAR(64) NOT NULL,
  `date` DATE NOT NULL,
  `opened_at` DATETIME NOT NULL,
  `closed_at` DATETIME NOT NULL,
  `closed_by` VARCHAR(150) NOT NULL,
  `initial_cash` DECIMAL(10,2) NOT NULL,
  `final_cash_balance` DECIMAL(10,2) NOT NULL,
  `total_revenue` DECIMAL(10,2) NOT NULL,
  `total_service_charge` DECIMAL(10,2) NOT NULL,
  `comandas_count` INT NOT NULL DEFAULT 0,
  `transactions_count` INT NOT NULL DEFAULT 0,
  `by_payment_method_json` TEXT NOT NULL,
  `top_products_sold_json` TEXT NULL,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 8. Tabela: staff_pins (Senhas de Acesso da Equipe)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `staff_pins` (
  `role` VARCHAR(50) NOT NULL,
  `title` VARCHAR(100) NOT NULL,
  `pin` VARCHAR(10) NOT NULL,
  PRIMARY KEY (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inserir dados padrão de estado do caixa
INSERT INTO `cash_register` (`id`, `is_open`, `opened_at`, `initial_cash`, `current_cash_balance`, `total_revenue`, `total_service_charge`, `by_payment_method_json`)
VALUES (1, 1, NOW(), 300.00, 300.00, 0.00, 0.00, '{"pix":0,"cartao_credito":0,"cartao_debito":0,"dinheiro":0,"misto":0}')
ON DUPLICATE KEY UPDATE `id` = 1;

-- Inserir PINs da equipe
INSERT INTO `staff_pins` (`role`, `title`, `pin`) VALUES
('admin', 'Gerência', '0000'),
('garcom', 'Garçom', '1234'),
('caixa', 'Caixa / PDV', '2026'),
('estoque', 'Estoque', '5555')
ON DUPLICATE KEY UPDATE `pin` = VALUES(`pin`);

COMMIT;
