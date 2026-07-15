import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  arrayUnion,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from './AuthContext';
import type { Clinic, ClinicMember, ClinicSettings } from '../types';

type ClinicContextType = {
  activeClinic: Clinic | null;
  clinics: Clinic[];
  clinicRole: 'owner' | 'doctor' | 'staff' | null;
  loading: boolean;
  switchClinic: (clinicId: string) => Promise<boolean>;
  createClinic: (name: string, address: string, phone: string, doctorRegNo?: string) => Promise<string>;
  refreshClinics: () => Promise<void>;
};

const ClinicContext = createContext<ClinicContextType | null>(null);

export const ClinicProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, refreshProfile } = useAuth();
  const [activeClinic, setActiveClinic] = useState<Clinic | null>(null);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [clinicRole, setClinicRole] = useState<'owner' | 'doctor' | 'staff' | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchClinics = async () => {
    if (!user || !profile) {
      setActiveClinic(null);
      setClinics([]);
      setClinicRole(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const clinicIds = profile.clinicIds || [];

      if (clinicIds.length === 0) {
        setClinics([]);
        setActiveClinic(null);
        setClinicRole(null);
        setLoading(false);
        return;
      }

      // Fetch all clinics the user belongs to
      const clinicList: Clinic[] = [];
      for (const clinicId of clinicIds) {
        const clinicDoc = await getDoc(doc(db, 'clinics', clinicId));
        if (clinicDoc.exists()) {
          clinicList.push({ id: clinicDoc.id, ...clinicDoc.data() } as Clinic);
        }
      }
      setClinics(clinicList);

      // Set active clinic
      const activeId = profile.activeClinicId;
      if (activeId) {
        const active = clinicList.find((c) => c.id === activeId);
        if (active) {
          setActiveClinic(active);
          // Fetch user's role in this clinic
          const memberDoc = await getDoc(
            doc(db, 'clinics', activeId, 'members', user.uid)
          );
          if (memberDoc.exists()) {
            setClinicRole(memberDoc.data().role);
          }
        } else {
          setActiveClinic(null);
          setClinicRole(null);
        }
      } else if (clinicList.length > 0) {
        // Auto-select first clinic
        const first = clinicList[0];
        setActiveClinic(first);
        await updateDoc(doc(db, 'users', user.uid), {
          activeClinicId: first.id,
        });
        const memberDoc = await getDoc(
          doc(db, 'clinics', first.id, 'members', user.uid)
        );
        if (memberDoc.exists()) {
          setClinicRole(memberDoc.data().role);
        }
      } else {
        setActiveClinic(null);
        setClinicRole(null);
      }
    } catch (err) {
      console.error('Error fetching clinics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClinics();
  }, [user, profile]);

  const switchClinic = async (clinicId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      setLoading(true);
      // Update active clinic in user profile
      await updateDoc(doc(db, 'users', user.uid), {
        activeClinicId: clinicId,
      });

      // Fetch the clinic
      const clinicDoc = await getDoc(doc(db, 'clinics', clinicId));
      if (clinicDoc.exists()) {
        setActiveClinic({ id: clinicDoc.id, ...clinicDoc.data() } as Clinic);

        // Fetch role
        const memberDoc = await getDoc(
          doc(db, 'clinics', clinicId, 'members', user.uid)
        );
        if (memberDoc.exists()) {
          setClinicRole(memberDoc.data().role);
        }

        await refreshProfile();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error switching clinic:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const createClinic = async (
    name: string,
    address: string,
    phone: string,
    doctorRegNo?: string
  ): Promise<string> => {
    if (!user || !profile) throw new Error('Must be logged in');

    const clinicRef = doc(collection(db, 'clinics'));
    const clinicId = clinicRef.id;

    const defaultSettings: ClinicSettings = {
      prescriptionHeader: name,
      prescriptionFooter: 'Get well soon!',
      defaultPaymentTermDays: 50,
      lowStockThreshold: 10,
    };

    const clinicData = {
      name,
      address,
      phone,
      doctorRegNo: doctorRegNo || '',
      logoUrl: '',
      ownerId: user.uid,
      settings: defaultSettings,
      createdAt: serverTimestamp(),
    };

    // Create clinic document
    await setDoc(clinicRef, clinicData);

    // Add creator as owner member
    await setDoc(doc(db, 'clinics', clinicId, 'members', user.uid), {
      uid: user.uid,
      name: profile.name,
      email: profile.email,
      role: 'owner',
      joinedAt: serverTimestamp(),
    });

    // Update user profile with new clinic
    await updateDoc(doc(db, 'users', user.uid), {
      clinicIds: arrayUnion(clinicId),
      activeClinicId: clinicId,
    });

    // Refresh
    await refreshProfile();
    return clinicId;
  };

  const refreshClinics = async () => {
    await fetchClinics();
  };

  return (
    <ClinicContext.Provider
      value={{
        activeClinic,
        clinics,
        clinicRole,
        loading,
        switchClinic,
        createClinic,
        refreshClinics,
      }}
    >
      {children}
    </ClinicContext.Provider>
  );
};

export const useClinic = () => {
  const context = useContext(ClinicContext);
  if (!context) {
    throw new Error('useClinic must be used within a ClinicProvider');
  }
  return context;
};
