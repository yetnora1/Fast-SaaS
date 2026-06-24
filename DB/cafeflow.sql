-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jun 24, 2026 at 08:23 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `cafeflow`
--

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

CREATE TABLE `audit_logs` (
  `id` varchar(191) NOT NULL,
  `tenant_id` varchar(191) DEFAULT NULL,
  `user_id` varchar(191) DEFAULT NULL,
  `action` varchar(191) NOT NULL,
  `entity` varchar(191) DEFAULT NULL,
  `entity_id` varchar(191) DEFAULT NULL,
  `meta_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`meta_json`)),
  `ip` varchar(191) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `audit_logs`
--

INSERT INTO `audit_logs` (`id`, `tenant_id`, `user_id`, `action`, `entity`, `entity_id`, `meta_json`, `ip`, `created_at`) VALUES
('cmqovuedl0001tj73px1bc6iy', 'cmqovu7kh0002nxts603a35wi', 'cmqovu7q9000wnxtssmj4evdz', 'auth.login', NULL, NULL, NULL, '::1', '2026-06-22 07:17:05.481'),
('cmqovvt9m0003tj731dhr3rf7', 'cmqovu7kh0002nxts603a35wi', 'cmqovu7q9000wnxtssmj4evdz', 'auth.login', NULL, NULL, NULL, '::1', '2026-06-22 07:18:11.435'),
('cmqovxx8l0005tj73f22dibd1', 'cmqovu7kh0002nxts603a35wi', 'cmqovu7q9000wnxtssmj4evdz', 'auth.logout', NULL, NULL, NULL, NULL, '2026-06-22 07:19:49.893'),
('cmqovyebi0007tj73fkdmmw2v', 'cmqovu7kh0002nxts603a35wi', 'cmqovu7ts000ynxtsdpmh7pmn', 'auth.login', NULL, NULL, NULL, '::1', '2026-06-22 07:20:12.030'),
('cmqovzbas0009tj73jv8ma94j', 'cmqovu7kh0002nxts603a35wi', 'cmqovu7ts000ynxtsdpmh7pmn', 'auth.login', NULL, NULL, NULL, '::1', '2026-06-22 07:20:54.772'),
('cmqow0rtx000btj735ct0vitx', 'cmqovu7kh0002nxts603a35wi', 'cmqovu7ts000ynxtsdpmh7pmn', 'auth.login', NULL, NULL, NULL, '::1', '2026-06-22 07:22:02.853'),
('cmqow1ozm000ftj735y5cca81', 'cmqovu7kh0002nxts603a35wi', 'cmqovu7ts000ynxtsdpmh7pmn', 'auth.logout', NULL, NULL, NULL, NULL, '2026-06-22 07:22:45.826'),
('cmqown3uu00011zqbxh37uxzs', 'cmqovu7kh0002nxts603a35wi', 'cmqovu7q9000wnxtssmj4evdz', 'auth.login', NULL, NULL, NULL, '::1', '2026-06-22 07:39:24.870'),
('cmqowod6w00031zqbmt5y1n16', 'cmqovu7kh0002nxts603a35wi', 'cmqovu7q9000wnxtssmj4evdz', 'auth.login', NULL, NULL, NULL, '::1', '2026-06-22 07:40:23.624'),
('cmqowphzj00051zqbi0nr5cw1', 'cmqovu7kh0002nxts603a35wi', 'cmqovu7q9000wnxtssmj4evdz', 'auth.login', NULL, NULL, NULL, '::1', '2026-06-22 07:41:16.496'),
('cmqowtcwg00071zqbdxygbr4w', 'cmqovu7kh0002nxts603a35wi', 'cmqovu7q9000wnxtssmj4evdz', 'auth.login', NULL, NULL, NULL, '::ffff:127.0.0.1', '2026-06-22 07:44:16.528'),
('cmqowv5vb00091zqbucakwut9', 'cmqovu7kh0002nxts603a35wi', 'cmqovu7ts000ynxtsdpmh7pmn', 'auth.login', NULL, NULL, NULL, '::1', '2026-06-22 07:45:40.727'),
('cmqowvi4c000b1zqbk9501ls4', 'cmqovu7kh0002nxts603a35wi', 'cmqovu7q9000wnxtssmj4evdz', 'auth.login', NULL, NULL, NULL, '::ffff:127.0.0.1', '2026-06-22 07:45:56.604'),
('cmqowx3zd000p1zqbqqtp5jv6', 'cmqovu7kh0002nxts603a35wi', 'cmqovu7ts000ynxtsdpmh7pmn', 'auth.logout', NULL, NULL, NULL, NULL, '2026-06-22 07:47:11.593'),
('cmqowxcjh000r1zqbewx1bq94', 'cmqovu7kh0002nxts603a35wi', 'cmqovu7q9000wnxtssmj4evdz', 'auth.login', NULL, NULL, NULL, '::ffff:127.0.0.1', '2026-06-22 07:47:22.685'),
('cmqowxxha000t1zqbqagtypg5', 'cmqovu7kh0002nxts603a35wi', 'cmqovu7q9000wnxtssmj4evdz', 'auth.login', NULL, NULL, NULL, '::ffff:127.0.0.1', '2026-06-22 07:47:49.823'),
('cmqox2qlg000v1zqb5fi3ea3s', 'cmqovu7kh0002nxts603a35wi', 'cmqovu7q9000wnxtssmj4evdz', 'auth.login', NULL, NULL, NULL, '::ffff:127.0.0.1', '2026-06-22 07:51:34.180'),
('cmqox9qp6000x1zqbroe3w90m', 'cmqovu7kh0002nxts603a35wi', 'cmqovu7ts000ynxtsdpmh7pmn', 'auth.logout', NULL, NULL, NULL, NULL, '2026-06-22 07:57:00.905'),
('cmqoxady9000z1zqb082l2yhj', NULL, 'cmqovu7k70001nxtsvi13vxgs', 'auth.login', NULL, NULL, NULL, '::1', '2026-06-22 07:57:31.041'),
('cmqoxat6c00111zqbtlp7ke3k', NULL, 'cmqovu7k70001nxtsvi13vxgs', 'auth.logout', NULL, NULL, NULL, NULL, '2026-06-22 07:57:50.772'),
('cmqoxbbpw00131zqb4yd3amu4', NULL, 'cmqovu7k70001nxtsvi13vxgs', 'auth.login', NULL, NULL, NULL, '::1', '2026-06-22 07:58:14.805'),
('cmqpe6wyf0001vxmccftsfdeh', 'cmqovu7kh0002nxts603a35wi', 'cmqovu7ts000ynxtsdpmh7pmn', 'auth.login', NULL, NULL, NULL, '::1', '2026-06-22 15:50:42.514'),
('cmqpe73fq0003vxmc80clstrk', 'cmqovu7kh0002nxts603a35wi', 'cmqovu7ts000ynxtsdpmh7pmn', 'auth.logout', NULL, NULL, NULL, NULL, '2026-06-22 15:50:50.918'),
('cmqqtnv430001khu0gdwsp5hu', NULL, 'cmqovu7k70001nxtsvi13vxgs', 'auth.login', NULL, NULL, NULL, '::1', '2026-06-23 15:51:33.695'),
('cmqqto5zh0003khu0kv604qxk', 'cmqovu7kh0002nxts603a35wi', 'cmqovu7ts000ynxtsdpmh7pmn', 'auth.login', NULL, NULL, NULL, '::1', '2026-06-23 15:51:47.789'),
('cmqqto7pr0005khu0xafp36ua', NULL, 'cmqovu7k70001nxtsvi13vxgs', 'auth.logout', NULL, NULL, NULL, NULL, '2026-06-23 15:51:50.028'),
('cmqqtofps0007khu0alxc8umx', NULL, 'cmqovu7k70001nxtsvi13vxgs', 'auth.login', NULL, NULL, NULL, '::1', '2026-06-23 15:52:00.400'),
('cmqqtqgvb0009khu0qwir6jvv', NULL, 'cmqovu7k70001nxtsvi13vxgs', 'auth.logout', NULL, NULL, NULL, NULL, '2026-06-23 15:53:35.207'),
('cmqqtqqar000bkhu0gc0f0o8j', 'cmqovu7kh0002nxts603a35wi', 'cmqovu7xe0010nxtscgvpwlew', 'auth.login', NULL, NULL, NULL, '::1', '2026-06-23 15:53:47.427'),
('cmqquchmf0001qacvf10e07mp', 'cmqovu7kh0002nxts603a35wi', 'cmqovu7q9000wnxtssmj4evdz', 'auth.login', NULL, NULL, NULL, '::1', '2026-06-23 16:10:42.611'),
('cmqqutd470007qacvk42lv2fl', 'cmqovu7kh0002nxts603a35wi', 'cmqovu7q9000wnxtssmj4evdz', 'owner.menu.publish', NULL, NULL, '{\"published\":1}', NULL, '2026-06-23 16:23:49.927'),
('cmqqv3duu0009qacvyixkpqyq', 'cmqovu7kh0002nxts603a35wi', 'cmqovu7ts000ynxtsdpmh7pmn', 'auth.login', NULL, NULL, NULL, '::1', '2026-06-23 16:31:37.446'),
('cmqqv3t4h000bqacvudfpnik9', 'cmqovu7kh0002nxts603a35wi', 'cmqovu7xe0010nxtscgvpwlew', 'auth.logout', NULL, NULL, NULL, NULL, '2026-06-23 16:31:57.233'),
('cmqqv42eg000dqacvowmba4hh', 'cmqovu7kh0002nxts603a35wi', 'cmqovu7ts000ynxtsdpmh7pmn', 'auth.login', NULL, NULL, NULL, '::1', '2026-06-23 16:32:09.256');

-- --------------------------------------------------------

--
-- Table structure for table `branches`
--

CREATE TABLE `branches` (
  `id` varchar(191) NOT NULL,
  `tenant_id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `address` varchar(191) DEFAULT NULL,
  `phone` varchar(191) DEFAULT NULL,
  `manager_id` varchar(191) DEFAULT NULL,
  `settings_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`settings_json`)),
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `branches`
--

INSERT INTO `branches` (`id`, `tenant_id`, `name`, `address`, `phone`, `manager_id`, `settings_json`, `active`, `created_at`) VALUES
('cmqovu7l0000enxtst2g8taxl', 'cmqovu7kh0002nxts603a35wi', 'Main Branch', 'Bole, Addis Ababa', '+251911000000', 'cmqovu7ts000ynxtsdpmh7pmn', NULL, 1, '2026-06-22 07:16:56.676');

-- --------------------------------------------------------

--
-- Table structure for table `email_templates`
--

CREATE TABLE `email_templates` (
  `id` varchar(191) NOT NULL,
  `type` varchar(191) NOT NULL,
  `subject` varchar(191) NOT NULL,
  `body_html` text NOT NULL,
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `inventory_items`
--

CREATE TABLE `inventory_items` (
  `id` varchar(191) NOT NULL,
  `tenant_id` varchar(191) NOT NULL,
  `branch_id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `unit` varchar(191) NOT NULL DEFAULT 'unit',
  `quantity` decimal(14,3) NOT NULL DEFAULT 0.000,
  `min_threshold` decimal(14,3) NOT NULL DEFAULT 0.000,
  `cost_per_unit` decimal(12,2) NOT NULL DEFAULT 0.00,
  `supplier_id` varchar(191) DEFAULT NULL,
  `available` tinyint(1) NOT NULL DEFAULT 1,
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `inventory_items`
--

INSERT INTO `inventory_items` (`id`, `tenant_id`, `branch_id`, `name`, `unit`, `quantity`, `min_threshold`, `cost_per_unit`, `supplier_id`, `available`, `updated_at`) VALUES
('cmqovu8ay001rnxts3mz8uhsj', 'cmqovu7kh0002nxts603a35wi', 'cmqovu7l0000enxtst2g8taxl', 'Coffee Beans', 'kg', 12.000, 5.000, 850.00, 'cmqovu8aw001qnxtsnpxe9g8l', 1, '2026-06-22 07:16:57.610'),
('cmqovu8ay001snxtsah2zeg2c', 'cmqovu7kh0002nxts603a35wi', 'cmqovu7l0000enxtst2g8taxl', 'Milk', 'L', 3.000, 10.000, 90.00, 'cmqovu8aw001qnxtsnpxe9g8l', 1, '2026-06-22 07:16:57.610'),
('cmqovu8ay001tnxts8cwy8uiv', 'cmqovu7kh0002nxts603a35wi', 'cmqovu7l0000enxtst2g8taxl', 'Sugar', 'kg', 20.000, 8.000, 60.00, 'cmqovu8aw001qnxtsnpxe9g8l', 1, '2026-06-22 07:16:57.610'),
('cmqovu8ay001unxts8n37wf45', 'cmqovu7kh0002nxts603a35wi', 'cmqovu7l0000enxtst2g8taxl', 'Bread', 'loaf', 6.000, 10.000, 40.00, 'cmqovu8aw001qnxtsnpxe9g8l', 1, '2026-06-22 07:16:57.610');

-- --------------------------------------------------------

--
-- Table structure for table `invitations`
--

CREATE TABLE `invitations` (
  `id` varchar(191) NOT NULL,
  `tenant_id` varchar(191) NOT NULL,
  `email` varchar(191) NOT NULL,
  `role` enum('saas_owner','cafe_owner','cafe_manager','waiter','cashier','barista','kitchen','store_manager') NOT NULL,
  `branch_id` varchar(191) DEFAULT NULL,
  `token` varchar(191) NOT NULL,
  `accepted` tinyint(1) NOT NULL DEFAULT 0,
  `expires_at` datetime(3) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `menu_categories`
--

CREATE TABLE `menu_categories` (
  `id` varchar(191) NOT NULL,
  `tenant_id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `name_am` varchar(191) DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `menu_categories`
--

INSERT INTO `menu_categories` (`id`, `tenant_id`, `name`, `name_am`, `sort_order`, `active`) VALUES
('cmqovu8ae001anxts6ncemwu3', 'cmqovu7kh0002nxts603a35wi', 'Drinks', 'መጠጦች', 1, 1),
('cmqovu8ag001cnxtsj071wvcw', 'cmqovu7kh0002nxts603a35wi', 'Food', 'ምግብ', 2, 1);

-- --------------------------------------------------------

--
-- Table structure for table `menu_items`
--

CREATE TABLE `menu_items` (
  `id` varchar(191) NOT NULL,
  `category_id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `name_am` varchar(191) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `price` decimal(12,2) NOT NULL,
  `cost` decimal(12,2) NOT NULL DEFAULT 0.00,
  `vat_applicable` tinyint(1) NOT NULL DEFAULT 1,
  `available` tinyint(1) NOT NULL DEFAULT 1,
  `featured` tinyint(1) NOT NULL DEFAULT 0,
  `course` enum('starter','main','dessert','drink') NOT NULL DEFAULT 'main',
  `station` enum('BARISTA','KITCHEN') NOT NULL DEFAULT 'KITCHEN',
  `image_url` varchar(191) DEFAULT NULL,
  `prep_target_sec` int(11) NOT NULL DEFAULT 300,
  `state` enum('DRAFT','PUBLISHED') NOT NULL DEFAULT 'DRAFT',
  `available_from` varchar(191) DEFAULT NULL,
  `available_to` varchar(191) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `menu_items`
--

INSERT INTO `menu_items` (`id`, `category_id`, `name`, `name_am`, `description`, `price`, `cost`, `vat_applicable`, `available`, `featured`, `course`, `station`, `image_url`, `prep_target_sec`, `state`, `available_from`, `available_to`, `created_at`) VALUES
('cmqovu8ak001enxtsta14k7z0', 'cmqovu8ae001anxts6ncemwu3', 'Macchiato', 'ማኪያቶ', NULL, 70.00, 20.00, 1, 1, 0, 'drink', 'BARISTA', NULL, 180, 'PUBLISHED', NULL, NULL, '2026-06-22 07:16:57.596'),
('cmqovu8ap001knxtsp8nrq0fc', 'cmqovu8ae001anxts6ncemwu3', 'Ethiopian Coffee', 'ቡና', NULL, 50.00, 12.00, 1, 1, 0, 'drink', 'BARISTA', NULL, 240, 'PUBLISHED', NULL, NULL, '2026-06-22 07:16:57.602'),
('cmqovu8as001mnxtstagb5z0c', 'cmqovu8ag001cnxtsj071wvcw', 'Firfir', 'ፍርፍር', NULL, 180.00, 60.00, 1, 1, 0, 'main', 'KITCHEN', NULL, 600, 'PUBLISHED', NULL, NULL, '2026-06-22 07:16:57.604'),
('cmqovu8au001onxtsjvpkmqoj', 'cmqovu8ag001cnxtsj071wvcw', 'Club Sandwich', 'ክለብ ሳንድዊች', NULL, 220.00, 80.00, 1, 1, 0, 'main', 'KITCHEN', NULL, 720, 'PUBLISHED', NULL, NULL, '2026-06-22 07:16:57.606');

-- --------------------------------------------------------

--
-- Table structure for table `modifiers`
--

CREATE TABLE `modifiers` (
  `id` varchar(191) NOT NULL,
  `item_id` varchar(191) NOT NULL,
  `group_name` varchar(191) NOT NULL,
  `option` varchar(191) NOT NULL,
  `extra_price` decimal(12,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `modifiers`
--

INSERT INTO `modifiers` (`id`, `item_id`, `group_name`, `option`, `extra_price`) VALUES
('cmqovu8an001fnxtsvuabzy08', 'cmqovu8ak001enxtsta14k7z0', 'Size', 'Small', 0.00),
('cmqovu8an001gnxtslg1wtpya', 'cmqovu8ak001enxtsta14k7z0', 'Size', 'Large', 20.00),
('cmqovu8an001hnxtsznrc8rql', 'cmqovu8ak001enxtsta14k7z0', 'Sugar', 'No sugar', 0.00),
('cmqovu8an001inxtsb2v7puoz', 'cmqovu8ak001enxtsta14k7z0', 'Sugar', 'Extra sugar', 0.00);

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` varchar(191) NOT NULL,
  `user_id` varchar(191) NOT NULL,
  `type` varchar(191) NOT NULL,
  `title` varchar(191) NOT NULL,
  `body` text NOT NULL,
  `read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`id`, `user_id`, `type`, `title`, `body`, `read`, `created_at`) VALUES
('cmqoww2xs000k1zqbdcinkh5u', 'cmqovu80m0012nxtsvtjc22bh', 'schedule_published', 'Schedule published', 'Your shift schedule has been updated.', 0, '2026-06-22 07:46:23.584'),
('cmqoww2xs000l1zqbam5zkz1x', 'cmqovu7xe0010nxtscgvpwlew', 'schedule_published', 'Schedule published', 'Your shift schedule has been updated.', 1, '2026-06-22 07:46:23.584'),
('cmqoww2xu000n1zqb6pmaz15k', 'cmqovu8a70018nxtsyat2eh3o', 'schedule_published', 'Schedule published', 'Your shift schedule has been updated.', 0, '2026-06-22 07:46:23.584');

-- --------------------------------------------------------

--
-- Table structure for table `orders`
--

CREATE TABLE `orders` (
  `id` varchar(191) NOT NULL,
  `tenant_id` varchar(191) NOT NULL,
  `branch_id` varchar(191) NOT NULL,
  `table_id` varchar(191) DEFAULT NULL,
  `waiter_id` varchar(191) DEFAULT NULL,
  `status` enum('DRAFT','SUBMITTED','IN_PREPARATION','PARTIALLY_READY','READY','DELIVERED','BILL_REQUESTED','PAYMENT_PENDING','COMPLETED','VOIDED','REFUNDED') NOT NULL DEFAULT 'DRAFT',
  `type` enum('DINE_IN','QR','TAKEAWAY') NOT NULL DEFAULT 'DINE_IN',
  `allergy_ack` tinyint(1) NOT NULL DEFAULT 0,
  `held_for_bar` tinyint(1) NOT NULL DEFAULT 0,
  `submitted_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `order_items`
--

CREATE TABLE `order_items` (
  `id` varchar(191) NOT NULL,
  `order_id` varchar(191) NOT NULL,
  `menu_item_id` varchar(191) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `unit_price` decimal(12,2) NOT NULL,
  `modifiers_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`modifiers_json`)),
  `notes` text DEFAULT NULL,
  `allergy_note` varchar(191) DEFAULT NULL,
  `status` enum('NEW','ACCEPTED','PREPARING','PLATING','READY','DELIVERED','VOIDED') NOT NULL DEFAULT 'NEW',
  `station` enum('BARISTA','KITCHEN') NOT NULL DEFAULT 'KITCHEN',
  `course` enum('starter','main','dessert','drink') NOT NULL DEFAULT 'main',
  `actual_start` datetime(3) DEFAULT NULL,
  `actual_end` datetime(3) DEFAULT NULL,
  `delivered_at` datetime(3) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payments`
--

CREATE TABLE `payments` (
  `id` varchar(191) NOT NULL,
  `order_id` varchar(191) NOT NULL,
  `method` enum('CASH','TELEBIRR','CBE_BIRR','SPLIT') NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `tendered` decimal(12,2) DEFAULT NULL,
  `change_due` decimal(12,2) DEFAULT NULL,
  `reference` varchar(191) DEFAULT NULL,
  `status` enum('PENDING','CONFIRMED','FAILED','REFUNDED') NOT NULL DEFAULT 'PENDING',
  `cashier_id` varchar(191) DEFAULT NULL,
  `shift_id` varchar(191) DEFAULT NULL,
  `verified_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `platform_config`
--

CREATE TABLE `platform_config` (
  `key` varchar(191) NOT NULL,
  `value` text NOT NULL,
  `updated_by` varchar(191) DEFAULT NULL,
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `platform_config`
--

INSERT INTO `platform_config` (`key`, `value`, `updated_by`, `updated_at`) VALUES
('account_name', 'CafeFlow Technologies', NULL, '2026-06-22 07:16:56.513'),
('account_number', '1000XXXXXXXXX', NULL, '2026-06-22 07:16:56.510'),
('bank_name', 'Commercial Bank of Ethiopia', NULL, '2026-06-22 07:16:56.481'),
('global_announcement', '', NULL, '2026-06-22 07:16:56.520'),
('subscription_amount', '30000', NULL, '2026-06-22 07:16:56.518'),
('vat_rate', '0.15', NULL, '2026-06-22 07:16:56.516');

-- --------------------------------------------------------

--
-- Table structure for table `po_items`
--

CREATE TABLE `po_items` (
  `id` varchar(191) NOT NULL,
  `po_id` varchar(191) NOT NULL,
  `inventory_item_id` varchar(191) NOT NULL,
  `quantity` decimal(14,3) NOT NULL,
  `unit_cost` decimal(12,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `purchase_orders`
--

CREATE TABLE `purchase_orders` (
  `id` varchar(191) NOT NULL,
  `tenant_id` varchar(191) NOT NULL,
  `supplier_id` varchar(191) DEFAULT NULL,
  `status` enum('DRAFT','PENDING_APPROVAL','APPROVED','SENT','RECEIVED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
  `total` decimal(12,2) NOT NULL DEFAULT 0.00,
  `notes` text DEFAULT NULL,
  `approved_by` varchar(191) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `refunds`
--

CREATE TABLE `refunds` (
  `id` varchar(191) NOT NULL,
  `order_id` varchar(191) NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `reason` text NOT NULL,
  `approved_by` varchar(191) DEFAULT NULL,
  `executed_by` varchar(191) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `restock_requests`
--

CREATE TABLE `restock_requests` (
  `id` varchar(191) NOT NULL,
  `tenant_id` varchar(191) NOT NULL,
  `item_id` varchar(191) NOT NULL,
  `branch_id` varchar(191) NOT NULL,
  `quantity` decimal(14,3) NOT NULL,
  `status` enum('REQUESTED','ORDERED','FULFILLED','REJECTED') NOT NULL DEFAULT 'REQUESTED',
  `requested_by` varchar(191) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `shifts`
--

CREATE TABLE `shifts` (
  `id` varchar(191) NOT NULL,
  `branch_id` varchar(191) NOT NULL,
  `opened_by` varchar(191) NOT NULL,
  `open_time` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `close_time` datetime(3) DEFAULT NULL,
  `opening_float` decimal(12,2) NOT NULL,
  `actual_cash` decimal(12,2) DEFAULT NULL,
  `expected_cash` decimal(12,2) DEFAULT NULL,
  `variance` decimal(12,2) DEFAULT NULL,
  `status` enum('OPEN','CLOSED') NOT NULL DEFAULT 'OPEN'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `staff_attendance`
--

CREATE TABLE `staff_attendance` (
  `id` varchar(191) NOT NULL,
  `user_id` varchar(191) NOT NULL,
  `shift_id` varchar(191) DEFAULT NULL,
  `clock_in` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `clock_out` datetime(3) DEFAULT NULL,
  `late_flag` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `staff_ratings`
--

CREATE TABLE `staff_ratings` (
  `id` varchar(191) NOT NULL,
  `staff_id` varchar(191) NOT NULL,
  `rating` int(11) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `staff_schedules`
--

CREATE TABLE `staff_schedules` (
  `id` varchar(191) NOT NULL,
  `user_id` varchar(191) NOT NULL,
  `branch_id` varchar(191) NOT NULL,
  `date` date NOT NULL,
  `shift_start` varchar(191) NOT NULL,
  `shift_end` varchar(191) NOT NULL,
  `status` enum('DRAFT','PUBLISHED','SWAP_REQUESTED') NOT NULL DEFAULT 'DRAFT'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `staff_schedules`
--

INSERT INTO `staff_schedules` (`id`, `user_id`, `branch_id`, `date`, `shift_start`, `shift_end`, `status`) VALUES
('cmqowvrtl000d1zqbirznbt93', 'cmqovu7xe0010nxtscgvpwlew', 'cmqovu7l0000enxtst2g8taxl', '2026-06-22', '06:00', '14:00', 'PUBLISHED'),
('cmqowvu3e000f1zqbfx38crza', 'cmqovu80m0012nxtsvtjc22bh', 'cmqovu7l0000enxtst2g8taxl', '2026-06-22', '06:00', '14:00', 'PUBLISHED'),
('cmqowvxfk000h1zqbzzqby48j', 'cmqovu8a70018nxtsyat2eh3o', 'cmqovu7l0000enxtst2g8taxl', '2026-06-22', '06:00', '14:00', 'PUBLISHED');

-- --------------------------------------------------------

--
-- Table structure for table `stock_counts`
--

CREATE TABLE `stock_counts` (
  `id` varchar(191) NOT NULL,
  `branch_id` varchar(191) NOT NULL,
  `initiated_by` varchar(191) NOT NULL,
  `status` enum('OPEN','SUBMITTED','CLOSED') NOT NULL DEFAULT 'OPEN',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `stock_count_lines`
--

CREATE TABLE `stock_count_lines` (
  `id` varchar(191) NOT NULL,
  `stock_count_id` varchar(191) NOT NULL,
  `item_id` varchar(191) NOT NULL,
  `system_qty` decimal(14,3) NOT NULL,
  `counted_qty` decimal(14,3) DEFAULT NULL,
  `variance` decimal(14,3) DEFAULT NULL,
  `reason` varchar(191) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `stock_movements`
--

CREATE TABLE `stock_movements` (
  `id` varchar(191) NOT NULL,
  `item_id` varchar(191) NOT NULL,
  `type` enum('RECEIVE','CONSUME','ADJUST','WASTE') NOT NULL,
  `quantity` decimal(14,3) NOT NULL,
  `reason` varchar(191) DEFAULT NULL,
  `user_id` varchar(191) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `subscriptions`
--

CREATE TABLE `subscriptions` (
  `id` varchar(191) NOT NULL,
  `tenant_id` varchar(191) NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `period_start` datetime(3) DEFAULT NULL,
  `period_end` datetime(3) DEFAULT NULL,
  `receipt_url` varchar(191) DEFAULT NULL,
  `status` enum('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  `approved_by` varchar(191) DEFAULT NULL,
  `review_note` varchar(191) DEFAULT NULL,
  `reject_reason` varchar(191) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `suppliers`
--

CREATE TABLE `suppliers` (
  `id` varchar(191) NOT NULL,
  `tenant_id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `contact` varchar(191) DEFAULT NULL,
  `phone` varchar(191) DEFAULT NULL,
  `email` varchar(191) DEFAULT NULL,
  `payment_terms` varchar(191) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `suppliers`
--

INSERT INTO `suppliers` (`id`, `tenant_id`, `name`, `contact`, `phone`, `email`, `payment_terms`, `created_at`) VALUES
('cmqovu8aw001qnxtsnpxe9g8l', 'cmqovu7kh0002nxts603a35wi', 'Addis Coffee Suppliers', 'Tigist', '+251922000000', 'sales@addiscoffee.et', 'Net 15', '2026-06-22 07:16:57.608');

-- --------------------------------------------------------

--
-- Table structure for table `system_metrics`
--

CREATE TABLE `system_metrics` (
  `id` varchar(191) NOT NULL,
  `key` varchar(191) NOT NULL,
  `value` double NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tables`
--

CREATE TABLE `tables` (
  `id` varchar(191) NOT NULL,
  `branch_id` varchar(191) NOT NULL,
  `number` int(11) NOT NULL,
  `capacity` int(11) NOT NULL DEFAULT 4,
  `status` enum('available','occupied','attention','dirty') NOT NULL DEFAULT 'available',
  `x_pos` double NOT NULL DEFAULT 0,
  `y_pos` double NOT NULL DEFAULT 0,
  `rotation` double NOT NULL DEFAULT 0,
  `shape` enum('round','square','rectangle','booth') NOT NULL DEFAULT 'round'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tables`
--

INSERT INTO `tables` (`id`, `branch_id`, `number`, `capacity`, `status`, `x_pos`, `y_pos`, `rotation`, `shape`) VALUES
('cmqovu7l2000gnxtspzcmr3l1', 'cmqovu7l0000enxtst2g8taxl', 1, 2, 'available', 40, 40, 0, 'round'),
('cmqovu7l8000inxtsvfc87es4', 'cmqovu7l0000enxtst2g8taxl', 2, 4, 'available', 160, 40, 0, 'square'),
('cmqovu7lc000knxtsetz39y8y', 'cmqovu7l0000enxtst2g8taxl', 3, 6, 'available', 280, 40, 60, 'booth'),
('cmqovu7lg000mnxtsbnalzko6', 'cmqovu7l0000enxtst2g8taxl', 4, 4, 'available', 400, 40, 0, 'booth'),
('cmqovu7li000onxtsoz8zljgp', 'cmqovu7l0000enxtst2g8taxl', 5, 4, 'available', 40, 160, 0, 'round'),
('cmqovu7lw000qnxtsztdcmqkq', 'cmqovu7l0000enxtst2g8taxl', 6, 2, 'available', 160, 160, 0, 'square'),
('cmqovu7m2000snxtsx6ege1pt', 'cmqovu7l0000enxtst2g8taxl', 7, 8, 'available', 280, 160, 0, 'rectangle'),
('cmqovu7mz000unxtsoe32y0m4', 'cmqovu7l0000enxtst2g8taxl', 8, 6, 'available', 400, 160, 0, 'booth');

-- --------------------------------------------------------

--
-- Table structure for table `tenants`
--

CREATE TABLE `tenants` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `owner_user_id` varchar(191) DEFAULT NULL,
  `status` enum('active','suspended','terminated') NOT NULL DEFAULT 'active',
  `trial_end` datetime(3) DEFAULT NULL,
  `sub_start` datetime(3) DEFAULT NULL,
  `sub_end` datetime(3) DEFAULT NULL,
  `address` varchar(191) DEFAULT NULL,
  `phone` varchar(191) DEFAULT NULL,
  `branch_count` int(11) NOT NULL DEFAULT 1,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tenants`
--

INSERT INTO `tenants` (`id`, `name`, `owner_user_id`, `status`, `trial_end`, `sub_start`, `sub_end`, `address`, `phone`, `branch_count`, `created_at`, `updated_at`) VALUES
('cmqovu7kh0002nxts603a35wi', 'ZAD Cafe', 'cmqovu7q9000wnxtssmj4evdz', 'active', '2026-06-29 07:16:56.652', NULL, NULL, 'Bole, Addis Ababa', '+251911000000', 1, '2026-06-22 07:16:56.657', '2026-06-22 07:16:56.870');

-- --------------------------------------------------------

--
-- Table structure for table `tenant_features`
--

CREATE TABLE `tenant_features` (
  `id` varchar(191) NOT NULL,
  `tenant_id` varchar(191) NOT NULL,
  `key` varchar(191) NOT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tenant_features`
--

INSERT INTO `tenant_features` (`id`, `tenant_id`, `key`, `enabled`) VALUES
('cmqovu7kk0004nxtsrzlqsxy9', 'cmqovu7kh0002nxts603a35wi', 'feature_kds', 1),
('cmqovu7ko0006nxtsy2r8aewl', 'cmqovu7kh0002nxts603a35wi', 'feature_qr_order', 1),
('cmqovu7kr0008nxtsgb3hs1df', 'cmqovu7kh0002nxts603a35wi', 'feature_multi_branch', 1),
('cmqovu7kt000anxtssnz6qrxn', 'cmqovu7kh0002nxts603a35wi', 'feature_amharic', 1),
('cmqovu7kv000cnxts3rgeml2q', 'cmqovu7kh0002nxts603a35wi', 'feature_offline', 1);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` varchar(191) NOT NULL,
  `tenant_id` varchar(191) DEFAULT NULL,
  `name` varchar(191) NOT NULL,
  `email` varchar(191) NOT NULL,
  `password_hash` varchar(191) DEFAULT NULL,
  `role` enum('saas_owner','cafe_owner','cafe_manager','waiter','cashier','barista','kitchen','store_manager') NOT NULL,
  `branch_id` varchar(191) DEFAULT NULL,
  `pin_hash` varchar(191) DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `email_verified` datetime(3) DEFAULT NULL,
  `mfa_secret` varchar(191) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `tenant_id`, `name`, `email`, `password_hash`, `role`, `branch_id`, `pin_hash`, `active`, `email_verified`, `mfa_secret`, `created_at`, `updated_at`) VALUES
('cmqovu7k70001nxtsvi13vxgs', NULL, 'Platform Admin', 'saas@cafeflow.app', '$2a$10$cwZ1MfbVPoCsSUHOo1Dwturm4OhR2eMH7YNeLoUaLfTBMkbwcirym', 'saas_owner', NULL, '$2a$10$RPkkDexacpUAmilPxuvOlOTrIWCAkqjPlkbYm4rlxYZYU8GsHC0Ky', 1, '2026-06-22 07:16:56.638', NULL, '2026-06-22 07:16:56.641', '2026-06-22 07:16:56.641'),
('cmqovu7q9000wnxtssmj4evdz', 'cmqovu7kh0002nxts603a35wi', 'Abrham Minbale', 'owner@zadcafe.et', '$2a$10$cZHjqyxmuqnmBMsEii//ZuaKtXBWs9rq4vhSrgTXZIQESctw3t.Ya', 'cafe_owner', 'cmqovu7l0000enxtst2g8taxl', '$2a$10$5/Ek0O1UtWV/DcfxNc6AyeqUCB6Klky72sOphOwH.HrsVngKlA8dC', 1, '2026-06-22 07:16:56.864', NULL, '2026-06-22 07:16:56.865', '2026-06-22 07:16:56.865'),
('cmqovu7ts000ynxtsdpmh7pmn', 'cmqovu7kh0002nxts603a35wi', 'Sara Tesfaye', 'manager@zadcafe.et', '$2a$10$Dnu6jEWM4PIPjyrNMYjePe1xUOFglshNfEbaRAKb88Dsp0CR93o1K', 'cafe_manager', 'cmqovu7l0000enxtst2g8taxl', '$2a$10$RfJkfCv.N5xVRKkF7m1F3.bOF1Cf7KaV9BJl198T.0hFXWPiVHSJC', 1, '2026-06-22 07:16:56.991', NULL, '2026-06-22 07:16:56.992', '2026-06-22 07:16:56.992'),
('cmqovu7xe0010nxtscgvpwlew', 'cmqovu7kh0002nxts603a35wi', 'Dawit Bekele', 'waiter@zadcafe.et', '$2a$10$v9jBSAiFxfb8VyZ17WPw2uf23bzuZkFe5DTSDHadMxggM1DIWeeDq', 'waiter', 'cmqovu7l0000enxtst2g8taxl', '$2a$10$JLzoSADQtyfAlFSpaEWQNuQlONWAaZs.OEz.8SQXB.QbY56gFuJSW', 1, '2026-06-22 07:16:57.121', NULL, '2026-06-22 07:16:57.122', '2026-06-22 07:16:57.122'),
('cmqovu80m0012nxtsvtjc22bh', 'cmqovu7kh0002nxts603a35wi', 'Helen Girma', 'cashier@zadcafe.et', '$2a$10$usxNXfvH3AvzfmDJntGD..5NphTogVXmZNBqVV4VN/VMCYRWCvvmK', 'cashier', 'cmqovu7l0000enxtst2g8taxl', '$2a$10$wjtdQomg.8xfglROExEAOOZJd/kmrCJFLwVBVzHASvhRndFkh56Ru', 1, '2026-06-22 07:16:57.237', NULL, '2026-06-22 07:16:57.239', '2026-06-22 07:16:57.239'),
('cmqovu83r0014nxtsdffs4po9', 'cmqovu7kh0002nxts603a35wi', 'Yonas Alemu', 'barista@zadcafe.et', '$2a$10$Qsr/EQIrNMB2cTmyNpUyV.UFG9S3pB8UuendVNlPPqnfFFkWbqZ56', 'barista', 'cmqovu7l0000enxtst2g8taxl', '$2a$10$UF4Uijh9/fv4ULJZ5oJoVOoclcfHJAFarBNEw7v/qGTq5MKtbM5aC', 1, '2026-06-22 07:16:57.350', NULL, '2026-06-22 07:16:57.352', '2026-06-22 07:16:57.352'),
('cmqovu8720016nxtsomj00kqd', 'cmqovu7kh0002nxts603a35wi', 'Meron Haile', 'kitchen@zadcafe.et', '$2a$10$SvNjutRV8u.B7ruv2OC1Nu8liMAKk02yDH4qgwOIzY.A1AY.YYn0O', 'kitchen', 'cmqovu7l0000enxtst2g8taxl', '$2a$10$opUdb6uesxOdWw/tr9/Uou.Np3y1gnYIDoXg.M3Bg.rXLaAhDY1Da', 1, '2026-06-22 07:16:57.469', NULL, '2026-06-22 07:16:57.470', '2026-06-22 07:16:57.470'),
('cmqovu8a70018nxtsyat2eh3o', 'cmqovu7kh0002nxts603a35wi', 'Kebede Worku', 'store@zadcafe.et', '$2a$10$M2GyvcxyWLG.On1JAslj3.3M0XcMzmfDyvoUfQiCVCLD92rYNQi0W', 'store_manager', 'cmqovu7l0000enxtst2g8taxl', '$2a$10$A1kutrxdlBXJmxZZAVmIY.mRjplyb493XEJUyEhgH6Lm0UKgNspK2', 1, '2026-06-22 07:16:57.581', NULL, '2026-06-22 07:16:57.583', '2026-06-22 07:16:57.583');

-- --------------------------------------------------------

--
-- Table structure for table `waste_log`
--

CREATE TABLE `waste_log` (
  `id` varchar(191) NOT NULL,
  `tenant_id` varchar(191) NOT NULL,
  `item_id` varchar(191) DEFAULT NULL,
  `quantity` decimal(14,3) NOT NULL,
  `reason` varchar(191) NOT NULL,
  `user_id` varchar(191) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `audit_logs_tenant_id_idx` (`tenant_id`),
  ADD KEY `audit_logs_action_idx` (`action`);

--
-- Indexes for table `branches`
--
ALTER TABLE `branches`
  ADD PRIMARY KEY (`id`),
  ADD KEY `branches_tenant_id_idx` (`tenant_id`);

--
-- Indexes for table `email_templates`
--
ALTER TABLE `email_templates`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email_templates_type_key` (`type`);

--
-- Indexes for table `inventory_items`
--
ALTER TABLE `inventory_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `inventory_items_tenant_id_idx` (`tenant_id`),
  ADD KEY `inventory_items_branch_id_idx` (`branch_id`),
  ADD KEY `inventory_items_supplier_id_fkey` (`supplier_id`);

--
-- Indexes for table `invitations`
--
ALTER TABLE `invitations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `invitations_token_key` (`token`),
  ADD KEY `invitations_tenant_id_idx` (`tenant_id`);

--
-- Indexes for table `menu_categories`
--
ALTER TABLE `menu_categories`
  ADD PRIMARY KEY (`id`),
  ADD KEY `menu_categories_tenant_id_idx` (`tenant_id`);

--
-- Indexes for table `menu_items`
--
ALTER TABLE `menu_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `menu_items_category_id_idx` (`category_id`);

--
-- Indexes for table `modifiers`
--
ALTER TABLE `modifiers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `modifiers_item_id_idx` (`item_id`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `notifications_user_id_idx` (`user_id`);

--
-- Indexes for table `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`id`),
  ADD KEY `orders_tenant_id_idx` (`tenant_id`),
  ADD KEY `orders_branch_id_idx` (`branch_id`),
  ADD KEY `orders_status_idx` (`status`),
  ADD KEY `orders_table_id_fkey` (`table_id`),
  ADD KEY `orders_waiter_id_fkey` (`waiter_id`);

--
-- Indexes for table `order_items`
--
ALTER TABLE `order_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `order_items_order_id_idx` (`order_id`),
  ADD KEY `order_items_station_idx` (`station`),
  ADD KEY `order_items_menu_item_id_fkey` (`menu_item_id`);

--
-- Indexes for table `payments`
--
ALTER TABLE `payments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `payments_order_id_idx` (`order_id`),
  ADD KEY `payments_shift_id_idx` (`shift_id`),
  ADD KEY `payments_cashier_id_fkey` (`cashier_id`);

--
-- Indexes for table `platform_config`
--
ALTER TABLE `platform_config`
  ADD PRIMARY KEY (`key`);

--
-- Indexes for table `po_items`
--
ALTER TABLE `po_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `po_items_po_id_idx` (`po_id`),
  ADD KEY `po_items_inventory_item_id_fkey` (`inventory_item_id`);

--
-- Indexes for table `purchase_orders`
--
ALTER TABLE `purchase_orders`
  ADD PRIMARY KEY (`id`),
  ADD KEY `purchase_orders_tenant_id_idx` (`tenant_id`),
  ADD KEY `purchase_orders_supplier_id_fkey` (`supplier_id`);

--
-- Indexes for table `refunds`
--
ALTER TABLE `refunds`
  ADD PRIMARY KEY (`id`),
  ADD KEY `refunds_order_id_idx` (`order_id`);

--
-- Indexes for table `restock_requests`
--
ALTER TABLE `restock_requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `restock_requests_tenant_id_idx` (`tenant_id`);

--
-- Indexes for table `shifts`
--
ALTER TABLE `shifts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `shifts_branch_id_idx` (`branch_id`),
  ADD KEY `shifts_opened_by_fkey` (`opened_by`);

--
-- Indexes for table `staff_attendance`
--
ALTER TABLE `staff_attendance`
  ADD PRIMARY KEY (`id`),
  ADD KEY `staff_attendance_user_id_idx` (`user_id`),
  ADD KEY `staff_attendance_shift_id_fkey` (`shift_id`);

--
-- Indexes for table `staff_ratings`
--
ALTER TABLE `staff_ratings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `staff_ratings_staff_id_idx` (`staff_id`);

--
-- Indexes for table `staff_schedules`
--
ALTER TABLE `staff_schedules`
  ADD PRIMARY KEY (`id`),
  ADD KEY `staff_schedules_user_id_idx` (`user_id`),
  ADD KEY `staff_schedules_branch_id_date_idx` (`branch_id`,`date`);

--
-- Indexes for table `stock_counts`
--
ALTER TABLE `stock_counts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `stock_counts_branch_id_idx` (`branch_id`);

--
-- Indexes for table `stock_count_lines`
--
ALTER TABLE `stock_count_lines`
  ADD PRIMARY KEY (`id`),
  ADD KEY `stock_count_lines_stock_count_id_idx` (`stock_count_id`);

--
-- Indexes for table `stock_movements`
--
ALTER TABLE `stock_movements`
  ADD PRIMARY KEY (`id`),
  ADD KEY `stock_movements_item_id_idx` (`item_id`);

--
-- Indexes for table `subscriptions`
--
ALTER TABLE `subscriptions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `subscriptions_tenant_id_idx` (`tenant_id`),
  ADD KEY `subscriptions_status_idx` (`status`);

--
-- Indexes for table `suppliers`
--
ALTER TABLE `suppliers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `suppliers_tenant_id_idx` (`tenant_id`);

--
-- Indexes for table `system_metrics`
--
ALTER TABLE `system_metrics`
  ADD PRIMARY KEY (`id`),
  ADD KEY `system_metrics_key_idx` (`key`);

--
-- Indexes for table `tables`
--
ALTER TABLE `tables`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `tables_branch_id_number_key` (`branch_id`,`number`),
  ADD KEY `tables_branch_id_idx` (`branch_id`);

--
-- Indexes for table `tenants`
--
ALTER TABLE `tenants`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `tenant_features`
--
ALTER TABLE `tenant_features`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `tenant_features_tenant_id_key_key` (`tenant_id`,`key`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `users_email_key` (`email`),
  ADD KEY `users_tenant_id_idx` (`tenant_id`),
  ADD KEY `users_role_idx` (`role`),
  ADD KEY `users_branch_id_fkey` (`branch_id`);

--
-- Indexes for table `waste_log`
--
ALTER TABLE `waste_log`
  ADD PRIMARY KEY (`id`),
  ADD KEY `waste_log_tenant_id_idx` (`tenant_id`),
  ADD KEY `waste_log_item_id_fkey` (`item_id`);

--
-- Constraints for dumped tables
--

--
-- Constraints for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD CONSTRAINT `audit_logs_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `branches`
--
ALTER TABLE `branches`
  ADD CONSTRAINT `branches_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `inventory_items`
--
ALTER TABLE `inventory_items`
  ADD CONSTRAINT `inventory_items_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `inventory_items_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `inventory_items_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `invitations`
--
ALTER TABLE `invitations`
  ADD CONSTRAINT `invitations_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `menu_categories`
--
ALTER TABLE `menu_categories`
  ADD CONSTRAINT `menu_categories_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `menu_items`
--
ALTER TABLE `menu_items`
  ADD CONSTRAINT `menu_items_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `menu_categories` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `modifiers`
--
ALTER TABLE `modifiers`
  ADD CONSTRAINT `modifiers_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `menu_items` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `orders`
--
ALTER TABLE `orders`
  ADD CONSTRAINT `orders_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `orders_table_id_fkey` FOREIGN KEY (`table_id`) REFERENCES `tables` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `orders_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `orders_waiter_id_fkey` FOREIGN KEY (`waiter_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `order_items`
--
ALTER TABLE `order_items`
  ADD CONSTRAINT `order_items_menu_item_id_fkey` FOREIGN KEY (`menu_item_id`) REFERENCES `menu_items` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `order_items_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `payments`
--
ALTER TABLE `payments`
  ADD CONSTRAINT `payments_cashier_id_fkey` FOREIGN KEY (`cashier_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `payments_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `payments_shift_id_fkey` FOREIGN KEY (`shift_id`) REFERENCES `shifts` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `po_items`
--
ALTER TABLE `po_items`
  ADD CONSTRAINT `po_items_inventory_item_id_fkey` FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_items` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `po_items_po_id_fkey` FOREIGN KEY (`po_id`) REFERENCES `purchase_orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `purchase_orders`
--
ALTER TABLE `purchase_orders`
  ADD CONSTRAINT `purchase_orders_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `purchase_orders_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `refunds`
--
ALTER TABLE `refunds`
  ADD CONSTRAINT `refunds_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `shifts`
--
ALTER TABLE `shifts`
  ADD CONSTRAINT `shifts_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `shifts_opened_by_fkey` FOREIGN KEY (`opened_by`) REFERENCES `users` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `staff_attendance`
--
ALTER TABLE `staff_attendance`
  ADD CONSTRAINT `staff_attendance_shift_id_fkey` FOREIGN KEY (`shift_id`) REFERENCES `shifts` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `staff_attendance_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `staff_ratings`
--
ALTER TABLE `staff_ratings`
  ADD CONSTRAINT `staff_ratings_staff_id_fkey` FOREIGN KEY (`staff_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `staff_schedules`
--
ALTER TABLE `staff_schedules`
  ADD CONSTRAINT `staff_schedules_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `staff_schedules_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `stock_count_lines`
--
ALTER TABLE `stock_count_lines`
  ADD CONSTRAINT `stock_count_lines_stock_count_id_fkey` FOREIGN KEY (`stock_count_id`) REFERENCES `stock_counts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `stock_movements`
--
ALTER TABLE `stock_movements`
  ADD CONSTRAINT `stock_movements_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `inventory_items` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `subscriptions`
--
ALTER TABLE `subscriptions`
  ADD CONSTRAINT `subscriptions_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `suppliers`
--
ALTER TABLE `suppliers`
  ADD CONSTRAINT `suppliers_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `tables`
--
ALTER TABLE `tables`
  ADD CONSTRAINT `tables_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `tenant_features`
--
ALTER TABLE `tenant_features`
  ADD CONSTRAINT `tenant_features_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `users_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `users_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `waste_log`
--
ALTER TABLE `waste_log`
  ADD CONSTRAINT `waste_log_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `inventory_items` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `waste_log_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
