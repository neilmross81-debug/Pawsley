import React, { useState } from 'react';
import {
    IonContent,
    IonPage,
    IonInput,
    IonButton,
    IonItem,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonToast,
    IonSpinner
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import './Auth.css';

const Register: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [role, setRole] = useState<'customer' | 'provider'>('customer');
    const { refreshUserRole } = useAuth();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const history = useHistory();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { user } = await createUserWithEmailAndPassword(auth, email, password);

            const collectionName = role === 'customer' ? 'users' : 'providers';
            await setDoc(doc(db, collectionName, user.uid), {
                uid: user.uid,
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                name: `${firstName.trim()} ${lastName.trim()}`, // Keep 'name' for backward compatibility
                email,
                role,
                createdAt: new Date(),
                ...(role === 'provider' ? {
                    isVerified: false,
                    bio: '',
                    hourlyRate: 0,
                } : {})
            });

            await refreshUserRole();
            history.push('/home');
        } catch (err: any) {
            setError(err.message || 'Failed to register');
        } finally {
            setLoading(false);
        }
    };

    return (
        <IonPage>
            <IonContent className="auth-content">
                <div className="auth-page-wrap">
                    {/* ── Blue hero branding panel ── */}
                    <div className="auth-hero">
                        <h1 className="auth-logo-wordmark pawsley-wordmark">Pawsley</h1>
                        <p className="auth-logo-tagline">Join our community of dog lovers</p>
                    </div>

                    {/* ── White form card ── */}
                    <div className="auth-card">
                        <h2 className="auth-card-title">Create account</h2>
                        <p className="auth-card-subtitle">Join our community of dog lovers</p>

                        {/* Role picker */}
                        <IonSegment
                            value={role}
                            onIonChange={e => setRole(e.detail.value as 'customer' | 'provider')}
                            className="role-segment"
                        >
                            <IonSegmentButton value="customer">
                                <IonLabel>🐶 I need a walker</IonLabel>
                            </IonSegmentButton>
                            <IonSegmentButton value="provider">
                                <IonLabel>🦺 I am a walker</IonLabel>
                            </IonSegmentButton>
                        </IonSegment>

                        <form onSubmit={handleRegister}>
                            <IonItem className="auth-input" lines="none">
                                <IonInput
                                    label="First name"
                                    labelPlacement="stacked"
                                    type="text"
                                    value={firstName}
                                    onIonChange={e => setFirstName(e.detail.value!)}
                                    required
                                />
                            </IonItem>

                            <IonItem className="auth-input" lines="none">
                                <IonInput
                                    label="Last name"
                                    labelPlacement="stacked"
                                    type="text"
                                    value={lastName}
                                    onIonChange={e => setLastName(e.detail.value!)}
                                    required
                                />
                            </IonItem>

                            <IonItem className="auth-input" lines="none">
                                <IonInput
                                    label="Email address"
                                    labelPlacement="stacked"
                                    type="email"
                                    value={email}
                                    onIonChange={e => setEmail(e.detail.value!)}
                                    required
                                />
                            </IonItem>

                            <IonItem className="auth-input" lines="none">
                                <IonInput
                                    label="Password"
                                    labelPlacement="stacked"
                                    type="password"
                                    value={password}
                                    onIonChange={e => setPassword(e.detail.value!)}
                                    required
                                />
                            </IonItem>

                            <IonButton
                                expand="block"
                                type="submit"
                                className="auth-btn"
                                disabled={loading}
                            >
                                {loading ? <IonSpinner name="crescent" /> : 'Create Account'}
                            </IonButton>
                        </form>

                        <div className="auth-footer">
                            <span>Already have an account?</span>
                            <IonButton fill="clear" onClick={() => history.push('/login')}>
                                Sign In
                            </IonButton>
                        </div>
                    </div>
                </div>

                <IonToast
                    isOpen={!!error}
                    message={error}
                    duration={3000}
                    onDidDismiss={() => setError('')}
                    color="danger"
                />
            </IonContent>
        </IonPage>
    );
};

export default Register;
