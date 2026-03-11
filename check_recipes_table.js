
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pfoaszhlqggxqsevkcat.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmb2FzemhscWdneHFzZXZrY2F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0NjE1NjAsImV4cCI6MjA2ODAzNzU2MH0.dwq2EBOeO8fT7QqQH0H02JCOJkDX4CvJTIyZWjSk7IQ'
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function test() {
    const { data, error } = await supabase
        .from('receitas')
        .select('*')
        .limit(1)

    if (error) {
        if (error.code === 'PGRST116' || error.message.includes('not found')) {
            console.log('TABLE_EXISTS: FALSE')
        } else {
            console.log('Error:', error.message)
            console.log('Error Code:', error.code)
        }
    } else {
        console.log('TABLE_EXISTS: TRUE')
        if (data && data.length > 0) {
            console.log('COLUMNS:', Object.keys(data[0]).join(', '))
        }
    }
}

test()
