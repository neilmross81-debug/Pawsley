import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
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
    IonIcon,
    IonSpinner,
    IonButton
} from '@ionic/react';
import { notificationsOutline, checkmarkCircleOutline, chatbubbleOutline, calendarOutline } from 'ionicons/icons';
import { collection, query, orderBy, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import BottomNavigation from '../components/BottomNavigation';
import './Marketplace.css';

const Notifications: React.FC = () => {
    const { currentUser, userRole } = useAuth();
    const history = useHistory();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (currentUser) {
            fetchNotifications();
        }
    }, [currentUser]);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const notifRef = collection(db, 'users', currentUser!.uid, 'notifications');
            const q = query(notifRef, orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);

            const notifList: any[] = [];
            snapshot.forEach(doc => {
                notifList.push({ id: doc.id, ...doc.data() });
            });
            setNotifications(notifList);
        } catch (error) {
            console.error("Error fetching notifications:", error);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (notifId: string) => {
        try {
            const notifRef = doc(db, 'users', currentUser!.uid, 'notifications', notifId);
            await updateDoc(notifRef, { read: true });

            // Update local state
            setNotifications(notifications.map(n =>
                n.id === notifId ? { ...n, read: true } : n
            ));
        } catch (error) {
            console.error("Error marking notification as read:", error);
        }
    };

    const handleNotifTap = async (notif: any) => {
        // Mark as read
        if (!notif.read) {
            await markAsRead(notif.id);
        }
        // Navigate to relevant page
        if (notif.chatId && notif.customerId && notif.providerId) {
            history.push(`/chat?customerId=${notif.customerId}&providerId=${notif.providerId}`);
        } else if (notif.jobId) {
            history.push(userRole === 'provider' ? '/provider-jobs' : '/my-requests');
        }
    };

    const formatDate = (dateValue: any) => {
        if (!dateValue) return '';
        const d = dateValue.toDate ? dateValue.toDate() : new Date(dateValue);
        return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <IonPage>
            <IonHeader className="ion-no-border">
                <IonToolbar className="pawsley-toolbar">
                    <IonButtons slot="start">
                        <IonBackButton defaultHref="/home" />
                    </IonButtons>
                    <IonTitle>Notifications</IonTitle>
                    <IonButtons slot="end"></IonButtons>
                </IonToolbar>
            </IonHeader>

            <IonContent className="ion-padding marketplace-content" style={{ '--padding-bottom': '70px' }}>
                <div className="marketplace-container" style={{ maxWidth: '600px', margin: '0 auto' }}>

                    {loading ? (
                        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                            <IonSpinner name="dots" />
                        </div>
                    ) : notifications.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                            <IonIcon icon={notificationsOutline} style={{ fontSize: '4rem', color: '#cbd5e1', marginBottom: '1rem' }} />
                            <h2 style={{ fontFamily: 'Inter', color: '#1e293b', fontWeight: 700 }}>
                                You're All Caught Up
                            </h2>
                            <p style={{ color: '#64748b' }}>
                                You don't have any notifications right now.
                            </p>
                        </div>
                    ) : (
                        <IonList className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                            {notifications.map(notif => {
                                const isChat = !!(notif.chatId);
                                const icon = notif.read ? checkmarkCircleOutline : (isChat ? chatbubbleOutline : notificationsOutline);
                                const iconColor = notif.read ? '#94a3b8' : (isChat ? '#007aff' : 'var(--ion-color-primary)');

                                return (
                                    <IonItem
                                        key={notif.id}
                                        lines="full"
                                        style={{
                                            '--background': notif.read ? 'transparent' : 'rgba(137, 207, 240, 0.15)',
                                            paddingTop: '8px',
                                            paddingBottom: '8px',
                                            cursor: 'pointer'
                                        }}
                                        onClick={() => handleNotifTap(notif)}
                                        button
                                    >
                                        <IonIcon
                                            icon={icon}
                                            slot="start"
                                            style={{ color: iconColor, alignSelf: 'flex-start', marginTop: '12px' }}
                                        />
                                        <IonLabel className="ion-text-wrap">
                                            <h3 style={{ fontWeight: notif.read ? 600 : 700, color: '#1e293b', marginBottom: '4px', fontSize: '1.05rem' }}>
                                                {notif.title}
                                            </h3>
                                            <p style={{ color: '#475569', fontSize: '0.9rem', lineHeight: 1.4, marginBottom: '6px' }}>
                                                {notif.message}
                                            </p>
                                            <p style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 500 }}>
                                                {formatDate(notif.createdAt)}
                                                {isChat && !notif.read && <span style={{ marginLeft: '8px', color: '#007aff', fontWeight: 700 }}>Tap to reply</span>}
                                            </p>
                                        </IonLabel>
                                    </IonItem>
                                );
                            })}
                        </IonList>
                    )}
                </div>
            </IonContent>
            <BottomNavigation />
        </IonPage>
    );
};

export default Notifications;
