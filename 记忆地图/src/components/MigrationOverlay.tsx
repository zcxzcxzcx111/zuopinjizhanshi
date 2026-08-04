import React from "react";
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from "react-native";
import { colors } from "../theme/appleTheme";

export default function MigrationOverlay({ progress, total, error, onRetry }: { progress: number, total: number, error?: string, onRetry?: () => void }) {
  if (total === 0 && !error) return null;
  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        {!error ? (
          <ActivityIndicator size="large" color={colors.accent} style={{ marginBottom: 16 }} />
        ) : (
          <Text style={{ fontSize: 32, marginBottom: 12 }}>⚠️</Text>
        )}
        <Text style={styles.title}>{error ? '迁移遇到问题' : '正在为您升级到云端架构'}</Text>
        <Text style={styles.subtitle}>
          {error ? error : '这可能需要几分钟时间，期间请不要关闭页面。\n升级完成后，App 将彻底解决卡顿问题。'}
        </Text>
        {!error ? (
          <Text style={styles.progressText}>{progress} / {total}</Text>
        ) : (
          <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
            <Text style={styles.retryText}>重新尝试</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 99999,
  },
  card: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 20,
    width: "80%",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 20,
  },
  progressText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.accent,
  },
  retryBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  }
});
