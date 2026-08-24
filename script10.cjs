const fs = require('fs');
let code = fs.readFileSync('src/components/study/NoteExplorer.tsx', 'utf-8');

code = code.replace(
  /const arrayBuffer = await file\.arrayBuffer\(\);/,
  \const arrayBuffer = await file.arrayBuffer();
        
        let pdfPublicUrl = '';
        if (file.name.toLowerCase().endsWith('.pdf')) {
          setSyncProgress({ status: 'uploading', scannedCount: 1, uploadedCount: 1, totalCount: 2 } as any);
          const fileName = Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('media')
            .upload('pdfs/' + fileName, file);
          
          if (!uploadError && uploadData) {
            const { data: urlData } = supabase.storage.from('media').getPublicUrl('pdfs/' + fileName);
            pdfPublicUrl = urlData.publicUrl;
          }
        }\
);

code = code.replace(
  /let text = '';/,
  \let text = pdfPublicUrl ? '---\\npdf_url: ' + pdfPublicUrl + '\\n---\\n\\n' : '';\
);

fs.writeFileSync('src/components/study/NoteExplorer.tsx', code);
