CREATE TABLE public.blocked_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocked_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  reason text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.blocked_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view blocks" ON public.blocked_slots
  FOR SELECT TO public USING (true);

CREATE POLICY "Auth can manage blocks" ON public.blocked_slots
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO public.admin_settings (id, bookings_enabled, today_closed)
VALUES ('main', true, false)
ON CONFLICT (id) DO NOTHING;