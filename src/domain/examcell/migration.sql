-- Exam Cell Tables Migration for College ERP
-- These tables are prefixed with 'ec_' to avoid naming conflicts with Prisma-managed tables
-- Run against the college_erp database

-- 1. Admins (Exam Cell specific admin accounts with granular permissions)
CREATE TABLE IF NOT EXISTS ec_admins (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  can_upload BOOLEAN NOT NULL DEFAULT false,
  can_manage_settings BOOLEAN NOT NULL DEFAULT false,
  can_manage_academics BOOLEAN NOT NULL DEFAULT false,
  can_manage_internal_marks BOOLEAN NOT NULL DEFAULT false,
  can_view_dashboard BOOLEAN NOT NULL DEFAULT true,
  can_view_students BOOLEAN NOT NULL DEFAULT true,
  can_view_reports BOOLEAN NOT NULL DEFAULT true,
  can_freeze_marks BOOLEAN NOT NULL DEFAULT false,
  login_type TEXT NOT NULL DEFAULT 'GLOBAL',
  allowed_ips TEXT NOT NULL DEFAULT ''
);

-- 2. Students
CREATE TABLE IF NOT EXISTS ec_students (
  id SERIAL PRIMARY KEY,
  roll_number TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  branch TEXT NOT NULL,
  batch TEXT NOT NULL,
  regulation TEXT NOT NULL,
  program TEXT,
  section TEXT,
  gender TEXT,
  phone TEXT,
  address TEXT
);

-- 3. Student Academic Status
CREATE TABLE IF NOT EXISTS ec_student_academic_status (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES ec_students(id),
  academic_year TEXT NOT NULL,
  semester TEXT NOT NULL,
  status TEXT NOT NULL,
  reason TEXT DEFAULT '',
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 4. Student Photos
CREATE TABLE IF NOT EXISTS ec_student_photos (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL UNIQUE REFERENCES ec_students(id),
  photo_data TEXT NOT NULL
);

-- 5. Subjects
CREATE TABLE IF NOT EXISTS ec_subjects (
  id SERIAL PRIMARY KEY,
  subject_code TEXT NOT NULL UNIQUE,
  subject_name TEXT NOT NULL,
  credits DOUBLE PRECISION NOT NULL,
  semester TEXT NOT NULL,
  branch TEXT NOT NULL
);

-- 6. Results
CREATE TABLE IF NOT EXISTS ec_results (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES ec_students(id),
  subject_id INTEGER NOT NULL REFERENCES ec_subjects(id),
  semester TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  exam_type TEXT NOT NULL,
  attempt_no INTEGER NOT NULL,
  grade TEXT NOT NULL,
  grade_points INTEGER NOT NULL,
  credits_earned DOUBLE PRECISION NOT NULL,
  internal_marks INTEGER,
  status TEXT NOT NULL,
  is_latest BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ec_unique_result_idx 
  ON ec_results (student_id, subject_id, exam_type, academic_year);

-- 7. Faculty
CREATE TABLE IF NOT EXISTS ec_faculty (
  id SERIAL PRIMARY KEY,
  faculty_name TEXT NOT NULL,
  department TEXT,
  designation TEXT
);

-- 8. Faculty-Subject Mapping
CREATE TABLE IF NOT EXISTS ec_faculty_subject_map (
  id SERIAL PRIMARY KEY,
  faculty_id INTEGER NOT NULL REFERENCES ec_faculty(id),
  subject_code TEXT NOT NULL,
  semester TEXT NOT NULL,
  branch TEXT NOT NULL,
  batch TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  section TEXT
);

-- 9. MID Exams
CREATE TABLE IF NOT EXISTS ec_mid_exams (
  id SERIAL PRIMARY KEY,
  academic_year TEXT NOT NULL,
  semester TEXT NOT NULL,
  branch TEXT NOT NULL,
  batch TEXT NOT NULL DEFAULT '',
  subject_code TEXT NOT NULL,
  mid_type TEXT NOT NULL,
  max_marks INTEGER NOT NULL DEFAULT 30,
  is_frozen BOOLEAN NOT NULL DEFAULT false,
  is_final_locked BOOLEAN NOT NULL DEFAULT false,
  locked_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 10. MID Marks
CREATE TABLE IF NOT EXISTS ec_mid_marks (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES ec_students(id),
  mid_exam_id INTEGER NOT NULL REFERENCES ec_mid_exams(id),
  mid_exam_marks DOUBLE PRECISION NOT NULL DEFAULT 0,
  assignment_marks DOUBLE PRECISION NOT NULL DEFAULT 0,
  quiz_marks DOUBLE PRECISION NOT NULL DEFAULT 0,
  total_marks DOUBLE PRECISION NOT NULL DEFAULT 0,
  lab_daily_marks DOUBLE PRECISION NOT NULL DEFAULT 0,
  lab_record_marks DOUBLE PRECISION NOT NULL DEFAULT 0,
  lab_internal_marks DOUBLE PRECISION NOT NULL DEFAULT 0,
  lab_viva_marks DOUBLE PRECISION NOT NULL DEFAULT 0,
  prc_assessment_marks DOUBLE PRECISION NOT NULL DEFAULT 0,
  report_marks DOUBLE PRECISION NOT NULL DEFAULT 0,
  seminar_marks DOUBLE PRECISION NOT NULL DEFAULT 0,
  entered_by INTEGER NOT NULL REFERENCES ec_admins(id),
  is_locked BOOLEAN NOT NULL DEFAULT false,
  locked_at TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ec_unique_mid_mark_idx 
  ON ec_mid_marks (student_id, mid_exam_id);

-- 11. Audit Logs
CREATE TABLE IF NOT EXISTS ec_audit_logs (
  id SERIAL PRIMARY KEY,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id INTEGER NOT NULL,
  performed_by INTEGER NOT NULL REFERENCES ec_admins(id),
  reason TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 12. Global Settings
CREATE TABLE IF NOT EXISTS ec_global_settings (
  id SERIAL PRIMARY KEY,
  auto_lock_on_save BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Seed default global settings
INSERT INTO ec_global_settings (auto_lock_on_save) 
  SELECT false WHERE NOT EXISTS (SELECT 1 FROM ec_global_settings);

-- Seed default admin
INSERT INTO ec_admins (username, password, is_admin, can_upload, can_manage_settings, can_manage_academics, can_manage_internal_marks, can_view_dashboard, can_view_students, can_view_reports, can_freeze_marks)
  SELECT 'admin', '$2b$10$PJSx.3nMqzBWAq1J8x9Vy.rZUhREuQCx6N7TW3bZ7l75E2oQlVKC', true, true, true, true, true, true, true, true, true
  WHERE NOT EXISTS (SELECT 1 FROM ec_admins WHERE username = 'admin');
