

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."get_account_balance"("account_id" "uuid") RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    balance DECIMAL(15,2);
BEGIN
    SELECT current_balance INTO balance
    FROM account_balances
    WHERE account_balances.account_id = get_account_balance.account_id;
    
    RETURN COALESCE(balance, 0);
END;
$$;


ALTER FUNCTION "public"."get_account_balance"("account_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_balances_by_type"("acc_type" "text") RETURNS TABLE("account_id" "uuid", "account_code" character varying, "account_name" character varying, "current_balance" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ab.account_id,
        ab.account_code,
        ab.account_name,
        ab.current_balance
    FROM account_balances ab
    WHERE ab.account_type = acc_type
    ORDER BY ab.account_code;
END;
$$;


ALTER FUNCTION "public"."get_balances_by_type"("acc_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_transaction_ids"() RETURNS TABLE("id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT t.id 
    FROM transactions t
    WHERE t.created_by = auth.uid();
END;
$$;


ALTER FUNCTION "public"."get_user_transaction_ids"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
    insert into public.profiles (user_id, full_name)
    values (new.id, new.raw_user_meta_data->>'full_name');
    return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_account_balances"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY account_balances;
END;
$$;


ALTER FUNCTION "public"."refresh_account_balances"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_account_current_balance"("account_uuid" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    calc_balance numeric;
BEGIN
    -- Calculate the actual balance from transactions
    SELECT 
        COALESCE(a.initial_balance, 0) + COALESCE(t.net_amount, 0)
    INTO calc_balance
    FROM accounts a
    LEFT JOIN (
        SELECT 
            te.account_id,
            SUM(COALESCE(te.credit_amount, 0) - COALESCE(te.debit_amount, 0)) as net_amount
        FROM transaction_entries te
        INNER JOIN transactions t ON te.transaction_id = t.id
        WHERE te.account_id = account_uuid
        GROUP BY te.account_id
    ) t ON a.id = t.account_id
    WHERE a.id = account_uuid;
    
    -- Update the account's current_balance
    UPDATE accounts 
    SET 
        current_balance = calc_balance,
        updated_at = NOW()
    WHERE id = account_uuid;
END;
$$;


ALTER FUNCTION "public"."sync_account_current_balance"("account_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_refresh_account_balances"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    PERFORM refresh_account_balances();
    RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."trigger_refresh_account_balances"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_refresh_account_balances_on_account"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Refresh the materialized view after account changes
    PERFORM refresh_account_balances();
    RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."trigger_refresh_account_balances_on_account"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_refresh_account_balances_on_transaction"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    affected_account_id uuid;
BEGIN
    -- Get the affected account ID
    IF TG_TABLE_NAME = 'transaction_entries' THEN
        affected_account_id := COALESCE(NEW.account_id, OLD.account_id);
    END IF;
    
    -- Sync the affected account's current_balance
    IF affected_account_id IS NOT NULL THEN
        PERFORM sync_account_current_balance(affected_account_id);
    END IF;
    
    -- Refresh the materialized view
    PERFORM refresh_account_balances();
    
    RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."trigger_refresh_account_balances_on_transaction"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_can_access_transaction"("transaction_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM transactions 
        WHERE id = transaction_id 
        AND created_by = auth.uid()
    );
END;
$$;


ALTER FUNCTION "public"."user_can_access_transaction"("transaction_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_double_entry"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    total_debits DECIMAL(15,2);
    total_credits DECIMAL(15,2);
    transaction_total DECIMAL(15,2);
BEGIN
    -- Calculate totals for the transaction
    SELECT 
        COALESCE(SUM(debit_amount), 0),
        COALESCE(SUM(credit_amount), 0)
    INTO total_debits, total_credits
    FROM transaction_entries 
    WHERE transaction_id = COALESCE(NEW.transaction_id, OLD.transaction_id);
    
    -- Get the transaction total
    SELECT total_amount INTO transaction_total
    FROM transactions 
    WHERE id = COALESCE(NEW.transaction_id, OLD.transaction_id);
    
    -- Validate double-entry rule
    IF total_debits != total_credits THEN
        RAISE EXCEPTION 'Double-entry rule violated: Debits (%) must equal Credits (%)', 
            total_debits, total_credits;
    END IF;
    
    -- Validate that totals match transaction amount
    IF total_debits != transaction_total THEN
        RAISE EXCEPTION 'Entry totals (%) must equal transaction amount (%)', 
            total_debits, transaction_total;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."validate_double_entry"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "account_name" character varying(255) NOT NULL,
    "account_number" character varying(50) NOT NULL,
    "bank_name" character varying(255) NOT NULL,
    "account_type" character varying(50) NOT NULL,
    "initial_balance" numeric(15,2) DEFAULT 0.00,
    "current_balance" numeric(15,2) DEFAULT 0.00,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid" NOT NULL,
    "account_code" character varying NOT NULL,
    CONSTRAINT "accounts_account_type_check" CHECK ((("account_type")::"text" = ANY ((ARRAY['checking'::character varying, 'savings'::character varying, 'credit'::character varying, 'investment'::character varying, 'loan'::character varying])::"text"[])))
);


ALTER TABLE "public"."accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."transaction_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "transaction_id" "uuid" NOT NULL,
    "account_id" "uuid" NOT NULL,
    "debit_amount" numeric(15,2) DEFAULT 0,
    "credit_amount" numeric(15,2) DEFAULT 0,
    "description" "text",
    "entry_order" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "check_debit_or_credit" CHECK (((("debit_amount" > (0)::numeric) AND ("credit_amount" = (0)::numeric)) OR (("credit_amount" > (0)::numeric) AND ("debit_amount" = (0)::numeric)))),
    CONSTRAINT "transaction_entries_credit_amount_check" CHECK (("credit_amount" >= (0)::numeric)),
    CONSTRAINT "transaction_entries_debit_amount_check" CHECK (("debit_amount" >= (0)::numeric))
);


ALTER TABLE "public"."transaction_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "transaction_number" character varying(50) NOT NULL,
    "transaction_date" "date" NOT NULL,
    "description" "text" NOT NULL,
    "reference" character varying(100),
    "total_amount" numeric(15,2) NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "transactions_total_amount_check" CHECK (("total_amount" > (0)::numeric))
);


ALTER TABLE "public"."transactions" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "public"."account_balances" AS
 SELECT "a"."id" AS "account_id",
    "a"."account_name",
    "a"."account_number",
    "a"."bank_name",
    "a"."account_type",
    "a"."initial_balance",
    "a"."user_id",
    "a"."account_code",
    (COALESCE("a"."initial_balance", (0)::numeric) + COALESCE("t"."net_amount", (0)::numeric)) AS "calculated_balance",
    "a"."current_balance" AS "stored_balance",
        CASE
            WHEN ("abs"((COALESCE("a"."current_balance", (0)::numeric) - (COALESCE("a"."initial_balance", (0)::numeric) + COALESCE("t"."net_amount", (0)::numeric)))) > 0.01) THEN true
            ELSE false
        END AS "has_discrepancy",
    COALESCE("t"."total_debits", (0)::numeric) AS "total_debits",
    COALESCE("t"."total_credits", (0)::numeric) AS "total_credits",
    COALESCE("t"."transaction_count", (0)::bigint) AS "transaction_count",
    "t"."last_transaction_date",
    "a"."is_active",
    "a"."created_at",
    "a"."updated_at",
    "now"() AS "balance_calculated_at"
   FROM ("public"."accounts" "a"
     LEFT JOIN ( SELECT "te"."account_id",
            "sum"((COALESCE("te"."credit_amount", (0)::numeric) - COALESCE("te"."debit_amount", (0)::numeric))) AS "net_amount",
            "sum"(COALESCE("te"."debit_amount", (0)::numeric)) AS "total_debits",
            "sum"(COALESCE("te"."credit_amount", (0)::numeric)) AS "total_credits",
            "count"(*) AS "transaction_count",
            "max"("t_1"."transaction_date") AS "last_transaction_date"
           FROM ("public"."transaction_entries" "te"
             JOIN "public"."transactions" "t_1" ON (("te"."transaction_id" = "t_1"."id")))
          GROUP BY "te"."account_id") "t" ON (("a"."id" = "t"."account_id")))
  WITH NO DATA;


ALTER MATERIALIZED VIEW "public"."account_balances" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "full_name" "text",
    "avatar_url" "text",
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."transaction_details" AS
 SELECT "t"."id" AS "transaction_id",
    "t"."transaction_number",
    "t"."transaction_date",
    "t"."description" AS "transaction_description",
    "t"."reference",
    "t"."total_amount",
    "te"."id" AS "entry_id",
    "a"."id" AS "account_id",
    "te"."debit_amount",
    "te"."credit_amount",
    "te"."description" AS "entry_description",
    "te"."entry_order"
   FROM (("public"."transactions" "t"
     JOIN "public"."transaction_entries" "te" ON (("t"."id" = "te"."transaction_id")))
     JOIN "public"."accounts" "a" ON (("te"."account_id" = "a"."id")))
  ORDER BY "t"."transaction_date" DESC, "t"."transaction_number", "te"."entry_order";


ALTER VIEW "public"."transaction_details" OWNER TO "postgres";


ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_account_code_key" UNIQUE ("account_code");



ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."transaction_entries"
    ADD CONSTRAINT "transaction_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_transaction_number_key" UNIQUE ("transaction_number");



ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "unique_account_per_user" UNIQUE ("user_id", "account_number");



CREATE UNIQUE INDEX "idx_account_balances_account_id" ON "public"."account_balances" USING "btree" ("account_id");



CREATE INDEX "idx_account_balances_discrepancy" ON "public"."account_balances" USING "btree" ("has_discrepancy") WHERE ("has_discrepancy" = true);



CREATE INDEX "idx_account_balances_user_id" ON "public"."account_balances" USING "btree" ("user_id");



CREATE INDEX "idx_accounts_account_type" ON "public"."accounts" USING "btree" ("account_type");



CREATE INDEX "idx_accounts_is_active" ON "public"."accounts" USING "btree" ("is_active");



CREATE INDEX "idx_accounts_user_account_number" ON "public"."accounts" USING "btree" ("user_id", "account_number");



CREATE INDEX "idx_accounts_user_active" ON "public"."accounts" USING "btree" ("user_id", "is_active");



CREATE INDEX "idx_accounts_user_id" ON "public"."accounts" USING "btree" ("user_id");



CREATE INDEX "idx_transaction_entries_account_id" ON "public"."transaction_entries" USING "btree" ("account_id");



CREATE INDEX "idx_transaction_entries_transaction_id" ON "public"."transaction_entries" USING "btree" ("transaction_id");



CREATE INDEX "idx_transactions_date" ON "public"."transactions" USING "btree" ("transaction_date");



CREATE INDEX "idx_transactions_number" ON "public"."transactions" USING "btree" ("transaction_number");



CREATE OR REPLACE TRIGGER "refresh_balances_on_entry_delete" AFTER DELETE ON "public"."transaction_entries" FOR EACH STATEMENT EXECUTE FUNCTION "public"."trigger_refresh_account_balances"();



CREATE OR REPLACE TRIGGER "refresh_balances_on_entry_insert" AFTER INSERT ON "public"."transaction_entries" FOR EACH STATEMENT EXECUTE FUNCTION "public"."trigger_refresh_account_balances"();



CREATE OR REPLACE TRIGGER "refresh_balances_on_entry_update" AFTER UPDATE ON "public"."transaction_entries" FOR EACH STATEMENT EXECUTE FUNCTION "public"."trigger_refresh_account_balances"();



CREATE OR REPLACE TRIGGER "refresh_balances_on_transaction_delete" AFTER DELETE ON "public"."transactions" FOR EACH STATEMENT EXECUTE FUNCTION "public"."trigger_refresh_account_balances"();



CREATE OR REPLACE TRIGGER "refresh_balances_on_transaction_insert" AFTER INSERT ON "public"."transactions" FOR EACH STATEMENT EXECUTE FUNCTION "public"."trigger_refresh_account_balances"();



CREATE OR REPLACE TRIGGER "refresh_balances_on_transaction_update" AFTER UPDATE ON "public"."transactions" FOR EACH STATEMENT EXECUTE FUNCTION "public"."trigger_refresh_account_balances"();



CREATE OR REPLACE TRIGGER "trigger_account_balances_on_account_insert" AFTER INSERT ON "public"."accounts" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_refresh_account_balances_on_account"();



CREATE OR REPLACE TRIGGER "trigger_account_balances_on_account_update" AFTER UPDATE ON "public"."accounts" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_refresh_account_balances_on_account"();



CREATE OR REPLACE TRIGGER "trigger_account_balances_on_entry_delete" AFTER DELETE ON "public"."transaction_entries" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_refresh_account_balances_on_transaction"();



CREATE OR REPLACE TRIGGER "trigger_account_balances_on_entry_insert" AFTER INSERT ON "public"."transaction_entries" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_refresh_account_balances_on_transaction"();



CREATE OR REPLACE TRIGGER "trigger_account_balances_on_entry_update" AFTER UPDATE ON "public"."transaction_entries" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_refresh_account_balances_on_transaction"();



CREATE OR REPLACE TRIGGER "trigger_account_balances_on_transaction_delete" AFTER DELETE ON "public"."transactions" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_refresh_account_balances_on_transaction"();



CREATE OR REPLACE TRIGGER "trigger_account_balances_on_transaction_insert" AFTER INSERT ON "public"."transactions" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_refresh_account_balances_on_transaction"();



CREATE OR REPLACE TRIGGER "trigger_account_balances_on_transaction_update" AFTER UPDATE ON "public"."transactions" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_refresh_account_balances_on_transaction"();



CREATE OR REPLACE TRIGGER "trigger_transactions_updated_at" BEFORE UPDATE ON "public"."transactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trigger_validate_double_entry_delete" AFTER DELETE ON "public"."transaction_entries" FOR EACH ROW EXECUTE FUNCTION "public"."validate_double_entry"();



CREATE OR REPLACE TRIGGER "trigger_validate_double_entry_insert" AFTER INSERT ON "public"."transaction_entries" FOR EACH ROW EXECUTE FUNCTION "public"."validate_double_entry"();



CREATE OR REPLACE TRIGGER "trigger_validate_double_entry_update" AFTER UPDATE ON "public"."transaction_entries" FOR EACH ROW EXECUTE FUNCTION "public"."validate_double_entry"();



CREATE OR REPLACE TRIGGER "update_accounts_updated_at" BEFORE UPDATE ON "public"."accounts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transaction_entries"
    ADD CONSTRAINT "transaction_entries_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id");



ALTER TABLE ONLY "public"."transaction_entries"
    ADD CONSTRAINT "transaction_entries_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE CASCADE;



CREATE POLICY "Public profiles are viewable by everyone." ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Users can delete own accounts" ON "public"."accounts" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own transaction entries" ON "public"."transaction_entries" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."transactions"
  WHERE (("transactions"."id" = "transaction_entries"."transaction_id") AND ("transactions"."created_by" = "auth"."uid"())))));



CREATE POLICY "Users can delete own transactions" ON "public"."transactions" FOR DELETE USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can delete their own accounts" ON "public"."accounts" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own accounts" ON "public"."accounts" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own transaction entries" ON "public"."transaction_entries" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."transactions"
  WHERE (("transactions"."id" = "transaction_entries"."transaction_id") AND ("transactions"."created_by" = "auth"."uid"())))));



CREATE POLICY "Users can insert own transactions" ON "public"."transactions" FOR INSERT WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can insert their own accounts" ON "public"."accounts" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own profile." ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own accounts" ON "public"."accounts" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own profile." ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own transaction entries" ON "public"."transaction_entries" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."transactions"
  WHERE (("transactions"."id" = "transaction_entries"."transaction_id") AND ("transactions"."created_by" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."transactions"
  WHERE (("transactions"."id" = "transaction_entries"."transaction_id") AND ("transactions"."created_by" = "auth"."uid"())))));



CREATE POLICY "Users can update own transactions" ON "public"."transactions" FOR UPDATE USING (("auth"."uid"() = "created_by")) WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can update their own accounts" ON "public"."accounts" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own accounts" ON "public"."accounts" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own transaction entries" ON "public"."transaction_entries" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."transactions"
  WHERE (("transactions"."id" = "transaction_entries"."transaction_id") AND ("transactions"."created_by" = "auth"."uid"())))));



CREATE POLICY "Users can view own transactions" ON "public"."transactions" FOR SELECT USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can view their own accounts" ON "public"."accounts" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."accounts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."transaction_entries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."transactions" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."get_account_balance"("account_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_account_balance"("account_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_account_balance"("account_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_balances_by_type"("acc_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_balances_by_type"("acc_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_balances_by_type"("acc_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_transaction_ids"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_transaction_ids"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_transaction_ids"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_account_balances"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_account_balances"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_account_balances"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_account_current_balance"("account_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."sync_account_current_balance"("account_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_account_current_balance"("account_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_refresh_account_balances"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_refresh_account_balances"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_refresh_account_balances"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_refresh_account_balances_on_account"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_refresh_account_balances_on_account"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_refresh_account_balances_on_account"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_refresh_account_balances_on_transaction"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_refresh_account_balances_on_transaction"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_refresh_account_balances_on_transaction"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."user_can_access_transaction"("transaction_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_can_access_transaction"("transaction_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_can_access_transaction"("transaction_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_double_entry"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_double_entry"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_double_entry"() TO "service_role";


















GRANT ALL ON TABLE "public"."accounts" TO "anon";
GRANT ALL ON TABLE "public"."accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."accounts" TO "service_role";



GRANT ALL ON TABLE "public"."transaction_entries" TO "anon";
GRANT ALL ON TABLE "public"."transaction_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."transaction_entries" TO "service_role";



GRANT ALL ON TABLE "public"."transactions" TO "anon";
GRANT ALL ON TABLE "public"."transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."transactions" TO "service_role";



GRANT ALL ON TABLE "public"."account_balances" TO "anon";
GRANT ALL ON TABLE "public"."account_balances" TO "authenticated";
GRANT ALL ON TABLE "public"."account_balances" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."transaction_details" TO "anon";
GRANT ALL ON TABLE "public"."transaction_details" TO "authenticated";
GRANT ALL ON TABLE "public"."transaction_details" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























RESET ALL;
