/**
 * Storage Verification Acceptance Test Script
 * 
 * Verifies Acceptance Criteria:
 * 1. Uploads a mock probe file to Supabase Storage 'media' bucket.
 * 2. Resolves public URL via getPublicUrl.
 * 3. Executes HTTP GET to ensure status 200 OK and matching payload content.
 * 4. Cleans up probe artifact.
 * 5. Exits with code 0 on success, code 1 on failure.
 */

import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gbdwswfrscjccaaeciiu.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_WCo_qddtShwOHZQGhsPwdg_nwgydoqr';

async function verifyStorage() {
  console.log('\n======================================================================');
  console.log('▶ RUNNING SUPABASE STORAGE ACCEPTANCE VERIFICATION');
  console.log('======================================================================\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const testId = Date.now();
  const probePath = `vault_pdfs/verification/probe_${testId}.txt`;
  const probeContent = `Vibe Todos Storage Probe Test Payload — Timestamp: ${new Date().toISOString()} — ID: ${testId}`;
  const probeBuffer = Buffer.from(probeContent, 'utf-8');

  try {
    // Step 1: Direct Binary Upload
    console.log(`[1/4] Uploading probe file to media bucket: ${probePath}...`);
    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from('media')
      .upload(probePath, probeBuffer, {
        contentType: 'text/plain',
        upsert: true
      });

    assert.strictEqual(uploadErr, null, `Upload failed: ${uploadErr?.message}`);
    assert.ok(uploadData, 'Upload response data must be defined');
    console.log('  ✔ Upload successful.');

    // Step 2: Retrieve Public URL
    console.log('[2/4] Resolving public URL...');
    const { data: urlData } = supabase.storage.from('media').getPublicUrl(probePath);
    const publicUrl = urlData?.publicUrl;

    assert.ok(publicUrl, 'Public URL must not be empty');
    assert.ok(publicUrl.startsWith('http'), `Public URL must be HTTP(S) protocol: ${publicUrl}`);
    console.log(`  ✔ Resolved Public URL: ${publicUrl}`);

    // Step 3: HTTP GET & Payload Integrity Check
    console.log('[3/4] Testing HTTP GET reachability and payload integrity...');
    const response = await fetch(publicUrl);
    assert.strictEqual(response.status, 200, `HTTP GET returned status ${response.status}, expected 200`);

    const fetchedContent = await response.text();
    assert.strictEqual(fetchedContent, probeContent, 'Fetched content must exactly match original probe payload');
    console.log('  ✔ HTTP 200 OK received with 100% content integrity.');

    // Step 4: Cleanup Probe File
    console.log(`[4/4] Cleaning up probe file (${probePath})...`);
    const { error: removeErr } = await supabase.storage.from('media').remove([probePath]);
    assert.strictEqual(removeErr, null, `Cleanup failed: ${removeErr?.message}`);
    console.log('  ✔ Probe file removed from bucket.');

    console.log('\n\x1b[32m✔ STORAGE VERIFICATION PASSED ALL ACCEPTANCE CRITERIA!\x1b[0m\n');
    process.exit(0);

  } catch (err) {
    console.error('\n\x1b[31m❌ STORAGE VERIFICATION FAILED:\x1b[0m', err);
    process.exit(1);
  }
}

verifyStorage();
