import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadPhotos, savePhotoToDb } from './photoStorage';

const PEOPLE_STORAGE_KEY = '@memory_map_people';

export interface BackupData {
  version: 1;
  photosRaw: string | null;
  peopleRaw: string | null;
  timestamp: string;
}

export const backupService = {
  async exportData(): Promise<void> {
    try {
      const photos = await loadPhotos();
      const photosRaw = JSON.stringify(photos);
      const peopleRaw = await AsyncStorage.getItem(PEOPLE_STORAGE_KEY);
      
      const backup: BackupData = {
        version: 1,
        photosRaw,
        peopleRaw,
        timestamp: new Date().toISOString(),
      };

      const jsonString = JSON.stringify(backup);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `memory-map-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export data:', error);
      throw new Error('导出数据失败');
    }
  },

  async importData(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        try {
          const jsonString = event.target?.result as string;
          if (!jsonString) throw new Error('文件内容为空');
          
          const backup = JSON.parse(jsonString) as Partial<BackupData>;
          
          if (backup.version !== 1) {
            throw new Error('不支持的备份版本或文件格式错误');
          }

          // Restore Photos
          if (backup.photosRaw) {
            try {
              const photos = JSON.parse(backup.photosRaw);
              if (Array.isArray(photos)) {
                for (const photo of photos) {
                  await savePhotoToDb(photo);
                }
              }
            } catch (e) {
              console.warn('Failed to parse backup photos array:', e);
            }
          }

          // Restore People
          if (backup.peopleRaw) {
            await AsyncStorage.setItem(PEOPLE_STORAGE_KEY, backup.peopleRaw);
          }
          
          resolve();
        } catch (error) {
          console.error('Failed to parse backup:', error);
          reject(new Error('备份文件解析失败，请确保选择了正确的文件'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('读取文件失败'));
      };
      
      reader.readAsText(file);
    });
  }
};
