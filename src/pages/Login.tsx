import React, { useState } from 'react';
import {
    IonContent,
    IonPage,
    IonInput,
    IonButton,
    IonItem,
    IonToast,
    IonSpinner
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { auth } from '../firebase';

import { seedDatabase } from '../utils/seedData';
import './Auth.css';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const history = useHistory();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await setPersistence(auth, browserLocalPersistence);
            await signInWithEmailAndPassword(auth, email, password);
            history.push('/home');
        } catch (err: any) {

            setError(err.message || 'Failed to login');
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
                        <p className="auth-logo-tagline">Trusted care for your best friend</p>
                    </div>

                    {/* ── White form card ── */}
                    <div className="auth-card">
                        <h2 className="auth-card-title">Welcome back</h2>
                        <p className="auth-card-subtitle">Sign in to your account</p>

                        <form onSubmit={handleLogin}>
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
                                {loading ? <IonSpinner name="crescent" /> : 'Sign In'}
                            </IonButton>
                        </form>

                        <div className="auth-footer">
                            <span>New to Pawsley?</span>
                            <IonButton fill="clear" onClick={() => history.push('/register')}>
                                Create account
                            </IonButton>
                        </div>

                        {/* Dev-only seed button */}
                        <div className="seed-btn-wrap">
                            <IonButton fill="outline" color="medium" size="small" onClick={seedDatabase}>
                                Seed Dummy Data
                            </IonButton>
                            <p>Creates fake users &amp; jobs for testing</p>
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

export default Login;
