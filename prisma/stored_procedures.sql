-- ───────────────────────────────────────────────────────────────────────────
-- CafeFlow SaaS — PostgreSQL stored procedures / functions
-- ───────────────────────────────────────────────────────────────────────────
--
-- These are OPTIONAL. The application implements the same logic atomically in
-- TypeScript via Prisma transactions (src/lib/services/*), which keeps the system
-- runnable without DB-side procedures and portable across providers.
--
-- Install:  psql -U avnadmin -d defaultdb -f prisma/stored_procedures.sql
-- ───────────────────────────────────────────────────────────────────────────

-- process_order_payment(): atomically mark an order paid and confirm payment.
CREATE OR REPLACE PROCEDURE process_order_payment(
  p_order_id VARCHAR(191),
  p_payment_id VARCHAR(191)
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Mark the payment as CONFIRMED
  UPDATE payments
  SET status = 'CONFIRMED', verified_at = NOW()
  WHERE id = p_payment_id;

  -- Mark the order as COMPLETED
  UPDATE orders
  SET status = 'COMPLETED', updated_at = NOW()
  WHERE id = p_order_id;

  -- Set table status back to available
  UPDATE tables
  SET status = 'available'
  FROM orders
  WHERE orders.table_id = tables.id AND orders.id = p_order_id;
END;
$$;


-- calculate_shift_totals(): aggregate cash + digital per shift for reconciliation.
CREATE OR REPLACE FUNCTION calculate_shift_totals(p_shift_id VARCHAR(191))
RETURNS TABLE (
  cash_total NUMERIC,
  telebirr_total NUMERIC,
  cbe_total NUMERIC,
  grand_total NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN method = 'CASH' THEN amount ELSE 0 END), 0)::NUMERIC      AS cash_total,
    COALESCE(SUM(CASE WHEN method = 'TELEBIRR' THEN amount ELSE 0 END), 0)::NUMERIC  AS telebirr_total,
    COALESCE(SUM(CASE WHEN method = 'CBE_BIRR' THEN amount ELSE 0 END), 0)::NUMERIC  AS cbe_total,
    COALESCE(SUM(amount), 0)::NUMERIC                                                AS grand_total
  FROM payments
  WHERE shift_id = p_shift_id AND status = 'CONFIRMED';
END;
$$;


-- compute_stock_forecast(): estimated hours-to-stockout per item based on
-- average daily consumption over the last 7 days.
CREATE OR REPLACE FUNCTION compute_stock_forecast(p_tenant_id VARCHAR(191))
RETURNS TABLE (
  id VARCHAR(191),
  name TEXT,
  quantity NUMERIC,
  min_threshold NUMERIC,
  avg_daily NUMERIC,
  hours_to_stockout DOUBLE PRECISION
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id::VARCHAR(191),
    i.name::TEXT,
    i.quantity::NUMERIC,
    i.min_threshold::NUMERIC,
    COALESCE(daily.avg_daily, 0)::NUMERIC AS avg_daily,
    CASE WHEN daily.avg_daily > 0
         THEN (i.quantity::DOUBLE PRECISION / daily.avg_daily::DOUBLE PRECISION) * 24.0
         ELSE NULL END AS hours_to_stockout
  FROM inventory_items i
  LEFT JOIN (
    SELECT m.item_id, (SUM(m.quantity) / 7.0) AS avg_daily
    FROM stock_movements m
    WHERE m.type = 'CONSUME' AND m.created_at >= (NOW() - INTERVAL '7 days')
    GROUP BY m.item_id
  ) daily ON daily.item_id = i.id
  WHERE i.tenant_id = p_tenant_id;
END;
$$;
