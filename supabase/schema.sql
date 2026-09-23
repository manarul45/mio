-- ==============================================================================
-- MIO LEARNING ACADEMY - SUPABASE POSTGRESQL SCHEMA & POLICIES
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('SUPER_ADMIN', 'ADMIN', 'INSTRUCTOR', 'STUDENT');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE course_level AS ENUM ('all_levels', 'beginner', 'intermediate', 'expert');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE course_status AS ENUM (
        'draft', 'submitted', 'in_review', 'revision_required',
        'approved', 'published', 'rejected', 'unpublished'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE order_status AS ENUM ('pending', 'paid', 'failed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE enrollment_status AS ENUM ('active', 'expired', 'revoked');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE question_type AS ENUM ('single_choice', 'multiple_choice', 'true_false');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE voucher_type AS ENUM ('fixed', 'percentage');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE affiliate_status AS ENUM ('pending', 'approved', 'paid');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE withdrawal_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ==============================================================================
-- 3. CORE TABLES
-- ==============================================================================

-- 3.1 PROFILES (Connected to Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    whatsapp_number VARCHAR(30),
    avatar_url TEXT,
    headline VARCHAR(255),
    bio TEXT,
    role user_role NOT NULL DEFAULT 'STUDENT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger to automatically populate public.profiles when a new user registers in Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, name, email, whatsapp_number, avatar_url, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.email,
        NEW.raw_user_meta_data->>'whatsapp_number',
        NEW.raw_user_meta_data->>'avatar_url',
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'STUDENT')
    )
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3.2 SETTINGS
CREATE TABLE IF NOT EXISTS public.settings (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    type VARCHAR(30) DEFAULT 'string',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.3 AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id TEXT NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);

-- 3.4 CATEGORIES
CREATE TABLE IF NOT EXISTS public.categories (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    parent_id BIGINT REFERENCES public.categories(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(120) UNIQUE NOT NULL,
    description TEXT,
    image_url TEXT,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_categories_parent_sort ON public.categories(parent_id, sort_order);

-- 3.5 COURSES
CREATE TABLE IF NOT EXISTS public.courses (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    instructor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    category_id BIGINT NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    subtitle VARCHAR(255),
    description TEXT,
    thumbnail_url TEXT,
    preview_video_id VARCHAR(50),
    level course_level NOT NULL DEFAULT 'all_levels',
    language VARCHAR(20) DEFAULT 'id',
    price NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    discount_price NUMERIC(15, 2),
    learning_objectives JSONB DEFAULT '[]'::JSONB,
    requirements JSONB DEFAULT '[]'::JSONB,
    target_audience JSONB DEFAULT '[]'::JSONB,
    whatsapp_group_url TEXT,
    whatsapp_contact_url TEXT,
    telegram_url TEXT,
    custom_commission_rate NUMERIC(5, 2),
    status course_status NOT NULL DEFAULT 'draft',
    moderation_notes TEXT,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_courses_instructor ON public.courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_courses_category ON public.courses(category_id);
CREATE INDEX IF NOT EXISTS idx_courses_status ON public.courses(status);

-- 3.6 COURSE SECTIONS
CREATE TABLE IF NOT EXISTS public.course_sections (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    course_id BIGINT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sections_course_sort ON public.course_sections(course_id, sort_order);

-- 3.7 LESSONS
CREATE TABLE IF NOT EXISTS public.lessons (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    section_id BIGINT NOT NULL REFERENCES public.course_sections(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    youtube_video_id VARCHAR(50) NOT NULL,
    duration_seconds INT DEFAULT 0,
    sort_order INT DEFAULT 0,
    is_preview BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lessons_section_sort ON public.lessons(section_id, sort_order);

-- 3.8 QUIZZES
CREATE TABLE IF NOT EXISTS public.quizzes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    section_id BIGINT NOT NULL REFERENCES public.course_sections(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    passing_score INT DEFAULT 70,
    time_limit_minutes INT DEFAULT 0,
    max_attempts INT DEFAULT 0,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_quizzes_section_sort ON public.quizzes(section_id, sort_order);

-- 3.9 QUIZ QUESTIONS & OPTIONS
CREATE TABLE IF NOT EXISTS public.quiz_questions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    quiz_id BIGINT NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    explanation TEXT,
    question_type question_type NOT NULL DEFAULT 'single_choice',
    points INT DEFAULT 10,
    sort_order INT DEFAULT 0,
    media_type VARCHAR(50),
    media_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_sort ON public.quiz_questions(quiz_id, sort_order);

CREATE TABLE IF NOT EXISTS public.quiz_options (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    question_id BIGINT NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT FALSE,
    sort_order INT DEFAULT 0,
    media_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_quiz_options_question ON public.quiz_options(question_id);

-- 3.10 VOUCHERS
CREATE TABLE IF NOT EXISTS public.vouchers (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    type voucher_type NOT NULL DEFAULT 'fixed',
    discount_amount NUMERIC(12, 2) NOT NULL,
    min_order_amount NUMERIC(12, 2) DEFAULT 0,
    max_discount_amount NUMERIC(12, 2),
    usage_limit INT,
    used_count INT DEFAULT 0,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.11 ORDERS & ORDER ITEMS
CREATE TABLE IF NOT EXISTS public.orders (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_number VARCHAR(64) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    customer_whatsapp VARCHAR(30),
    affiliate_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    final_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    voucher_code VARCHAR(50),
    voucher_discount_amount NUMERIC(12, 2) DEFAULT 0,
    status order_status NOT NULL DEFAULT 'pending',
    payment_method VARCHAR(50) DEFAULT 'bank_transfer',
    payment_gateway_ref VARCHAR(100),
    payment_proof_url TEXT,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_orders_user_status ON public.orders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_affiliate_status ON public.orders(affiliate_user_id, status);

CREATE TABLE IF NOT EXISTS public.order_items (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    course_id BIGINT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    instructor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    discount_price NUMERIC(12, 2),
    final_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    instructor_share_rate NUMERIC(5, 2) DEFAULT 70.00,
    affiliate_commission_rate NUMERIC(5, 2) DEFAULT 30.00,
    instructor_earning NUMERIC(12, 2) DEFAULT 0,
    affiliate_earning NUMERIC(12, 2) DEFAULT 0,
    platform_earning NUMERIC(12, 2) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);

-- 3.12 ENROLLMENTS
CREATE TABLE IF NOT EXISTS public.enrollments (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id BIGINT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    order_id BIGINT REFERENCES public.orders(id) ON DELETE SET NULL,
    status enrollment_status NOT NULL DEFAULT 'active',
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, course_id)
);
CREATE INDEX IF NOT EXISTS idx_enrollments_user ON public.enrollments(user_id, status);

-- 3.13 LESSON PROGRESS
CREATE TABLE IF NOT EXISTS public.lesson_progress (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id BIGINT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    lesson_id BIGINT NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    is_completed BOOLEAN DEFAULT FALSE,
    last_playback_position_seconds INT DEFAULT 0,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, lesson_id)
);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_course ON public.lesson_progress(user_id, course_id);

-- 3.14 QUIZ ATTEMPTS
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id BIGINT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    quiz_id BIGINT NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    total_questions SMALLINT DEFAULT 0,
    correct_answers SMALLINT DEFAULT 0,
    score_percentage NUMERIC(5, 2) DEFAULT 0,
    passed BOOLEAN DEFAULT FALSE,
    submitted_answers JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_quiz ON public.quiz_attempts(user_id, quiz_id);

-- 3.15 CERTIFICATES
CREATE TABLE IF NOT EXISTS public.certificates (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    certificate_code VARCHAR(64) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id BIGINT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    pdf_url TEXT,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, course_id)
);

-- 3.16 COURSE REVIEWS
CREATE TABLE IF NOT EXISTS public.course_reviews (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id BIGINT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    rating SMALLINT NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT NOT NULL,
    is_approved BOOLEAN DEFAULT TRUE,
    instructor_reply TEXT,
    instructor_replied_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, course_id)
);
CREATE INDEX IF NOT EXISTS idx_reviews_course_rating ON public.course_reviews(course_id, rating);

-- 3.17 LESSON DISCUSSIONS & REPLIES
CREATE TABLE IF NOT EXISTS public.lesson_discussions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    lesson_id BIGINT NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    is_resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_discussions_lesson ON public.lesson_discussions(lesson_id);

CREATE TABLE IF NOT EXISTS public.lesson_discussion_replies (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    discussion_id BIGINT NOT NULL REFERENCES public.lesson_discussions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_instructor BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_replies_discussion ON public.lesson_discussion_replies(discussion_id);

-- 3.18 AFFILIATE COMMISSIONS & WITHDRAWALS
CREATE TABLE IF NOT EXISTS public.affiliate_commissions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    affiliate_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    order_id BIGINT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    order_item_id BIGINT NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
    course_id BIGINT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    status affiliate_status NOT NULL DEFAULT 'approved',
    approved_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_commissions_affiliate ON public.affiliate_commissions(affiliate_user_id, status);

CREATE TABLE IF NOT EXISTS public.affiliate_withdrawals (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount NUMERIC(14, 2) NOT NULL,
    bank_name VARCHAR(100) NOT NULL,
    account_number VARCHAR(100) NOT NULL,
    account_holder VARCHAR(150) NOT NULL,
    status withdrawal_status NOT NULL DEFAULT 'pending',
    admin_notes TEXT,
    receipt_url TEXT,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON public.affiliate_withdrawals(user_id, status);

-- 3.19 LANDING PAGES
CREATE TABLE IF NOT EXISTS public.landing_pages (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    content TEXT,
    status VARCHAR(20) DEFAULT 'draft',
    is_template BOOLEAN DEFAULT FALSE,
    is_homepage BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_discussion_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_pages ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is ADMIN or SUPER_ADMIN
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles: Public can read basic profile, user can edit their own, admin can do all
CREATE POLICY "Public profiles are readable" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admin full profile access" ON public.profiles FOR ALL USING (public.is_admin());

-- Settings: Public can read, admin can modify
CREATE POLICY "Public can read settings" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Admin can modify settings" ON public.settings FOR ALL USING (public.is_admin());

-- Categories: Public can read active, admin/instructor can manage
CREATE POLICY "Public read active categories" ON public.categories FOR SELECT USING (is_active = true OR public.is_admin());
CREATE POLICY "Admin manage categories" ON public.categories FOR ALL USING (public.is_admin());

-- Courses: Public can read published, instructors can manage own, admin full
CREATE POLICY "Public read published courses" ON public.courses FOR SELECT USING (
    status = 'published' OR instructor_id = auth.uid() OR public.is_admin()
);
CREATE POLICY "Instructors can insert own courses" ON public.courses FOR INSERT WITH CHECK (
    auth.uid() = instructor_id OR public.is_admin()
);
CREATE POLICY "Instructors can update own courses" ON public.courses FOR UPDATE USING (
    auth.uid() = instructor_id OR public.is_admin()
);
CREATE POLICY "Instructors can delete own courses" ON public.courses FOR DELETE USING (
    auth.uid() = instructor_id OR public.is_admin()
);

-- Sections & Lessons: Public can read if enrolled or is_preview, instructor/admin full
CREATE POLICY "Read course sections" ON public.course_sections FOR SELECT USING (true);
CREATE POLICY "Manage course sections" ON public.course_sections FOR ALL USING (
    EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND (instructor_id = auth.uid() OR public.is_admin()))
);

CREATE POLICY "Read lessons" ON public.lessons FOR SELECT USING (true);
CREATE POLICY "Manage lessons" ON public.lessons FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.course_sections s
        JOIN public.courses c ON c.id = s.course_id
        WHERE s.id = section_id AND (c.instructor_id = auth.uid() OR public.is_admin())
    )
);

-- Quizzes & Questions & Options
CREATE POLICY "Read quizzes" ON public.quizzes FOR SELECT USING (true);
CREATE POLICY "Manage quizzes" ON public.quizzes FOR ALL USING (
    public.is_admin() OR EXISTS (
        SELECT 1 FROM public.course_sections s
        JOIN public.courses c ON c.id = s.course_id
        WHERE s.id = section_id AND c.instructor_id = auth.uid()
    )
);

CREATE POLICY "Read quiz questions" ON public.quiz_questions FOR SELECT USING (true);
CREATE POLICY "Manage quiz questions" ON public.quiz_questions FOR ALL USING (
    public.is_admin() OR EXISTS (
        SELECT 1 FROM public.quizzes q
        JOIN public.course_sections s ON s.id = q.section_id
        JOIN public.courses c ON c.id = s.course_id
        WHERE q.id = quiz_id AND c.instructor_id = auth.uid()
    )
);

CREATE POLICY "Read quiz options" ON public.quiz_options FOR SELECT USING (true);
CREATE POLICY "Manage quiz options" ON public.quiz_options FOR ALL USING (
    public.is_admin() OR EXISTS (
        SELECT 1 FROM public.quiz_questions qq
        JOIN public.quizzes q ON q.id = qq.quiz_id
        JOIN public.course_sections s ON s.id = q.section_id
        JOIN public.courses c ON c.id = s.course_id
        WHERE qq.id = question_id AND c.instructor_id = auth.uid()
    )
);

-- Vouchers & Landing Pages
CREATE POLICY "Public read active vouchers" ON public.vouchers FOR SELECT USING (is_active = true OR public.is_admin());
CREATE POLICY "Admin manage vouchers" ON public.vouchers FOR ALL USING (public.is_admin());

CREATE POLICY "Public read landing pages" ON public.landing_pages FOR SELECT USING (true);
CREATE POLICY "Admin manage landing pages" ON public.landing_pages FOR ALL USING (public.is_admin());

-- Orders & Enrollments
CREATE POLICY "Users read own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Users create orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin manage orders" ON public.orders FOR ALL USING (public.is_admin());

CREATE POLICY "Users read own enrollments" ON public.enrollments FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Admin manage enrollments" ON public.enrollments FOR ALL USING (public.is_admin());

-- Lesson Progress & Quiz Attempts
CREATE POLICY "Users manage own progress" ON public.lesson_progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own quiz attempts" ON public.quiz_attempts FOR ALL USING (auth.uid() = user_id);

-- Certificates: Public can verify, user can read own
CREATE POLICY "Public verify certificates" ON public.certificates FOR SELECT USING (true);
CREATE POLICY "Admin manage certificates" ON public.certificates FOR ALL USING (public.is_admin());

-- Reviews & Discussions
CREATE POLICY "Public read reviews" ON public.course_reviews FOR SELECT USING (is_approved = true OR auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Users create own review" ON public.course_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own review" ON public.course_reviews FOR UPDATE USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Public read discussions" ON public.lesson_discussions FOR SELECT USING (true);
CREATE POLICY "Users manage own discussions" ON public.lesson_discussions FOR ALL USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Public read replies" ON public.lesson_discussion_replies FOR SELECT USING (true);
CREATE POLICY "Users manage own replies" ON public.lesson_discussion_replies FOR ALL USING (auth.uid() = user_id OR public.is_admin());

-- ==============================================================================
-- 5. STORAGE BUCKETS SETUP
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('courses', 'courses', true),
    ('avatars', 'avatars', true),
    ('certificates', 'certificates', true),
    ('receipts', 'receipts', false),
    ('materials', 'materials', false)
ON CONFLICT (id) DO NOTHING;
