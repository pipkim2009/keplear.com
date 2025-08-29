import { createClient } from '@supabase/supabase-js'

// Use service role key for admin operations
const supabaseUrl = 'https://mfcszvnhsjwfptcjgzyn.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mY3N6dm5oc2p3ZnB0Y2pnenluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjQ3NDk4NCwiZXhwIjoyMDcyMDUwOTg0fQ.xHuwOtyNzR_xx9Oce9nRuHUSr44RdFuNlb1NDL2B9nY'

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export const setupDatabase = async () => {
  try {
    console.log('Setting up database tables and policies...')

    // Create profiles table
    const { error: createTableError } = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        -- Create profiles table
        CREATE TABLE IF NOT EXISTS public.profiles (
          id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
          email TEXT NOT NULL,
          full_name TEXT,
          username TEXT UNIQUE,
          avatar_url TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          PRIMARY KEY (id)
        );

        -- Enable RLS on profiles table
        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

        -- Create RLS policies
        DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
        CREATE POLICY "Users can view own profile" 
          ON public.profiles FOR SELECT 
          USING (auth.uid() = id);

        DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
        CREATE POLICY "Users can update own profile" 
          ON public.profiles FOR UPDATE 
          USING (auth.uid() = id);

        DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
        CREATE POLICY "Users can insert own profile" 
          ON public.profiles FOR INSERT 
          WITH CHECK (auth.uid() = id);

        -- Create function to handle new user signups
        CREATE OR REPLACE FUNCTION public.handle_new_user()
        RETURNS TRIGGER AS $$
        BEGIN
          INSERT INTO public.profiles (id, email, full_name)
          VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;

        -- Create trigger for new user signups
        DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
        CREATE TRIGGER on_auth_user_created
          AFTER INSERT ON auth.users
          FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

        -- Create function to update updated_at timestamp
        CREATE OR REPLACE FUNCTION public.update_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        -- Create trigger to automatically update updated_at
        DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
        CREATE TRIGGER update_profiles_updated_at
          BEFORE UPDATE ON public.profiles
          FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
      `
    })

    if (createTableError) {
      throw createTableError
    }

    console.log('✅ Database setup completed successfully!')
    return { success: true }

  } catch (error) {
    console.error('❌ Database setup failed:', error)
    return { success: false, error }
  }
}

// Run setup if called directly
if (typeof window === 'undefined') {
  setupDatabase()
}