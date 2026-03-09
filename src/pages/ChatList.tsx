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
    IonAvatar,
    IonSpinner,
    IonNote,
    IonIcon
} from '@ionic/react';
import { chatbubbleEllipsesOutline, chevronForwardOutline } from 'ionicons/icons';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useHistory } from 'react-router-dom';
import BottomNavigation from '../components/BottomNavigation';
import './Marketplace.css';

const ChatList: React.FC = () => {
    const { currentUser, userRole } = useAuth();
    const history = useHistory();
    const [chats, setChats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser) return;

        const fieldToFilter = userRole === 'customer' ? 'customerId' : 'providerId';
        const chatsRef = collection(db, 'chats');
        const q = query(
            chatsRef,
            where(fieldToFilter, '==', currentUser.uid),
            orderBy('lastUpdated', 'desc')
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const chatList: any[] = [];

            for (const chatDoc of snapshot.docs) {
                const data = chatDoc.data();
                const partnerId = userRole === 'customer' ? data.providerId : data.customerId;
                const partnerCollection = userRole === 'customer' ? 'providers' : 'users';

                // Fetch partner details
                let partnerName = 'Pawsley User';
                try {
                    const pDoc = await getDoc(doc(db, partnerCollection, partnerId));
                    if (pDoc.exists()) {
                        partnerName = pDoc.data().name || pDoc.data().firstName + ' ' + pDoc.data().lastName || 'Pawsley User';
                    }
                } catch (e) {
                    console.error("Error fetching partner name", e);
                }

                chatList.push({
                    id: chatDoc.id,
                    partnerId,
                    partnerName,
                    ...data
                });
            }
            setChats(chatList);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser, userRole]);

    const openChat = (chat: any) => {
        history.push(`/chat?customerId=${chat.customerId}&providerId=${chat.providerId}`);
    };

    return (
        <IonPage>
            <IonHeader className="ion-no-border">
                <IonToolbar className="paw-toolbar">
                    <IonButtons slot="start">
                        <IonBackButton defaultHref="/home" color="light" />
                    </IonButtons>
                    <IonTitle>Messages</IonTitle>
                </IonToolbar>
            </IonHeader>

            <IonContent className="ion-padding">
                <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                    <div className="section-header" style={{ marginBottom: '20px' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1a365d' }}>Your Conversations</h2>
                        <p style={{ color: '#64748b' }}>Manage your messages with walkers and owners.</p>
                    </div>

                    {loading ? (
                        <div className="ion-text-center" style={{ marginTop: '50px' }}>
                            <IonSpinner name="crescent" color="primary" />
                            <p>Loading messages...</p>
                        </div>
                    ) : chats.length === 0 ? (
                        <div className="ion-text-center" style={{ marginTop: '80px', padding: '20px' }}>
                            <div style={{
                                background: '#f8fafc',
                                border: '2px dashed #e2e8f0',
                                borderRadius: '20px',
                                padding: '40px 20px'
                            }}>
                                <IonIcon icon={chatbubbleEllipsesOutline} style={{ fontSize: '64px', color: '#cbd5e1' }} />
                                <h3 style={{ marginTop: '20px', fontWeight: '600' }}>No messages yet</h3>
                                <p style={{ color: '#64748b' }}>When you contact a walker or owner, your conversation will appear here.</p>
                            </div>
                        </div>
                    ) : (
                        <IonList lines="none" style={{ background: 'transparent' }}>
                            {chats.map(chat => (
                                <IonItem
                                    key={chat.id}
                                    onClick={() => openChat(chat)}
                                    style={{
                                        '--background': '#ffffff',
                                        marginBottom: '12px',
                                        borderRadius: '16px',
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                        '--padding-start': '16px',
                                        '--padding-end': '16px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <IonAvatar slot="start" style={{ width: '50px', height: '50px', background: '#3498db', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
                                        {chat.partnerName.charAt(0)}
                                    </IonAvatar>
                                    <IonLabel>
                                        <h2 style={{ fontWeight: '700', fontSize: '1.1rem', color: '#1a365d' }}>{chat.partnerName}</h2>
                                        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                                            {userRole === 'customer' ? 'Professional Walker' : 'Dog Owner'}
                                        </p>
                                    </IonLabel>
                                    {chat.lastUpdated && (
                                        <IonNote slot="end" style={{ fontSize: '0.8rem' }}>
                                            {new Date(chat.lastUpdated.toDate()).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                        </IonNote>
                                    )}
                                    <IonIcon icon={chevronForwardOutline} slot="end" color="medium" style={{ fontSize: '18px' }} />
                                </IonItem>
                            ))}
                        </IonList>
                    )}
                </div>
            </IonContent>
            <BottomNavigation />
        </IonPage>
    );
};

export default ChatList;
