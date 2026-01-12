import { db } from './firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';

export interface SponsorBio {
  de: string;
  en: string;
  es: string;
  fr: string;
  it: string;
  nl: string;
}

export interface Sponsor {
  id: string;
  name: string;
  tier: 'silver' | 'gold' | 'platinum';
  logoUrl: string;
  websiteUrl: string;
  bio: SponsorBio;
  order: number;
  isActive: boolean;
  logoScale?: number; // Optional scale factor (0.0-1.0) for logos without whitespace
  createdAt: any;
  updatedAt: any;
}

export async function getActiveSponsors(): Promise<Sponsor[]> {
  try {
    const sponsorsRef = collection(db, 'sponsors');
    const q = query(
      sponsorsRef,
      where('isActive', '==', true),
      orderBy('order', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    const sponsors: Sponsor[] = [];
    
    querySnapshot.forEach((doc) => {
      sponsors.push({
        id: doc.id,
        ...doc.data()
      } as Sponsor);
    });
    
    return sponsors;
  } catch (error) {
    console.error('Error fetching sponsors:', error);
    return [];
  }
}

export function getSponsorsByTier(sponsors: Sponsor[]) {
  const tierOrder = { platinum: 1, gold: 2, silver: 3 };
  
  const grouped = sponsors.reduce((acc, sponsor) => {
    if (!acc[sponsor.tier]) {
      acc[sponsor.tier] = [];
    }
    acc[sponsor.tier].push(sponsor);
    return acc;
  }, {} as Record<string, Sponsor[]>);
  
  // Return in tier priority order
  return Object.keys(grouped)
    .sort((a, b) => tierOrder[a as keyof typeof tierOrder] - tierOrder[b as keyof typeof tierOrder])
    .reduce((sortedGrouped, tier) => {
      sortedGrouped[tier] = grouped[tier];
      return sortedGrouped;
    }, {} as Record<string, Sponsor[]>);
}