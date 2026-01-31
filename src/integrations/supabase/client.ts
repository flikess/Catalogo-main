import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pfoaszhlqggxqsevkcat.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmb2FzemhscWdneHFzZXZrY2F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0NjE1NjAsImV4cCI6MjA2ODAzNzU2MH0.dwq2EBOeO8fT7QqQH0H02JCOJkDX4CvJTIyZWjSk7IQ'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)