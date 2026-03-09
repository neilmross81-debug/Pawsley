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
    IonSpinner,
    IonIcon,
    IonButton,
    IonSearchbar,
    IonModal,
    IonInput,
    IonTextarea
} from '@ionic/react';
import BottomNavigation from '../components/BottomNavigation';
import { star, starOutline, personOutline, medicalOutline, shieldCheckmarkOutline, addCircleOutline, filterOutline } from 'ionicons/icons';


import { collection, query, getDocs, doc, getDoc, updateDoc, arrayUnion, arrayRemove, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import './Marketplace.css';

const SearchProviders: React.FC = () => {
    const { currentUser, userRole } = useAuth();
    const [providers, setProviders] = useState<any[]>([]);
    const [filteredProviders, setFilteredProviders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState('');
    const [favorites, setFavorites] = useState<string[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newClient, setNewClient] = useState({ firstName: '', lastName: '', city: '', bio: '', email: '' });
    const [locationText, setLocationText] = useState('');
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [filters, setFilters] = useState({
        dbsOnly: false,
        firstAidOnly: false,
        memberships: [] as string[]
    });
    const [saving, setSaving] = useState(false);




    useEffect(() => {
        if (currentUser) {
            fetchProvidersAndFavorites();
        }
    }, [currentUser]);

    const fetchProvidersAndFavorites = async () => {
        setLoading(true);
        try {
            // Fetch user favorites
            const currentUserRefCollection = userRole === 'provider' ? 'providers' : 'users';
            const favField = userRole === 'provider' ? 'favoriteOwners' : 'favoriteProviders';
            const userDoc = await getDoc(doc(db, currentUserRefCollection, currentUser!.uid));
            let favs: string[] = [];
            if (userDoc.exists() && userDoc.data()[favField]) {
                favs = userDoc.data()[favField];
            }
            setFavorites(favs);

            // Fetch target profiles
            let targetList: any[] = [];
            if (userRole === 'provider') {
                // WALKERS: Only see their OWN manually added clients
                const clientsRef = collection(db, 'providers', currentUser!.uid, 'clients');
                const snapshot = await getDocs(clientsRef);
                snapshot.forEach(doc => targetList.push({ id: doc.id, ...doc.data() }));
            } else {
                // CUSTOMERS: Can search all providers
                const providersRef = collection(db, 'providers');
                const snapshot = await getDocs(providersRef);
                snapshot.forEach(doc => {
                    if (doc.id !== currentUser!.uid) {
                        targetList.push({ id: doc.id, ...doc.data() });
                    }
                });
            }

            setProviders(targetList);
            setFilteredProviders(targetList);

        } catch (e) {
            console.error("Failed to fetch targets", e);
        } finally {
            setLoading(false);
        }
    };

    const performFilter = (search: string, location: string, currentFilters: typeof filters) => {
        const lowerSearch = search.toLowerCase();
        const lowerLocation = location.toLowerCase();

        const filtered = providers.filter(p => {
            const name = p.firstName ? `${p.firstName} ${p.lastName || ''}`.trim() : (p.name || '');
            const matchesSearch = !lowerSearch ||
                (p.bio && p.bio.toLowerCase().includes(lowerSearch)) ||
                (name.toLowerCase().includes(lowerSearch));

            const matchesLocation = !lowerLocation ||
                (p.city && p.city.toLowerCase().includes(lowerLocation)) ||
                (p.postcode && p.postcode.toLowerCase().includes(lowerLocation));

            const matchesDBS = !currentFilters.dbsOnly || (p.dbsCheck && p.dbsCheck !== 'None');
            const matchesFirstAid = !currentFilters.firstAidOnly || p.firstAidCertified;

            const matchesMemberships = currentFilters.memberships.length === 0 ||
                (p.memberships && currentFilters.memberships.every((m: string) => p.memberships[m]));

            return matchesSearch && matchesLocation && matchesDBS && matchesFirstAid && matchesMemberships;
        });
        setFilteredProviders(filtered);
    };

    const handleSearch = (e: CustomEvent) => {
        const q = e.detail.value;
        setSearchText(q);
        performFilter(q, locationText, filters);
    };

    const handleLocationSearch = (e: CustomEvent) => {
        const loc = e.detail.value;
        setLocationText(loc);
        performFilter(searchText, loc, filters);
    };

    const applyFilters = () => {
        setShowFilterModal(false);
        performFilter(searchText, locationText, filters);
    };



    const handleAddClient = async () => {
        if (!newClient.firstName || !newClient.lastName) return;
        setSaving(true);
        try {
            const clientsRef = collection(db, 'providers', currentUser!.uid, 'clients');
            await addDoc(clientsRef, {
                ...newClient,
                name: `${newClient.firstName} ${newClient.lastName}`,
                createdAt: new Date(),
                role: 'customer'
            });
            setShowAddModal(false);
            setNewClient({ firstName: '', lastName: '', city: '', bio: '', email: '' });
            fetchProvidersAndFavorites();
        } catch (e) {
            console.error("Error adding client", e);
        } finally {
            setSaving(false);
        }
    };

    const toggleFavorite = async (providerId: string, event: React.MouseEvent) => {
        event.stopPropagation();
        const currentUserRefCollection = userRole === 'provider' ? 'providers' : 'users';
        const favField = userRole === 'provider' ? 'favoriteOwners' : 'favoriteProviders';
        const userRef = doc(db, currentUserRefCollection, currentUser!.uid);
        try {
            if (favorites.includes(providerId)) {
                // Remove favorite
                await updateDoc(userRef, {
                    [favField]: arrayRemove(providerId)
                });
                setFavorites(favorites.filter(id => id !== providerId));
            } else {
                // Add favorite
                await updateDoc(userRef, {
                    [favField]: arrayUnion(providerId)
                });
                setFavorites([...favorites, providerId]);
            }
        } catch (error) {
            console.error("Error toggling favorite", error);
        }
    };



    if (loading) return <IonSpinner name="dots" className="ion-margin" />;

    return (
        <IonPage>
            <IonHeader className="ion-no-border">
                <IonToolbar className="pawsley-toolbar">
                    <IonButtons slot="start">
                        <IonBackButton defaultHref="/home" />
                    </IonButtons>
                    <IonTitle>{userRole === 'provider' ? 'Find Owners' : 'Find a Walker'}</IonTitle>
                    <IonButtons slot="end"></IonButtons>
                </IonToolbar>
            </IonHeader>
            <IonContent className="ion-padding marketplace-content" style={{ '--padding-bottom': '70px' }}>
                <div className="marketplace-container" style={{ maxWidth: '600px', margin: '0 auto' }}>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <IonSearchbar
                                value={searchText}
                                onIonInput={handleSearch}
                                placeholder={userRole === 'provider' ? "Search my clients..." : "Search by name..."}
                                className="pawsley-searchbar"
                                style={{ '--border-radius': '16px', '--box-shadow': 'none', padding: 0, flex: 1 }}
                            />
                            {userRole === 'provider' ? (
                                <IonButton onClick={() => setShowAddModal(true)} className="premium-btn primary-btn" style={{ height: '44px', margin: 0, '--border-radius': '12px' }}>
                                    + Add
                                </IonButton>
                            ) : (
                                <IonButton onClick={() => setShowFilterModal(true)} fill="outline" style={{ height: '44px', margin: 0, '--border-radius': '12px' }}>
                                    <IonIcon icon={filterOutline} slot="icon-only" />
                                </IonButton>
                            )}
                        </div>
                        {userRole === 'customer' && (
                            <IonSearchbar
                                value={locationText}
                                onIonInput={handleLocationSearch}
                                placeholder="Search by city or postcode..."
                                className="pawsley-searchbar"
                                style={{ '--border-radius': '16px', '--box-shadow': 'none', padding: 0 }}
                                searchIcon={personOutline} /* Using personOutline as a placeholder for location since location pin icon is not imported */
                            />
                        )}
                    </div>



                    {filteredProviders.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                            <IonIcon icon={personOutline} style={{ fontSize: '4rem', color: '#cbd5e1', marginBottom: '1rem' }} />
                            <h2 style={{ fontFamily: 'Inter', color: '#1e293b', fontWeight: 700 }}>No Providers Found</h2>
                            <p style={{ color: '#64748b' }}>Try adjusting your search criteria.</p>
                        </div>
                    ) : (
                        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '1rem', paddingLeft: '1rem' }}>
                            {/* Vertical timeline line */}
                            <div style={{ position: 'absolute', left: '2.5rem', top: '2rem', bottom: '2rem', width: '2px', background: '#e2e8f0', zIndex: 0 }}></div>

                            {filteredProviders.map(provider => {
                                const profileName = provider.firstName ? `${provider.firstName} ${provider.lastName || ''}`.trim() : (provider.name || (userRole === 'provider' ? 'Dog Owner' : 'Dog Walker'));

                                return (
                                    <div key={provider.id} style={{ position: 'relative', zIndex: 1, background: '#fff', padding: '1.2rem', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', display: 'flex', gap: '1rem' }}>

                                        {/* Left Square Image */}
                                        <div style={{ flexShrink: 0 }}>
                                            <img
                                                alt={profileName}
                                                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(profileName)}&background=89CFF0&color=1e293b&size=128&rounded=false`}
                                                style={{ width: '64px', height: '64px', borderRadius: '12px', objectFit: 'cover' }}
                                            />
                                        </div>

                                        {/* Right Content */}
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div>
                                                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', color: '#1c1c1e', fontWeight: 700 }}>
                                                        {profileName}
                                                    </h3>
                                                    {userRole === 'customer' && (
                                                        <p style={{ margin: 0, color: '#475569', fontSize: '0.85rem' }}>
                                                            {provider.showPricing !== false
                                                                ? <>
                                                                    <span>Walks: £{provider.hourlyRate || 15}/hr</span>
                                                                    {provider.boardingRate && (
                                                                        <span style={{ marginLeft: '8px' }}>• Boarding: £{provider.boardingRate}/day</span>
                                                                    )}
                                                                </>
                                                                : 'Price on Request'}
                                                        </p>

                                                    )}
                                                    {userRole === 'provider' && provider.city && (
                                                        <p style={{ margin: 0, color: '#475569', fontSize: '0.9rem' }}>
                                                            {provider.city} {provider.postcode ? `(${provider.postcode})` : ''}
                                                        </p>
                                                    )}
                                                </div>
                                                <IonButton fill="clear" onClick={(e) => toggleFavorite(provider.id, e)} style={{ margin: '-8px -8px 0 0', '--padding-end': '0', '--padding-start': '0' }}>
                                                    <IonIcon
                                                        icon={favorites.includes(provider.id) ? star : starOutline}
                                                        style={{ color: favorites.includes(provider.id) ? '#feba02' : '#94a3b8', fontSize: '1.6rem' }}
                                                    />
                                                </IonButton>
                                            </div>

                                            {userRole === 'customer' && (
                                                <div style={{ margin: '8px 0 0 0', color: '#16a34a', fontWeight: 600, fontSize: '0.85rem' }}>
                                                    Available Now
                                                </div>
                                            )}

                                            {provider.bio && (
                                                <div style={{ fontSize: '0.85rem', color: '#64748b', margin: '8px 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                    {provider.bio}
                                                </div>
                                            )}

                                            {userRole === 'customer' && (
                                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                                                    {provider.firstAidCertified && (
                                                        <IonBadge color="success" style={{ fontSize: '0.7rem', padding: '4px 8px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <IonIcon icon={medicalOutline} /> First Aid
                                                        </IonBadge>
                                                    )}
                                                    {provider.dbsCheck && provider.dbsCheck !== 'None' && (
                                                        <IonBadge color="primary" style={{ fontSize: '0.7rem', padding: '4px 8px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <IonIcon icon={shieldCheckmarkOutline} /> DBS
                                                        </IonBadge>
                                                    )}
                                                </div>
                                            )}

                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                                                <IonButton fill="clear" size="small" routerLink={`/provider/${provider.id}`} style={{ '--color': '#64748b', textTransform: 'none', fontWeight: 600, padding: 0, margin: 0 }}>
                                                    View Profile
                                                </IonButton>

                                                {userRole === 'customer' ? (
                                                    <IonButton fill="clear" size="small" routerLink={`/create-job?providerId=${provider.id}`} style={{ '--color': 'var(--ion-color-primary)', textTransform: 'none', fontWeight: 700, padding: 0, margin: 0 }}>
                                                        Book Now ›
                                                    </IonButton>
                                                ) : (
                                                    <IonButton fill="clear" size="small" routerLink={`/chat?customerId=${provider.id}&providerId=${currentUser!.uid}`} style={{ '--color': 'var(--ion-color-primary)', textTransform: 'none', fontWeight: 700, padding: 0, margin: 0 }}>
                                                        Message ›
                                                    </IonButton>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                </div>

                {/* Add Client Modal */}
                <IonModal isOpen={showAddModal} onDidDismiss={() => setShowAddModal(false)} className="premium-modal">
                    <IonHeader className="ion-no-border">
                        <IonToolbar className="pawsley-toolbar">
                            <IonTitle>Add New Client</IonTitle>
                            <IonButtons slot="end">
                                <IonButton onClick={() => setShowAddModal(false)}>Close</IonButton>
                            </IonButtons>
                        </IonToolbar>
                    </IonHeader>
                    <IonContent className="ion-padding">
                        <div style={{ padding: '8px' }}>
                            <p style={{ color: '#64748b', marginBottom: '24px' }}>Manually enter your client's details. These records are private to you.</p>

                            <div className="bk-input-group" style={{ marginBottom: '16px' }}>
                                <IonLabel>First Name</IonLabel>
                                <IonInput
                                    value={newClient.firstName}
                                    onIonInput={e => setNewClient({ ...newClient, firstName: e.detail.value! })}
                                    className="bk-input-field"
                                />
                            </div>
                            <div className="bk-input-group" style={{ marginBottom: '16px' }}>
                                <IonLabel>Last Name</IonLabel>
                                <IonInput
                                    value={newClient.lastName}
                                    onIonInput={e => setNewClient({ ...newClient, lastName: e.detail.value! })}
                                    className="bk-input-field"
                                />
                            </div>
                            <div className="bk-input-group" style={{ marginBottom: '16px' }}>
                                <IonLabel>Email (Optional)</IonLabel>
                                <IonInput
                                    value={newClient.email}
                                    onIonInput={e => setNewClient({ ...newClient, email: e.detail.value! })}
                                    className="bk-input-field"
                                    type="email"
                                />
                            </div>
                            <div className="bk-input-group" style={{ marginBottom: '16px' }}>
                                <IonLabel>City/Area</IonLabel>
                                <IonInput
                                    value={newClient.city}
                                    onIonInput={e => setNewClient({ ...newClient, city: e.detail.value! })}
                                    className="bk-input-field"
                                />
                            </div>
                            <div className="bk-input-group" style={{ marginBottom: '24px' }}>
                                <IonLabel>Notes/Bio</IonLabel>
                                <IonTextarea
                                    value={newClient.bio}
                                    onIonInput={e => setNewClient({ ...newClient, bio: e.detail.value! })}
                                    className="bk-input-field"
                                    rows={3}
                                />
                            </div>

                            <IonButton expand="block" onClick={handleAddClient} disabled={saving || !newClient.firstName || !newClient.lastName} className="premium-btn primary-btn">
                                {saving ? <IonSpinner name="crescent" /> : 'Save Client'}
                            </IonButton>
                        </div>
                    </IonContent>
                </IonModal>
                {/* Filter Modal */}
                <IonModal isOpen={showFilterModal} onDidDismiss={() => setShowFilterModal(false)} className="premium-modal">
                    <IonHeader className="ion-no-border">
                        <IonToolbar className="pawsley-toolbar">
                            <IonTitle>Filter Walkers</IonTitle>
                            <IonButtons slot="end">
                                <IonButton onClick={() => setShowFilterModal(false)}>Close</IonButton>
                            </IonButtons>
                        </IonToolbar>
                    </IonHeader>
                    <IonContent className="ion-padding">
                        <div style={{ padding: '8px' }}>
                            <div className="bk-input-group" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <IonLabel style={{ fontWeight: 600 }}>DBS Checked Only</IonLabel>
                                <IonButton
                                    fill={filters.dbsOnly ? 'solid' : 'outline'}
                                    size="small"
                                    onClick={() => setFilters({ ...filters, dbsOnly: !filters.dbsOnly })}
                                    style={{ margin: 0 }}
                                >
                                    {filters.dbsOnly ? 'ON' : 'OFF'}
                                </IonButton>
                            </div>

                            <div className="bk-input-group" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <IonLabel style={{ fontWeight: 600 }}>First Aid Certified</IonLabel>
                                <IonButton
                                    fill={filters.firstAidOnly ? 'solid' : 'outline'}
                                    size="small"
                                    onClick={() => setFilters({ ...filters, firstAidOnly: !filters.firstAidOnly })}
                                    style={{ margin: 0 }}
                                >
                                    {filters.firstAidOnly ? 'ON' : 'OFF'}
                                </IonButton>
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <IonLabel style={{ fontWeight: 600, display: 'block', marginBottom: '12px' }}>Memberships</IonLabel>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {['NARPS', 'PIF', 'ADTB', 'IMDT'].map(m => (
                                        <IonButton
                                            key={m}
                                            fill={filters.memberships.includes(m) ? 'solid' : 'outline'}
                                            size="small"
                                            onClick={() => {
                                                const newM = filters.memberships.includes(m)
                                                    ? filters.memberships.filter(x => x !== m)
                                                    : [...filters.memberships, m];
                                                setFilters({ ...filters, memberships: newM });
                                            }}
                                            style={{ margin: 0 }}
                                        >
                                            {m}
                                        </IonButton>
                                    ))}
                                </div>
                            </div>

                            <IonButton expand="block" onClick={applyFilters} className="premium-btn primary-btn">
                                Apply Filters
                            </IonButton>
                            <IonButton expand="block" fill="clear" color="medium" onClick={() => {
                                setFilters({ dbsOnly: false, firstAidOnly: false, memberships: [] });
                                performFilter(searchText, locationText, { dbsOnly: false, firstAidOnly: false, memberships: [] });
                                setShowFilterModal(false);
                            }}>
                                Reset All
                            </IonButton>
                        </div>
                    </IonContent>
                </IonModal>
            </IonContent>

            <BottomNavigation />
        </IonPage>
    );
};

export default SearchProviders;
