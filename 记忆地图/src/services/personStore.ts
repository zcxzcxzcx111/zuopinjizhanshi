import AsyncStorage from '@react-native-async-storage/async-storage';
import { PersonProfile } from '../types';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = '@memory_map_people';

export const personStore = {
  async getProfiles(): Promise<PersonProfile[]> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      if (json) {
        return JSON.parse(json);
      }
    } catch (e) {
      console.error('Failed to get people profiles', e);
    }
    return [];
  },

  async addProfile(name: string, faceDescriptor: number[], baseCharacterUri?: string): Promise<PersonProfile> {
    const profiles = await this.getProfiles();
    const existing = profiles.find(p => p.name === name);
    if (existing) {
      // Re-use existing profile to prevent duplicate IDs for the same character name
      return existing;
    }

    const newProfile: PersonProfile = {
      id: uuidv4(),
      name,
      faceDescriptor,
      baseCharacterUri,
    };
    profiles.push(newProfile);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
    return newProfile;
  },

  async updateProfileBaseCharacter(id: string, baseCharacterUri: string): Promise<void> {
    const profiles = await this.getProfiles();
    const index = profiles.findIndex(p => p.id === id);
    if (index >= 0) {
      profiles[index].baseCharacterUri = baseCharacterUri;
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
    }
  },

  async updateProfileName(id: string, name: string): Promise<void> {
    const profiles = await this.getProfiles();
    const index = profiles.findIndex(p => p.id === id);
    if (index >= 0) {
      profiles[index].name = name;
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
    }
  },

  // Calculate Euclidean distance between two 128D descriptors
  calculateDistance(desc1: number[], desc2: number[]): number {
    if (desc1.length !== 128 || desc2.length !== 128) return 1.0; // Invalid
    let sum = 0;
    for (let i = 0; i < 128; i++) {
      const diff = desc1[i] - desc2[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  },

  async findMatchingProfile(faceDescriptor: number[], threshold = 0.45): Promise<PersonProfile | null> {
    const profiles = await this.getProfiles();
    let bestMatch: PersonProfile | null = null;
    let minDistance = Infinity;

    for (const profile of profiles) {
      const dist = this.calculateDistance(profile.faceDescriptor, faceDescriptor);
      if (dist < minDistance) {
        minDistance = dist;
        bestMatch = profile;
      }
    }

    if (bestMatch && minDistance < threshold) {
      return bestMatch;
    }
    return null;
  }
};
