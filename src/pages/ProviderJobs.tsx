import React, { useState, useEffect } from 'react';
import {
    IonContent,
    IonHeader,
    IonPage,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonLabel,
    IonSpinner,
    IonIcon,
    IonButton,
    IonBadge,
    IonToast,
    IonItem,
    IonAccordion,
    IonAccordionGroup
} from '@ionic/react';

import BottomNavigation from '../components/BottomNavigation';
import { timeOutline, pawOutline, checkmarkCircleOutline } from 'ionicons/icons';
import { collection, getDocs, doc, updateDoc, getDoc, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import './Marketplace.css';

const ProviderJobs: React.FC = () => {
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [pendingJobs, setPendingJobs] = useState<any[]>([]);
    const [bookedJobs, setBookedJobs] = useState<any[]>([]);
    const [historyJobs, setHistoryJobs] = useState<any[]>([]);

    // Caches to avoid redundant fetches
    const [customerCache, setCustomerCache] = useState<{ [key: string]: any }>({});
    const [dogCache, setDogCache] = useState<{ [key: string]: any }>({});

    const [toastMessage, setToastMessage] = useState('');

    useEffect(() => {
        if (currentUser) {
            fetchJobs();
        }
    }, [currentUser]);

    const fetchJobs = async () => {
        setLoading(true);
        try {
            const jobsRef = collection(db, 'jobs');
            const snapshot = await getDocs(jobsRef);

            const allPending: any[] = [];
            const allBooked: any[] = [];
            const allHistory: any[] = [];

            const uniqueCustomerIds = new Set<string>();
            const uniqueDogIds = new Set<{ customerId: string, dogId: string }>();

            snapshot.forEach(doc => {
                const data = doc.data();
                const jobWithId = { id: doc.id, ...data };

                if (data.status === 'pending') {
                    if (data.preferredWalkerId && data.firstRefusalUntil) {
                        const refusalUntil = new Date(data.firstRefusalUntil).getTime();
                        if (Date.now() < refusalUntil && data.preferredWalkerId !== currentUser!.uid) {
                            return;
                        }
                    }
                    allPending.push(jobWithId);
                } else if (data.providerId === currentUser!.uid) {
                    if (data.status === 'accepted') {
                        allBooked.push(jobWithId);
                    } else if (data.status === 'completed' || data.status === 'cancelled') {
                        allHistory.push(jobWithId);
                    }
                }

                if (data.customerId) uniqueCustomerIds.add(data.customerId);
                if (data.customerId && data.dogId) uniqueDogIds.add({ customerId: data.customerId, dogId: data.dogId });
            });

            const newCustomerCache = { ...customerCache };
            for (const cId of uniqueCustomerIds) {
                if (!newCustomerCache[cId]) {
                    const cDoc = await getDoc(doc(db, 'users', cId));
                    if (cDoc.exists()) newCustomerCache[cId] = cDoc.data();
                }
            }
            setCustomerCache(newCustomerCache);

            const newDogCache = { ...dogCache };
            for (const { customerId, dogId } of uniqueDogIds) {
                const cacheKey = `${customerId}_${dogId}`;
                if (!newDogCache[cacheKey]) {
                    const dDoc = await getDoc(doc(db, 'users', customerId, 'dogs', dogId));
                    if (dDoc.exists()) newDogCache[cacheKey] = dDoc.data();
                }
            }
            setDogCache(newDogCache);

            const sortByDate = (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime();
            setPendingJobs(allPending.sort(sortByDate));
            setBookedJobs(allBooked.sort(sortByDate));
            setHistoryJobs(allHistory.sort(sortByDate).reverse());
        } catch (e) {
            console.error("Failed to fetch jobs", e);
            setToastMessage("Could not load jobs.");
        } finally {
            setLoading(false);
        }
    };

    const handleAcceptJob = async (jobId: string) => {
        setLoading(true);
        try {
            const jobRef = doc(db, 'jobs', jobId);
            const jobSnap = await getDoc(jobRef);
            const jobData = jobSnap.data();

            await updateDoc(jobRef, {
                status: 'accepted',
                providerId: currentUser!.uid
            });

            if (jobData && jobData.customerId) {
                const serviceLabel = jobData.serviceType === 'boarding' ? 'boarding stay' : 'walk';
                const jobDate = jobData.date ? new Date(jobData.date) : null;
                const dateStr = jobDate ? jobDate.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }) : 'scheduled date';
                const timeStr = jobDate ? jobDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

                await addDoc(collection(db, 'users', jobData.customerId, 'notifications'), {
                    title: `${serviceLabel.charAt(0).toUpperCase() + serviceLabel.slice(1)} accepted! 🎉`,
                    message: `Your ${serviceLabel} on ${dateStr}${timeStr ? ' at ' + timeStr : ''} has been accepted by a walker.`,
                    jobId, read: false, createdAt: new Date()
                });

                await addDoc(collection(db, 'users', currentUser!.uid, 'notifications'), {
                    title: `Booking confirmed: ${serviceLabel}`,
                    message: `You've accepted a ${serviceLabel} on ${dateStr}${timeStr ? ' at ' + timeStr : ''}.`,
                    jobId, read: false, createdAt: new Date()
                });
            }

            setToastMessage('Job Accepted!');
            fetchJobs();
        } catch (error) {
            console.error('Error accepting job', error);
            setToastMessage('Failed to accept job.');
            setLoading(false);
        }
    };

    const handleCompleteJob = async (jobId: string) => {
        setLoading(true);
        try {
            await updateDoc(doc(db, 'jobs', jobId), { status: 'completed' });

            const jobSnap = await getDoc(doc(db, 'jobs', jobId));
            const jobData = jobSnap.data();

            if (jobData && jobData.customerId) {
                const serviceLabel = jobData.serviceType === 'boarding' ? 'boarding stay' : 'walk';
                await addDoc(collection(db, 'users', jobData.customerId, 'notifications'), {
                    title: `${serviceLabel.charAt(0).toUpperCase() + serviceLabel.slice(1)} Completed! 🐾`,
                    message: `Your walker has marked the ${serviceLabel} as completed.`,
                    jobId, read: false, createdAt: new Date()
                });
            }

            setToastMessage('Job marked as completed!');
            fetchJobs();
        } catch (error) {
            console.error('Error completing job', error);
            setToastMessage('Failed to complete job.');
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        const options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    const renderJobCard = (job: any) => {
        const customer = customerCache[job.customerId];
        const dog = dogCache[`${job.customerId}_${job.dogId}`];
        const isPast = new Date(job.date) < new Date();

        return (
            <div key={job.id} className="glass-card" style={{ padding: '0', overflow: 'hidden', opacity: (job.status === 'completed' || job.status === 'cancelled') ? 0.7 : 1, marginBottom: '12px' }}>
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 16px', borderBottom: '1px solid #e2e8f0',
                    backgroundColor: job.serviceType === 'boarding' ? 'rgba(88, 86, 214, 0.05)' : 'rgba(0, 122, 255, 0.05)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <IonIcon icon={job.serviceType === 'boarding' ? timeOutline : pawOutline} style={{ color: job.serviceType === 'boarding' ? '#5856D6' : '#007aff' }} />
                        <span style={{ fontWeight: 700, color: '#1e293b', textTransform: 'uppercase', fontSize: '0.8rem' }}>{job.serviceType}</span>
                    </div>
                    <IonBadge color={job.status === 'completed' ? 'success' : job.status === 'accepted' ? 'primary' : 'medium'}>
                        {job.status.toUpperCase()}
                    </IonBadge>
                </div>

                <div style={{ padding: '16px' }}>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', color: '#0f172a', fontWeight: 700 }}>
                        {job.serviceType === 'boarding' ? 'Drop-off: ' : ''}{formatDate(job.date)}
                    </h3>
                    {job.serviceType === 'boarding' && job.endDate && (
                        <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', color: '#0f172a', fontWeight: 700 }}>
                            Pick-up: {formatDate(job.endDate)}
                        </h3>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {dog?.photoUrl ? (
                            <img src={dog.photoUrl} alt={dog.name} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                            <div style={{ width: '40px', height: '40px', borderRadius: '20px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <IonIcon icon={pawOutline} style={{ color: '#94a3b8' }} />
                            </div>
                        )}
                        <div>
                            <p style={{ margin: 0, fontWeight: 600 }}>{dog?.name || 'Loading...'}</p>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Owner: {customer?.name || 'Loading...'}</p>
                        </div>
                    </div>

                    <div style={{ marginTop: '16px' }}>
                        {job.status === 'pending' && (
                            <IonButton expand="block" className="premium-btn primary-btn" onClick={() => handleAcceptJob(job.id)} disabled={isPast}>
                                {isPast ? 'Expired' : 'Accept Request'}
                            </IonButton>
                        )}
                        {job.status === 'accepted' && (
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <IonButton routerLink={`/chat?customerId=${job.customerId}&providerId=${currentUser!.uid}`} fill="outline" style={{ flex: 1 }}>Message</IonButton>
                                <IonButton onClick={() => handleCompleteJob(job.id)} color="success" style={{ flex: 1 }}>Complete</IonButton>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <IonPage>
            <IonHeader className="ion-no-border">
                <IonToolbar className="pawsley-toolbar">
                    <IonButtons slot="start">
                        <IonBackButton defaultHref="/home" />
                    </IonButtons>
                    <IonTitle>Jobs & Schedule</IonTitle>
                </IonToolbar>
            </IonHeader>

            <IonContent className="ion-padding marketplace-content" style={{ '--padding-bottom': '80px' }}>
                <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', marginTop: '2rem' }}><IonSpinner name="crescent" color="primary" /></div>
                    ) : (
                        <IonAccordionGroup multiple={true} defaultValue={['booked']}>
                            <IonAccordion value="available">
                                <IonItem slot="header">
                                    <IonLabel style={{ fontWeight: 700 }}>Available Hub</IonLabel>
                                    <IonBadge slot="end" color="primary">{pendingJobs.length}</IonBadge>
                                </IonItem>
                                <div slot="content" style={{ padding: '16px 0' }}>
                                    {pendingJobs.map(job => renderJobCard(job))}
                                    {pendingJobs.length === 0 && <p style={{ textAlign: 'center', color: '#64748b' }}>No requests.</p>}
                                </div>
                            </IonAccordion>

                            <IonAccordion value="booked" style={{ marginTop: '12px' }}>
                                <IonItem slot="header">
                                    <IonLabel style={{ fontWeight: 700 }}>My Schedule</IonLabel>
                                    <IonBadge slot="end" color="success">{bookedJobs.length}</IonBadge>
                                </IonItem>
                                <div slot="content" style={{ padding: '16px 0' }}>
                                    {bookedJobs.map(job => renderJobCard(job))}
                                    {bookedJobs.length === 0 && <p style={{ textAlign: 'center', color: '#64748b' }}>No jobs booked.</p>}
                                </div>
                            </IonAccordion>

                            <IonAccordion value="history" style={{ marginTop: '12px' }}>
                                <IonItem slot="header">
                                    <IonLabel style={{ fontWeight: 700 }}>History</IonLabel>
                                    <IonBadge slot="end" color="medium">{historyJobs.length}</IonBadge>
                                </IonItem>
                                <div slot="content" style={{ padding: '16px 0' }}>
                                    {historyJobs.map(job => renderJobCard(job))}
                                    {historyJobs.length === 0 && <p style={{ textAlign: 'center', color: '#64748b' }}>No history yet.</p>}
                                </div>
                            </IonAccordion>
                        </IonAccordionGroup>
                    )}
                </div>
            </IonContent>
            <BottomNavigation />
            <IonToast isOpen={!!toastMessage} message={toastMessage} duration={2000} onDidDismiss={() => setToastMessage('')} position="bottom" />
        </IonPage>
    );
};

export default ProviderJobs;
