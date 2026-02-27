
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pfoaszhlqggxqsevkcat.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmb2FzemhscWdneHFzZXZrY2F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0NjE1NjAsImV4cCI6MjA2ODAzNzU2MH0.dwq2EBOeO8fT7QqQH0H02JCOJkDX4CvJTIyZWjSk7IQ'
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function test() {
    const { data, error } = await supabase
        .from('bakery_settings')
        .select('*')
        .limit(1)

    if (error) {
        console.log('Error:', error.message)
    } else if (data && data.length > 0) {
        console.log('BAKERY_COLUMNS_START')
        Object.keys(data[0]).forEach(c => console.log(c))
        console.log('BAKERY_COLUMNS_END')
    } else {
        console.log('No bakery settings found.')
    }
}

test()
