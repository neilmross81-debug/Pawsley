import React, { useState, useEffect } from 'react';
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
    IonInput,
    IonTextarea,
    IonButton,
    IonList,
    IonListHeader,
    IonBadge,
    IonToast,
    IonSpinner,
    IonCheckbox,
    IonIcon,
    IonGrid,
    IonRow,
    IonCol,
    IonAccordion,
    IonAccordionGroup,
    IonSelect,
    IonSelectOption
} from '@ionic/react';
import BottomNavigation from '../components/BottomNavigation';
import { addOutline, trashOutline, createOutline, chevronForwardOutline } from 'ionicons/icons';
import { doc, getDoc, updateDoc, collection, addDoc, query, getDocs, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import './Profile.css';

const Profile: React.FC = () => {
    const { currentUser, userRole } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState('');

    // Personal Details (all users)
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [addressLine1, setAddressLine1] = useState('');
    const [city, setCity] = useState('');
    const [postcode, setPostcode] = useState('');
    const [savingPersonal, setSavingPersonal] = useState(false);

    // Provider Fields
    const [bio, setBio] = useState('');
    const [hourlyRate, setHourlyRate] = useState<number | string>('');
    const [cancellationWindowHours, setCancellationWindowHours] = useState<number | string>(24);

    // New Professional Fields
    const [memberships, setMemberships] = useState<{ [key: string]: string }>({});
    const [boardingRate, setBoardingRate] = useState<number | string>('');
    const [insurance, setInsurance] = useState('');
    const [dbsCheck, setDbsCheck] = useState('None');
    const [firstAidCertified, setFirstAidCertified] = useState(false);
    const [walkingCapacity, setWalkingCapacity] = useState<number | string>('');
    const [boardingCapacity, setBoardingCapacity] = useState<number | string>('');
    const [termsConditions, setTermsConditions] = useState('');
    const [showPricing, setShowPricing] = useState(true);
    const [blockedDates, setBlockedDates] = useState<string[]>([]);
    const [newBlockedDate, setNewBlockedDate] = useState('');
    const [coverageRadius, setCoverageRadius] = useState<number | string>('');
    const [coveragePostcodes, setCoveragePostcodes] = useState('');


    // Customer Fields (Dogs)
    const [dogs, setDogs] = useState<any[]>([]);
    const [editingDogId, setEditingDogId] = useState<string | null>(null);
    const [newDogName, setNewDogName] = useState('');
    const [newDogTraits, setNewDogTraits] = useState<string[]>([]);
    const [dogPhotoFile, setDogPhotoFile] = useState<File | null>(null);
    const [dogPhotoPreview, setDogPhotoPreview] = useState<string | null>(null);

    const STANDARD_COMMANDS = ["Sit down", "Lay down", "Stand still", "Leave it alone", "Drop from mouth"];

    // Initialize standard commands with empty cues
    const [standardCommands, setStandardCommands] = useState<{ command: string, cue: string }[]>(
        STANDARD_COMMANDS.map(cmd => ({ command: cmd, cue: '' }))
    );
    const [customCommands, setCustomCommands] = useState<{ command: string, cue: string }[]>([]);

    const AVAILABLE_TRAITS = [
        "Pulls on lead", "Reactive to dogs", "Reactive to people",
        "High prey drive", "Poor recall", "Nervous", "Senior",
        "Puppy", "Requires medication", "Resource guarder"
    ];

    useEffect(() => {
        fetchProfileData();
    }, [currentUser, userRole]);

    const fetchProfileData = async () => {
        if (!currentUser) return;
        try {
            if (userRole === 'provider') {
                const docRef = doc(db, 'providers', currentUser.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const d = docSnap.data();
                    setBio(d.bio || '');
                    setHourlyRate(d.hourlyRate || '');
                    setCancellationWindowHours(d.cancellationWindowHours ?? 24);
                    setFirstName(d.firstName || d.name?.split(' ')[0] || '');
                    setLastName(d.lastName || d.name?.split(' ').slice(1).join(' ') || '');
                    setPhone(d.phone || '');
                    setAddressLine1(d.addressLine1 || '');
                    setCity(d.city || '');
                    setPostcode(d.postcode || '');

                    // New fields
                    if (userRole === 'provider') {
                        // Migrate string to object if backward-compatibility is needed
                        setMemberships(typeof d.memberships === 'string' ? {} : (d.memberships || {}));
                        setBoardingRate(d.boardingRate || '');
                        setInsurance(d.insurance || '');
                        setDbsCheck(d.dbsCheck || 'None');
                        setFirstAidCertified(!!d.firstAidCertified);
                        setWalkingCapacity(d.walkingCapacity || '');
                        setBoardingCapacity(d.boardingCapacity || '');
                        setTermsConditions(d.termsConditions || '');
                        setShowPricing(d.showPricing !== false);
                        setBlockedDates(d.blockedDates || []);
                        setCoverageRadius(d.coverageRadius || '');
                        setCoveragePostcodes(d.coveragePostcodes || '');
                    }


                }
            } else if (userRole === 'customer') {
                const docRef = doc(db, 'users', currentUser.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const d = docSnap.data();
                    setFirstName(d.firstName || d.name?.split(' ')[0] || '');
                    setLastName(d.lastName || d.name?.split(' ').slice(1).join(' ') || '');
                    setPhone(d.phone || '');
                    setAddressLine1(d.addressLine1 || '');
                    setCity(d.city || '');
                    setPostcode(d.postcode || '');
                }
                // Fetch dogs subcollection
                const dogsRef = collection(db, 'users', currentUser.uid, 'dogs');
                const q = query(dogsRef);
                const querySnapshot = await getDocs(q);
                const dogList: any[] = [];
                querySnapshot.forEach((doc) => {
                    dogList.push({ id: doc.id, ...doc.data() });
                });
                setDogs(dogList);
            }
        } catch (e: any) {
            setToast('Failed to load profile');
        } finally {
            setLoading(false);
        }
    };

    const insertGenericTerms = () => {
        setTermsConditions("By booking these services, the Client agrees to the following terms:\n1. The Provider will adhere to all agreed schedules to the best of their ability.\n2. The Client is responsible for any vet bills arising from pre-existing conditions.\n3. Pawsley and its creators act solely as an introductory platform and accept absolutely no liability, financial or otherwise, for any incidents, damages, losses, or disputes that occur between the Client and the Provider.\n4. Cancellations made within the agreed window may be subject to a fee.");
    };

    const handlePersonalDetailsSave = async () => {
        if (!currentUser) return;
        setSavingPersonal(true);
        try {
            const collectionName = userRole === 'provider' ? 'providers' : 'users';
            await updateDoc(doc(db, collectionName, currentUser.uid), {
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                name: `${firstName.trim()} ${lastName.trim()}`,
                phone: phone.trim(),
                addressLine1: addressLine1.trim(),
                city: city.trim(),
                postcode: postcode.trim()
            });
            setToast('Personal details saved!');
        } catch (e: any) {
            setToast('Failed to save details');
        } finally {
            setSavingPersonal(false);
        }
    };

    const handleProviderSave = async () => {
        if (!currentUser) return;
        setSaving(true);
        try {
            const rate = Number(hourlyRate);
            const bRate = Number(boardingRate);
            const walkCap = walkingCapacity === '' ? '' : Number(walkingCapacity);
            const boardCap = boardingCapacity === '' ? '' : Number(boardingCapacity);
            const cancelWin = Number(cancellationWindowHours);

            await updateDoc(doc(db, 'providers', currentUser.uid), {
                bio: bio.trim(),
                hourlyRate: isNaN(rate) ? 0 : rate,
                boardingRate: isNaN(bRate) ? 0 : bRate,
                cancellationWindowHours: isNaN(cancelWin) ? 24 : cancelWin,
                memberships,
                insurance: insurance.trim(),
                dbsCheck,
                firstAidCertified,
                walkingCapacity: isNaN(Number(walkCap)) ? '' : walkCap,
                boardingCapacity: isNaN(Number(boardCap)) ? '' : boardCap,
                termsConditions: termsConditions.trim(),
                showPricing,
                blockedDates,
                coverageRadius: coverageRadius === '' ? '' : Number(coverageRadius),
                coveragePostcodes: coveragePostcodes.trim()
            });


            setToast('Profile updated successfully!');
        } catch (e: any) {
            setToast('Failed to save profile');
        } finally {
            setSaving(false);
        }
    };

    const handleTraitToggle = (trait: string) => {
        setNewDogTraits(prev =>
            prev.includes(trait) ? prev.filter(t => t !== trait) : [...prev, trait]
        );
    };

    const handleAddBlockedDate = () => {
        if (!newBlockedDate) return;
        if (!blockedDates.includes(newBlockedDate)) {
            setBlockedDates([...blockedDates, newBlockedDate].sort());
        }
        setNewBlockedDate('');
    };

    const handleRemoveBlockedDate = (date: string) => {
        setBlockedDates(blockedDates.filter(d => d !== date));
    };


    const handleStandardCommandChange = (index: number, value: string) => {
        const updated = [...standardCommands];
        updated[index].cue = value;
        setStandardCommands(updated);
    };

    const handleAddCustomCommand = () => {
        setCustomCommands([...customCommands, { command: '', cue: '' }]);
    };

    const handleCustomCommandChange = (index: number, field: 'command' | 'cue', value: string) => {
        const updated = [...customCommands];
        updated[index][field] = value;
        setCustomCommands(updated);
    };

    const handleRemoveCustomCommand = (index: number) => {
        setCustomCommands(customCommands.filter((_, i) => i !== index));
    };

    const handleEditDog = (dog: any) => {
        setEditingDogId(dog.id);
        setNewDogName(dog.name);
        setNewDogTraits(dog.traits || []);

        // Re-map the commands to populate the standard inputs vs custom ones
        const currentStandard = STANDARD_COMMANDS.map(cmd => ({ command: cmd, cue: '' }));
        const currentCustom: { command: string, cue: string }[] = [];

        if (dog.commands) {
            dog.commands.forEach((c: any) => {
                // Handle both 'cue' (new format) and 'cueWord' (legacy seed format)
                const cueValue = c.cue ?? c.cueWord ?? '';
                const stdIndex = currentStandard.findIndex(sc => sc.command === c.command);
                if (stdIndex !== -1) {
                    currentStandard[stdIndex].cue = cueValue;
                } else {
                    currentCustom.push({ command: c.command, cue: cueValue });
                }
            });
        }

        setStandardCommands(currentStandard);
        setCustomCommands(currentCustom);

        // Scroll down to the form area
        setTimeout(() => {
            const formElement = document.getElementById('dog-form');
            if (formElement) formElement.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const handleEditDogWithPhoto = (dog: any) => {
        handleEditDog(dog);
        setDogPhotoPreview(dog.photoUrl || null);
        setDogPhotoFile(null);
    };

    const handleSaveDog = async () => {
        if (!currentUser || !newDogName) return;
        setSaving(true);
        try {
            const dogsRef = collection(db, 'users', currentUser.uid, 'dogs');

            // Upload photo if a new one was selected
            let photoUrl: string | undefined = undefined;
            if (dogPhotoFile) {
                const dogId = editingDogId || 'new_' + Date.now();
                const photoRef = ref(storage, `dogPhotos/${currentUser.uid}/${dogId}`);
                await uploadBytes(photoRef, dogPhotoFile);
                photoUrl = await getDownloadURL(photoRef);
            }

            // Combine standard commands that have cues, and all valid custom commands
            const validStandard = standardCommands.filter(c => (c.cue ?? '').trim() !== '');
            const validCustom = customCommands.filter(c => (c.command ?? '').trim() !== '' && (c.cue ?? '').trim() !== '');
            const allCommands = [...validStandard, ...validCustom];

            const newDogData: any = {
                name: newDogName,
                traits: newDogTraits,
                commands: allCommands,
                updatedAt: new Date()
            };
            if (photoUrl) newDogData.photoUrl = photoUrl;
            // If editing, preserve the existing photoUrl if no new photo uploaded
            if (editingDogId && !photoUrl) {
                const existing = dogs.find(d => d.id === editingDogId);
                if (existing?.photoUrl) newDogData.photoUrl = existing.photoUrl;
            }

            if (editingDogId) {
                const dogRef = doc(db, 'users', currentUser.uid, 'dogs', editingDogId);
                await updateDoc(dogRef, newDogData);
                setDogs(dogs.map(d => d.id === editingDogId ? { ...d, ...newDogData } : d));
                setToast('Dog profile updated successfully!');

                // Check for upcoming accepted jobs and notify the provider
                const jobsRef = collection(db, 'jobs');
                const q = query(
                    jobsRef,
                    where("dogId", "==", editingDogId),
                    where("status", "==", "accepted")
                );

                try {
                    const snapshot = await getDocs(q);
                    // Get only jobs in the future
                    const futureJobs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
                        .filter((j: any) => new Date(j.date) > new Date());

                    for (const job of futureJobs) {
                        const providerId = (job as any).providerId;
                        if (providerId) {
                            // Create a notification for the provider
                            const notifRef = collection(db, 'users', providerId, 'notifications');
                            await addDoc(notifRef, {
                                title: 'Dog Profile Updated',
                                message: `The owner of ${newDogName} has updated their profile. Please re-review their traits and commands before the upcoming booking.`,
                                jobId: job.id,
                                dogId: editingDogId,
                                read: false,
                                createdAt: new Date()
                            });
                        }
                    }
                } catch (err) {
                    console.error("Failed to check upcoming jobs for notification:", err);
                }

            } else {
                const dogsRef = collection(db, 'users', currentUser.uid, 'dogs');
                const docRef = await addDoc(dogsRef, { ...newDogData, createdAt: new Date() });
                setDogs([...dogs, { id: docRef.id, ...newDogData }]);
                setToast('Dog profile added successfully!');
            }

            // Reset form
            setEditingDogId(null);
            setNewDogName('');
            setNewDogTraits([]);
            setDogPhotoFile(null);
            setDogPhotoPreview(null);
            setStandardCommands(STANDARD_COMMANDS.map(cmd => ({ command: cmd, cue: '' })));
            setCustomCommands([]);

        } catch (e: any) {
            console.error('Save dog error:', e);
            setToast(editingDogId ? 'Failed to update dog' : 'Failed to add dog');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <IonSpinner name="dots" className="ion-margin" />;

    const avatarInitials = firstName
        ? `${firstName[0]}${lastName?.[0] || ''}`.toUpperCase().slice(0, 2)
        : (currentUser?.email?.[0] ?? '?').toUpperCase();

    return (
        <IonPage>
            <IonHeader className="ion-no-border">
                <IonToolbar className="pawsley-toolbar">
                    <IonButtons slot="start">
                        <IonBackButton defaultHref="/home" />
                    </IonButtons>
                    <IonTitle>My Account</IonTitle>
                    <IonButtons slot="end"></IonButtons>
                </IonToolbar>
            </IonHeader>

            <IonContent className="acct-content" style={{ '--padding-bottom': '70px' }}>

                {/* ── Teal Hero Panel ── */}
                <div className="acct-hero">
                    <div className="acct-avatar">{avatarInitials}</div>
                    <div className="acct-hero-text">
                        <h1 className="acct-hero-name">
                            {firstName ? `${firstName} ${lastName}` : (currentUser?.email?.split('@')[0] || 'My Account')}
                        </h1>
                        <span className="acct-hero-badge">
                            {userRole === 'provider' ? '🦺 Dog Walker' : '🐶 Dog Owner'}
                        </span>
                    </div>
                </div>

                {/* ── Page body ── */}
                <div className="acct-body">
                    <IonAccordionGroup multiple={true}>

                        {/* ─ Personal Details ─ */}
                        <IonAccordion value="details" style={{ background: 'transparent' }}>
                            <IonItem slot="header" lines="none" style={{ '--background': 'transparent', '--padding-start': '0', '--inner-padding-end': '0' }}>
                                <IonLabel className="acct-section-title" style={{ margin: '14px 0 10px', fontSize: '0.85rem' }}>My Details</IonLabel>
                            </IonItem>
                            <div slot="content" style={{ padding: '0 0 16px' }}>
                                <div className="acct-card" style={{ margin: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                                    <IonItem className="acct-row" lines="full">
                                        <span className="acct-row-icon">👤</span>
                                        <IonLabel>
                                            <p className="acct-row-label">First Name</p>
                                            <IonInput
                                                value={firstName}
                                                onIonChange={e => setFirstName(e.detail.value!)}
                                                placeholder="Your first name"
                                                className="acct-inline-input"
                                            />
                                        </IonLabel>
                                    </IonItem>
                                    <IonItem className="acct-row" lines="full">
                                        <span className="acct-row-icon">👤</span>
                                        <IonLabel>
                                            <p className="acct-row-label">Last Name</p>
                                            <IonInput
                                                value={lastName}
                                                onIonChange={e => setLastName(e.detail.value!)}
                                                placeholder="Your last name"
                                                className="acct-inline-input"
                                            />
                                        </IonLabel>
                                    </IonItem>
                                    <IonItem className="acct-row" lines="full">
                                        <span className="acct-row-icon">📱</span>
                                        <IonLabel>
                                            <p className="acct-row-label">Phone</p>
                                            <IonInput
                                                type="tel"
                                                value={phone}
                                                onIonChange={e => setPhone(e.detail.value!)}
                                                placeholder="Your phone number"
                                                className="acct-inline-input"
                                            />
                                        </IonLabel>
                                    </IonItem>
                                    <IonItem className="acct-row" lines="full">
                                        <span className="acct-row-icon">🏠</span>
                                        <IonLabel>
                                            <p className="acct-row-label">Address Line 1</p>
                                            <IonInput
                                                value={addressLine1}
                                                onIonChange={e => setAddressLine1(e.detail.value!)}
                                                placeholder="Street address"
                                                className="acct-inline-input"
                                            />
                                        </IonLabel>
                                    </IonItem>
                                    <IonItem className="acct-row" lines="full">
                                        <span className="acct-row-icon" style={{ opacity: 0 }}>🏠</span>
                                        <IonLabel>
                                            <p className="acct-row-label">City / Town</p>
                                            <IonInput
                                                value={city}
                                                onIonChange={e => setCity(e.detail.value!)}
                                                placeholder="City"
                                                className="acct-inline-input"
                                            />
                                        </IonLabel>
                                    </IonItem>
                                    <IonItem className="acct-row" lines="none">
                                        <span className="acct-row-icon" style={{ opacity: 0 }}>🏠</span>
                                        <IonLabel>
                                            <p className="acct-row-label">Postcode</p>
                                            <IonInput
                                                value={postcode}
                                                onIonChange={e => setPostcode(e.detail.value!)}
                                                placeholder="Postcode"
                                                className="acct-inline-input"
                                            />
                                        </IonLabel>
                                    </IonItem>
                                </div>
                                <IonButton expand="block" className="acct-save-btn" onClick={handlePersonalDetailsSave} disabled={savingPersonal}>
                                    {savingPersonal ? <IonSpinner name="crescent" /> : 'Save Details'}
                                </IonButton>
                            </div>
                        </IonAccordion>

                        {/* ─ Provider Settings ─ */}
                        {/* ─ Walker Settings (Providers Only) ─ */}
                        {userRole === 'provider' && (
                            <IonAccordion value="walker-settings" style={{ background: 'transparent', marginTop: '8px' }}>
                                <IonItem slot="header" lines="none" style={{ '--background': 'transparent', '--padding-start': '0', '--inner-padding-end': '0' }}>
                                    <IonLabel className="acct-section-title" style={{ margin: '14px 0 10px', fontSize: '0.85rem' }}>Walker Settings</IonLabel>
                                </IonItem>
                                <div slot="content" style={{ padding: '0 0 16px' }}>
                                    <div className="acct-card" style={{ margin: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                                        <IonItem className="acct-row" lines="full">
                                            <span className="acct-row-icon">💷</span>
                                            <IonLabel>
                                                <p className="acct-row-label">Hourly Walking Rate</p>
                                                <IonInput
                                                    type="number"
                                                    value={hourlyRate}
                                                    onIonChange={e => setHourlyRate(e.detail.value!)}
                                                    placeholder="£ per hour"
                                                    className="acct-inline-input"
                                                />
                                            </IonLabel>
                                        </IonItem>
                                        <IonItem className="acct-row" lines="full">
                                            <span className="acct-row-icon">🏠</span>
                                            <IonLabel>
                                                <p className="acct-row-label">Nightly Boarding Rate</p>
                                                <IonInput
                                                    type="number"
                                                    value={boardingRate}
                                                    onIonChange={e => setBoardingRate(e.detail.value!)}
                                                    placeholder="£ per night"
                                                    className="acct-inline-input"
                                                />
                                            </IonLabel>
                                        </IonItem>
                                        <IonItem className="acct-row" lines="full">
                                            <span className="acct-row-icon">⏱️</span>
                                            <IonLabel>
                                                <p className="acct-row-label">Cancellation Cutoff (hours)</p>
                                                <IonInput
                                                    type="number"
                                                    value={cancellationWindowHours}
                                                    onIonChange={e => setCancellationWindowHours(e.detail.value!)}
                                                    className="acct-inline-input"
                                                />
                                            </IonLabel>
                                        </IonItem>
                                        <IonItem className="acct-row" lines="none">
                                            <span className="acct-row-icon">📝</span>
                                            <IonLabel>
                                                <p className="acct-row-label">Bio / Experience</p>
                                                <IonTextarea
                                                    value={bio}
                                                    onIonChange={e => setBio(e.detail.value!)}
                                                    rows={3}
                                                    placeholder="Tell owners about yourself..."
                                                    className="acct-inline-input"
                                                />
                                            </IonLabel>
                                        </IonItem>
                                    </div>

                                    <div className="acct-card" style={{ marginTop: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', paddingBottom: '8px' }}>
                                        <IonListHeader style={{ minHeight: 'auto', paddingTop: '16px' }}>
                                            <IonLabel style={{ fontWeight: 700, color: '#1c1c1e', margin: 0 }}>Professional Details</IonLabel>
                                        </IonListHeader>

                                        <IonItem className="acct-row" lines="full">
                                            <span className="acct-row-icon">⚕️</span>
                                            <IonLabel style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <p className="acct-row-label">Canine First Aid Certified</p>
                                                <IonCheckbox
                                                    checked={firstAidCertified}
                                                    onIonChange={e => setFirstAidCertified(e.detail.checked)}
                                                />
                                            </IonLabel>
                                        </IonItem>

                                        <IonItem className="acct-row" lines="full">
                                            <span className="acct-row-icon">🛡️</span>
                                            <IonLabel>
                                                <p className="acct-row-label">DBS Status</p>
                                                <IonSelect
                                                    value={dbsCheck}
                                                    onIonChange={e => setDbsCheck(e.detail.value)}
                                                    interface="popover"
                                                    className="acct-inline-input"
                                                    style={{ padding: 0 }}
                                                >
                                                    <IonSelectOption value="None">None</IonSelectOption>
                                                    <IonSelectOption value="Basic">Basic</IonSelectOption>
                                                    <IonSelectOption value="Enhanced">Enhanced</IonSelectOption>
                                                </IonSelect>
                                            </IonLabel>
                                        </IonItem>

                                        <IonItem className="acct-row" lines="full">
                                            <span className="acct-row-icon">🤝</span>
                                            <IonLabel>
                                                <p className="acct-row-label">Memberships</p>
                                                {['NarpsUK', 'PIF', 'IMDT'].map(org => (
                                                    <div key={org} style={{ display: 'flex', alignItems: 'center', margin: '8px 0', gap: '10px' }}>
                                                        <IonCheckbox
                                                            checked={memberships[org] !== undefined}
                                                            onIonChange={e => {
                                                                const newMemberships = { ...memberships };
                                                                if (e.detail.checked) {
                                                                    newMemberships[org] = newMemberships[org] || '';
                                                                } else {
                                                                    delete newMemberships[org];
                                                                }
                                                                setMemberships(newMemberships);
                                                            }}
                                                        />
                                                        <IonLabel style={{ minWidth: '80px', margin: 0, fontSize: '0.9rem' }}>{org}</IonLabel>
                                                        {memberships[org] !== undefined && (
                                                            <IonInput
                                                                placeholder="Number"
                                                                value={memberships[org]}
                                                                onIonChange={e => setMemberships({ ...memberships, [org]: e.detail.value! })}
                                                                style={{ borderBottom: '1px solid #cbd5e1', '--padding-start': '0', fontSize: '0.9rem' }}
                                                            />
                                                        )}
                                                    </div>
                                                ))}
                                            </IonLabel>
                                        </IonItem>

                                        <IonItem className="acct-row" lines="none">
                                            <span className="acct-row-icon">📜</span>
                                            <IonLabel>
                                                <p className="acct-row-label">Insurance Details</p>
                                                <IonInput
                                                    value={insurance}
                                                    onIonChange={e => setInsurance(e.detail.value!)}
                                                    placeholder="Provider & Policy type"
                                                    className="acct-inline-input"
                                                />
                                            </IonLabel>
                                        </IonItem>
                                    </div>

                                    <div className="acct-card" style={{ marginTop: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                                        <IonListHeader style={{ minHeight: 'auto', paddingTop: '16px' }}>
                                            <IonLabel style={{ fontWeight: 700, color: '#1c1c1e', margin: 0 }}>Approved Capacity</IonLabel>
                                        </IonListHeader>
                                        <IonRow>
                                            <IonCol size="6">
                                                <IonItem className="acct-row" lines="none">
                                                    <IonLabel>
                                                        <p className="acct-row-label">Walk Limit</p>
                                                        <IonInput
                                                            type="number"
                                                            value={walkingCapacity}
                                                            onIonChange={e => setWalkingCapacity(e.detail.value!)}
                                                            placeholder="Dogs"
                                                            className="acct-inline-input"
                                                        />
                                                    </IonLabel>
                                                </IonItem>
                                            </IonCol>
                                            <IonCol size="6" style={{ borderLeft: '1px solid #f1f5f9' }}>
                                                <IonItem className="acct-row" lines="none">
                                                    <IonLabel>
                                                        <p className="acct-row-label">Board Limit</p>
                                                        <IonInput
                                                            type="number"
                                                            value={boardingCapacity}
                                                            onIonChange={e => setBoardingCapacity(e.detail.value!)}
                                                            placeholder="Dogs"
                                                            className="acct-inline-input"
                                                        />
                                                    </IonLabel>
                                                </IonItem>
                                            </IonCol>
                                        </IonRow>
                                    </div>

                                    <div className="acct-card" style={{ marginTop: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                                        <IonItem className="acct-row" lines="none">
                                            <span className="acct-row-icon">⚖️</span>
                                            <IonLabel>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                    <p className="acct-row-label" style={{ margin: 0 }}>Terms & Conditions</p>
                                                    <IonButton fill="clear" size="small" onClick={insertGenericTerms} style={{ '--padding-end': '0', fontSize: '0.8rem', fontWeight: 600 }}>
                                                        Use Template
                                                    </IonButton>
                                                </div>
                                                <IonTextarea
                                                    value={termsConditions}
                                                    onIonChange={e => setTermsConditions(e.detail.value!)}
                                                    rows={5}
                                                    placeholder="Cancellation policy, late fees, etc..."
                                                    className="acct-inline-input"
                                                    style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px' }}
                                                />
                                            </IonLabel>
                                        </IonItem>
                                    </div>

                                    <IonItem lines="none" style={{ marginTop: '8px', '--background': 'transparent' }}>
                                        <IonCheckbox
                                            checked={showPricing}
                                            onIonChange={e => setShowPricing(e.detail.checked)}
                                            labelPlacement="end"
                                            justify="start"
                                        >
                                            <IonLabel style={{ fontSize: '0.9rem', color: '#64748b' }}>Display prices publicly</IonLabel>
                                        </IonCheckbox>
                                    </IonItem>

                                    <div className="acct-card" style={{ marginTop: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                                        <IonListHeader style={{ minHeight: 'auto', paddingTop: '16px' }}>
                                            <IonLabel style={{ fontWeight: 700, color: '#1c1c1e', margin: 0 }}>Availability & Blocked Dates</IonLabel>
                                        </IonListHeader>
                                        <div style={{ padding: '0 16px 16px' }}>
                                            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '12px' }}>
                                                Select dates where you are fully booked or unavailable.
                                                Owners will see you as unavailable for these dates.
                                            </p>
                                            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                                                <IonInput
                                                    type="date"
                                                    value={newBlockedDate}
                                                    onIonChange={e => setNewBlockedDate(e.detail.value!)}
                                                    className="acct-inline-input"
                                                    style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0 8px' }}
                                                />
                                                <IonButton onClick={handleAddBlockedDate} className="premium-btn primary-btn" style={{ margin: 0, '--border-radius': '8px' }}>
                                                    Block
                                                </IonButton>
                                            </div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                {blockedDates.length === 0 && <p style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>No dates blocked</p>}
                                                {blockedDates.map(date => (
                                                    <IonBadge key={date} color="light" style={{ padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => handleRemoveBlockedDate(date)}>
                                                        {new Date(date).toLocaleDateString()}
                                                        <IonIcon icon={trashOutline} style={{ fontSize: '0.9rem', color: '#ef4444' }} />
                                                    </IonBadge>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="acct-card" style={{ marginTop: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                                        <IonListHeader style={{ minHeight: 'auto', paddingTop: '16px' }}>
                                            <IonLabel style={{ fontWeight: 700, color: '#1c1c1e', margin: 0 }}>Coverage Area</IonLabel>
                                        </IonListHeader>
                                        <div style={{ padding: '0 16px 16px' }}>
                                            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '12px' }}>
                                                Define the area you are willing to travel to for walks/visits.
                                            </p>
                                            <div className="bk-input-group" style={{ marginBottom: '12px' }}>
                                                <IonLabel className="acct-row-label">Travel Radius (miles)</IonLabel>
                                                <IonInput
                                                    type="number"
                                                    value={coverageRadius}
                                                    onIonChange={e => setCoverageRadius(e.detail.value!)}
                                                    placeholder="e.g. 5"
                                                    className="acct-inline-input"
                                                    style={{ borderBottom: '1px solid #e2e8f0', padding: 0 }}
                                                />
                                            </div>
                                            <div className="bk-input-group">
                                                <IonLabel className="acct-row-label">Coverage Postcodes (optional)</IonLabel>
                                                <IonInput
                                                    value={coveragePostcodes}
                                                    onIonChange={e => setCoveragePostcodes(e.detail.value!)}
                                                    placeholder="e.g. SW1, SW2, SW3"
                                                    className="acct-inline-input"
                                                    style={{ borderBottom: '1px solid #e2e8f0', padding: 0 }}
                                                />
                                                <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>Separate multiple postcodes with commas.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <IonButton expand="block" className="acct-save-btn" onClick={handleProviderSave} disabled={saving}>
                                        {saving ? <IonSpinner name="crescent" /> : 'Save Walker Profile'}
                                    </IonButton>
                                </div>
                            </IonAccordion>


                        )}

                        {/* ─ My Dogs (Customers Only) ─ */}
                        {userRole === 'customer' && (
                            <IonAccordion value="dogs" style={{ background: 'transparent', marginTop: '8px' }}>
                                <IonItem slot="header" lines="none" style={{ '--background': 'transparent', '--padding-start': '0', '--inner-padding-end': '0' }}>
                                    <IonLabel className="acct-section-title" style={{ margin: '14px 0 10px', fontSize: '0.85rem' }}>My Dogs</IonLabel>
                                </IonItem>
                                <div slot="content" style={{ padding: '0 0 16px' }}>
                                    <>
                                        <div className="acct-card" style={{ margin: 0, padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                                            {dogs.length === 0 && (
                                                <IonItem lines="none" className="acct-row">
                                                    <IonLabel style={{ color: '#94a3b8', fontSize: '0.95rem' }}>No dogs added yet</IonLabel>
                                                </IonItem>
                                            )}
                                            {dogs.map((dog, idx) => (
                                                <IonItem
                                                    key={dog.id}
                                                    className="acct-row"
                                                    lines={idx < dogs.length - 1 ? 'full' : 'none'}
                                                >
                                                    {dog.photoUrl ? (
                                                        <img
                                                            src={dog.photoUrl} alt={dog.name} slot="start"
                                                            style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #e2e8f0' }}
                                                        />
                                                    ) : (
                                                        <div slot="start" style={{
                                                            width: '44px', height: '44px', borderRadius: '50%',
                                                            background: '#e6f4f3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem'
                                                        }}>🐶</div>
                                                    )}
                                                    <IonLabel>
                                                        <h3 style={{ fontWeight: 700, color: '#1a2e2c' }}>{dog.name}</h3>
                                                        <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                                            {dog.traits?.slice(0, 3).join(' · ') || 'No traits listed'}
                                                        </p>
                                                    </IonLabel>
                                                    <IonButton fill="clear" slot="end" onClick={() => handleEditDogWithPhoto(dog)}>
                                                        <IonIcon icon={createOutline} style={{ color: 'var(--ion-color-primary)' }} />
                                                    </IonButton>
                                                </IonItem>
                                            ))}
                                        </div>

                                        {/* Add / Edit Dog Form */}
                                        <p className="acct-section-title" style={{ marginTop: '24px' }}>{editingDogId ? 'Edit Dog Profile' : 'Add a Dog'}</p>
                                        <div className="acct-card" style={{ padding: '16px', margin: 0 }}>
                                            {editingDogId && (
                                                <IonButton fill="clear" size="small" onClick={() => {
                                                    setEditingDogId(null); setNewDogName('');
                                                    setNewDogTraits([]);
                                                    setStandardCommands(STANDARD_COMMANDS.map(cmd => ({ command: cmd, cue: '' })));
                                                    setCustomCommands([]);
                                                }} style={{ '--color': '#64748b', marginBottom: '8px' }}>
                                                    ← Cancel editing
                                                </IonButton>
                                            )}

                                            <IonItem className="acct-dog-input" lines="none">
                                                <IonLabel position="stacked" style={{ color: '#475569', fontWeight: 600, fontSize: '0.9rem' }}>Dog Name</IonLabel>
                                                <IonInput
                                                    value={newDogName}
                                                    onIonChange={e => setNewDogName(e.detail.value!)}
                                                    className="acct-dog-input-field"
                                                    placeholder="e.g. Luna"
                                                />
                                            </IonItem>

                                            {/* Photo picker */}
                                            <div style={{ padding: '12px 0 0' }}>
                                                <p style={{ margin: '0 0 8px', fontSize: '0.9rem', fontWeight: 600, color: '#1c1c1e' }}>Dog Photo (optional)</p>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                    {dogPhotoPreview ? (
                                                        <img src={dogPhotoPreview} alt="Preview"
                                                            style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--ion-color-primary)' }} />
                                                    ) : (
                                                        <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#f8fafc', border: '2px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <IonIcon icon={addOutline} style={{ fontSize: '1.8rem', color: '#94a3b8' }} />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <label htmlFor="dog-photo-input" style={{ display: 'inline-block', padding: '8px 16px', background: 'var(--ion-color-primary)', color: 'var(--ion-color-primary-contrast)', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>
                                                            {dogPhotoPreview ? 'Change Photo' : 'Upload Photo'}
                                                        </label>
                                                        <input id="dog-photo-input" type="file" accept="image/*" style={{ display: 'none' }}
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) { setDogPhotoFile(file); setDogPhotoPreview(URL.createObjectURL(file)); }
                                                            }} />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Traits */}
                                            <div style={{ marginTop: '1.5rem' }}>
                                                <IonLabel style={{ fontWeight: 700, color: '#1c1c1e' }}>Dog Traits &amp; Behaviours</IonLabel>
                                                <IonList lines="none" style={{ background: 'transparent', marginTop: '8px' }}>
                                                    <IonGrid style={{ padding: 0 }}>
                                                        <IonRow>
                                                            {AVAILABLE_TRAITS.map(trait => (
                                                                <IonCol size="12" sizeMd="6" key={trait} style={{ padding: '4px' }}>
                                                                    <IonItem color="light" style={{ '--border-radius': '12px', '--background': '#f1f5f9' }}>
                                                                        <IonCheckbox slot="start" checked={newDogTraits.includes(trait)} onIonChange={() => handleTraitToggle(trait)}
                                                                            style={{ '--checkmark-color': 'var(--ion-color-primary-contrast)', '--checkbox-background-checked': 'var(--ion-color-primary)', '--border-color-checked': 'var(--ion-color-primary)' }} />
                                                                        <IonLabel style={{ fontSize: '0.9rem', color: '#1e293b' }}>{trait}</IonLabel>
                                                                    </IonItem>
                                                                </IonCol>
                                                            ))}
                                                        </IonRow>
                                                    </IonGrid>
                                                </IonList>
                                            </div>

                                            {/* Commands */}
                                            <div style={{ marginTop: '1.5rem' }}>
                                                <IonLabel style={{ fontWeight: 700, color: '#1c1c1e' }}>Dog Commands</IonLabel>
                                                <p style={{ fontSize: '0.85rem', color: '#8e8e93', margin: '4px 0 12px 0' }}>Let walkers know the cue words your dog responds to.</p>

                                                <h4 style={{ fontSize: '0.9rem', color: '#1c1c1e', marginBottom: '8px' }}>Standard Actions</h4>
                                                {standardCommands.map((cmd, index) => (
                                                    <IonItem key={index} className="acct-dog-input" lines="none" style={{ marginBottom: '10px' }}>
                                                        <IonLabel position="stacked" style={{ color: '#475569', fontWeight: 600, fontSize: '0.85rem' }}>{cmd.command}</IonLabel>
                                                        <IonInput
                                                            placeholder='Cue (e.g. "Wait")'
                                                            value={cmd.cue}
                                                            onIonChange={e => handleStandardCommandChange(index, e.detail.value!)}
                                                            className="acct-dog-input-field"
                                                        />
                                                    </IonItem>
                                                ))}

                                                <h4 style={{ fontSize: '0.9rem', color: '#1c1c1e', marginBottom: '8px', marginTop: '16px' }}>Extra Commands</h4>
                                                {customCommands.map((cmd, index) => (
                                                    <IonItem key={`custom-${index}`} className="acct-dog-input" lines="none" style={{ marginBottom: '10px' }}>
                                                        <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                                                            <div style={{ flex: 1 }}>
                                                                <IonLabel position="stacked" style={{ color: '#475569', fontWeight: 600, fontSize: '0.85rem' }}>Action</IonLabel>
                                                                <IonInput
                                                                    placeholder="e.g. Roll Over"
                                                                    value={cmd.command}
                                                                    onIonChange={e => handleCustomCommandChange(index, 'command', e.detail.value!)}
                                                                    className="acct-dog-input-field"
                                                                />
                                                            </div>
                                                            <div style={{ flex: 1 }}>
                                                                <IonLabel position="stacked" style={{ color: '#475569', fontWeight: 600, fontSize: '0.85rem' }}>Cue Word</IonLabel>
                                                                <IonInput
                                                                    placeholder='"Barrel"'
                                                                    value={cmd.cue}
                                                                    onIonChange={e => handleCustomCommandChange(index, 'cue', e.detail.value!)}
                                                                    className="acct-dog-input-field"
                                                                />
                                                            </div>
                                                            <IonButton fill="clear" color="danger" onClick={() => handleRemoveCustomCommand(index)} style={{ alignSelf: 'flex-end', marginBottom: '2px' }}>
                                                                <IonIcon icon={trashOutline} slot="icon-only" />
                                                            </IonButton>
                                                        </div>
                                                    </IonItem>
                                                ))}
                                                <IonButton fill="clear" onClick={handleAddCustomCommand} style={{ '--color': 'var(--ion-color-primary)', fontWeight: 700 }}>
                                                    <IonIcon icon={addOutline} slot="start" /> Add Extra Command
                                                </IonButton>
                                            </div>

                                            <IonButton expand="block" className="acct-save-btn" onClick={handleSaveDog} disabled={saving || !newDogName} style={{ marginTop: '1.5rem' }}>
                                                {saving ? <IonSpinner name="crescent" color="light" /> : (editingDogId ? 'Save Changes' : 'Save Dog Profile')}
                                            </IonButton>
                                        </div>
                                    </>
                                </div>
                            </IonAccordion>
                        )}

                        {/* ─ Sign Out ─ */}
                        <p className="acct-section-title">Account</p>
                        <div className="acct-card">
                            <IonItem className="acct-row" lines="none" button onClick={async () => {
                                const { signOut } = await import('firebase/auth');
                                const { auth } = await import('../firebase');
                                await signOut(auth);
                            }}>
                                <span className="acct-row-icon">🚪</span>
                                <IonLabel style={{ color: '#dc2626', fontWeight: 600 }}>Sign Out</IonLabel>
                                <IonIcon icon={chevronForwardOutline} slot="end" style={{ color: '#94a3b8' }} />
                            </IonItem>
                        </div>

                    </IonAccordionGroup>
                    <div style={{ height: '32px' }} />
                </div>

                <IonToast isOpen={!!toast} message={toast} duration={2500} onDidDismiss={() => setToast('')} />
            </IonContent>
            <BottomNavigation />
        </IonPage >
    );
};

export default Profile;
