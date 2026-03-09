import React, { useState, useEffect } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import {
    IonContent,
    IonHeader,
    IonPage,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonItem,
    IonLabel,
    IonDatetime,
    IonSelect,
    IonSelectOption,
    IonButton,
    IonTextarea,
    IonToast,
    IonSpinner,
    IonText,
    IonIcon
} from '@ionic/react';
import { timeOutline, star, starOutline } from 'ionicons/icons';

import BottomNavigation from '../components/BottomNavigation';
import { Geolocation } from '@capacitor/geolocation';
import { collection, addDoc, query, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import * as geofire from 'geofire-common';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import './Marketplace.css';

const CreateJob: React.FC = () => {
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState('');

    const [dogs, setDogs] = useState<any[]>([]);
    const [selectedDogId, setSelectedDogId] = useState('');
    const [serviceType, setServiceType] = useState<'walk' | 'boarding'>('walk');
    const [walkDate, setWalkDate] = useState<string>(new Date().toISOString());
    const [walkTimeSlot, setWalkTimeSlot] = useState<string>('morning');
    const [endDate, setEndDate] = useState<string>(new Date(Date.now() + 86400000).toISOString());
    const [endTimeSlot, setEndTimeSlot] = useState<string>('afternoon');
    // Default to tomorrow
    const [notes, setNotes] = useState('');

    const location = useLocation();
    const history = useHistory();
    const [editJobId, setEditJobId] = useState<string | null>(null);
    const [preferredWalkerId, setPreferredWalkerId] = useState<string | null>(null);
    const [preferredWalkerName, setPreferredWalkerName] = useState<string>('');
    const [firstRefusalHours, setFirstRefusalHours] = useState<number>(4);
    const [allProviders, setAllProviders] = useState<any[]>([]);
    const [favorites, setFavorites] = useState<string[]>([]);


    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const editId = searchParams.get('edit');
        const providerId = searchParams.get('providerId');

        if (editId) {
            setEditJobId(editId);
            loadJobToEdit(editId);
        }
        if (providerId) {
            setPreferredWalkerId(providerId);
            getDoc(doc(db, 'providers', providerId)).then(snap => {
                if (snap.exists()) setPreferredWalkerName(snap.data().name);
            });
        }
    }, [location]);

    const loadJobToEdit = async (id: string) => {
        try {
            const docRef = doc(db, 'jobs', id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                setSelectedDogId(data.dogId);
                setServiceType(data.serviceType);
                setWalkDate(data.date);
                if (data.serviceType === 'boarding' && data.endDate) {
                    setEndDate(data.endDate);
                }
                setNotes(data.notes || '');
            }
        } catch (e) {
            setToast('Failed to load job details.');
        }
    };

    useEffect(() => {
        if (currentUser) {
            fetchDogs();
            fetchProviders();
            fetchFavorites();
        }
    }, [currentUser]);

    const fetchFavorites = async () => {
        const favsRef = collection(db, 'users', currentUser!.uid, 'favorites');
        const snapshot = await getDocs(favsRef);
        const favIds: string[] = [];
        snapshot.forEach(doc => favIds.push(doc.id));
        setFavorites(favIds);
    };


    const fetchDogs = async () => {
        const dogsRef = collection(db, 'users', currentUser!.uid, 'dogs');
        const q = query(dogsRef);
        const snapshot = await getDocs(q);
        const dogList: any[] = [];
        snapshot.forEach(doc => dogList.push({ id: doc.id, ...doc.data() }));
        setDogs(dogList);
    };

    const fetchProviders = async () => {
        const pRef = collection(db, 'providers');
        // In a real app we'd filter by geohash, here we fetch all for MVP
        const snapshot = await getDocs(pRef);
        const pList: any[] = [];
        snapshot.forEach(doc => pList.push({ id: doc.id, ...doc.data() }));
        setAllProviders(pList);
    };

    const handleCreateJob = async () => {
        if (!selectedDogId || !walkDate) {
            setToast('Please select a dog and date/time.');
            return;
        }

        setLoading(true);
        try {
            if (editJobId) {
                const docRef = doc(db, 'jobs', editJobId);
                const updateData: any = {
                    dogId: selectedDogId,
                    serviceType,
                    date: walkDate,
                    notes
                };
                if (serviceType === 'boarding') {
                    updateData.endDate = endDate;
                }

                await updateDoc(docRef, updateData);
                setToast('Request updated successfully!');
                setTimeout(() => history.push('/my-requests'), 1500);
            } else {
                // 1. Get User Location (Using current location as pickup/dropoff for v1)
                const position = await Geolocation.getCurrentPosition();
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                // 2. Compute GeoHash for fast radius queries
                const hash = geofire.geohashForLocation([lat, lng]);

                // 3. Save Job to Firestore as PENDING
                const jobData: any = {
                    customerId: currentUser!.uid,
                    dogId: selectedDogId,
                    serviceType,
                    date: walkDate,
                    timeSlot: walkTimeSlot,
                    notes,
                    status: 'pending', // Pending acceptance by a walker
                    location: { lat, lng },
                    geohash: hash,
                    createdAt: new Date()
                };


                if (preferredWalkerId) {
                    jobData.preferredWalkerId = preferredWalkerId;
                    const hours = firstRefusalHours || 0;
                    jobData.firstRefusalUntil = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
                }

                if (serviceType === 'boarding') {
                    jobData.endDate = endDate;
                    jobData.endTimeSlot = endTimeSlot;
                }


                await addDoc(collection(db, 'jobs'), jobData);
                setToast(`${serviceType === 'walk' ? 'Walk' : 'Boarding'} request created! Providers in your area will see it.`);

                // Reset form
                setSelectedDogId('');
                setNotes('');
                setTimeout(() => history.push('/my-requests'), 1500);
            }
        } catch (e: any) {
            console.error(e);
            setToast('Failed to save request. Please ensure location services are enabled.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <IonPage>
            <IonHeader className="ion-no-border">
                <IonToolbar className="pawsley-toolbar">
                    <IonButtons slot="start">
                        <IonBackButton defaultHref="/home" />
                    </IonButtons>
                    <IonTitle>Book a Walk</IonTitle>
                    <IonButtons slot="end"></IonButtons>
                </IonToolbar>
            </IonHeader>
            <IonContent className="ion-padding marketplace-content">
                <div className="marketplace-container">
                    <h2>{editJobId ? 'Edit Your Request' : 'Find a Walker Nearby'}</h2>
                    <p>{editJobId ? 'Update your walk or boarding details below.' : 'We\'ll match you with verified providers in your area.'}</p>

                    <IonItem className="marketplace-input">
                        <IonLabel>Service Type</IonLabel>
                        <IonSelect
                            value={serviceType}
                            onIonChange={e => setServiceType(e.detail.value)}
                        >
                            <IonSelectOption value="walk">Dog Walking</IonSelectOption>
                            <IonSelectOption value="boarding">Boarding (Overnight)</IonSelectOption>
                        </IonSelect>
                    </IonItem>

                    <IonItem className="marketplace-input">
                        <IonLabel>Which Dog?</IonLabel>
                        <IonSelect
                            value={selectedDogId}
                            onIonChange={e => setSelectedDogId(e.detail.value)}
                            placeholder="Select Dog"
                        >
                            {dogs.map(dog => (
                                <IonSelectOption key={dog.id} value={dog.id}>{dog.name}</IonSelectOption>
                            ))}
                        </IonSelect>
                    </IonItem>

                    <div className="unified-calendar-section" style={{ background: '#f8fafc', padding: '1.2rem', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <IonIcon icon={timeOutline} style={{ color: 'var(--ion-color-primary)', fontSize: '1.4rem' }} />
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>
                                {serviceType === 'walk' ? 'Date & Approximate Time' : 'Boarding Dates & Times'}
                            </h3>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {/* Start Date & Time Slot */}
                            <div>
                                <IonLabel style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>
                                    {serviceType === 'walk' ? 'Walk Date' : 'Drop-off Date'}
                                </IonLabel>
                                <IonDatetime
                                    value={walkDate}
                                    onIonChange={e => setWalkDate(typeof e.detail.value === 'string' ? e.detail.value : e.detail.value![0])}
                                    presentation="date"
                                    min={new Date().toISOString()}
                                    style={{ '--background': 'transparent', borderRadius: '12px', border: '1px solid #cbd5e1', marginBottom: '12px' }}
                                />
                                <IonLabel style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>
                                    Approximate Time
                                </IonLabel>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {['morning', 'afternoon', 'evening'].map(slot => (
                                        <IonButton
                                            key={slot}
                                            fill={walkTimeSlot === slot ? 'solid' : 'outline'}
                                            size="small"
                                            onClick={() => setWalkTimeSlot(slot)}
                                            style={{ flex: 1, textTransform: 'capitalize', fontSize: '0.8rem' }}
                                        >
                                            {slot}
                                        </IonButton>
                                    ))}
                                </div>
                            </div>

                            {/* End Date & Time Slot (for boarding) */}
                            {serviceType === 'boarding' && (
                                <div style={{ paddingTop: '16px', borderTop: '1px dashed #cbd5e1' }}>
                                    <IonLabel style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>
                                        Pick-up Date
                                    </IonLabel>
                                    <IonDatetime
                                        value={endDate}
                                        onIonChange={e => setEndDate(typeof e.detail.value === 'string' ? e.detail.value : e.detail.value![0])}
                                        presentation="date"
                                        min={walkDate}
                                        style={{ '--background': 'transparent', borderRadius: '12px', border: '1px solid #cbd5e1', marginBottom: '12px' }}
                                    />
                                    <IonLabel style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>
                                        Approximate Time
                                    </IonLabel>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        {['morning', 'afternoon', 'evening'].map(slot => (
                                            <IonButton
                                                key={slot}
                                                fill={endTimeSlot === slot ? 'solid' : 'outline'}
                                                size="small"
                                                onClick={() => setEndTimeSlot(slot)}
                                                style={{ flex: 1, textTransform: 'capitalize', fontSize: '0.8rem' }}
                                            >
                                                {slot}
                                            </IonButton>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>



                    {!editJobId && (
                        <div className="glass-card" style={{ padding: '16px', margin: '16px 0', border: '2px solid var(--ion-color-primary)', background: '#f8fafc' }}>
                            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.05rem', color: '#1e293b', fontWeight: 700 }}>
                                ⭐️ Preferred Walker (Optional)
                            </h3>
                            <IonItem lines="none" style={{ '--background': 'transparent', '--padding-start': '0', marginBottom: '8px' }}>
                                <IonSelect
                                    value={preferredWalkerId}
                                    onIonChange={e => {
                                        const val = e.detail.value;
                                        setPreferredWalkerId(val);
                                        if (val) {
                                            const p = allProviders.find(p => p.id === val);
                                            if (p) setPreferredWalkerName(p.name);
                                        } else {
                                            setPreferredWalkerName('');
                                        }
                                    }}
                                    interface="popover"
                                    placeholder="Open to everyone"
                                    style={{ background: '#fff', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', padding: '10px' }}
                                >
                                    <IonSelectOption value={null}>Open to everyone</IonSelectOption>
                                    {allProviders.map(p => (
                                        <IonSelectOption key={p.id} value={p.id}>
                                            {favorites.includes(p.id) ? '⭐️ ' : ''}{p.name}
                                        </IonSelectOption>
                                    ))}

                                </IonSelect>
                            </IonItem>

                            {preferredWalkerId && (
                                <>
                                    <IonItem lines="none" style={{ '--background': 'transparent', '--padding-start': '0' }}>
                                        <IonLabel position="stacked" style={{ color: '#475569', fontWeight: 600, marginBottom: '8px' }}>First Refusal Window</IonLabel>
                                        <IonSelect
                                            value={firstRefusalHours}
                                            onIonChange={e => setFirstRefusalHours(e.detail.value)}
                                            interface="popover"
                                            style={{ background: '#fff', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', padding: '10px' }}
                                        >
                                            <IonSelectOption value={2}>2 Hours</IonSelectOption>
                                            <IonSelectOption value={4}>4 Hours</IonSelectOption>
                                            <IonSelectOption value={12}>12 Hours</IonSelectOption>
                                            <IonSelectOption value={24}>24 Hours</IonSelectOption>
                                            <IonSelectOption value={48}>48 Hours</IonSelectOption>
                                        </IonSelect>
                                    </IonItem>
                                    <p style={{ margin: '8px 0 0 0', fontSize: '0.8rem', color: '#64748b', lineHeight: '1.4' }}>
                                        They get exclusive access to this request until the window expires. After that, it becomes visible to all nearby walkers.
                                    </p>
                                    <IonButton
                                        fill="clear"
                                        size="small"
                                        onClick={() => setPreferredWalkerId(null)}
                                        style={{ '--color': '#ef4444', margin: '8px 0 0 0', '--padding-start': '0' }}
                                    >
                                        Clear preferred walker
                                    </IonButton>
                                </>
                            )}
                        </div>
                    )}

                    <IonItem className="marketplace-input">
                        <IonLabel position="floating">Instructions / Notes</IonLabel>
                        <IonTextarea
                            value={notes}
                            onIonChange={e => setNotes(e.detail.value!)}
                            rows={3}
                            placeholder="e.g. Bring own treats, the key is under the mat..."
                        />
                    </IonItem>

                    <div className="ion-margin-top">
                        <IonText color="medium" className="ion-text-center" style={{ display: 'block', marginBottom: '1rem', fontSize: '0.9rem' }}>
                            * Your current location will be used to find nearby providers
                        </IonText>
                        <IonButton
                            expand="block"
                            className="action-btn"
                            onClick={handleCreateJob}
                            disabled={loading || dogs.length === 0}
                        >
                            {loading ? <IonSpinner name="crescent" /> : (editJobId ? 'Save Changes' : 'Confirm Request')}
                        </IonButton>
                    </div>
                </div>

                <IonToast
                    isOpen={!!toast}
                    message={toast}
                    duration={3000}
                    onDidDismiss={() => setToast('')}
                />
            </IonContent>
            <BottomNavigation />
        </IonPage >
    );
};

export default CreateJob;
