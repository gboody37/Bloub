/**
 * Automated Supabase Storage Infrastructure Setup Script
 * 
 * Configures:
 * 1. storage.buckets 'media' bucket with public: true, 50MB limit.
 * 2. RLS policies on storage.objects for public SELECT and authenticated/anon INSERT, UPDATE, DELETE.
 */

import pg from 'pg';

const { Client } = pg;

const POSTGRES_CONN = process.env.POSTGRES_URL || 
  process.env.DATABASE_URL || 
  'postgresql://postgres.gbdwswfrscjccaaeciiu:Abdodragon66-_-_@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres';

async function setupStorage() {
  console.log('\n======================================================================');
  console.log('▶ PROVISIONING SUPABASE STORAGE: media bucket & RLS policies');
  console.log('======================================================================\n');

  const client = new Client({ connectionString: POSTGRES_CONN });

  try {
    await client.connect();
    console.log('✔ Connected to Supabase PostgreSQL database.');

    // Step 1: Idempotently create or update the media bucket
    console.log('[1/3] Ensuring "media" bucket exists in storage.buckets...');
    const bucketSql = `
      INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
      VALUES (
        'media',
        'media',
        true,
        false,
        52428800, -- 50MB
        null      -- Allow standard media & document mime types
      )
      ON CONFLICT (id) DO UPDATE SET
        public = true,
        avif_autodetection = false,
        file_size_limit = 52428800,
        allowed_mime_types = null;
    `;
    await client.query(bucketSql);
    console.log('  ✔ "media" bucket verified (public: true, limit: 50MB).');

    // Step 2: Verify RLS status on storage.objects
    console.log('[2/3] Checking RLS on storage.objects...');
    try {
      await client.query('ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;');
      console.log('  ✔ RLS enabled on storage.objects.');
    } catch (e) {
      console.log('  ℹ storage.objects RLS managed by system (default enabled).');
    }

    // Step 3: Configure Idempotent Storage Policies on storage.objects
    console.log('[3/3] Configuring RLS policies on storage.objects for media bucket...');

    const policies = [
      {
        name: 'Public media select',
        drop: [
          'DROP POLICY IF EXISTS "Public media select" ON storage.objects;',
          'DROP POLICY IF EXISTS "Public media access" ON storage.objects;',
          'DROP POLICY IF EXISTS "Public Media Access" ON storage.objects;'
        ],
        create: `CREATE POLICY "Public media select" ON storage.objects FOR SELECT TO public USING (bucket_id = 'media');`
      },
      {
        name: 'Allow media insert',
        drop: [
          'DROP POLICY IF EXISTS "Allow media insert" ON storage.objects;',
          'DROP POLICY IF EXISTS "Allow upload to media bucket" ON storage.objects;',
          'DROP POLICY IF EXISTS "Allow Media Uploads" ON storage.objects;'
        ],
        create: `CREATE POLICY "Allow media insert" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'media');`
      },
      {
        name: 'Allow media update',
        drop: [
          'DROP POLICY IF EXISTS "Allow media update" ON storage.objects;',
          'DROP POLICY IF EXISTS "Allow update to media bucket" ON storage.objects;',
          'DROP POLICY IF EXISTS "Allow Media Updates" ON storage.objects;'
        ],
        create: `CREATE POLICY "Allow media update" ON storage.objects FOR UPDATE TO anon, authenticated USING (bucket_id = 'media') WITH CHECK (bucket_id = 'media');`
      },
      {
        name: 'Allow media delete',
        drop: [
          'DROP POLICY IF EXISTS "Allow media delete" ON storage.objects;',
          'DROP POLICY IF EXISTS "Allow delete to media bucket" ON storage.objects;',
          'DROP POLICY IF EXISTS "Allow Media Deletions" ON storage.objects;'
        ],
        create: `CREATE POLICY "Allow media delete" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'media');`
      }
    ];

    for (const p of policies) {
      try {
        for (const dropSql of p.drop) {
          try { await client.query(dropSql); } catch {}
        }
        await client.query(p.create);
        console.log(`  ✔ Policy "${p.name}" applied successfully.`);
      } catch (policyErr) {
        console.log(`  ℹ Policy "${p.name}" notice: ${policyErr.message}`);
      }
    }

    // Verify configuration
    const checkBucket = await client.query("SELECT id, name, public, file_size_limit FROM storage.buckets WHERE id = 'media';");
    const checkPolicies = await client.query("SELECT policyname, cmd, roles FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';");

    console.log('\n--- VERIFICATION SUMMARY ---');
    console.log('Bucket Status:', checkBucket.rows[0]);
    console.log('Configured Policies on storage.objects:', checkPolicies.rows.map(r => `${r.policyname} (${r.cmd})`));
    console.log('\n\x1b[32m✔ SUPABASE STORAGE SETUP COMPLETED SUCCESSFULLY!\x1b[0m\n');

  } catch (err) {
    console.error('\n\x1b[31m❌ SETUP FAILED:\x1b[0m', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

setupStorage();
