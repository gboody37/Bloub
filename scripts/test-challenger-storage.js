/**
 * EMPIRICAL CHALLENGER STRESS-TEST HARNESS
 * Milestone: M1_PDF_OVERHAUL
 * 
 * Test Suites:
 * 1. High-concurrency parallel uploads & simultaneous HTTP GET retrievals.
 * 2. Multi-format MIME validation (PDF binary, PNG binary, UTF-8 Arabic Markdown, JSON).
 * 3. Edge cases & Filename Sanitization:
 *    - Sanitization resilience against spaces, Arabic, brackets, pluses, symbols.
 *    - Idempotency & upsert collision semantics (upsert: false reject vs upsert: true overwrite).
 * 4. Policy enforcement & non-existent bucket rejection.
 * 5. Automated teardown & artifact cleanup.
 */

import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gbdwswfrscjccaaeciiu.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_WCo_qddtShwOHZQGhsPwdg_nwgydoqr';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const BUCKET = 'media';
const RUN_ID = Date.now();
const cleanupPaths = [];

function registerForCleanup(path) {
  cleanupPaths.push(path);
  return path;
}

async function runTests() {
  console.log('======================================================================');
  console.log(`▶ EMPIRICAL CHALLENGER STRESS TEST HARNESS — Run ID: ${RUN_ID}`);
  console.log('======================================================================\n');

  const testResults = [];

  function record(name, pass, details = '') {
    testResults.push({ name, pass, details });
    const mark = pass ? '✔ PASS' : '❌ FAIL';
    console.log(`[${mark}] ${name}${details ? ' — ' + details : ''}`);
  }

  try {
    // -------------------------------------------------------------------------
    // TEST SUITE 1: High Concurrency (10 Parallel Streams)
    // -------------------------------------------------------------------------
    console.log('--- TEST SUITE 1: High Concurrency (10 Parallel Streams) ---');
    const CONCURRENCY_COUNT = 10;
    const concurrentItems = Array.from({ length: CONCURRENCY_COUNT }, (_, idx) => {
      const path = registerForCleanup(`vault_pdfs/stress_${RUN_ID}/worker_${idx}_${Date.now()}.txt`);
      const payload = `Concurrent worker payload #${idx} — UUID: ${Math.random().toString(36).substring(2)}`;
      return { idx, path, payload, buffer: Buffer.from(payload, 'utf-8') };
    });

    const startUploadTime = Date.now();
    const uploadPromises = concurrentItems.map(item => 
      supabase.storage.from(BUCKET).upload(item.path, item.buffer, {
        contentType: 'text/plain',
        upsert: true
      }).then(res => ({ item, res }))
    );

    const uploadResults = await Promise.all(uploadPromises);
    const totalUploadTime = Date.now() - startUploadTime;

    let allUploadsOk = true;
    for (const { item, res } of uploadResults) {
      if (res.error) {
        allUploadsOk = false;
        console.error(`Upload error for worker ${item.idx}:`, res.error);
      }
    }
    record(
      '1.1 Concurrent Uploads (10 parallel streams)',
      allUploadsOk,
      `Completed in ${totalUploadTime}ms (avg ${(totalUploadTime/CONCURRENCY_COUNT).toFixed(1)}ms/upload)`
    );

    const startFetchTime = Date.now();
    const fetchPromises = concurrentItems.map(async item => {
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(item.path);
      const res = await fetch(data.publicUrl);
      const text = await res.text();
      return { item, status: res.status, text, publicUrl: data.publicUrl };
    });

    const fetchResults = await Promise.all(fetchPromises);
    const totalFetchTime = Date.now() - startFetchTime;

    let allFetchesOk = true;
    for (const f of fetchResults) {
      if (f.status !== 200 || f.text !== f.item.payload) {
        allFetchesOk = false;
        console.error(`Fetch mismatch for ${f.item.path}: status=${f.status}, match=${f.text === f.item.payload}`);
      }
    }
    record(
      '1.2 Concurrent HTTP GET Public URLs & Payload Integrity',
      allFetchesOk,
      `All 10 verified in ${totalFetchTime}ms (HTTP 200 + 100% byte match)`
    );

    // -------------------------------------------------------------------------
    // TEST SUITE 2: Multi-Format Document Ingestion
    // -------------------------------------------------------------------------
    console.log('\n--- TEST SUITE 2: Multi-Format Document Ingestion ---');

    // 2.1 Binary PDF
    const pdfContent = `%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000052 00000 n \n0000000101 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF`;
    const pdfBuffer = Buffer.from(pdfContent, 'binary');
    const pdfPath = registerForCleanup(`vault_pdfs/stress_${RUN_ID}/formats/test_doc_${RUN_ID}.pdf`);

    const { error: pdfUploadErr } = await supabase.storage.from(BUCKET).upload(pdfPath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true
    });
    const { data: pdfUrlData } = supabase.storage.from(BUCKET).getPublicUrl(pdfPath);
    const pdfHttpRes = await fetch(pdfUrlData.publicUrl);
    const pdfFetchedBuffer = Buffer.from(await pdfHttpRes.arrayBuffer());

    const pdfPass = !pdfUploadErr && pdfHttpRes.status === 200 && pdfBuffer.equals(pdfFetchedBuffer);
    record(
      '2.1 PDF Document Binary Ingestion & Retrieval',
      pdfPass,
      `Size: ${pdfBuffer.length} bytes, Status: ${pdfHttpRes.status}, Content-Type: ${pdfHttpRes.headers.get('content-type')}`
    );

    // 2.2 PNG Image Binary Buffer
    const pngHex = '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2d450000000049454e44ae426082';
    const pngBuffer = Buffer.from(pngHex, 'hex');
    const pngPath = registerForCleanup(`vault_pdfs/stress_${RUN_ID}/formats/test_image_${RUN_ID}.png`);

    const { error: pngUploadErr } = await supabase.storage.from(BUCKET).upload(pngPath, pngBuffer, {
      contentType: 'image/png',
      upsert: true
    });
    const { data: pngUrlData } = supabase.storage.from(BUCKET).getPublicUrl(pngPath);
    const pngHttpRes = await fetch(pngUrlData.publicUrl);
    const pngFetchedBuffer = Buffer.from(await pngHttpRes.arrayBuffer());

    const pngPass = !pngUploadErr && pngHttpRes.status === 200 && pngBuffer.equals(pngFetchedBuffer);
    record(
      '2.2 PNG Image Binary Ingestion & Retrieval',
      pngPass,
      `Size: ${pngBuffer.length} bytes, Status: ${pngHttpRes.status}`
    );

    // 2.3 UTF-8 Markdown with Arabic & Special Characters
    const mdContent = `# ملخص دراسة Vibe Todos — جبنة 🧀\n\n- نقطة 1: دعم كامل للغة العربية والرموز التعبيرية\n- نقطة 2: LaTeX formulas $E = mc^2$\n- وقت التحديث: ${new Date().toISOString()}`;
    const mdBuffer = Buffer.from(mdContent, 'utf-8');
    const mdPath = registerForCleanup(`vault_pdfs/stress_${RUN_ID}/formats/arabic_notes_${RUN_ID}.md`);

    const { error: mdUploadErr } = await supabase.storage.from(BUCKET).upload(mdPath, mdBuffer, {
      contentType: 'text/markdown',
      upsert: true
    });
    const { data: mdUrlData } = supabase.storage.from(BUCKET).getPublicUrl(mdPath);
    const mdHttpRes = await fetch(mdUrlData.publicUrl);
    const mdFetchedText = await mdHttpRes.text();

    const mdPass = !mdUploadErr && mdHttpRes.status === 200 && mdFetchedText === mdContent;
    record(
      '2.3 UTF-8 / Arabic / Emoji Markdown Ingestion',
      mdPass,
      `Length: ${mdContent.length} chars, Status: ${mdHttpRes.status}`
    );

    // 2.4 Structured JSON Document
    const jsonData = { app: 'vibe-todos', version: '0.1.0', studyNodes: [1, 2, 3], nested: { valid: true } };
    const jsonBuffer = Buffer.from(JSON.stringify(jsonData, null, 2), 'utf-8');
    const jsonPath = registerForCleanup(`vault_pdfs/stress_${RUN_ID}/formats/data_${RUN_ID}.json`);

    const { error: jsonUploadErr } = await supabase.storage.from(BUCKET).upload(jsonPath, jsonBuffer, {
      contentType: 'application/json',
      upsert: true
    });
    const { data: jsonUrlData } = supabase.storage.from(BUCKET).getPublicUrl(jsonPath);
    const jsonHttpRes = await fetch(jsonUrlData.publicUrl);
    const jsonFetched = await jsonHttpRes.json();

    const jsonPass = !jsonUploadErr && jsonHttpRes.status === 200 && JSON.stringify(jsonFetched) === JSON.stringify(jsonData);
    record(
      '2.4 JSON Structured Data Ingestion',
      jsonPass,
      `Status: ${jsonHttpRes.status}`
    );

    // -------------------------------------------------------------------------
    // TEST SUITE 3: Edge Cases & Storage Key Sanitization Resilience
    // -------------------------------------------------------------------------
    console.log('\n--- TEST SUITE 3: Edge Cases (Filenames, Sanitization, Upsert) ---');

    // 3.1 Worker's Filename Sanitization Pipeline
    // Test that dirty user filenames (with spaces, Arabic, brackets, pluses) sanitized via
    // filename.replace(/[^a-zA-Z0-9._-]/g, '_') resolve and download cleanly with HTTP 200.
    const dirtyUserFileName = `ملخص دراسة (AI & Physics) + [v1.0] #final!.pdf`;
    const cleanFileName = dirtyUserFileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const sanitizedPath = registerForCleanup(`vault_pdfs/stress_${RUN_ID}/sanitized/${Date.now()}_${cleanFileName}`);

    const { error: sanitizedUploadErr } = await supabase.storage.from(BUCKET).upload(sanitizedPath, Buffer.from('Sanitized pipeline content', 'utf-8'), {
      contentType: 'application/pdf',
      upsert: true
    });
    const { data: sanitizedUrlData } = supabase.storage.from(BUCKET).getPublicUrl(sanitizedPath);
    const sanitizedHttpRes = await fetch(sanitizedUrlData.publicUrl);
    const sanitizedFetchedText = await sanitizedHttpRes.text();

    const sanitizedPass = !sanitizedUploadErr && sanitizedHttpRes.status === 200 && sanitizedFetchedText === 'Sanitized pipeline content';
    record(
      '3.1 Filename Sanitization Pipeline Resilience',
      sanitizedPass,
      `Input: "${dirtyUserFileName}" -> Output key: "${cleanFileName}", Status: ${sanitizedHttpRes.status}`
    );

    // 3.2 Idempotency & Upsert Collision Control
    const idempPath = registerForCleanup(`vault_pdfs/stress_${RUN_ID}/idempotency/idemp_${RUN_ID}.txt`);
    
    // First upload with upsert: false -> should succeed
    const { error: initialUploadErr } = await supabase.storage.from(BUCKET).upload(idempPath, Buffer.from('Initial Content V1', 'utf-8'), {
      contentType: 'text/plain',
      upsert: false
    });

    // Second upload with upsert: false -> should return duplicate/exists error
    const { error: duplicateUploadErr } = await supabase.storage.from(BUCKET).upload(idempPath, Buffer.from('Duplicate Content V2', 'utf-8'), {
      contentType: 'text/plain',
      upsert: false
    });

    // Third upload with upsert: true -> should succeed and overwrite
    const { error: overwriteUploadErr } = await supabase.storage.from(BUCKET).upload(idempPath, Buffer.from('Overwritten Content V3', 'utf-8'), {
      contentType: 'text/plain',
      upsert: true
    });

    const { data: idempUrlData } = supabase.storage.from(BUCKET).getPublicUrl(idempPath);
    const idempHttpRes = await fetch(idempUrlData.publicUrl);
    const idempText = await idempHttpRes.text();

    const idempPass = !initialUploadErr && 
                      Boolean(duplicateUploadErr) && 
                      !overwriteUploadErr && 
                      idempText === 'Overwritten Content V3';

    record(
      '3.2 Idempotency & Upsert Overwrite Semantics',
      idempPass,
      `Initial=OK, Duplicate=Rejected (${duplicateUploadErr?.message || 'Error'}), Overwrite=OK (Payload V3 confirmed)`
    );

    // -------------------------------------------------------------------------
    // TEST SUITE 4: Invalid Bucket & Policy Boundaries
    // -------------------------------------------------------------------------
    console.log('\n--- TEST SUITE 4: Invalid Bucket & Policy Boundaries ---');

    const fakeBucketName = `non_existent_bucket_${RUN_ID}`;
    const { error: fakeBucketErr } = await supabase.storage.from(fakeBucketName).upload(`test.txt`, Buffer.from('test', 'utf-8'));

    const fakeBucketPass = Boolean(fakeBucketErr) && (
      fakeBucketErr.message?.toLowerCase().includes('not found') || 
      fakeBucketErr.message?.toLowerCase().includes('bucket') || 
      fakeBucketErr.statusCode === '404'
    );
    record(
      '4.1 Non-Existent Bucket Rejection',
      fakeBucketPass,
      `Correctly rejected with message: "${fakeBucketErr?.message}"`
    );

    // -------------------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------------------
    console.log('\n--- TEARDOWN: Cleaning up test artifacts ---');
    console.log(`Cleaning up ${cleanupPaths.length} probe files from "${BUCKET}"...`);
    const { error: cleanupErr } = await supabase.storage.from(BUCKET).remove(cleanupPaths);
    const cleanupPass = !cleanupErr;
    record(
      '5.1 Teardown & Bucket Artifact Cleanup',
      cleanupPass,
      cleanupPass ? `Cleaned up ${cleanupPaths.length} items.` : `Cleanup error: ${cleanupErr?.message}`
    );

    // -------------------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------------------
    console.log('\n======================================================================');
    console.log('▶ EMPIRICAL CHALLENGER TEST SUMMARY');
    console.log('======================================================================');
    const passedCount = testResults.filter(t => t.pass).length;
    const totalCount = testResults.length;
    console.log(`Total Tests: ${totalCount} | Passed: ${passedCount} | Failed: ${totalCount - passedCount}\n`);

    if (passedCount === totalCount) {
      console.log('\x1b[32m✔ ALL EMPIRICAL CHALLENGER TESTS PASSED WITH 100% SUCCESS!\x1b[0m\n');
      process.exit(0);
    } else {
      console.error('\x1b[31m❌ SOME CHALLENGER TESTS FAILED!\x1b[0m\n');
      process.exit(1);
    }

  } catch (err) {
    console.error('\n\x1b[31m❌ UNEXPECTED HARNESS FAILURE:\x1b[0m', err);
    process.exit(1);
  }
}

runTests();
