import React from 'react';
import { Image, View, ImageStyle, StyleProp } from 'react-native';
import { Photo } from '../types';
import { usePhotoAsset } from '../hooks/usePhotoAsset';

interface PhotoAssetImageProps {
  photo: Photo;
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  preferCharacter?: boolean;
}

/**
 * A small wrapper that lazy-loads a photo's binary asset (uri or characterUri)
 * from IndexedDB using the usePhotoAsset hook, and renders an Image.
 */
export default function PhotoAssetImage({ photo, style, resizeMode = 'cover', preferCharacter = false }: PhotoAssetImageProps) {
  const { uri, characterUri } = usePhotoAsset(photo.id);
  
  let src = undefined;
  if (preferCharacter) {
    src = characterUri || photo.characterUri || uri || photo.uri;
  } else {
    src = uri || photo.uri || characterUri || photo.characterUri;
  }

  if (!src) return <View style={style} />;
  
  return <Image source={{ uri: src }} style={style} resizeMode={resizeMode} />;
}
