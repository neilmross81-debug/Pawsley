import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { initializePushNotifications } from '../utils/notifications';
import { Capacitor } from '@capacitor/core';


interface AuthContextType {
    currentUser: User | null;
    userRole: 'customer' | 'provider' | null;
    loading: boolean;
    refreshUserRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    currentUser: null,
    userRole: null,
    loading: true,
    refreshUserRole: async () => { }
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [userRole, setUserRole] = useState<'customer' | 'provider' | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchRole = async (user: User): Promise<'customer' | 'provider' | null> => {
        try {
            const [customerSnap, providerSnap] = await Promise.all([
                getDoc(doc(db, 'users', user.uid)),
                getDoc(doc(db, 'providers', user.uid))
            ]);

            if (providerSnap.exists()) {
                setUserRole('provider');
                return 'provider';
            } else if (customerSnap.exists()) {
                setUserRole('customer');
                return 'customer';
            } else {
                setUserRole(null);
                return null;
            }
        } catch (error) {
            console.error("Error fetching user role:", error);
            setUserRole(null);
            return null;
        }
    };


    const refreshUserRole = async () => {
        if (currentUser) {
            await fetchRole(currentUser);
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);
            if (user) {
                const role = await fetchRole(user);
                // Initialize push notifications if on native platform
                if (Capacitor.isNativePlatform()) {
                    initializePushNotifications(user.uid, role || 'customer');
                }
            } else {


                setUserRole(null);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    return (
        <AuthContext.Provider value={{ currentUser, userRole, loading, refreshUserRole }}>
            {children}
        </AuthContext.Provider>
    );
};
