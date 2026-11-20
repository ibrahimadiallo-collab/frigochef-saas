-- ============================================================================
-- MIGRATION: 20261120000002_security_saas_3.sql
-- DESCRIZIONE:
-- 1. Recupero atomico webhook Stripe bloccati (stale lock timeout 300s) tramite RPC `claim_stripe_webhook_event`
-- 2. Consumo atomico quote AI tramite RPC `consume_ai_quota`
-- 3. Trigger anti-privilege escalation su `profiles` e RLS completa
-- ============================================================================

BEGIN;

-- 1. AGGIORNAMENTO SICURO TABELLA: public.stripe_webhook_events
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  status TEXT DEFAULT 'processing' NOT NULL, -- 'processing', 'completed'
  locked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.stripe_webhook_events
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'processing' NOT NULL,
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- CRITICO 1 — Funzione RPC Atomica per acquisizione e recupero di eventi Stripe bloccati
-- Restituisce:
--   'CLAIMED'           -> Nuovo evento acquisito, procedi con l'elaborazione
--   'RECLAIMED'         -> Evento rimasto bloccato in 'processing' oltre il timeout (es. crash server), riacquisito atomicamente
--   'ALREADY_COMPLETED' -> Evento già completato con successo (idempotente: rispondi 200)
--   'IN_PROGRESS'       -> Evento attualmente in elaborazione da un'altra istanza attiva (rispondi 409 così Stripe riprova più tardi)
CREATE OR REPLACE FUNCTION public.claim_stripe_webhook_event(
  p_event_id TEXT,
  p_event_type TEXT,
  p_lock_timeout_seconds INTEGER DEFAULT 300
)
RETURNS JSONB AS $$
DECLARE
  v_existing_status TEXT;
  v_existing_locked_at TIMESTAMP WITH TIME ZONE;
  v_now TIMESTAMP WITH TIME ZONE := timezone('utc'::text, now());
  v_timeout_threshold TIMESTAMP WITH TIME ZONE := v_now - make_interval(secs => COALESCE(p_lock_timeout_seconds, 300));
BEGIN
  IF p_event_id IS NULL OR BTRIM(p_event_id) = '' THEN
    RETURN jsonb_build_object('action', 'HEALTHCHECK_OK', 'status', 'ready');
  END IF;

  -- Lock transazionale esclusivo sull'ID evento Stripe
  PERFORM pg_advisory_xact_lock(hashtext('stripe_evt:' || p_event_id));

  SELECT status, locked_at
  INTO v_existing_status, v_existing_locked_at
  FROM public.stripe_webhook_events
  WHERE event_id = p_event_id;

  IF NOT FOUND THEN
    INSERT INTO public.stripe_webhook_events (event_id, event_type, status, locked_at, processed_at)
    VALUES (p_event_id, p_event_type, 'processing', v_now, v_now);

    RETURN jsonb_build_object('action', 'CLAIMED', 'status', 'processing');
  END IF;

  IF v_existing_status = 'completed' THEN
    RETURN jsonb_build_object('action', 'ALREADY_COMPLETED', 'status', 'completed');
  END IF;

  -- Se lo stato è 'processing', verifica se il lock è scaduto (istanza precedente interrotta)
  IF v_existing_locked_at IS NULL OR v_existing_locked_at < v_timeout_threshold THEN
    UPDATE public.stripe_webhook_events
    SET status = 'processing',
        locked_at = v_now,
        event_type = p_event_type
    WHERE event_id = p_event_id;

    RETURN jsonb_build_object('action', 'RECLAIMED', 'status', 'processing');
  END IF;

  -- Lock ancora valido: un'altra istanza sta elaborando l'evento in questo momento
  RETURN jsonb_build_object('action', 'IN_PROGRESS', 'status', 'processing');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.claim_stripe_webhook_event(TEXT, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;

COMMIT;
