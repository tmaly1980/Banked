-- Bill Categories Table
CREATE TABLE IF NOT EXISTS bill_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, name)
);

ALTER TABLE bill_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own bill categories"
  ON bill_categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bill categories"
  ON bill_categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bill categories"
  ON bill_categories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bill categories"
  ON bill_categories FOR DELETE
  USING (auth.uid() = user_id);

-- Add category_id to bills table
ALTER TABLE bills ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES bill_categories(id) ON DELETE SET NULL;
