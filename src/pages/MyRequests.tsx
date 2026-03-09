import React, { useState, useEffect } from 'react';
import {
    IonContent,
    IonHeader,
    IonPage,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonList,
    IonItem,
    IonLabel,
    IonBadge,
    IonButton,
    IonIcon,
    IonSpinner,
    IonAlert,
    IonAccordion,
    IonAccordionGroup
} from '@ionic/react';

import BottomNavigation from '../components/BottomNavigation';
import { timeOutline, createOutline, trashOutline, alertCircleOutline, chatbubbleEllipsesOutline } from 'ionicons/icons';
import { collection, query, where, getDocs, doc, deleteDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import './Marketplace.css';

const MyRequests: React.FC = () => {
    const { currentUser } = useAuth();
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [dogCache, setDogCache] = useState<{ [key: string]: string }>({});
    const [providerCache, setProviderCache] = useState<{ [key: string]: any }>({});
    const [deleteJobId, setDeleteJobId] = useState<string | null>(null);
    const [cancelFeeJob, setCancelFeeJob] = useState<{ id: string, cutoff: number, providerName: string } | null>(null);

    // Categorized jobs
    const [pendingJobs, setPendingJobs] = useState<any[]>([]);
    const [bookedJobs, setBookedJobs] = useState<any[]>([]);
    const [historyJobs, setHistoryJobs] = useState<any[]>([]);


    useEffect(() => {
        if (currentUser) {
            fetchMyJobs();
        }
    }, [currentUser]);

    const fetchMyJobs = async () => {
        setLoading(true);
        try {
            // Fetch Jobs
            const jobsRef = collection(db, 'jobs');
            const q = query(jobsRef, where("customerId", "==", currentUser!.uid));
            const snapshot = await getDocs(q);
            const jobList: any[] = [];

            // Collect unique dog IDs to fetch their names efficiently
            const uniqueDogIds = new Set<string>();
            const uniqueProviderIds = new Set<string>();

            snapshot.forEach(doc => {
                const data = doc.data();
                jobList.push({ id: doc.id, ...data });
                uniqueDogIds.add(data.dogId);
                if (data.providerId) uniqueProviderIds.add(data.providerId);
            });

            // Fetch Dog Names for caching
            const newDogCache = { ...dogCache };
            for (const dogId of uniqueDogIds) {
                if (!newDogCache[dogId]) {
                    const dogDoc = await getDocs(query(collection(db, 'users', currentUser!.uid, 'dogs')));
                    // Finding the specific dog in the query output
                    dogDoc.forEach(d => {
                        if (d.id === dogId) {
                            newDogCache[dogId] = d.data().name;
                        }
                    });
                }
            }
            setDogCache(newDogCache);

            // Fetch Provider Data for Cancellation Logic
            const newProviderCache = { ...providerCache };
            for (const pId of uniqueProviderIds) {
                if (!newProviderCache[pId]) {
                    const pDoc = await getDoc(doc(db, 'providers', pId));
                    if (pDoc.exists()) newProviderCache[pId] = pDoc.data();
                }
            }
            setProviderCache(newProviderCache);

            // Sort jobs by date ascending (closest first)
            jobList.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            // Categorize
            setPendingJobs(jobList.filter(j => j.status === 'pending'));
            setBookedJobs(jobList.filter(j => j.status === 'accepted'));
            setHistoryJobs(jobList.filter(j => j.status === 'completed' || j.status === 'cancelled').reverse());

            setJobs(jobList);


        } catch (e) {
            console.error("Failed to fetch jobs", e);
        } finally {
            setLoading(false);
        }
    };

    const initiateCancellation = (job: any) => {
        if (job.status === 'pending') {
            setDeleteJobId(job.id);
            return;
        }

        if (job.status === 'accepted' && job.providerId) {
            const providerData = providerCache[job.providerId];
            if (providerData) {
                const cutoffHours = providerData.cancellationWindowHours || 24;
                const jobTime = new Date(job.date).getTime();
                const now = new Date().getTime();
                const hoursUntilJob = (jobTime - now) / (1000 * 60 * 60);

                if (hoursUntilJob < cutoffHours) {
                    setCancelFeeJob({ id: job.id, cutoff: cutoffHours, providerName: providerData.name || 'Your Walker' });
                    return;
                }
            }
            setDeleteJobId(job.id); // Proceed normally without fee warning
        }
    };

    const confirmCancellation = async (jobId: string, applyFee: boolean = false) => {
        try {
            const jobToCancel = jobs.find(j => j.id === jobId);
            if (jobToCancel?.status === 'pending') {
                await deleteDoc(doc(db, 'jobs', jobId));
            } else {
                await updateDoc(doc(db, 'jobs', jobId), {
                    status: 'cancelled',
                    feeApplied: applyFee
                });
            }
            setJobs(jobs.filter(j => j.id !== jobId));
            setDeleteJobId(null);
            setCancelFeeJob(null);
        } catch (e) {
            console.error("Failed to cancel job", e);
        }
    };

    const formatDate = (dateString: string) => {
        const options: Intl.DateTimeFormatOptions = {
            weekday: 'short', month: 'short', day: 'numeric',
            hour: 'numeric', minute: '2-digit'
        };
        return new Date(dateString).toLocaleDateString('en-GB', options);
    };

    const renderJobCard = (job: any) => (
        <div key={job.id} style={{ position: 'relative', zIndex: 1, background: '#fff', padding: '1.2rem', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            {/* Left Square Image */}
            <div style={{ flexShrink: 0 }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: 'var(--ion-color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ion-color-primary-contrast)', fontSize: '1.6rem' }}>
                    {job.serviceType === 'boarding' ? '🏠' : '🐕'}
                </div>
            </div>

            {/* Right Content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', color: '#1c1c1e', fontWeight: 700 }}>
                            {job.serviceType === 'boarding' ? 'Boarding' : 'Walk'} for {dogCache[job.dogId] || 'Dog'}
                        </h3>
                        <div style={{ margin: 0, color: '#475569', fontSize: '0.85rem' }}>
                            <p style={{ margin: '0 0 2px 0' }}>
                                <IonIcon icon={timeOutline} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                                {job.serviceType === 'boarding' ? 'Drop-off: ' : ''}{formatDate(job.date)}
                            </p>
                            {job.serviceType === 'boarding' && job.endDate && (
                                <p style={{ margin: 0 }}>
                                    <IonIcon icon={timeOutline} style={{ verticalAlign: 'middle', marginRight: '4px', opacity: 0 }} />
                                    Pick-up: {formatDate(job.endDate)}
                                </p>
                            )}
                        </div>
                    </div>
                    <IonBadge color={job.status === 'pending' ? 'warning' : job.status === 'accepted' ? 'success' : 'light'} style={{ fontSize: '0.7rem', padding: '4px 6px', borderRadius: '8px' }}>
                        {job.status.toUpperCase()}
                    </IonBadge>
                </div>

                {job.status === 'accepted' && job.providerId && (
                    <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                        <span style={{ fontSize: '1.2rem' }}>🦺</span>
                        <div style={{ flex: 1 }}>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Booked With</p>
                            <p style={{ margin: '2px 0 0 0', color: '#1c1c1e', fontWeight: 700 }}>
                                {providerCache[job.providerId]?.name || 'Your Walker'}
                            </p>
                        </div>
                    </div>
                )}

                {job.notes && (
                    <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '6px', fontSize: '0.85rem', color: '#475569', marginTop: '10px' }}>
                        <strong>Notes:</strong> {job.notes}
                    </div>
                )}

                {(job.status === 'pending' || job.status === 'accepted') && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                        <IonButton routerLink={`/create-job?edit=${job.id}`} fill="outline" color="medium" size="small" style={{ '--border-radius': '8px', flex: 1, margin: 0 }}>
                            Edit
                        </IonButton>
                        {job.status === 'accepted' && (
                            <IonButton routerLink={`/chat?customerId=${currentUser!.uid}&providerId=${job.providerId}`} fill="outline" style={{ '--color': 'var(--ion-color-primary)', '--border-color': 'var(--ion-color-primary)', '--border-radius': '8px', flex: 1, margin: 0 }}>
                                Chat
                            </IonButton>
                        )}
                        <IonButton fill="clear" color="danger" size="small" onClick={() => initiateCancellation(job)} style={{ margin: 0 }}>
                            Cancel
                        </IonButton>
                    </div>
                )}
            </div>
        </div>
    );


    if (loading) return <IonSpinner name="dots" className="ion-margin" />;

    return (
        <IonPage>
            <IonHeader className="ion-no-border">
                <IonToolbar className="pawsley-toolbar">
                    <IonButtons slot="start">
                        <IonBackButton defaultHref="/home" />
                    </IonButtons>
                    <IonTitle>My Bookings</IonTitle>
                    <IonButtons slot="end"></IonButtons>
                </IonToolbar>
            </IonHeader>
            <IonContent className="ion-padding marketplace-content" style={{ '--padding-bottom': '70px' }}>
                <div className="marketplace-container" style={{ maxWidth: '600px', margin: '0 auto' }}>

                    {jobs.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                            <IonIcon icon={timeOutline} style={{ fontSize: '4rem', color: '#cbd5e1', marginBottom: '1rem' }} />
                            <h2 style={{ fontFamily: 'Inter', color: '#1e293b', fontWeight: 700 }}>No Bookings Yet</h2>
                            <p style={{ color: '#64748b' }}>You haven't scheduled any walks or boardings yet.</p>
                            <IonButton routerLink="/create-job" className="premium-btn primary-btn" style={{ marginTop: '1rem' }}>
                                Book a Service
                            </IonButton>
                        </div>
                    ) : (
                        <IonAccordionGroup multiple={true} value={['booked', 'pending']}>
                            <IonAccordion value="booked" className="jobs-accordion">
                                <IonItem slot="header" style={{ '--padding-start': '0' }}>
                                    <div className="jobs-accordion-header">
                                        <IonLabel>Upcoming Bookings</IonLabel>
                                        <IonBadge color="success">{bookedJobs.length}</IonBadge>
                                    </div>
                                </IonItem>
                                <div slot="content" style={{ padding: '16px 0' }}>
                                    {bookedJobs.length === 0 ? (
                                        <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>No upcoming bookings</p>
                                    ) : (
                                        bookedJobs.map(job => renderJobCard(job))
                                    )}
                                </div>
                            </IonAccordion>

                            <IonAccordion value="pending" className="jobs-accordion">
                                <IonItem slot="header" style={{ '--padding-start': '0' }}>
                                    <div className="jobs-accordion-header">
                                        <IonLabel>Pending Requests</IonLabel>
                                        <IonBadge color="warning">{pendingJobs.length}</IonBadge>
                                    </div>
                                </IonItem>
                                <div slot="content" style={{ padding: '16px 0' }}>
                                    {pendingJobs.length === 0 ? (
                                        <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>No pending requests</p>
                                    ) : (
                                        pendingJobs.map(job => renderJobCard(job))
                                    )}
                                </div>
                            </IonAccordion>

                            <IonAccordion value="history" className="jobs-accordion">
                                <IonItem slot="header" style={{ '--padding-start': '0' }}>
                                    <div className="jobs-accordion-header">
                                        <IonLabel>Booking History</IonLabel>
                                        <IonBadge color="medium">{historyJobs.length}</IonBadge>
                                    </div>
                                </IonItem>
                                <div slot="content" style={{ padding: '16px 0' }}>
                                    {historyJobs.length === 0 ? (
                                        <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>No past bookings</p>
                                    ) : (
                                        historyJobs.map(job => renderJobCard(job))
                                    )}
                                </div>
                            </IonAccordion>
                        </IonAccordionGroup>
                    )}

                </div>

                <IonAlert
                    isOpen={!!deleteJobId}
                    onDidDismiss={() => setDeleteJobId(null)}
                    header="Cancel Request"
                    message="Are you sure you want to cancel this request?"
                    buttons={[
                        { text: 'No, Keep it', role: 'cancel', cssClass: 'secondary' },
                        {
                            text: 'Yes, Cancel', role: 'destructive', handler: () => {
                                if (deleteJobId) confirmCancellation(deleteJobId, false);
                            }
                        }
                    ]}
                />

                <IonAlert
                    isOpen={!!cancelFeeJob}
                    onDidDismiss={() => setCancelFeeJob(null)}
                    header="Late Cancellation Fee"
                    message={`You are cancelling this request within ${cancelFeeJob?.providerName}'s ${cancelFeeJob?.cutoff}-hour cancellation window. A cancellation fee will be applied to compensate them for their reserved time.\n\nDo you still wish to proceed?`}
                    buttons={[
                        { text: 'Go Back', role: 'cancel', cssClass: 'secondary' },
                        {
                            text: 'Accept Fee & Cancel', role: 'destructive', handler: () => {
                                if (cancelFeeJob) confirmCancellation(cancelFeeJob.id, true);
                            }
                        }
                    ]}
                />
            </IonContent>
            <BottomNavigation />
        </IonPage>
    );
};

export default MyRequests;
