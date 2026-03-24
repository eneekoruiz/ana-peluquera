
-- Services table with i18n and sandwich booking phases
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  label_es TEXT NOT NULL,
  label_en TEXT NOT NULL,
  label_eu TEXT NOT NULL,
  description_es TEXT DEFAULT '',
  description_en TEXT DEFAULT '',
  description_eu TEXT DEFAULT '',
  category TEXT NOT NULL,
  duration_min INTEGER NOT NULL,
  price_cents INTEGER,
  price_from BOOLEAN DEFAULT false,
  phase1_min INTEGER,
  phase2_min INTEGER,
  phase3_min INTEGER,
  icon_name TEXT NOT NULL DEFAULT 'scissors',
  visible BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Bookings table with sandwich phase support
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  client_email TEXT DEFAULT '',
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  current_phase TEXT DEFAULT 'active',
  phase2_released BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'confirmed',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Gallery table
CREATE TABLE public.gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  image_url TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  visible BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Admin settings (singleton row)
CREATE TABLE public.admin_settings (
  id TEXT PRIMARY KEY DEFAULT 'main',
  bookings_enabled BOOLEAN DEFAULT true,
  today_closed BOOLEAN DEFAULT false,
  today_closed_date DATE,
  vacation_start DATE,
  vacation_end DATE,
  about_text_es TEXT DEFAULT '',
  about_text_en TEXT DEFAULT '',
  about_text_eu TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Storage bucket for gallery images
INSERT INTO storage.buckets (id, name, public) VALUES ('gallery', 'gallery', true);

-- RLS
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Services: public read visible, auth manage all
CREATE POLICY "Anyone can view visible services" ON public.services FOR SELECT USING (visible = true);
CREATE POLICY "Auth can view all services" ON public.services FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth can insert services" ON public.services FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth can update services" ON public.services FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth can delete services" ON public.services FOR DELETE TO authenticated USING (true);

-- Bookings: public insert + view, auth manage
CREATE POLICY "Anyone can create bookings" ON public.bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view bookings" ON public.bookings FOR SELECT USING (true);
CREATE POLICY "Auth can update bookings" ON public.bookings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth can delete bookings" ON public.bookings FOR DELETE TO authenticated USING (true);

-- Gallery: public read visible, auth manage
CREATE POLICY "Anyone can view visible gallery" ON public.gallery FOR SELECT USING (visible = true);
CREATE POLICY "Auth can manage gallery" ON public.gallery FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Admin settings: public read, auth update
CREATE POLICY "Anyone can read settings" ON public.admin_settings FOR SELECT USING (true);
CREATE POLICY "Auth can update settings" ON public.admin_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth can insert settings" ON public.admin_settings FOR INSERT TO authenticated WITH CHECK (true);

-- Storage policies for gallery bucket
CREATE POLICY "Anyone can view gallery images" ON storage.objects FOR SELECT USING (bucket_id = 'gallery');
CREATE POLICY "Auth can upload gallery images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'gallery');
CREATE POLICY "Auth can update gallery images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'gallery');
CREATE POLICY "Auth can delete gallery images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'gallery');

-- Seed admin settings
INSERT INTO public.admin_settings (id, bookings_enabled, about_text_es, about_text_en, about_text_eu) VALUES (
  'main', true,
  'Con más de 15 años de experiencia en el cuidado del cabello, Ana fundó AG Beauty Salon con una visión clara: crear un espacio donde cada clienta se sienta especial. Aquí no hay prisas — cada cita es un momento dedicado exclusivamente a ti.',
  'With over 15 years of experience in hair care, Ana founded AG Beauty Salon with a clear vision: creating a space where every client feels special. There are no rushes here — each appointment is a moment dedicated exclusively to you.',
  'Ile-zainketan 15 urte baino gehiagoko esperientziarekin, Anak AG Beauty Salon sortu zuen ikuspegi argi batekin: bezero bakoitza berezia sentitzen den espazio bat sortzea. Hemen ez dago presarik — hitzordu bakoitza zurei soilik eskainitako unea da.'
);

-- Seed services with i18n and prices
INSERT INTO public.services (slug, label_es, label_en, label_eu, description_es, description_en, description_eu, category, duration_min, price_cents, price_from, phase1_min, phase2_min, phase3_min, icon_name, sort_order) VALUES
('corte', 'Corte', 'Haircut', 'Mozketa', 'Corte personalizado adaptado a tu estilo y tipo de cabello', 'Personalized cut adapted to your style and hair type', 'Zure estilo eta ile-motara egokitutako mozketa pertsonalizatua', 'peluqueria', 30, 2500, true, NULL, NULL, NULL, 'scissors', 1),
('color', 'Coloración', 'Hair Color', 'Kolorazioa', 'Color profesional con productos de alta gama para un resultado natural', 'Professional color with premium products for a natural result', 'Goi-mailako produktuekin kolore profesionala emaitza naturalerako', 'peluqueria', 90, 4500, true, NULL, NULL, NULL, 'palette', 2),
('mechas', 'Mechas & Balayage', 'Highlights & Balayage', 'Metxak eta Balayage', 'Técnicas de iluminación para un look radiante y multidimensional', 'Highlighting techniques for a radiant, multidimensional look', 'Argiztapen teknikak itxura distiratsua eta multidimentsionalerako', 'peluqueria', 120, 6000, true, 30, 45, 30, 'sparkles', 3),
('peinado', 'Peinado', 'Styling', 'Orrazkera', 'Peinados para eventos especiales, bodas y celebraciones', 'Styling for special events, weddings and celebrations', 'Ekitaldi berezi, ezkontza eta ospakizunetarako orrazkerak', 'peluqueria', 45, 3000, false, NULL, NULL, NULL, 'paintbrush', 4),
('tratamiento', 'Tratamiento Capilar', 'Hair Treatment', 'Ile Tratamendua', 'Tratamientos reparadores con keratina y aceites esenciales', 'Repairing treatments with keratin and essential oils', 'Keratina eta olio esentzialekin tratamendu konpontzaileak', 'peluqueria', 60, 3500, true, NULL, NULL, NULL, 'droplets', 5),
('barba', 'Barba & Perfilado', 'Beard Trim', 'Bizarra eta Profilatzea', 'Recorte, perfilado y cuidado profesional de barba', 'Professional beard trim, shaping and care', 'Bizarraren mozketa, profilatzea eta zaintza profesionala', 'peluqueria', 20, 1500, false, NULL, NULL, NULL, 'circle-dot', 6),
('masaje-relajante', 'Masaje Relajante', 'Relaxing Massage', 'Masaje Lasaigarria', 'Masaje corporal descontracturante con aceites esenciales', 'Full body relaxing massage with essential oils', 'Gorputz masaje lasaigarria olio esentzialekin', 'masajes', 60, 4000, false, NULL, NULL, NULL, 'hand', 7),
('masaje-facial', 'Tratamiento Facial', 'Facial Treatment', 'Aurpegi Tratamendua', 'Limpieza profunda e hidratación con productos naturales', 'Deep cleansing and hydration with natural products', 'Garbiketa sakona eta hidratazioa produktu naturalekin', 'masajes', 45, 3500, false, NULL, NULL, NULL, 'flower-2', 8),
('masaje-craneal', 'Masaje Craneal', 'Cranial Massage', 'Buru Masajea', 'Técnica relajante para aliviar tensión y estrés', 'Relaxing technique to relieve tension and stress', 'Tentsioa eta estresa arintzeko teknika lasaigarria', 'masajes', 30, 2500, false, NULL, NULL, NULL, 'sparkles', 9);
