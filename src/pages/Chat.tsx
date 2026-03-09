import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import {
    IonContent,
    IonHeader,
    IonPage,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonInput,
    IonButton,
    IonIcon,
    IonFooter,
    IonSpinner
} from '@ionic/react';
import { sendOutline } from 'ionicons/icons';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import BottomNavigation from '../components/BottomNavigation';
import './Marketplace.css';

const Chat: React.FC = () => {
    const { currentUser, userRole } = useAuth();
    const location = useLocation();
    const history = useHistory();

    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [chatPartnerName, setChatPartnerName] = useState('Loading...');

    // We expect ?customerId=X&providerId=Y from the URL
    const searchParams = new URLSearchParams(location.search);
    const customerId = searchParams.get('customerId');
    const providerId = searchParams.get('providerId');

    const chatId = `${customerId}_${providerId}`; // Unique open chat thread
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!customerId || !providerId) {
            history.push('/home');
            return;
        }

        // Fetch partner name
        const fetchPartner = async () => {
            const partnerId = userRole === 'customer' ? providerId : customerId;
            const collectionName = userRole === 'customer' ? 'providers' : 'users';

            try {
                const partnerDoc = await getDoc(doc(db, collectionName, partnerId));
                if (partnerDoc.exists()) {
                    setChatPartnerName(partnerDoc.data().name || 'Your Walker');
                }
            } catch (e) {
                console.error("Could not fetch partner name");
                setChatPartnerName('Chat');
            }
        };
        fetchPartner();

        // Ensure the chat room document exists for querying purposes later if needed
        const initChatRoom = async () => {
            const chatRef = doc(db, 'chats', chatId);
            await setDoc(chatRef, {
                customerId,
                providerId,
                lastUpdated: serverTimestamp()
            }, { merge: true });
        };
        initChatRoom();

        // Listen for live messages
        const messagesRef = collection(db, 'chats', chatId, 'messages');
        const q = query(messagesRef, orderBy('createdAt', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgList: any[] = [];
            snapshot.forEach(doc => msgList.push({ id: doc.id, ...doc.data() }));
            setMessages(msgList);
            setLoading(false);
            scrollToBottom();
        });

        return () => unsubscribe();
    }, [customerId, providerId, userRole, history]);

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !currentUser) return;

        const textToSend = newMessage.trim();
        setNewMessage(''); // optimistic clear

        try {
            const messagesRef = collection(db, 'chats', chatId, 'messages');
            await addDoc(messagesRef, {
                text: textToSend,
                senderId: currentUser.uid,
                createdAt: serverTimestamp()
            });

            // Update the main chat doc timestamp
            const chatRef = doc(db, 'chats', chatId);
            await setDoc(chatRef, {
                lastUpdated: serverTimestamp()
            }, { merge: true });

            // Notify the recipient
            const recipientId = userRole === 'customer' ? providerId! : customerId!;
            try {
                // Get sender's display name
                const senderCollection = userRole === 'customer' ? 'users' : 'providers';
                const senderDoc = await getDoc(doc(db, senderCollection, currentUser.uid));
                const senderName = senderDoc.exists() ? (senderDoc.data().name || 'Someone') : 'Someone';

                const notifRef = collection(db, 'users', recipientId, 'notifications');
                await addDoc(notifRef, {
                    title: `New message from ${senderName}`,
                    message: textToSend.length > 80 ? textToSend.substring(0, 80) + '…' : textToSend,
                    chatId,
                    customerId,
                    providerId,
                    read: false,
                    createdAt: new Date()
                });
            } catch (notifErr) {
                // Notification failure is non-critical
                console.warn('Could not send message notification:', notifErr);
            }

            scrollToBottom();
        } catch (error) {
            console.error("Error sending message", error);
        }
    };

    return (
        <IonPage>
            <IonHeader className="ion-no-border">
                <IonToolbar className="pawsley-toolbar">
                    <IonButtons slot="start">
                        <IonBackButton defaultHref="/home" />
                    </IonButtons>
                    <IonTitle>Chat</IonTitle>
                    <IonButtons slot="end"></IonButtons>
                </IonToolbar>
            </IonHeader>

            <IonContent className="ion-padding" style={{ '--background': '#f8fafc' }}>
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
                        <IonSpinner name="dots" />
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '20px' }}>
                        {messages.length === 0 && (
                            <p style={{ textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', marginTop: '20px' }}>
                                No messages yet. Say hello!
                            </p>
                        )}

                        {messages.map((msg) => {
                            const isMine = msg.senderId === currentUser?.uid;
                            return (
                                <div
                                    key={msg.id}
                                    style={{
                                        display: 'flex',
                                        justifyContent: isMine ? 'flex-end' : 'flex-start',
                                        width: '100%'
                                    }}
                                >
                                    <div style={{
                                        maxWidth: '75%',
                                        padding: '10px 14px',
                                        borderRadius: '16px',
                                        borderBottomRightRadius: isMine ? '4px' : '16px',
                                        borderBottomLeftRadius: !isMine ? '4px' : '16px',
                                        backgroundColor: isMine ? '#007aff' : '#fff',
                                        color: isMine ? '#fff' : '#1e293b',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                        fontSize: '0.95rem',
                                        lineHeight: '1.4'
                                    }}>
                                        {msg.text}
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </IonContent>

            <IonFooter className="ion-no-border" style={{ marginBottom: '64px' }}>
                <IonToolbar style={{ '--background': '#fff', padding: '4px 8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: '24px', padding: '0 8px' }}>
                        <IonInput
                            value={newMessage}
                            onIonChange={(e) => setNewMessage(e.detail.value!)}
                            placeholder="Type a message..."
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') handleSendMessage();
                            }}
                            style={{ '--padding-start': '12px', flex: 1 }}
                        />
                        <IonButton fill="clear" onClick={handleSendMessage} disabled={!newMessage.trim()} style={{ '--color': '#007aff', margin: 0 }}>
                            <IonIcon icon={sendOutline} style={{ fontSize: '1.4rem' }} />
                        </IonButton>
                    </div>
                </IonToolbar>
            </IonFooter>
            <BottomNavigation />
        </IonPage>
    );
};

export default Chat;
