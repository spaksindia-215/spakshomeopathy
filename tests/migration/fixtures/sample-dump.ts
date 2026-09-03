/**
 * Small, isolated fixture dataset for M3-B pipeline tests.
 *
 * Owner instruction (M3-B §9): "Create a small isolated fixture dataset
 * containing edge cases: normal product, null values, legacy/typo values,
 * duplicate-like identifiers, order with multiple products, order with
 * payment, order with missing optional payment, GroupId relationships,
 * historical status values, integer/string orderId mismatch. The fixture
 * must never contain real credentials or sensitive production data."
 *
 * CONTAINS NO REAL DATA — every value below is synthetic, invented for
 * this test fixture. No password hash, email, phone number, or address
 * here corresponds to any real person or the actual production database.
 * Password hashes are literal placeholder strings, not valid bcrypt
 * output.
 *
 * Written in the same phpMyAdmin dump text format the real parser
 * consumes, so these fixtures exercise the ACTUAL extraction stage
 * (sqlDumpParser.ts), not a shortcut that bypasses it.
 */

export const SAMPLE_DUMP = `
CREATE TABLE \`users\` (
  \`id\` int(11) NOT NULL,
  \`name\` varchar(255) DEFAULT NULL,
  \`email\` varchar(255) DEFAULT NULL,
  \`mobile\` varchar(255) DEFAULT NULL,
  \`email_verified_at\` timestamp NULL DEFAULT NULL,
  \`password\` varchar(255) DEFAULT NULL,
  \`image\` varchar(255) DEFAULT NULL,
  \`utype\` int(11) DEFAULT NULL,
  \`status\` int(11) DEFAULT NULL,
  \`remember_token\` varchar(100) DEFAULT NULL,
  \`created_at\` timestamp NULL DEFAULT current_timestamp(),
  \`updated_at\` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1: normal user; 2: all-nullable fields null; 3: buyer with a matching
-- buyer_profile row (see below)
INSERT INTO \`users\` (\`id\`, \`name\`, \`email\`, \`mobile\`, \`email_verified_at\`, \`password\`, \`image\`, \`utype\`, \`status\`, \`remember_token\`, \`created_at\`, \`updated_at\`) VALUES
(1, 'Normal User', 'normal@test.invalid', '9000000001', NULL, 'FAKE_HASH_NOT_REAL_1', NULL, 3, 1, NULL, '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
(2, 'Null Fields User', 'nulls@test.invalid', NULL, NULL, 'FAKE_HASH_NOT_REAL_2', NULL, NULL, NULL, NULL, '2026-01-02 00:00:00', '2026-01-02 00:00:00'),
(3, 'Buyer With Profile', 'buyer@test.invalid', '9000000003', NULL, 'FAKE_HASH_NOT_REAL_3', NULL, 3, 1, NULL, '2026-01-03 00:00:00', '2026-01-03 00:00:00');

CREATE TABLE \`buyer_profile\` (
  \`id\` int(21) NOT NULL,
  \`uid\` int(21) DEFAULT NULL,
  \`PinCode\` varchar(255) DEFAULT NULL,
  \`FullAddress\` varchar(255) DEFAULT NULL,
  \`HouseNo\` varchar(255) DEFAULT NULL,
  \`Landmark\` varchar(255) DEFAULT NULL,
  \`State\` varchar(255) DEFAULT NULL,
  \`Country\` varchar(255) DEFAULT NULL,
  \`DeliveryType\` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO \`buyer_profile\` (\`id\`, \`uid\`, \`PinCode\`, \`FullAddress\`, \`HouseNo\`, \`Landmark\`, \`State\`, \`Country\`, \`DeliveryType\`) VALUES
(1, 3, '110025', 'Test Address', '12', NULL, 'Delhi', 'India', NULL);

CREATE TABLE \`products\` (
  \`id\` int(11) NOT NULL,
  \`p_cat\` int(11) DEFAULT NULL,
  \`p_name\` varchar(255) DEFAULT NULL,
  \`p_heading\` varchar(400) NOT NULL,
  \`p_bestimg\` varchar(255) DEFAULT NULL,
  \`p_mrp\` int(11) DEFAULT NULL,
  \`p_price\` int(11) DEFAULT NULL,
  \`p_status\` int(11) DEFAULT NULL,
  \`created_at\` timestamp NULL DEFAULT current_timestamp(),
  \`updated_at\` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- 1: normal product; 2: minimal (only the NOT NULL heading present, every
-- nullable field null) — exercises "legacy/typo-adjacent" minimal data
INSERT INTO \`products\` (\`id\`, \`p_cat\`, \`p_name\`, \`p_heading\`, \`p_bestimg\`, \`p_mrp\`, \`p_price\`, \`p_status\`, \`created_at\`, \`updated_at\`) VALUES
(1, 5, 'Normal Product', 'Normal Product Heading', 'normal.jpg', 100, 90, 1, '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
(2, NULL, NULL, 'Minimal Heading Only', NULL, NULL, NULL, NULL, '2026-01-02 00:00:00', '2026-01-02 00:00:00');

CREATE TABLE \`product_images\` (
  \`id\` int(11) NOT NULL,
  \`p_id\` int(11) DEFAULT NULL,
  \`p_image\` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

INSERT INTO \`product_images\` (\`id\`, \`p_id\`, \`p_image\`) VALUES
(1, 1, 'normal-extra.jpg'),
(2, 999, 'orphan-image.jpg');

CREATE TABLE \`product_review\` (
  \`id\` int(11) NOT NULL,
  \`p_id\` int(11) DEFAULT NULL,
  \`r_name\` varchar(255) DEFAULT NULL,
  \`r_email\` varchar(255) DEFAULT NULL,
  \`r_rating\` int(11) DEFAULT NULL,
  \`r_review\` text DEFAULT NULL,
  \`r_status\` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

CREATE TABLE \`product_specification\` (
  \`id\` int(11) NOT NULL,
  \`p_id\` int(11) NOT NULL,
  \`p_heading\` varchar(255) DEFAULT NULL,
  \`p_specification\` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

CREATE TABLE \`categories\` (
  \`id\` int(11) NOT NULL,
  \`name\` varchar(255) DEFAULT NULL,
  \`image\` varchar(255) DEFAULT NULL,
  \`slug\` varchar(255) DEFAULT NULL,
  \`type\` enum('N','H') NOT NULL COMMENT 'N=Normal,H=harbels',
  \`status\` tinyint(1) DEFAULT NULL,
  \`created_at\` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- 2: unsanitized legacy slug with spaces/uppercase — a legacy/typo-value edge case (P-07)
INSERT INTO \`categories\` (\`id\`, \`name\`, \`image\`, \`slug\`, \`type\`, \`status\`, \`created_at\`) VALUES
(1, 'Test Disease', 'test.jpg', 'test-disease-a1b2c', 'N', 1, '2026-01-01 00:00:00'),
(2, 'Legacy Category', NULL, 'Legacy Slug With Spaces12345', 'H', 1, '2026-01-02 00:00:00');

CREATE TABLE \`product_category\` (
  \`id\` int(20) UNSIGNED NOT NULL,
  \`parent_id\` int(11) DEFAULT NULL,
  \`cat_name\` varchar(255) NOT NULL,
  \`cat_image\` varchar(255) DEFAULT NULL,
  \`cat_level\` int(11) DEFAULT NULL,
  \`cat_slug\` varchar(255) DEFAULT NULL,
  \`cat_status\` int(11) DEFAULT NULL,
  \`created_at\` timestamp NULL DEFAULT current_timestamp(),
  \`updated_at\` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO \`product_category\` (\`id\`, \`parent_id\`, \`cat_name\`, \`cat_image\`, \`cat_level\`, \`cat_slug\`, \`cat_status\`, \`created_at\`, \`updated_at\`) VALUES
(1, NULL, 'Root Category', NULL, 1, 'root', 1, '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
(2, 1, 'Child Category', NULL, 2, 'child', 1, '2026-01-01 00:00:00', '2026-01-01 00:00:00');

CREATE TABLE \`orders\` (
  \`id\` int(11) NOT NULL,
  \`qr_transection_id\` varchar(400) NOT NULL,
  \`CustId\` int(21) DEFAULT NULL,
  \`SellerId\` int(21) DEFAULT NULL,
  \`GroupId\` int(21) DEFAULT NULL,
  \`ProductId\` int(21) DEFAULT NULL,
  \`quantity\` int(21) DEFAULT NULL,
  \`SellPrice\` varchar(255) DEFAULT NULL,
  \`DeliveryPrice\` int(21) DEFAULT NULL,
  \`TotalPrice\` int(21) DEFAULT NULL,
  \`OrderId\` int(11) DEFAULT NULL,
  \`OrderNotes\` varchar(255) DEFAULT NULL,
  \`OrderStatus\` int(21) DEFAULT NULL,
  \`PayMode\` varchar(255) DEFAULT NULL,
  \`OrderDate\` varchar(255) DEFAULT NULL,
  \`deliveryDate\` varchar(255) DEFAULT NULL,
  \`created_at\` timestamp NOT NULL DEFAULT current_timestamp(),
  \`updated_at\` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- GroupId=100: normal order, 2 lines, 1 payment (order with multiple products)
-- GroupId=200: order with NO matching payment row (missing optional payment)
-- GroupId=300: historical status — a "cancelled" order, orderStatus=5 (P-03: 5/5/4 pattern)
-- Note SellPrice is a STRING ('90.50') — integer/string type mismatch vs orderProducts, by design
INSERT INTO \`orders\` (\`id\`, \`qr_transection_id\`, \`CustId\`, \`SellerId\`, \`GroupId\`, \`ProductId\`, \`quantity\`, \`SellPrice\`, \`DeliveryPrice\`, \`TotalPrice\`, \`OrderId\`, \`OrderNotes\`, \`OrderStatus\`, \`PayMode\`, \`OrderDate\`, \`deliveryDate\`, \`created_at\`, \`updated_at\`) VALUES
(1, 'QR-FIXTURE-100', 1, NULL, 100, 1, 2, '90.50', 0, 181, 1200101, NULL, 1, 'qr', '2026-01-01', NULL, '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
(2, 'QR-FIXTURE-200', 3, NULL, 200, 1, 1, '90', 0, 90, 1200102, NULL, 1, 'qr', '2026-01-02', NULL, '2026-01-02 00:00:00', '2026-01-02 00:00:00'),
(3, 'QR-FIXTURE-300', 1, NULL, 300, 1, 1, '90', 0, 90, 1200103, NULL, 5, 'qr', '2026-01-03', NULL, '2026-01-03 00:00:00', '2026-01-03 00:00:00');

CREATE TABLE \`orderproducts\` (
  \`id\` int(11) NOT NULL,
  \`GroupId\` int(11) DEFAULT NULL,
  \`ProductId\` int(11) DEFAULT NULL,
  \`OrderImage\` varchar(255) DEFAULT NULL,
  \`quantity\` int(11) DEFAULT NULL,
  \`SellPrice\` int(11) DEFAULT NULL,
  \`DeliveryCharge\` int(11) DEFAULT NULL,
  \`TotalPrice\` int(11) DEFAULT NULL,
  \`SellerId\` int(11) DEFAULT NULL,
  \`BuyerId\` int(11) DEFAULT NULL,
  \`TrackingCode\` varchar(255) DEFAULT NULL,
  \`DelaveryDate\` varchar(255) DEFAULT NULL,
  \`DelaveryBy\` varchar(255) DEFAULT NULL,
  \`OrderStatus\` int(11) DEFAULT NULL,
  \`created_at\` timestamp NULL DEFAULT current_timestamp(),
  \`updated_at\` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- GroupId=100 has TWO lines (order with multiple products); GroupId=200
-- and 300 have one line each; id=6 is an ORPHAN (GroupId=999 matches no
-- order — orphan-detection edge case)
INSERT INTO \`orderproducts\` (\`id\`, \`GroupId\`, \`ProductId\`, \`OrderImage\`, \`quantity\`, \`SellPrice\`, \`DeliveryCharge\`, \`TotalPrice\`, \`SellerId\`, \`BuyerId\`, \`TrackingCode\`, \`DelaveryDate\`, \`DelaveryBy\`, \`OrderStatus\`, \`created_at\`, \`updated_at\`) VALUES
(1, 100, 1, 'img1.jpg', 1, 90, 0, 90, NULL, 1, NULL, NULL, NULL, 1, '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
(2, 100, 1, 'img2.jpg', 1, 91, 0, 91, NULL, 1, NULL, NULL, NULL, 1, '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
(3, 200, 1, 'img3.jpg', 1, 90, 0, 90, NULL, 3, NULL, NULL, NULL, 1, '2026-01-02 00:00:00', '2026-01-02 00:00:00'),
(4, 300, 1, 'img4.jpg', 1, 90, 0, 90, NULL, 1, NULL, NULL, NULL, 5, '2026-01-03 00:00:00', '2026-01-03 00:00:00'),
(6, 999, 1, 'orphan.jpg', 1, 90, 0, 90, NULL, 1, NULL, NULL, NULL, 1, '2026-01-06 00:00:00', '2026-01-06 00:00:00');

CREATE TABLE \`payments\` (
  \`id\` int(11) NOT NULL,
  \`pid\` int(11) DEFAULT NULL,
  \`qunt\` int(11) DEFAULT NULL,
  \`gid\` int(21) DEFAULT NULL,
  \`cid\` int(21) DEFAULT NULL,
  \`sid\` int(21) DEFAULT NULL,
  \`amount\` int(21) DEFAULT NULL,
  \`totalAmount\` int(11) DEFAULT NULL,
  \`orderId\` varchar(255) DEFAULT NULL,
  \`payStatus\` int(21) DEFAULT NULL,
  \`orderStatus\` int(21) DEFAULT NULL,
  \`AdminFee\` int(21) DEFAULT NULL,
  \`SellerPay\` int(21) DEFAULT NULL,
  \`discount\` int(21) DEFAULT NULL,
  \`payMode\` varchar(255) DEFAULT NULL,
  \`payDate\` varchar(255) DEFAULT NULL,
  \`created_at\` timestamp NOT NULL DEFAULT current_timestamp(),
  \`updated_at\` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- gid=100 has a payment (order with payment); gid=200 has NO payment row
-- at all (order with missing optional payment); gid=300 is the
-- "cancelled" order — orderStatus=4 here vs 5 on orders/orderproducts
-- (P-03 historical status pattern). orderId is a STRING here, matching
-- orders.OrderId's own value as text — the integer/string orderId
-- mismatch fixture case.
INSERT INTO \`payments\` (\`id\`, \`pid\`, \`qunt\`, \`gid\`, \`cid\`, \`sid\`, \`amount\`, \`totalAmount\`, \`orderId\`, \`payStatus\`, \`orderStatus\`, \`AdminFee\`, \`SellerPay\`, \`discount\`, \`payMode\`, \`payDate\`, \`created_at\`, \`updated_at\`) VALUES
(1, 1, 2, 100, 1, NULL, 181, 181, '1200101', 1, 1, 9, 172, 0, 'qr', '2026-01-01', '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
(2, 1, 1, 300, 1, NULL, 90, 90, '1200103', 1, 4, 4, 86, 0, 'qr', '2026-01-03', '2026-01-03 00:00:00', '2026-01-03 00:00:00');

CREATE TABLE \`tbl_appointment\` (
  \`id\` int(11) NOT NULL,
  \`name\` varchar(255) DEFAULT NULL,
  \`age\` int(255) DEFAULT NULL,
  \`gender\` varchar(255) DEFAULT NULL,
  \`phone\` varchar(255) DEFAULT NULL,
  \`appointment_date\` varchar(255) DEFAULT NULL,
  \`consultant_hour\` varchar(255) DEFAULT NULL,
  \`created_at\` timestamp NOT NULL DEFAULT current_timestamp(),
  \`updated_at\` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO \`tbl_appointment\` (\`id\`, \`name\`, \`age\`, \`gender\`, \`phone\`, \`appointment_date\`, \`consultant_hour\`, \`created_at\`, \`updated_at\`) VALUES
(1, 'Test Patient', 30, 'M', '9000000099', '2026-02-01', '10 AM', '2026-01-01 00:00:00', '2026-01-01 00:00:00');

CREATE TABLE \`enquiries\` (
  \`id\` int(11) NOT NULL,
  \`name\` varchar(255) DEFAULT NULL,
  \`email\` varchar(255) DEFAULT NULL,
  \`mobile\` varchar(255) DEFAULT NULL,
  \`subject\` varchar(255) DEFAULT NULL,
  \`message\` text DEFAULT NULL,
  \`created_at\` timestamp NOT NULL DEFAULT current_timestamp(),
  \`updated_at\` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- includes a message with embedded punctuation/quotes, exercising the
-- quote-aware parser (a simplified stand-in for real spam content)
INSERT INTO \`enquiries\` (\`id\`, \`name\`, \`email\`, \`mobile\`, \`subject\`, \`message\`, \`created_at\`, \`updated_at\`) VALUES
(1, 'Test Enquirer', 'enquiry@test.invalid', NULL, 'Test Subject', 'A message with an apostrophe''s and (parentheses) inside it.', '2026-01-01 00:00:00', '2026-01-01 00:00:00');

CREATE TABLE \`slider\` (
  \`id\` bigint(20) UNSIGNED NOT NULL,
  \`slider_title\` varchar(255) NOT NULL,
  \`slider_subtitle\` varchar(255) NOT NULL,
  \`slider_image\` varchar(255) NOT NULL,
  \`slider_status\` int(11) NOT NULL,
  \`created_at\` timestamp NULL DEFAULT current_timestamp(),
  \`updated_at\` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE \`pin_codes\` (
  \`id\` bigint(20) UNSIGNED NOT NULL,
  \`uid\` int(21) DEFAULT NULL,
  \`country\` varchar(255) DEFAULT NULL,
  \`pincode\` varchar(255) DEFAULT NULL,
  \`location\` varchar(255) DEFAULT NULL,
  \`status\` varchar(255) DEFAULT NULL,
  \`created_at\` timestamp NULL DEFAULT current_timestamp(),
  \`updated_at\` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO \`pin_codes\` (\`id\`, \`uid\`, \`country\`, \`pincode\`, \`location\`, \`status\`, \`created_at\`, \`updated_at\`) VALUES
(1, NULL, 'India', '110025', 'South Delhi', '1', '2026-01-01 00:00:00', '2026-01-01 00:00:00');

CREATE TABLE \`tbl_post\` (
  \`id\` int(11) NOT NULL,
  \`p_id\` varchar(400) NOT NULL,
  \`post_homeopathy\` int(11) DEFAULT NULL,
  \`post_diseases\` int(11) DEFAULT NULL,
  \`post_title\` varchar(255) DEFAULT NULL,
  \`post_image\` varchar(255) DEFAULT NULL,
  \`post_desc\` text DEFAULT NULL,
  \`post_status\` int(11) DEFAULT NULL,
  \`created_at\` timestamp NOT NULL DEFAULT current_timestamp(),
  \`updated_at\` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

INSERT INTO \`tbl_post\` (\`id\`, \`p_id\`, \`post_homeopathy\`, \`post_diseases\`, \`post_title\`, \`post_image\`, \`post_desc\`, \`post_status\`, \`created_at\`, \`updated_at\`) VALUES
(1, '1', NULL, 1, 'Test Post', NULL, 'Post description', 1, '2026-01-01 00:00:00', '2026-01-01 00:00:00');

CREATE TABLE \`tbl_homeopathy\` (
  \`id\` int(11) NOT NULL,
  \`name\` varchar(255) DEFAULT NULL,
  \`image\` varchar(255) DEFAULT NULL,
  \`slug\` varchar(255) DEFAULT NULL,
  \`status\` tinyint(1) DEFAULT NULL,
  \`created_at\` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

CREATE TABLE \`blogs\` (
  \`id\` int(10) UNSIGNED NOT NULL,
  \`blog_catid\` int(11) DEFAULT NULL,
  \`blog_title\` varchar(255) DEFAULT NULL,
  \`blog_image\` varchar(255) DEFAULT NULL,
  \`blog_desc\` text DEFAULT NULL,
  \`blog_author\` varchar(255) DEFAULT NULL,
  \`blog_slug\` varchar(255) DEFAULT NULL,
  \`blog_status\` int(11) DEFAULT NULL,
  \`created_at\` timestamp NULL DEFAULT current_timestamp(),
  \`updated_at\` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE \`blog_category\` (
  \`id\` int(20) UNSIGNED NOT NULL,
  \`bcat_name\` varchar(255) DEFAULT NULL,
  \`bcat_image\` varchar(255) DEFAULT NULL,
  \`bcat_slug\` varchar(255) DEFAULT NULL,
  \`created_at\` timestamp NULL DEFAULT current_timestamp(),
  \`updated_at\` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE \`statezones\` (
  \`id\` int(11) NOT NULL,
  \`CountryId\` int(21) DEFAULT NULL,
  \`ZoneName\` varchar(255) DEFAULT NULL,
  \`status\` int(11) DEFAULT NULL,
  \`created_at\` timestamp NOT NULL DEFAULT current_timestamp(),
  \`updated_at\` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE \`cities\` (
  \`id\` int(11) NOT NULL,
  \`ZoneId\` int(21) DEFAULT NULL,
  \`CityName\` varchar(255) DEFAULT NULL,
  \`PinCode\` int(11) DEFAULT NULL,
  \`status\` int(11) DEFAULT NULL,
  \`created_at\` timestamp NULL DEFAULT current_timestamp(),
  \`updated_at\` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
`;
