import { uploadToCOS } from './cos';
import { loadPhotoAssets, savePhotoAssets, STORE_NAME, DB_NAME, DB_VERSION } from './photoAssetStorage';

function openDbForKeys(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Iterates through all photo assets, finds any legacy Base64 strings,
 * uploads them to Tencent Cloud, and updates the local IndexedDB.
 * Processes sequentially to avoid Out of Memory (OOM) crashes.
 */
export async function runCloudMigration(
  onProgress?: (current: number, total: number) => void,
  onError?: (error: string) => void
) {
  if (typeof indexedDB === 'undefined') return;

  try {
    const db = await openDbForKeys();
    const keys = await new Promise<string[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAllKeys();
      req.onsuccess = () => resolve(req.result as string[]);
      req.onerror = () => reject(req.error);
    });
    db.close();

    // First pass: identify how many records ACTUALLY need migration
    const legacyKeys: string[] = [];
    for (const id of keys) {
      const record = await loadPhotoAssets(id);
      if (record && ((record.uri && record.uri.startsWith('data:image/')) || (record.characterUri && record.characterUri.startsWith('data:image/')))) {
        legacyKeys.push(id);
      }
    }

    if (legacyKeys.length === 0) {
      console.log(`[CloudMigration] No legacy Base64 strings found. Data is fully clean.`);
      if (onProgress) onProgress(0, 0);
      return;
    }

    console.log(`[CloudMigration] Found ${legacyKeys.length} legacy assets to migrate...`);

    let migratedCount = 0;
    for (const id of legacyKeys) {
      if (onProgress) onProgress(migratedCount, legacyKeys.length);
      const record = await loadPhotoAssets(id);
      if (!record) continue;

      let updated = false;
      const newRecord = { ...record };

      // Migrate primary photo
      if (newRecord.uri && newRecord.uri.startsWith('data:image/')) {
        try {
          console.log(`[CloudMigration] Uploading legacy photo ${id} to COS...`);
          const blob = await fetch(newRecord.uri).then(r => r.blob());
          const url = await uploadToCOS(blob, `migrated-uri-${id}.jpg`);
          newRecord.uri = url;
          updated = true;
        } catch (e) {
          console.error(`[CloudMigration] Failed to migrate uri for ${id}`, e);
          updated = false; // ensure we flag failure
        }
      }

      // Migrate character sticker
      if (newRecord.characterUri && newRecord.characterUri.startsWith('data:image/')) {
        try {
          console.log(`[CloudMigration] Uploading legacy character sticker ${id} to COS...`);
          const blob = await fetch(newRecord.characterUri).then(r => r.blob());
          const url = await uploadToCOS(blob, `migrated-char-${id}.jpg`);
          newRecord.characterUri = url;
          updated = true;
        } catch (e) {
          console.error(`[CloudMigration] Failed to migrate characterUri for ${id}`, e);
        }
      }

      if (updated) {
        await savePhotoAssets(id, newRecord);
        migratedCount++;
        console.log(`[CloudMigration] Saved updated cloud URLs for ${id}`);
        if (onProgress) onProgress(migratedCount, legacyKeys.length);
      }
      
      // Sleep slightly to let the browser breathe
      await new Promise(r => setTimeout(r, 50));
    }
    
    if (migratedCount < legacyKeys.length) {
      if (onError) onError(`有 ${legacyKeys.length - migratedCount} 张照片上传失败，请检查腾讯云 CORS 跨域配置是否正确生效（可能需要等待5分钟）。`);
      return; // Do NOT close overlay
    }
    
    // Ensure overlay closes
    if (onProgress) onProgress(legacyKeys.length, legacyKeys.length);
    
    console.log(`[CloudMigration] Successfully migrated ${migratedCount} assets to Tencent Cloud!`);

  } catch (error) {
    console.error('[CloudMigration] Error during migration:', error);
    if (onError) onError('底层数据库异常导致迁移中断。');
  }
}
