import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import AppModal from './AppModal';
import { backupService } from '../services/backupService';
import { colors, radius, spacing, typography } from '../theme/appleTheme';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function SettingsModal({ visible, onClose }: SettingsModalProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setLoading(true);
    setMessage('正在生成备份文件...');
    try {
      await backupService.exportData();
      setMessage('✅ 导出成功！请妥善保存下载的文件。');
    } catch (error: any) {
      setMessage(`❌ 导出失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setMessage('正在导入数据并恢复，请稍候...');
    try {
      await backupService.importData(file);
      setMessage('✅ 导入成功！正在刷新页面...');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error: any) {
      setMessage(`❌ 导入失败: ${error.message}`);
      setLoading(false);
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <AppModal visible={visible} onRequestClose={loading ? undefined : onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>设置与数据迁移</Text>
            {!loading && (
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.description}>
            我们的应用数据保存在本地浏览器中。如果你需要更换域名或设备，请先导出数据，然后在新页面中导入。
          </Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.loadingText}>{message || '处理中...'}</Text>
          </View>
        ) : (
          <View style={styles.actionContainer}>
            <TouchableOpacity style={[styles.button, styles.exportButton]} onPress={handleExport}>
              <Text style={styles.exportButtonText}>⬇️ 导出数据备份</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.button, styles.importButton]} onPress={handleImportClick}>
              <Text style={styles.importButtonText}>⬆️ 导入数据恢复</Text>
            </TouchableOpacity>
            
            {message ? <Text style={styles.messageText}>{message}</Text> : null}
          </View>
        )}

        {/* Hidden file input for import */}
        <input
          type="file"
          accept=".json"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        </View>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: radius.lg,
    width: 320,
    maxWidth: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.title2,
    color: colors.textPrimary,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  closeBtnText: {
    fontSize: 20,
    color: colors.textSecondary,
  },
  description: {
    ...typography.subhead,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  actionContainer: {
    width: '100%',
    gap: spacing.md,
  },
  button: {
    width: '100%',
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportButton: {
    backgroundColor: colors.accent,
  },
  exportButtonText: {
    ...typography.headline,
    color: colors.surface,
  },
  importButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.separator,
  },
  importButtonText: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  loadingText: {
    ...typography.subhead,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  messageText: {
    ...typography.caption1,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
  }
});
