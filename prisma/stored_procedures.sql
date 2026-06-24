-- ───────────────────────────────────────────────────────────────────────────
-- CafeFlow SaaS — MySQL stored procedures
-- (MySQL equivalents of the PLpgSQL procedures from the original PostgreSQL spec)
--
-- These are OPTIONAL. The application implements the same logic atomically in
-- TypeScript via Prisma transactions (src/lib/services/*), which keeps the system
-- runnable without DB-side procedures and portable across providers. Install these
-- if you prefer to push the critical paths into the database layer.
--
-- Install:  mysql -u cafeflow -p cafeflow < prisma/stored_procedures.sql
-- ───────────────────────────────────────────────────────────────────────────

DELIMITER $$

-- process_order_payment(): atomically mark an order paid, decrement nothing here
-- (inventory consumption is handled per-recipe in app layer), and confirm payment.
DROP PROCEDURE IF EXISTS process_order_payment $$
CREATE PROCEDURE process_order_payment(
  IN p_order_id VARCHAR(191),
  IN p_payment_id VARCHAR(191)
)
BEGIN
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;
    UPDATE payments
      SET status = 'CONFIRMED', verified_at = NOW()
      WHERE id = p_payment_id;

    UPDATE orders
      SET status = 'COMPLETED', updated_at = NOW()
      WHERE id = p_order_id;

    UPDATE tables t
      JOIN orders o ON o.table_id = t.id
      SET t.status = 'available'
      WHERE o.id = p_order_id;
  COMMIT;
END $$

-- calculate_shift_totals(): aggregate cash + digital per shift for reconciliation.
DROP PROCEDURE IF EXISTS calculate_shift_totals $$
CREATE PROCEDURE calculate_shift_totals(IN p_shift_id VARCHAR(191))
BEGIN
  SELECT
    COALESCE(SUM(CASE WHEN method = 'CASH' THEN amount ELSE 0 END), 0)      AS cash_total,
    COALESCE(SUM(CASE WHEN method = 'TELEBIRR' THEN amount ELSE 0 END), 0)  AS telebirr_total,
    COALESCE(SUM(CASE WHEN method = 'CBE_BIRR' THEN amount ELSE 0 END), 0)  AS cbe_total,
    COALESCE(SUM(amount), 0)                                                AS grand_total
  FROM payments
  WHERE shift_id = p_shift_id AND status = 'CONFIRMED';
END $$

-- compute_stock_forecast(): estimated hours-to-stockout per item based on
-- average daily consumption over the last 7 days.
DROP PROCEDURE IF EXISTS compute_stock_forecast $$
CREATE PROCEDURE compute_stock_forecast(IN p_tenant_id VARCHAR(191))
BEGIN
  SELECT
    i.id,
    i.name,
    i.quantity,
    i.min_threshold,
    daily.avg_daily,
    CASE WHEN daily.avg_daily > 0
         THEN (i.quantity / daily.avg_daily) * 24.0
         ELSE NULL END AS hours_to_stockout
  FROM inventory_items i
  LEFT JOIN (
    SELECT m.item_id, (SUM(m.quantity) / 7.0) AS avg_daily
    FROM stock_movements m
    WHERE m.type = 'CONSUME' AND m.created_at >= (NOW() - INTERVAL 7 DAY)
    GROUP BY m.item_id
  ) daily ON daily.item_id = i.id
  WHERE i.tenant_id = p_tenant_id;
END $$

DELIMITER ;
