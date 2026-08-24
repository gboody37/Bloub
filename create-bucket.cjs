const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://gbdwswfrscjccaaeciiu.supabase.co',
  'sb_publishable_WCo_qddtShwOHZQGhsPwdg_nwgydoqr'
);

async function main() {
  // List existing buckets
  const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
  console.log('Existing buckets:', buckets?.map(b => b.name) || [], listErr?.message || '');

  // Try creating the media bucket
  const { data, error } = await supabase.storage.createBucket('media', {
    public: true,
    allowedMimeTypes: ['application/pdf', 'image/*', 'video/*', 'audio/*'],
    fileSizeLimit: 52428800 // 50MB
  });
  console.log('Create result:', data, error?.message || 'success');
}
main();
