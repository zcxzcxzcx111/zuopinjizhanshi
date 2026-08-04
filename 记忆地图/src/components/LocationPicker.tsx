import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  TextInput,
} from 'react-native';
import { PhotoLocation } from '../types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Common locations for quick selection
const PRESET_LOCATIONS: (PhotoLocation & { name: string })[] = [
  { latitude: 39.9042, longitude: 116.4074, name: '北京' },
  { latitude: 31.2304, longitude: 121.4737, name: '上海' },
  { latitude: 30.2741, longitude: 120.1551, name: '杭州' },
  { latitude: 31.2989, longitude: 120.5853, name: '苏州' },
  { latitude: 23.1291, longitude: 113.2644, name: '广州' },
  { latitude: 22.5431, longitude: 114.0579, name: '深圳' },
  { latitude: 30.5728, longitude: 104.0668, name: '成都' },
  { latitude: 29.5630, longitude: 106.5516, name: '重庆' },
  { latitude: 34.3416, longitude: 108.9398, name: '西安' },
  { latitude: 30.5928, longitude: 114.3055, name: '武汉' },
];

interface LocationPickerProps {
  onSelect: (location: PhotoLocation) => void;
  onCancel: () => void;
}

export default function LocationPicker({ onSelect, onCancel }: LocationPickerProps) {
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [showPresets, setShowPresets] = useState(true);

  const handleConfirm = () => {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      return;
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return;
    }

    onSelect({ latitude, longitude });
  };

  const handlePreset = (preset: (typeof PRESET_LOCATIONS)[0]) => {
    setLat(preset.latitude.toString());
    setLng(preset.longitude.toString());
    setShowPresets(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>取消</Text>
        </TouchableOpacity>
        <Text style={styles.title}>选择位置</Text>
        <TouchableOpacity
          onPress={handleConfirm}
          style={[
            styles.confirmBtn,
            (!lat || !lng) && styles.confirmBtnDisabled,
          ]}
          disabled={!lat || !lng}
        >
          <Text
            style={[
              styles.confirmText,
              (!lat || !lng) && styles.confirmTextDisabled,
            ]}
          >
            确认
          </Text>
        </TouchableOpacity>
      </View>

      {/* Info text */}
      <View style={styles.infoBox}>
        <Text style={styles.infoEmoji}>&#x1F4CD;</Text>
        <Text style={styles.infoText}>
          照片没有GPS信息，请手动选择拍摄位置
        </Text>
      </View>

      {/* Preset locations */}
      {showPresets && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>常用城市</Text>
          <View style={styles.presetGrid}>
            {PRESET_LOCATIONS.map((preset) => (
              <TouchableOpacity
                key={preset.name}
                style={styles.presetBtn}
                onPress={() => handlePreset(preset)}
              >
                <Text style={styles.presetText}>{preset.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Manual input */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>手动输入坐标</Text>
        <View style={styles.inputRow}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>纬度</Text>
            <TextInput
              style={styles.input}
              value={lat}
              onChangeText={setLat}
              placeholder="39.9042"
              keyboardType="decimal-pad"
              placeholderTextColor="#ccc"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>经度</Text>
            <TextInput
              style={styles.input}
              value={lng}
              onChangeText={setLng}
              placeholder="116.4074"
              keyboardType="decimal-pad"
              placeholderTextColor="#ccc"
            />
          </View>
        </View>
      </View>

      {/* Map placeholder for web */}
      {Platform.OS === 'web' && (
        <View style={styles.mapPlaceholder}>
          <Text style={styles.mapPlaceholderText}>
            &#x1F5FA; 在移动端可使用地图选点
          </Text>
          <Text style={styles.mapPlaceholderHint}>
            请选择常用城市或输入坐标
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cancelText: {
    fontSize: 16,
    color: '#666',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#2C3E50',
  },
  confirmBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  confirmBtnDisabled: {
    opacity: 0.5,
  },
  confirmText: {
    fontSize: 16,
    color: '#4ECDC4',
    fontWeight: '600',
  },
  confirmTextDisabled: {
    color: '#ccc',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    gap: 10,
  },
  infoEmoji: {
    fontSize: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 12,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  presetBtn: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  presetText: {
    fontSize: 14,
    color: '#333',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 6,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    color: '#333',
  },
  mapPlaceholder: {
    margin: 16,
    height: 200,
    backgroundColor: '#e8f4f8',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#b0d4e8',
    borderStyle: 'dashed',
  },
  mapPlaceholderText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  mapPlaceholderHint: {
    fontSize: 12,
    color: '#999',
  },
});
