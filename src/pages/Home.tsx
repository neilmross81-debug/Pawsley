import React, { useState, useEffect } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButton,
  IonButtons,
  IonIcon,
  IonLabel,
  IonModal,
  IonTextarea,
  IonSelect,
  IonSelectOption,
  IonInput,
  IonItem,
  IonToast,
  IonSpinner
} from '@ionic/react';
import BottomNavigation from '../components/BottomNavigation';
import { useHistory } from 'react-router-dom';
import {
  logOutOutline, notificationsOutline, compassOutline, pawOutline,
  timeOutline, settingsOutline, searchOutline, calendarOutline,
  homeOutline, chatbubbleOutline, megaphoneOutline, chevronForwardOutline, closeOutline
} from 'ionicons/icons';
import { signOut } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs, addDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { auth, db } from '../firebase';
import './Home.css';

const Home: React.FC = () => {
  const { currentUser, userRole, refreshUserRole } = useAuth();
  const history = useHistory();
  const [isFixing, setIsFixing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [userData, setUserData] = useState<any>(null);

  // Alert Modal State
  const [showPreview, setShowPreview] = useState(false);
  const [alertMsg, setAlertMsg] = useState('');
  const [alertTargetType, setAlertTargetType] = useState<'area' | 'distance' | 'favorites'>('distance');
  const [alertArea, setAlertArea] = useState('');
  const [alertDistanceMiles, setAlertDistanceMiles] = useState<number | string>(5);
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [showOfferModal, setShowOfferModal] = useState(false);

  const [alertDiscount, setAlertDiscount] = useState('');
  const [sendingAlert, setSendingAlert] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    if (!currentUser) return;

    // Real-time unread notification count
    const notifRef = collection(db, 'users', currentUser.uid, 'notifications');
    const unreadQ = query(notifRef, where('read', '==', false));

    const unsubscribeNotifs = onSnapshot(unreadQ, (snapshot) => {
      setUnreadCount(snapshot.docs.length);
    }, (err) => {
      console.error('Error listening to notifications', err);
    });

    const fetchReminders = async () => {
      // Check for upcoming jobs within 24hrs and send reminders if needed
      if (userRole === 'customer' || userRole === 'provider') {
        try {
          const jobsRef = collection(db, 'jobs');
          const field = userRole === 'customer' ? 'customerId' : 'providerId';
          const jobsQ = query(jobsRef, where(field, '==', currentUser.uid), where('status', '==', 'accepted'));
          const jobsSnap = await getDocs(jobsQ);

          const now = new Date();
          const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

          for (const jobDoc of jobsSnap.docs) {
            const job = jobDoc.data();
            const jobDate = job.date ? new Date(job.date) : null;
            if (!jobDate) continue;

            // Only remind if job is within the next 24 hours and hasn't had a reminder sent
            if (jobDate > now && jobDate <= in24h && !job.reminderSent) {
              const serviceLabel = job.serviceType === 'boarding' ? 'boarding stay' : 'walk';
              const timeStr = jobDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              await addDoc(notifRef, {
                title: `Reminder: Upcoming ${serviceLabel} tomorrow`,
                message: `You have a ${serviceLabel} scheduled for ${jobDate.toLocaleDateString()} at ${timeStr}.`,
                jobId: jobDoc.id,
                read: false,
                createdAt: new Date()
              });

              // Mark reminder as sent on the job
              await setDoc(doc(db, 'jobs', jobDoc.id), { reminderSent: true }, { merge: true });
            }
          }
        } catch (e) {
          console.error('Error checking reminders', e);
        }
      }
    };

    const fetchAlertsAndUserData = async () => {
      if (userRole) {
        const collectionName = userRole === 'customer' ? 'users' : 'providers';
        const userDoc = await getDoc(doc(db, collectionName, currentUser.uid));
        if (userDoc.exists()) setUserData(userDoc.data());
      }

      if (userRole === 'customer') {
        // Fetch active alerts
        const alertsRef = collection(db, 'alerts');
        const q = query(alertsRef, where('expiresAt', '>', new Date()));
        try {
          const snapshot = await getDocs(q);
          const alertList: any[] = [];
          snapshot.forEach(doc => alertList.push({ id: doc.id, ...doc.data() }));
          setAlerts(alertList);
        } catch (e) {
          console.error('Error fetching alerts', e);
        }
      }
    };

    fetchReminders();
    fetchAlertsAndUserData();

    return () => unsubscribeNotifs();
  }, [currentUser, userRole]);

  const handleInterestOffer = () => {
    if (!selectedAlert) return;
    setShowOfferModal(false);
    // Pre-fill chat with interest
    history.push(`/chat?customerId=${currentUser!.uid}&providerId=${selectedAlert.providerId}&message=${encodeURIComponent("Hi! I'm interested in your special offer: " + (selectedAlert.discount ? `${selectedAlert.discount} Offer!` : 'Special Space Available!'))}`);
  };

  const handleAcceptOffer = () => {
    // This function is currently empty, but will be implemented later
  };

  const handleSignOut = () => {
    signOut(auth);
  };

  const handleRetrySetup = async (role: 'customer' | 'provider') => {
    if (!currentUser) return;
    setIsFixing(true);
    try {
      const collectionName = role === 'customer' ? 'users' : 'providers';
      const otherCollection = role === 'customer' ? 'providers' : 'users';

      // 1. Create/Update the chosen profile
      await setDoc(doc(db, collectionName, currentUser.uid), {
        uid: currentUser.uid,
        name: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
        email: currentUser.email,
        role,
        createdAt: new Date(),
        ...(role === 'provider' ? { isVerified: false, bio: '', hourlyRate: 0 } : {})
      });

      // 2. Cleanup the "other" collection to prevent role precedence conflicts
      try {
        await deleteDoc(doc(db, otherCollection, currentUser.uid));
      } catch (cleanupErr) {
        console.warn("Role cleanup could not delete from " + otherCollection, cleanupErr);
      }

      // 3. Force context update
      await refreshUserRole();

      // We don't need to alert, the UI will re-render because of refreshUserRole
    } catch (err: any) {
      alert('Action failed: ' + err.message);
    } finally {
      setIsFixing(false);
    }
  };

  const handleSendAlert = async () => {
    if (!alertMsg) {
      setToastMessage('Message is required.');
      return;
    }
    if (alertTargetType === 'area' && !alertArea) {
      setToastMessage('Target Area is required.');
      return;
    }

    setSendingAlert(true);
    try {
      await addDoc(collection(db, 'alerts'), {
        providerId: currentUser!.uid,
        providerName: userData?.firstName || userData?.name || 'A Walker',
        message: alertMsg,
        targetType: alertTargetType,
        targetArea: alertTargetType === 'area' ? alertArea : null,
        targetDistance: alertTargetType === 'distance' ? Number(alertDistanceMiles) : null,
        discount: alertDiscount,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h expiry
      });
      setToastMessage('Alert broadcasted successfully! 🎉');
      setShowPreview(false);
      setAlertMsg('');
      setAlertArea('');
      setAlertDiscount('');
    } catch (e) {
      console.error(e);
      setToastMessage('Failed to send alert.');
    } finally {
      setSendingAlert(false);
    }
  };

  const userFirstName = userData?.firstName || userData?.name?.split(' ')[0] || currentUser?.displayName?.split(' ')[0] || currentUser?.email?.split('@')[0] || 'Guest';
  const lastNameInitial = userData?.lastName?.[0] || userData?.name?.split(' ')?.[1]?.[0] || '';
  const initials = `${userFirstName[0]}${lastNameInitial}`.toUpperCase().slice(0, 2);

  return (
    <IonPage>
      <IonContent fullscreen className="home-content">
        {/* ── HEADER (Booking.com deep blue) ── */}
        <div className="bk-header-wrapper">
          <IonHeader className="ion-no-border">
            <IonToolbar className="bk-toolbar">
              <IonButtons slot="start">
                <div className="bk-avatar" onClick={() => history.push('/profile')}>
                  {initials}
                </div>
              </IonButtons>

              <IonTitle className="bk-title pawsley-wordmark">Pawsley</IonTitle>

              <IonButtons slot="end" style={{ gap: '4px' }}>
                {/* Chat shortcut */}
                <IonButton routerLink="/chat-list" style={{ '--color': 'white' }}>
                  <IonIcon icon={chatbubbleOutline} style={{ fontSize: '1.3rem' }} />
                </IonButton>


                {/* Notifications bell — universal */}
                <IonButton routerLink="/notifications" style={{ position: 'relative', '--color': 'white' }}>
                  <IonIcon icon={notificationsOutline} style={{ fontSize: '1.3rem' }} />
                  {unreadCount > 0 && (
                    <span className="bk-badge">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>

          {/* Hero greeting band */}
          <div className="bk-hero">
            <div className="bk-hero-text">
              <h1 className="bk-hero-name">Hi, {userFirstName}!</h1>
            </div>
          </div>
        </div>

        {/* ── MAIN CONTENT ── */}
        <div className="bk-content">

          {!userRole && (
            <div className="bk-section">
              <div className="bk-card alert-card">
                <h3 style={{ marginTop: 0, color: 'var(--ion-color-primary)' }}>Profile Incomplete</h3>
                <p style={{ color: '#444', marginBottom: '1rem' }}>
                  It looks like your setup was interrupted. Are you a Dog Owner or a Dog Walker?
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <IonButton expand="block" className="bk-btn-primary" disabled={isFixing} onClick={() => handleRetrySetup('customer')}>
                    I am a Dog Owner
                  </IonButton>
                  <IonButton expand="block" className="bk-btn-outline" disabled={isFixing} onClick={() => handleRetrySetup('provider')}>
                    I am a Dog Walker
                  </IonButton>
                </div>
                <IonButton fill="clear" className="bk-btn-text-red" onClick={handleSignOut} style={{ marginTop: '1rem', width: '100%' }}>
                  <IonIcon slot="start" icon={logOutOutline} />
                  Sign Out
                </IonButton>
              </div>
            </div>
          )}

          {userRole === 'customer' && (
            <>
              {/* Nearby Alerts / Offers */}
              {alerts.length > 0 && (
                <div className="bk-section" style={{ marginBottom: '16px' }}>
                  <h2 className="bk-section-title">Special Offers Near You</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {alerts.filter(alert => {
                      if (!userData) return true;
                      const area = alert.targetArea?.toLowerCase() || '';
                      const ownerCity = userData.city?.toLowerCase() || '';
                      const ownerPC = userData.postcode?.toLowerCase().slice(0, 3) || '';
                      return area.includes(ownerCity) || area.includes(ownerPC) || ownerCity.includes(area) || ownerPC.includes(area);
                    }).map(alert => (
                      <div key={alert.id} className="bk-card" style={{
                        border: '1px solid var(--ion-color-primary)',
                        background: 'rgba(137, 207, 240, 0.05)',
                        padding: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        cursor: 'pointer'
                      }} onClick={() => {
                        setSelectedAlert(alert);
                        setShowOfferModal(true);
                      }}>
                        <div style={{ background: 'var(--ion-color-primary)', padding: '10px', borderRadius: '12px', display: 'flex' }}>

                          <IonIcon icon={megaphoneOutline} style={{ color: '#fff', fontSize: '1.2rem' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ margin: '0 0 2px', fontSize: '0.95rem', fontWeight: 800, color: '#1e293b' }}>
                            {alert.discount ? `${alert.discount} Offer!` : 'New Space Available!'}
                          </h4>
                          <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569', lineHeight: '1.4' }}>
                            <strong>{alert.providerName}</strong>: {alert.message}
                          </p>
                        </div>
                        <IonIcon icon={chevronForwardOutline} style={{ color: 'var(--ion-color-primary)' }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bk-section">
                <h2 className="bk-section-title">Quick Actions</h2>
                <div className="bk-card-row">
                  <div className="bk-quick-card" onClick={() => history.push('/create-job')}>
                    <div className="bk-quick-icon" style={{ background: '#e8f0fe' }}>
                      <IonIcon icon={calendarOutline} style={{ color: 'var(--ion-color-primary)', fontSize: '1.6rem' }} />
                    </div>
                    <span>Book a Service</span>
                  </div>
                  <div className="bk-quick-card" onClick={() => history.push('/search')}>
                    <div className="bk-quick-icon" style={{ background: '#fff8e1' }}>
                      <IonIcon icon={searchOutline} style={{ color: '#f57f17', fontSize: '1.6rem' }} />
                    </div>
                    <span>Find Walkers</span>
                  </div>
                  <div className="bk-quick-card" onClick={() => history.push('/my-requests')}>
                    <div className="bk-quick-icon" style={{ background: '#e8f5e9' }}>
                      <IonIcon icon={timeOutline} style={{ color: '#388e3c', fontSize: '1.6rem' }} />
                    </div>
                    <span>My Bookings</span>
                  </div>
                  <div className="bk-quick-card" onClick={() => history.push('/profile')}>
                    <div className="bk-quick-icon" style={{ background: '#fff3e0' }}>
                      <IonIcon icon={pawOutline} style={{ color: '#e65100', fontSize: '1.6rem' }} />
                    </div>
                    <span>My Dogs</span>
                  </div>
                </div>
              </div>

              <div className="bk-section">
                <h2 className="bk-section-title">Browse Services</h2>
                <div className="bk-card bk-service-card" onClick={() => history.push('/create-job')}>
                  <div className="bk-service-icon">
                    <IonIcon icon={compassOutline} style={{ fontSize: '2rem', color: 'var(--ion-color-primary)' }} />
                  </div>
                  <div className="bk-service-info">
                    <h3>Dog Walking</h3>
                    <p>Daily walks with verified local walkers</p>
                  </div>
                  <span className="bk-chevron">›</span>
                </div>
                <div className="bk-card bk-service-card" style={{ marginTop: '8px' }} onClick={() => history.push('/create-job')}>
                  <div className="bk-service-icon">
                    <IonIcon icon={homeOutline} style={{ fontSize: '2rem', color: 'var(--ion-color-primary)' }} />
                  </div>
                  <div className="bk-service-info">
                    <h3>Dog Boarding</h3>
                    <p>Overnight stays in a trusted home</p>
                  </div>
                  <span className="bk-chevron">›</span>
                </div>
              </div>
            </>
          )}

          {userRole === 'provider' && (
            <>
              {/* Broadcast Alert Tile */}
              <div className="bk-section">
                <div className="bk-card" style={{ marginBottom: '8px', border: '1px solid var(--ion-color-primary)', background: 'rgba(var(--ion-color-primary-rgb), 0.05)', padding: '16px', cursor: 'pointer' }} onClick={() => setShowPreview(true)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ backgroundColor: 'var(--ion-color-primary)', padding: '10px', borderRadius: '12px', display: 'flex' }}>
                      <IonIcon icon={megaphoneOutline} style={{ color: '#fff', fontSize: '1.4rem' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>Broadcast an Alert</h3>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Post to owners near you</p>
                    </div>
                    <IonIcon icon={chevronForwardOutline} style={{ color: 'var(--ion-color-primary)' }} />
                  </div>
                </div>
              </div>

              <div className="bk-section">
                <h2 className="bk-section-title">Quick Actions</h2>
                <div className="bk-card-row">
                  <div className="bk-quick-card" onClick={() => history.push('/provider-jobs')}>
                    <div className="bk-quick-icon" style={{ background: '#e8f0fe' }}>
                      <IonIcon icon={calendarOutline} style={{ color: 'var(--ion-color-primary)', fontSize: '1.6rem' }} />
                    </div>
                    <span>Available Jobs</span>
                  </div>
                  <div className="bk-quick-card" onClick={() => history.push('/notifications')}>
                    <div className="bk-quick-icon" style={{ background: '#fce4ec' }}>
                      <IonIcon icon={notificationsOutline} style={{ color: '#c62828', fontSize: '1.6rem' }} />
                    </div>
                    <span>Alerts</span>
                  </div>
                  <div className="bk-quick-card" onClick={() => history.push('/profile')}>
                    <div className="bk-quick-icon" style={{ background: '#f3e5f5' }}>
                      <IonIcon icon={settingsOutline} style={{ color: '#6a1b9a', fontSize: '1.6rem' }} />
                    </div>
                    <span>My Profile</span>
                  </div>
                </div>
              </div>

              <div className="bk-section">
                <div className="bk-card bk-service-card" onClick={() => history.push('/provider-jobs')}>
                  <div className="bk-service-icon">
                    <IonIcon icon={searchOutline} style={{ fontSize: '2rem', color: 'var(--ion-color-primary)' }} />
                  </div>
                  <div className="bk-service-info">
                    <h3>Browse Opportunities</h3>
                    <p>Find walk and boarding jobs near you</p>
                  </div>
                  <span className="bk-chevron">›</span>
                </div>

                {/* My Schedule Tile */}
                <div className="bk-card bk-service-card" style={{ marginTop: '12px', borderLeft: '4px solid var(--ion-color-primary)' }} onClick={() => history.push('/provider-jobs')}>
                  <div className="bk-service-icon" style={{ background: '#f0f9ff' }}>
                    <IonIcon icon={calendarOutline} style={{ fontSize: '2rem', color: 'var(--ion-color-primary)' }} />
                  </div>
                  <div className="bk-service-info">
                    <h3>My Schedule</h3>
                    <p>View your booked jobs and upcoming walks</p>
                  </div>
                  <span className="bk-chevron">›</span>
                </div>
              </div>

            </>
          )}
        </div>
      </IonContent>

      <IonModal isOpen={showOfferModal} onDidDismiss={() => setShowOfferModal(false)} className="pawsley-modal">
        <IonHeader className="ion-no-border">
          <IonToolbar style={{ '--padding-top': '12px', '--padding-bottom': '12px' }}>
            <IonTitle style={{ fontWeight: 800 }}>Special Offer</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setShowOfferModal(false)}>
                <IonIcon icon={closeOutline} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          {selectedAlert && (
            <div style={{ textAlign: 'center', padding: '12px' }}>
              <div style={{ background: 'rgba(var(--ion-color-primary-rgb), 0.1)', padding: '24px', borderRadius: '24px', marginBottom: '24px' }}>
                <IonIcon icon={megaphoneOutline} style={{ fontSize: '3rem', color: 'var(--ion-color-primary)', marginBottom: '16px' }} />
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 8px', color: '#1e293b' }}>
                  {selectedAlert.discount ? `${selectedAlert.discount} Offer!` : 'Special Space Available!'}
                </h2>
                <p style={{ fontSize: '1.1rem', color: '#475569', marginBottom: '8px' }}>
                  From <strong>{selectedAlert.providerName}</strong>
                </p>
              </div>

              <div className="bk-card" style={{ padding: '20px', marginBottom: '24px', textAlign: 'left', border: '1px dashed var(--ion-color-primary)' }}>
                <p style={{ margin: 0, fontSize: '1rem', color: '#334155', lineHeight: '1.6', fontStyle: 'italic' }}>
                  "{selectedAlert.message}"
                </p>
              </div>

              <div style={{ display: 'grid', gap: '12px' }}>
                <IonButton
                  expand="block"
                  className="premium-btn primary-btn"
                  style={{ height: '56px', margin: 0 }}
                  onClick={() => {
                    setShowOfferModal(false);
                    history.push(`/create-job?providerId=${selectedAlert.providerId}`);
                  }}
                >
                  Accept & Book Now
                </IonButton>
                <IonButton
                  expand="block"
                  fill="clear"
                  style={{ '--color': '#64748b' }}
                  onClick={() => setShowOfferModal(false)}
                >
                  Decline Offer
                </IonButton>
              </div>
            </div>
          )}
        </IonContent>
      </IonModal>

      <IonModal isOpen={showPreview} onDidDismiss={() => setShowPreview(false)} className="pawsley-modal">

        <IonHeader className="ion-no-border">
          <IonToolbar style={{ '--padding-top': '12px', '--padding-bottom': '12px' }}>
            <IonTitle style={{ fontWeight: 800 }}>Broadcast Alert</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setShowPreview(false)}>
                <IonIcon icon={closeOutline} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <div style={{ padding: '8px' }}>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '20px' }}>
              Your alert will be shown to targeted owners for the next 24 hours.
            </p>

            <div className="acct-card" style={{ padding: '0', marginBottom: '16px' }}>
              <IonItem className="acct-row" lines="full">
                <IonLabel position="stacked" style={{ fontWeight: 600, color: '#1e293b' }}>Target Audience</IonLabel>
                <IonSelect value={alertTargetType} onIonChange={e => setAlertTargetType(e.detail.value)} interface="popover" style={{ width: '100%', maxWidth: '100%' }}>
                  <IonSelectOption value="area">Specific Area/Postcode</IonSelectOption>
                  <IonSelectOption value="distance">Within Distance of Me</IonSelectOption>
                  <IonSelectOption value="favorites">My Favorite Owners</IonSelectOption>
                </IonSelect>
              </IonItem>

              {alertTargetType === 'area' && (
                <IonItem className="acct-row" lines="full">
                  <IonLabel position="stacked" style={{ fontWeight: 600, color: '#1e293b' }}>Target Area (Postcode or City)</IonLabel>
                  <IonInput
                    value={alertArea}
                    onIonChange={e => setAlertArea(e.detail.value!)}
                    placeholder="e.g. SW1 or London"
                    className="acct-inline-input"
                  />
                </IonItem>
              )}

              {alertTargetType === 'distance' && (
                <IonItem className="acct-row" lines="full">
                  <IonLabel position="stacked" style={{ fontWeight: 600, color: '#1e293b' }}>Distance in miles</IonLabel>
                  <IonInput
                    type="number"
                    value={alertDistanceMiles}
                    onIonChange={e => setAlertDistanceMiles(e.detail.value!)}
                    placeholder="e.g. 5"
                    className="acct-inline-input"
                  />
                </IonItem>
              )}

              <IonItem className="acct-row" lines="full">
                <IonLabel position="stacked" style={{ fontWeight: 600, color: '#1e293b' }}>Discount / Offer (Optional)</IonLabel>
                <IonInput
                  value={alertDiscount}
                  onIonChange={e => setAlertDiscount(e.detail.value!)}
                  placeholder="e.g. 20% Off"
                  className="acct-inline-input"
                />
              </IonItem>
              <IonItem className="acct-row" lines="none">
                <IonLabel position="stacked" style={{ fontWeight: 600, color: '#1e293b' }}>Message</IonLabel>
                <IonTextarea
                  value={alertMsg}
                  onIonChange={e => setAlertMsg(e.detail.value!)}
                  placeholder="Hey! I have a space left for a walk today at 10am..."
                  rows={4}
                  className="acct-inline-input"
                />
              </IonItem>
            </div>

            <IonButton expand="block" style={{ '--background': 'var(--ion-color-primary)', '--color': 'var(--ion-color-primary-contrast)', fontWeight: 800, '--border-radius': '16px', height: '56px' }} onClick={handleSendAlert} disabled={sendingAlert}>
              {sendingAlert ? <IonSpinner name="crescent" /> : 'Send Broadcast'}
            </IonButton>
          </div>
        </IonContent>
      </IonModal>

      <IonToast
        isOpen={!!toastMessage}
        message={toastMessage}
        duration={3000}
        onDidDismiss={() => setToastMessage('')}
      />


      <BottomNavigation />
    </IonPage>
  );
};

export default Home;
