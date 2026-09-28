-- Run this in your Supabase SQL editor

CREATE TABLE candidates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('PM', 'SPM')),
  cv_text TEXT NOT NULL,

  -- PM scores (criterion 1–4)
  pm_c1_score SMALLINT CHECK (pm_c1_score BETWEEN 1 AND 4),
  pm_c1_reason TEXT,
  pm_c2_score SMALLINT CHECK (pm_c2_score BETWEEN 1 AND 4),
  pm_c2_reason TEXT,
  pm_c3_score SMALLINT CHECK (pm_c3_score BETWEEN 1 AND 4),
  pm_c3_reason TEXT,
  pm_c4_score SMALLINT CHECK (pm_c4_score BETWEEN 1 AND 4),
  pm_c4_reason TEXT,
  pm_total NUMERIC(4,2),
  pm_pass BOOLEAN,
  pm_flag TEXT,

  -- SPM scores
  spm_c1_score SMALLINT CHECK (spm_c1_score BETWEEN 1 AND 4),
  spm_c1_reason TEXT,
  spm_c2_score SMALLINT CHECK (spm_c2_score BETWEEN 1 AND 4),
  spm_c2_reason TEXT,
  spm_c3_score SMALLINT CHECK (spm_c3_score BETWEEN 1 AND 4),
  spm_c3_reason TEXT,
  spm_c4_score SMALLINT CHECK (spm_c4_score BETWEEN 1 AND 4),
  spm_c4_reason TEXT,
  spm_total NUMERIC(4,2),
  spm_pass BOOLEAN,
  spm_flag TEXT,

  -- Generated content
  interview_brief TEXT,
  email_draft TEXT,
  email_sent BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMPTZ,

  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'scoring', 'scored', 'error')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE candidate_pii (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE UNIQUE,
  name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reference table — seeded once
CREATE TABLE rubric_criteria (
  id SERIAL PRIMARY KEY,
  criterion_number SMALLINT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  pm_weight NUMERIC(3,2) NOT NULL,
  spm_weight NUMERIC(3,2) NOT NULL
);

INSERT INTO rubric_criteria (criterion_number, name, pm_weight, spm_weight) VALUES
  (1, 'Unprompted builds, adopted by others', 0.30, 0.25),
  (2, 'Operational ground truth',             0.25, 0.20),
  (3, 'Hard call with personal stakes',       0.25, 0.35),
  (4, 'Loss institutionalised',               0.20, 0.20);
