import React, { useState, useEffect } from 'react';
import { useParams, useHistory } from 'react-router-dom';
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
    IonBadge,
    IonSpinner,
    IonIcon,
    IonButton,
    IonAvatar,
    IonGrid,
    IonRow,
    IonCol,
    IonCard,
    IonCardContent,
    IonList,
    IonListHeader
} from '@ionic/react';
import { star, shieldCheckmarkOutline, medicalOutline, fitnessOutline, cashOutline, timeOutline, documentTextOutline, peopleOutline, homeOutline } from 'ionicons/icons';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import './Marketplace.css';

const ProviderProfileView: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const history = useHistory();
    const [provider, setProvider] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProvider = async () => {
            try {
                const docSnap = await getDoc(doc(db, 'providers', id));
                if (docSnap.exists()) {
                    setProvider({ id: docSnap.id, ...docSnap.data() });
                }
            } catch (e) {
                console.error("Error fetching provider", e);
            } finally {
                setLoading(false);
            }
        };
        fetchProvider();
    }, [id]);

    if (loading) {
        return (
            <IonPage>
                <IonContent className="ion-padding ion-text-center">
                    <IonSpinner name="dots" />
                </IonContent>
            </IonPage>
        );
    }

    if (!provider) {
        return (
            <IonPage>
                <IonContent className="ion-padding ion-text-center">
                    <h2>Provider Not Found</h2>
                    <IonButton routerLink="/search">Back to Search</IonButton>
                </IonContent>
            </IonPage>
        );
    }

    return (
        <IonPage>
            <IonHeader className="ion-no-border">
                <IonToolbar className="pawsley-toolbar">
                    <IonButtons slot="start">
                        <IonBackButton defaultHref="/search" />
                    </IonButtons>
                    <IonTitle>Walker Profile</IonTitle>
                    <IonButtons slot="end"></IonButtons>
                </IonToolbar>
            </IonHeader>

            <IonContent className="marketplace-content">
                <div style={{ background: 'var(--ion-color-primary)', padding: '40px 20px', textAlign: 'center', borderBottomLeftRadius: '30px', borderBottomRightRadius: '30px', marginBottom: '-30px' }}>
                    <IonAvatar style={{ width: '100px', height: '100px', margin: '0 auto 16px', border: '4px solid #fff', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                        <img alt={provider.name} src={`https://ui-avatars.com/api/?name=${encodeURIComponent(provider.name || 'Walker')}&background=fff&color=1e293b&size=256`} />
                    </IonAvatar>
                    <h1 style={{ margin: '0', color: '#fff', fontWeight: 800, fontSize: '1.8rem' }}>{provider.name}</h1>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '10px' }}>
                        {provider.firstAidCertified && <IonBadge color="success" style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 10px', borderRadius: '12px' }}><IonIcon icon={medicalOutline} /> First Aid</IonBadge>}
                        {provider.dbsCheck !== 'None' && <IonBadge color="primary" style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 10px', borderRadius: '12px' }}><IonIcon icon={shieldCheckmarkOutline} /> DBS {provider.dbsCheck}</IonBadge>}
                    </div>
                </div>

                <div className="marketplace-container" style={{ padding: '0 16px 100px' }}>

                    {/* Bio Section */}
                    <div className="acct-card" style={{ marginTop: '0', padding: '20px' }}>
                        <h2 style={{ margin: '0 0 12px', fontSize: '1.2rem', fontWeight: 700, color: '#1e293b' }}>About Me</h2>
                        <p style={{ margin: 0, color: '#475569', lineHeight: '1.6', fontSize: '1rem' }}>
                            {provider.bio || "No bio provided yet."}
                        </p>
                    </div>

                    <IonGrid className="ion-no-padding">
                        <IonRow>
                            <IonCol size="6">
                                <div className="acct-card" style={{ padding: '16px', textAlign: 'center', height: '100%' }}>
                                    <IonIcon icon={cashOutline} style={{ fontSize: '1.5rem', color: 'var(--ion-color-primary)' }} />
                                    <p style={{ margin: '8px 0 2px', fontSize: '0.8rem', color: '#64748b' }}>Hourly Rate</p>
                                    <p style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem', color: '#1e293b' }}>
                                        {provider.showPricing !== false ? `£${provider.hourlyRate || 15}` : 'Hidden'}
                                    </p>
                                </div>
                            </IonCol>
                            <IonCol size="6">
                                <div className="acct-card" style={{ padding: '16px', textAlign: 'center', height: '100%' }}>
                                    <IonIcon icon={timeOutline} style={{ fontSize: '1.5rem', color: 'var(--ion-color-primary)' }} />
                                    <p style={{ margin: '8px 0 2px', fontSize: '0.8rem', color: '#64748b' }}>Cancel Window</p>
                                    <p style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem', color: '#1e293b' }}>{provider.cancellationWindowHours || 24}h</p>
                                </div>
                            </IonCol>
                        </IonRow>
                    </IonGrid>

                    {/* Professional Info */}
                    <IonListHeader style={{ marginTop: '20px' }}>
                        <IonLabel style={{ fontWeight: 700, fontSize: '1.1rem' }}>Professional Credentials</IonLabel>
                    </IonListHeader>

                    <div className="acct-card" style={{ padding: '0' }}>
                        <IonItem lines="full">
                            <IonIcon icon={shieldCheckmarkOutline} slot="start" color="primary" />
                            <IonLabel>
                                <p style={{ fontSize: '0.8rem' }}>Insurance</p>
                                <p style={{ fontWeight: 600, color: '#1e293b' }}>{provider.insurance || 'Private Insurance Covered'}</p>
                            </IonLabel>
                        </IonItem>
                        <IonItem lines="none">
                            <IonIcon icon={fitnessOutline} slot="start" color="primary" />
                            <IonLabel>
                                <p style={{ fontSize: '0.8rem' }}>Memberships</p>
                                <p style={{ fontWeight: 600, color: '#1e293b' }}>{provider.memberships || 'Professional Walker'}</p>
                            </IonLabel>
                        </IonItem>
                    </div>

                    {/* Capacity Info */}
                    <IonListHeader style={{ marginTop: '20px' }}>
                        <IonLabel style={{ fontWeight: 700, fontSize: '1.1rem' }}>Daily Capacity</IonLabel>
                    </IonListHeader>

                    <IonGrid className="ion-no-padding">
                        <IonRow>
                            <IonCol size="6">
                                <div className="acct-card" style={{ padding: '16px', textAlign: 'center' }}>
                                    <IonIcon icon={peopleOutline} style={{ fontSize: '1.5rem', color: 'var(--ion-color-primary)' }} />
                                    <p style={{ margin: '8px 0 2px', fontSize: '0.8rem', color: '#64748b' }}>Walk Limit</p>
                                    <p style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem', color: '#1e293b' }}>{provider.walkingCapacity || 'No limit'} dogs</p>
                                </div>
                            </IonCol>
                            <IonCol size="6">
                                <div className="acct-card" style={{ padding: '16px', textAlign: 'center' }}>
                                    <IonIcon icon={homeOutline} style={{ fontSize: '1.5rem', color: 'var(--ion-color-primary)' }} />
                                    <p style={{ margin: '8px 0 2px', fontSize: '0.8rem', color: '#64748b' }}>Board Limit</p>
                                    <p style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem', color: '#1e293b' }}>{provider.boardingCapacity || 'No limit'} dogs</p>
                                </div>
                            </IonCol>
                        </IonRow>
                    </IonGrid>

                    {/* Terms & Conditions */}
                    {provider.termsConditions && (
                        <>
                            <IonListHeader style={{ marginTop: '20px' }}>
                                <IonLabel style={{ fontWeight: 700, fontSize: '1.1rem' }}>Terms & Conditions</IonLabel>
                            </IonListHeader>
                            <div className="acct-card" style={{ padding: '20px', background: '#f8fafc' }}>
                                <p style={{ margin: 0, color: '#64748b', whiteSpace: 'pre-wrap', fontSize: '0.9rem', fontStyle: 'italic' }}>
                                    {provider.termsConditions}
                                </p>
                            </div>
                        </>
                    )}

                </div>

                {/* Sticky Booking Button */}
                <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', borderTop: '1px solid #e2e8f0', zIndex: 100 }}>
                    <IonButton expand="block" style={{ '--background': 'var(--ion-color-primary)', '--border-radius': '16px', fontWeight: 800, height: '56px', fontSize: '1.1rem' }} routerLink={`/create-job?providerId=${provider.id}`}>
                        Book {provider.name.split(' ')[0]} Now
                    </IonButton>
                </div>
            </IonContent>
        </IonPage>
    );
};

export default ProviderProfileView;
