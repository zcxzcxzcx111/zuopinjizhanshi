import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  TextInput,
} from 'react-native';
import AppModal from './AppModal';
import { Photo, PhotoLocation } from '../types';
import {
  pickPhotos,
  takePhoto,
  processPickedPhoto,
  extractLocation,
  PickedPhotoData,
} from '../services/photoService';
import { detectFaces, FaceBoundingBox } from '../services/faceDetection';
import { minimalistColors, minimalistRadii, minimalistShadows, minimalistTypography } from '../theme/minimalistTheme';
import LocationPicker from './LocationPicker';
import { personStore } from '../services/personStore';
import { PersonProfile } from '../types';
import { triggerLightHaptic } from '../utils/haptics';

type UploadStep = 'pick' | 'ai_analyzing' | 'review' | 'location' | 'processing';

interface PendingPhoto {
  picked: PickedPhotoData;
  detectedLocation: PhotoLocation | null;
  manualLocation?: PhotoLocation;
  selectedPoints?: { x: number; y: number }[]; // Keeping for backward compatibility or simple clicks
  detectedFaces?: FaceBoundingBox[];
  selectedFaceIndexes?: number[];
  faceProfiles?: Array<PersonProfile | null>;
  customFaceNames?: string[];
}

interface PhotoUploaderProps {
  visible: boolean;
  onClose: () => void;
  onPhotosAdded: (photos: Photo[]) => void;
}

export default function PhotoUploader({ visible, onClose, onPhotosAdded }: PhotoUploaderProps) {
  const [step, setStep] = useState<UploadStep>('pick');
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiPhase, setAiPhase] = useState(0);

  const reset = useCallback(() => {
    setStep('pick');
    setPendingPhotos([]);
    setCurrentIndex(0);
    setIsProcessing(false);
    setAiPhase(0);
  }, []);

  const handleClose = useCallback((force?: boolean | any) => {
    if (force !== true && step !== 'pick' && step !== 'processing') {
      if (Platform.OS === 'web') {
        if (!window.confirm('确定放弃当前操作？已填写的信息将全部丢失。')) return;
      } else {
        // For non-web, just close (Alert.alert is async, harder here)
      }
    }
    reset();
    onClose();
  }, [step, reset, onClose]);

  // AI scanning animation timer (fake delays removed for better UX)
  useEffect(() => {
    if (step === 'ai_analyzing') {
      setAiPhase(0);
      const t1 = setTimeout(() => setAiPhase(1), 100);
      const t2 = setTimeout(() => setAiPhase(2), 200);
      const t3 = setTimeout(() => setAiPhase(3), 300);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }
  }, [step]);

  const startAIAnalysis = useCallback(async (pendingList: PendingPhoto[]) => {
    setPendingPhotos(pendingList);
    setCurrentIndex(0);
    setStep('ai_analyzing');
    
    // Simulate AI scanning and actual face detection (sequential to avoid memory overload)
    const updatedPhotos: PendingPhoto[] = [];
    for (const p of pendingList) {
      let faces: FaceBoundingBox[] = [];
      let faceProfiles: Array<PersonProfile | null> = [];
      let customFaceNames: string[] = [];

      try {
        faces = await detectFaces(p.picked.uri);
        for (const face of faces) {
          if (face.descriptor) {
            const profile = await personStore.findMatchingProfile(face.descriptor);
            faceProfiles.push(profile);
            // Pre-fill customFaceNames with matched name so user can edit it
            customFaceNames.push(profile ? profile.name : '');
          } else {
            faceProfiles.push(null);
            customFaceNames.push('');
          }
        }
      } catch (e) {
        console.warn('Face detection error:', e);
      }
      const result: PendingPhoto = {
        ...p,
        detectedLocation: p.detectedLocation || null,
        detectedFaces: faces,
        selectedFaceIndexes: faces.map((_, i) => i), // Default select all faces
        faceProfiles,
        customFaceNames,
      };
      updatedPhotos.push(result);
    }
    
    setPendingPhotos(updatedPhotos);
    setStep('review');
  }, [onPhotosAdded, handleClose]);

  const handlePickFromGallery = useCallback(async () => {
    try {
      const picked = await pickPhotos();
      if (picked.length === 0) return;

      const pending: PendingPhoto[] = picked.map((p) => {
        const exifLocation = extractLocation(p.exif);
        return {
          picked: p,
          detectedLocation: exifLocation,
        };
      });

      startAIAnalysis(pending);
    } catch (error: any) {
      Alert.alert('错误', error.message || '选择照片失败');
    }
  }, [startAIAnalysis]);

  const handleTakePhoto = useCallback(async () => {
    try {
      const picked = await takePhoto();
      if (!picked) return;

      const exifLocation = extractLocation(picked.exif) || picked.capturedLocation || null;
      const pending: PendingPhoto = {
        picked,
        detectedLocation: exifLocation,
        manualLocation: undefined,
      };

      startAIAnalysis([pending]);
    } catch (error: any) {
      Alert.alert('错误', error.message || '拍照失败');
    }
  }, [startAIAnalysis]);

  const handleNext = useCallback(() => {
    const current = pendingPhotos[currentIndex];
    if (!current.detectedLocation && !current.manualLocation) {
      Alert.alert('提示', '未检测到位置信息，请手动指定。');
      setStep('location');
      return;
    }
    if (currentIndex < pendingPhotos.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      processAllPhotos();
    }
  }, [currentIndex, pendingPhotos]);

  const handleSkip = useCallback(() => {
    handleNext();
  }, [handleNext]);

  const handleLocationSelect = useCallback((location: PhotoLocation) => {
    setPendingPhotos((prev) =>
      prev.map((p, i) => (i === currentIndex ? { ...p, manualLocation: location } : p))
    );
    setStep('review');
  }, [currentIndex]);

  const [imageLayout, setImageLayout] = useState<{width: number; height: number} | null>(null);

  const handleImageTap = useCallback((e: any) => {
    if (!imageLayout) return;
    
    const currentPhoto = pendingPhotos[currentIndex];
    if (!currentPhoto || !currentPhoto.picked.width || !currentPhoto.picked.height) return;

    // If face detection found faces, we ignore direct tap because they tap the bounding box instead.
    if (currentPhoto.detectedFaces && currentPhoto.detectedFaces.length > 0) return;
    
    const { locationX, locationY } = e.nativeEvent;
    
    const containerW = imageLayout.width;
    const containerH = imageLayout.height;
    const imgW = currentPhoto.picked.width;
    const imgH = currentPhoto.picked.height;
    
    const scale = Math.min(containerW / imgW, containerH / imgH);
    const renderW = imgW * scale;
    const renderH = imgH * scale;
    
    const offsetX = (containerW - renderW) / 2;
    const offsetY = (containerH - renderH) / 2;
    
    let x = (locationX - offsetX) / renderW;
    let y = (locationY - offsetY) / renderH;
    
    if (x < 0) x = 0;
    if (x > 1) x = 1;
    if (y < 0) y = 0;
    if (y > 1) y = 1;

    setPendingPhotos((prev) => prev.map((p, i) => {
      if (i === currentIndex) {
        const points = p.selectedPoints || [];
        return { ...p, selectedPoints: [...points, { x, y }] };
      }
      return p;
    }));
  }, [imageLayout, currentIndex, pendingPhotos]);

  const toggleFaceSelection = useCallback((index: number) => {
    setPendingPhotos((prev) => prev.map((p, i) => {
      if (i === currentIndex && p.detectedFaces) {
        const selected = p.selectedFaceIndexes || [];
        const isSelected = selected.includes(index);
        const newSelected = isSelected 
          ? selected.filter(idx => idx !== index)
          : [...selected, index];
        return { ...p, selectedFaceIndexes: newSelected };
      }
      return p;
    }));
  }, [currentIndex]);

  const handleFaceNameChange = useCallback((index: number, text: string) => {
    setPendingPhotos((prev) => prev.map((p, i) => {
      if (i === currentIndex && p.customFaceNames) {
        const newNames = [...p.customFaceNames];
        newNames[index] = text;
        return { ...p, customFaceNames: newNames };
      }
      return p;
    }));
  }, [currentIndex]);

  const undoLastPoint = useCallback(() => {
    setPendingPhotos((prev) => prev.map((p, i) => {
      if (i === currentIndex && p.selectedPoints && p.selectedPoints.length > 0) {
        return { ...p, selectedPoints: p.selectedPoints.slice(0, -1) };
      }
      return p;
    }));
  }, [currentIndex]);



  const processAllPhotos = useCallback(async () => {
    setIsProcessing(true);
    setStep('processing');
    try {
      const processed: Photo[] = [];
      for (const pending of pendingPhotos) {
        let finalProfiles = pending.faceProfiles ? [...pending.faceProfiles] : [];
        if (pending.detectedFaces && pending.customFaceNames && pending.faceProfiles) {
          for (let i = 0; i < pending.detectedFaces.length; i++) {
            const face = pending.detectedFaces[i];
            const customName = (pending.customFaceNames[i] || '').trim();
            const existingProfile = finalProfiles[i];
            if (face.descriptor) {
              if (customName && existingProfile && customName !== existingProfile.name) {
                // User edited the recognized name → update profile in store
                await personStore.updateProfileName(existingProfile.id, customName);
                finalProfiles[i] = { ...existingProfile, name: customName };
              } else if (customName && !existingProfile) {
                // Brand new person → create profile
                const newProfile = await personStore.addProfile(customName, face.descriptor);
                finalProfiles[i] = newProfile;
              }
            }
          }
        }

        const photo = await processPickedPhoto(
          pending.picked,
          pending.manualLocation || undefined,
          pending.selectedPoints,
          pending.detectedFaces && pending.selectedFaceIndexes 
            ? pending.selectedFaceIndexes.map(idx => pending.detectedFaces![idx])
            : undefined,
          finalProfiles.length > 0 ? finalProfiles : undefined,
          pending.detectedFaces ? pending.detectedFaces.map(f => ({
            ...f,
            descriptor: f.descriptor ? Array.from(f.descriptor) : undefined
          })) : undefined
        );
        processed.push(photo);
      }
      
      if (onPhotosAdded) {
        onPhotosAdded(processed);
      }
      handleClose(true);
    } catch (error: any) {
      Alert.alert('错误', error.message || '处理照片失败');
      setIsProcessing(false);
      setStep('review');
    }
  }, [pendingPhotos, onPhotosAdded, handleClose]);

  const currentPhoto = pendingPhotos[currentIndex];

  return (
    <AppModal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={styles.container}>
        {/* Step: Pick photos */}
        {step === 'pick' && (
          <View style={styles.stepContainer}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => { triggerLightHaptic(); handleClose(); }} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.title}>添加回忆</Text>
              <View style={{ width: 32 }} />
            </View>

            <ScrollView style={styles.pickScrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.pickTopSection}>
                <Text style={styles.pickTitle}>记录此刻</Text>
                <Text style={styles.pickSubtitle}>
                  选择照片或直接拍摄，我们将自动识别内容并生成专属的地图回忆贴纸。
                </Text>

                <View style={styles.actionButtonsRow}>
                  <TouchableOpacity style={styles.pickBtnMain} onPress={() => { triggerLightHaptic(); handlePickFromGallery(); }} activeOpacity={0.8}>
                    <Text style={styles.pickBtnIcon}>🖼️</Text>
                    <View>
                      <Text style={styles.pickBtnMainText}>相册选择</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.pickBtnMainAlt} onPress={() => { triggerLightHaptic(); handleTakePhoto(); }} activeOpacity={0.8}>
                    <Text style={styles.pickBtnIcon}>📸</Text>
                    <View>
                      <Text style={styles.pickBtnMainTextAlt}>拍照</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>


              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        )}

        {/* Step: AI Analyzing */}
        {step === 'ai_analyzing' && currentPhoto && (
          <View style={styles.aiScanningContainer}>
            <ActivityIndicator size="large" color={minimalistColors.textPrimary} style={{ marginBottom: 24 }} />
            <Text style={styles.aiScannerTitle}>正在分析内容</Text>
            <Text style={styles.aiScannerSubtitle}>提取特征并生成贴纸...</Text>

            <View style={styles.aiProgressCard}>
              <View style={styles.aiProgressRow}>
                <Text style={styles.aiCheckIcon}>{aiPhase >= 0 ? '✓' : '○'}</Text>
                <Text style={styles.aiProgressLabel}>视觉特征提取</Text>
              </View>
              <View style={styles.aiProgressRow}>
                <Text style={styles.aiCheckIcon}>{aiPhase >= 1 ? '✓' : '○'}</Text>
                <Text style={styles.aiProgressLabel}>场景内容识别</Text>
              </View>
              <View style={styles.aiProgressRow}>
                <Text style={styles.aiCheckIcon}>{aiPhase >= 2 ? '✓' : '○'}</Text>
                <Text style={styles.aiProgressLabel}>坐标数据解析</Text>
              </View>
              <View style={styles.aiProgressRow}>
                <Text style={styles.aiCheckIcon}>{aiPhase >= 3 ? '✓' : '○'}</Text>
                <Text style={styles.aiProgressLabel}>生成地图专属贴纸</Text>
              </View>
            </View>
          </View>
        )}

        {/* Step: Review */}
        {step === 'review' && currentPhoto && (
          <View style={styles.stepContainer}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => { triggerLightHaptic(); handleClose(); }} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.title}>确认内容 ({currentIndex + 1} / {pendingPhotos.length})</Text>
              <TouchableOpacity onPress={() => { triggerLightHaptic(); handleSkip(); }} style={styles.skipBtn}>
                <Text style={styles.skipText}>跳过</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.reviewContent} showsVerticalScrollIndicator={false}>
              
              <Text style={styles.sceneSelectHint}>
                {(currentPhoto.detectedFaces && currentPhoto.detectedFaces.length > 0) 
                  ? `检测到 ${currentPhoto.detectedFaces.length} 个人脸，请点击选框取消或重新选择`
                  : `未检测到人脸。系统将默认提取照片主体（如美食、静物）生成贴纸。您也可点击照片手动框选区域。`}
              </Text>
              
              <View style={styles.imageSelectorContainer}>
                <TouchableOpacity
                  activeOpacity={1}
                  onLayout={(e) => setImageLayout(e.nativeEvent.layout)}
                  onPress={handleImageTap}
                  style={styles.imageSelectorWrapper}
                >
                  {/* Dimmed Base Image */}
                  <Image
                    source={{ uri: currentPhoto.picked.uri }}
                    style={[styles.selectorImage, { opacity: (currentPhoto.detectedFaces && currentPhoto.detectedFaces.length > 0) ? 0.3 : 1 }]}
                    resizeMode="contain"
                  />
                  
                  {/* Spotlight Bright Image (Web Only CSS Mask Trick) */}
                  {Platform.OS === 'web' && currentPhoto.detectedFaces && currentPhoto.detectedFaces.length > 0 && (
                    <Image
                      source={{ uri: currentPhoto.picked.uri }}
                      style={[
                        styles.selectorImage,
                        styles.spotlightImage,
                        {
                          // @ts-ignore
                          WebkitMaskImage: (currentPhoto.selectedFaceIndexes || []).map(idx => {
                            const face = currentPhoto.detectedFaces![idx];
                            if (!face) return '';
                            const cx = (face.x + face.width / 2) * 100;
                            const cy = (face.y + face.height / 2) * 100;
                            // Make oval taller to include shoulders
                            const rx = (face.width * 1.2) * 100;
                            const ry = (face.height * 2.0) * 100;
                            return `radial-gradient(ellipse ${rx}% ${ry}% at ${cx}% ${cy}%, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 70%)`;
                          }).filter(Boolean).join(', ') || 'none',
                        }
                      ]}
                      resizeMode="contain"
                    />
                  )}
                  
                  {/* Render manually tapped points if no faces detected */}
                  {(!currentPhoto.detectedFaces || currentPhoto.detectedFaces.length === 0) && (currentPhoto.selectedPoints || []).map((pt, idx) => {
                    const imgW = currentPhoto.picked.width || 1;
                    const imgH = currentPhoto.picked.height || 1;
                    const scale = Math.min((imageLayout?.width || 0) / imgW, (imageLayout?.height || 0) / imgH);
                    const renderW = imgW * scale;
                    const renderH = imgH * scale;
                    const offsetX = ((imageLayout?.width || 0) - renderW) / 2;
                    const offsetY = ((imageLayout?.height || 0) - renderH) / 2;
                    return (
                    <View
                      key={idx}
                      style={[
                        styles.markerDot,
                        { left: offsetX + pt.x * renderW - 12, top: offsetY + pt.y * renderH - 12 }
                      ]}
                      pointerEvents="none"
                    >
                      <Text style={styles.markerDotText}>{idx + 1}</Text>
                    </View>
                  )})}
                  
                  {/* Render Invisible Touch Areas for Faces */}
                  {(currentPhoto.detectedFaces || []).map((face, idx) => {
                    const imgW = currentPhoto.picked.width || 1;
                    const imgH = currentPhoto.picked.height || 1;
                    const scale = Math.min((imageLayout?.width || 0) / imgW, (imageLayout?.height || 0) / imgH);
                    const renderW = imgW * scale;
                    const renderH = imgH * scale;
                    const offsetX = ((imageLayout?.width || 0) - renderW) / 2;
                    const offsetY = ((imageLayout?.height || 0) - renderH) / 2;
                    
                    const isSelected = (currentPhoto.selectedFaceIndexes || []).includes(idx);
                    
                    return (
                      <TouchableOpacity
                        key={`face-${idx}`}
                        activeOpacity={1}
                        onPress={() => { triggerLightHaptic(); toggleFaceSelection(idx); }}
                        style={[
                          styles.faceTouchArea,
                          {
                            left: offsetX + face.x * renderW,
                            top: offsetY + face.y * renderH,
                            width: face.width * renderW,
                            height: face.height * renderH,
                          }
                        ]}
                      >
                        {isSelected && Platform.OS !== 'web' && (
                          <View style={styles.faceBoxCheck}>
                            <Text style={styles.faceBoxCheckText}>✓</Text>
                          </View>
                        )}
                        {/* Name Label / Input — always editable */}
                        <View style={{position: 'absolute', bottom: -44, left: -20, right: -20, alignItems: 'center'}}>
                          {currentPhoto.faceProfiles?.[idx] && !currentPhoto.customFaceNames?.[idx]?.trim() ? (
                            // Recognized: show name as tappable chip that opens an edit mode
                            <TouchableOpacity
                              onPress={() => {
                                triggerLightHaptic();
                                // Pre-fill input with recognized name for editing
                                handleFaceNameChange(idx, currentPhoto.faceProfiles![idx]!.name);
                              }}
                              activeOpacity={0.7}
                              style={{backgroundColor: 'rgba(0,180,120,0.8)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 4}}
                            >
                              <Text style={{color: '#FFF', fontSize: 12, fontWeight: '600'}}>{currentPhoto.faceProfiles[idx]!.name}</Text>
                              <Text style={{color: 'rgba(255,255,255,0.8)', fontSize: 10}}>✎</Text>
                            </TouchableOpacity>
                          ) : (
                            <TextInput 
                              placeholder={currentPhoto.faceProfiles?.[idx] ? currentPhoto.faceProfiles[idx]!.name : '添加姓名(选填)'}
                              placeholderTextColor={currentPhoto.faceProfiles?.[idx] ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.7)'}
                              style={{backgroundColor: currentPhoto.faceProfiles?.[idx] ? 'rgba(0,120,80,0.8)' : 'rgba(0,0,0,0.65)', color: '#FFF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, fontSize: 13, minWidth: 90, textAlign: 'center'}}
                              value={currentPhoto.customFaceNames?.[idx] || ''}
                              onChangeText={(text) => handleFaceNameChange(idx, text)}
                              onPressIn={(e) => e.stopPropagation()}
                              autoFocus={!!currentPhoto.faceProfiles?.[idx]}
                            />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </TouchableOpacity>
              </View>

              <View style={styles.selectionStatsRow}>
                <Text style={styles.selectionStatsText}>
                  {(currentPhoto.detectedFaces && currentPhoto.detectedFaces.length > 0)
                    ? `已选择 ${(currentPhoto.selectedFaceIndexes || []).length} 个人物`
                    : (currentPhoto.selectedPoints && currentPhoto.selectedPoints.length > 0)
                      ? '已框选自定义主体区域'
                      : '将默认提取整张照片主体'}
                </Text>
                {(!currentPhoto.detectedFaces || currentPhoto.detectedFaces.length === 0) && (currentPhoto.selectedPoints || []).length > 0 && (
                  <TouchableOpacity onPress={() => { triggerLightHaptic(); undoLastPoint(); }}>
                    <Text style={styles.undoText}>撤销</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.aiReportCard}>
                <View style={styles.aiReportItem}>
                  <Text style={styles.aiReportLabel}>记录位置</Text>
                  <Text style={[styles.aiReportValue, !currentPhoto.detectedLocation && !currentPhoto.manualLocation && { color: minimalistColors.error }]}>
                    {currentPhoto.detectedLocation 
                      ? (currentPhoto.detectedLocation.placeName || '已获取 EXIF 坐标')
                      : currentPhoto.manualLocation
                      ? (currentPhoto.manualLocation.placeName || '手动补充坐标')
                      : '⚠️ 缺失位置信息 (需手动补充)'}
                  </Text>
                </View>
              </View>

              {!currentPhoto.detectedLocation && !currentPhoto.manualLocation && (
                <TouchableOpacity style={styles.addLocationBtn} onPress={() => { triggerLightHaptic(); setStep('location'); }}>
                  <Text style={styles.addLocationText}>📍 手动补充地理坐标</Text>
                </TouchableOpacity>
              )}

              <View style={{ height: 20 }} />
            </ScrollView>

            <View style={styles.bottomBar}>
              <TouchableOpacity style={styles.confirmBtn} onPress={() => { triggerLightHaptic(); handleNext(); }} activeOpacity={0.8}>
                <Text style={styles.confirmBtnText}>
                  {currentIndex < pendingPhotos.length - 1 ? '继续下一张' : '完成并放置地图'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Step: Location */}
        {step === 'location' && (
          <LocationPicker onSelect={handleLocationSelect} onCancel={() => setStep('review')} />
        )}

        {/* Step: Processing */}
        {step === 'processing' && (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color={minimalistColors.textPrimary} />
            <Text style={styles.processingText}>正在处理照片…</Text>
          </View>
        )}
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: minimalistColors.background },
  stepContainer: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 50, paddingBottom: 16, paddingHorizontal: 20,
    backgroundColor: minimalistColors.background,
    borderBottomWidth: 1, borderBottomColor: minimalistColors.border,
  },
  closeBtn: {
    width: 32, height: 32, borderRadius: minimalistRadii.round,
    backgroundColor: minimalistColors.surface, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: minimalistColors.border,
  },
  closeBtnText: { ...minimalistTypography.body, color: minimalistColors.textPrimary },
  title: { ...minimalistTypography.headline, color: minimalistColors.textPrimary },
  skipBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  skipText: { ...minimalistTypography.body, color: minimalistColors.textSecondary },

  pickScrollContent: { flex: 1, paddingHorizontal: 20 },
  pickTopSection: { paddingTop: 32, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: minimalistColors.border },
  pickTitle: { ...minimalistTypography.title, color: minimalistColors.textPrimary, marginBottom: 8 },
  pickSubtitle: { ...minimalistTypography.body, color: minimalistColors.textSecondary, marginBottom: 24 },
  actionButtonsRow: { flexDirection: 'row', gap: 16 },
  
  pickBtnMain: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: minimalistColors.accent,
    paddingVertical: 16, borderRadius: minimalistRadii.lg,
    ...minimalistShadows.card,
  },
  pickBtnIcon: { fontSize: 20, marginRight: 8 },
  pickBtnMainText: { ...minimalistTypography.subhead, color: minimalistColors.textOnAccent, fontWeight: '600' },
  
  pickBtnMainAlt: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: minimalistColors.surface,
    paddingVertical: 16, borderRadius: minimalistRadii.lg,
    borderWidth: 1, borderColor: minimalistColors.border,
  },
  pickBtnMainTextAlt: { ...minimalistTypography.subhead, color: minimalistColors.textPrimary, fontWeight: '600' },

  demoSection: { paddingTop: 24 },
  demoSectionTitle: { ...minimalistTypography.headline, color: minimalistColors.textPrimary, marginBottom: 16 },
  
  demoCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: minimalistColors.surface,
    borderRadius: minimalistRadii.lg,
    padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: minimalistColors.border,
    ...minimalistShadows.card,
  },
  demoIconBox: {
    width: 48, height: 48, borderRadius: minimalistRadii.round,
    backgroundColor: minimalistColors.background,
    justifyContent: 'center', alignItems: 'center', marginRight: 16,
  },
  demoStickerIcon: { width: 36, height: 36 },
  demoTextBox: { flex: 1 },
  demoTitle: { ...minimalistTypography.subhead, color: minimalistColors.textPrimary, marginBottom: 2, fontWeight: '600' },
  demoDesc: { ...minimalistTypography.caption, color: minimalistColors.textSecondary },
  demoArrow: { fontSize: 24, color: minimalistColors.textMuted, marginLeft: 8 },

  aiScanningContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  aiScannerTitle: { ...minimalistTypography.title, color: minimalistColors.textPrimary, marginBottom: 8 },
  aiScannerSubtitle: { ...minimalistTypography.body, color: minimalistColors.textSecondary, marginBottom: 32 },
  aiProgressCard: {
    width: '100%', backgroundColor: minimalistColors.surface, borderRadius: minimalistRadii.lg,
    padding: 24, borderWidth: 1, borderColor: minimalistColors.border, gap: 16,
    ...minimalistShadows.card,
  },
  aiProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  aiCheckIcon: { fontSize: 16, color: minimalistColors.textPrimary, fontWeight: '700' },
  aiProgressLabel: { ...minimalistTypography.subhead, color: minimalistColors.textPrimary },

  reviewContent: { flex: 1, paddingHorizontal: 20, paddingTop: 12 },
  sceneSelectHint: { ...minimalistTypography.body, color: minimalistColors.textSecondary, marginBottom: 16, textAlign: 'center' },
  
  imageSelectorContainer: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: '#000',
    borderRadius: minimalistRadii.lg,
    overflow: 'hidden',
    marginBottom: 12,
  },
  imageSelectorWrapper: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  selectorImage: {
    width: '100%',
    height: '100%',
  },
  spotlightImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  faceTouchArea: {
    position: 'absolute',
    // We only use this for catching touch events; visual is handled by CSS mask
    backgroundColor: 'transparent',
  },
  faceBoxCheck: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: minimalistColors.accent,
    width: 20, height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceBoxCheckText: {
    color: '#FFF', fontSize: 12, fontWeight: '900',
  },
  markerDot: {
    position: 'absolute',
    width: 24, height: 24,
    borderRadius: 12,
    backgroundColor: minimalistColors.accent,
    borderWidth: 2, borderColor: '#FFF',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4,
  },
  markerDotText: {
    color: '#FFF', fontSize: 12, fontWeight: '700',
  },
  selectionStatsRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 8, marginBottom: 24,
  },
  selectionStatsText: {
    ...minimalistTypography.subhead, color: minimalistColors.textPrimary, fontWeight: '600',
  },
  undoText: {
    ...minimalistTypography.subhead, color: minimalistColors.accent,
  },

  aiReportCard: {
    backgroundColor: minimalistColors.surface, borderRadius: minimalistRadii.lg, padding: 20,
    borderWidth: 1, borderColor: minimalistColors.border, marginBottom: 24, gap: 12,
  },
  aiReportItem: { flexDirection: 'row', alignItems: 'flex-start' },
  aiReportLabel: { ...minimalistTypography.subhead, color: minimalistColors.textSecondary, width: 80 },
  aiReportValue: { ...minimalistTypography.subhead, color: minimalistColors.textPrimary, flex: 1, fontWeight: '600' },

  addLocationBtn: { paddingVertical: 14, alignItems: 'center', backgroundColor: minimalistColors.surface, borderRadius: minimalistRadii.lg, borderWidth: 1, borderColor: minimalistColors.border, marginTop: 24 },
  addLocationText: { ...minimalistTypography.subhead, color: minimalistColors.textPrimary, fontWeight: '600' },

  bottomBar: {
    paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 32,
    backgroundColor: minimalistColors.background, borderTopWidth: 1, borderTopColor: minimalistColors.border,
  },
  confirmBtn: {
    backgroundColor: minimalistColors.accent, borderRadius: minimalistRadii.round, paddingVertical: 16, alignItems: 'center',
    ...minimalistShadows.card,
  },
  confirmBtnText: { ...minimalistTypography.headline, color: minimalistColors.textOnAccent },
  processingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  processingText: { ...minimalistTypography.headline, color: minimalistColors.textPrimary },
  processingHint: {
    ...minimalistTypography.caption,
    color: minimalistColors.textSecondary,
    maxWidth: 280,
    textAlign: 'center',
  },
});
