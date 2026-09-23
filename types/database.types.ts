export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'INSTRUCTOR' | 'STUDENT'
export type CourseLevel = 'all_levels' | 'beginner' | 'intermediate' | 'expert'
export type CourseStatus = 'draft' | 'submitted' | 'in_review' | 'revision_required' | 'approved' | 'published' | 'rejected' | 'unpublished'
export type OrderStatus = 'pending' | 'paid' | 'failed' | 'cancelled'
export type EnrollmentStatus = 'active' | 'expired' | 'revoked'
export type QuestionType = 'single_choice' | 'multiple_choice' | 'true_false'
export type VoucherType = 'fixed' | 'percentage'
export type AffiliateStatus = 'pending' | 'approved' | 'paid'
export type WithdrawalStatus = 'pending' | 'approved' | 'rejected'

export interface Profile {
  id: string
  name: string
  email: string
  whatsapp_number?: string | null
  avatar_url?: string | null
  headline?: string | null
  bio?: string | null
  role: UserRole
  created_at: string
  updated_at: string
}

export interface Category {
  id: number
  parent_id?: number | null
  name: string
  slug: string
  description?: string | null
  image_url?: string | null
  sort_order: number
  is_active: boolean
  courses_count?: number
  created_at: string
  updated_at: string
}

export interface Course {
  id: number
  instructor_id: string
  category_id: number
  title: string
  slug: string
  subtitle?: string | null
  description?: string | null
  thumbnail_url?: string | null
  preview_video_id?: string | null
  level: CourseLevel
  language: string
  price: number
  discount_price?: number | null
  learning_objectives?: string[] | null
  requirements?: string[] | null
  target_audience?: string[] | null
  whatsapp_group_url?: string | null
  whatsapp_contact_url?: string | null
  telegram_url?: string | null
  custom_commission_rate?: number | null
  status: CourseStatus
  moderation_notes?: string | null
  published_at?: string | null
  created_at: string
  updated_at: string
  category?: Category
  instructor?: Profile
  sections?: CourseSection[]
  reviews_count?: number
  rating_avg?: number
}

export interface CourseSection {
  id: number
  course_id: number
  title: string
  description?: string | null
  sort_order: number
  lessons?: Lesson[]
  quizzes?: Quiz[]
  created_at: string
  updated_at: string
}

export interface Lesson {
  id: number
  section_id: number
  title: string
  slug: string
  description?: string | null
  youtube_video_id: string
  duration_seconds: number
  sort_order: number
  is_preview: boolean
  is_active: boolean
  is_completed?: boolean
  created_at: string
  updated_at: string
}

export interface Quiz {
  id: number
  section_id: number
  title: string
  slug: string
  description?: string | null
  passing_score: number
  time_limit_minutes: number
  max_attempts: number
  sort_order: number
  is_active: boolean
  questions?: QuizQuestion[]
  created_at: string
  updated_at: string
}

export interface QuizQuestion {
  id: number
  quiz_id: number
  question_text: string
  explanation?: string | null
  question_type: QuestionType
  points: number
  sort_order: number
  media_type?: string | null
  media_url?: string | null
  options?: QuizOption[]
  created_at: string
  updated_at: string
}

export interface QuizOption {
  id: number
  question_id: number
  option_text: string
  is_correct: boolean
  sort_order: number
  media_url?: string | null
  created_at: string
  updated_at: string
}

export interface Voucher {
  id: number
  code: string
  name: string
  type: VoucherType
  discount_amount: number
  min_order_amount: number
  max_discount_amount?: number | null
  usage_limit?: number | null
  used_count: number
  expires_at?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Order {
  id: number
  order_number: string
  user_id: string
  customer_whatsapp?: string | null
  affiliate_user_id?: string | null
  total_amount: number
  discount_amount: number
  final_amount: number
  voucher_code?: string | null
  voucher_discount_amount: number
  status: OrderStatus
  payment_method: string
  payment_gateway_ref?: string | null
  payment_proof_url?: string | null
  paid_at?: string | null
  created_at: string
  updated_at: string
  order_items?: OrderItem[]
  user?: Profile
}

export interface OrderItem {
  id: number
  order_id: number
  course_id: number
  instructor_id: string
  price: number
  discount_price?: number | null
  final_price: number
  course?: Course
}

export interface Enrollment {
  id: number
  user_id: string
  course_id: number
  order_id?: number | null
  status: EnrollmentStatus
  enrolled_at: string
  completed_at?: string | null
  course?: Course
}

export interface Certificate {
  id: number
  certificate_code: string
  user_id: string
  course_id: number
  pdf_url?: string | null
  issued_at: string
  course?: Course
  user?: Profile
}
