import { PushNotifications } from '@capacitor/push-notifications';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';

export const initializePushNotifications = async (userId: string, userRole: 'customer' | 'provider') => {
    // Request permission to use push notifications
    // iOS will prompt a user and return if they granted permission or not
    // Android will just grant without prompting
    PushNotifications.requestPermissions().then(result => {
        if (result.receive === 'granted') {
            // Register with Apple / Google to receive push via APNS/FCM
            PushNotifications.register();
        } else {
            // Show some error
            console.warn("Push notification permission not granted");
        }
    });

    // On success, we should be able to receive notifications
    PushNotifications.addListener('registration', (token) => {
        console.log('Push registration success, token: ' + token.value);
        saveTokenToFirestore(userId, userRole, token.value);
    });

    // Some error occurred
    PushNotifications.addListener('registrationError', (error) => {
        console.error('Error on registration: ' + JSON.stringify(error));
    });

    // Show us the notification payload if the app is open on our device
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Push received: ' + JSON.stringify(notification));
    });

    // Method called when tapping on a notification
    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('Push action performed: ' + JSON.stringify(notification));
    });
};

const saveTokenToFirestore = async (userId: string, userRole: 'customer' | 'provider', token: string) => {
    try {
        const collectionName = userRole === 'provider' ? 'providers' : 'users';
        const userRef = doc(db, collectionName, userId);
        await updateDoc(userRef, {
            fcmTokens: arrayUnion(token)
        });
        console.log("Token saved to Firestore");
    } catch (e) {
        console.error("Error saving token to Firestore", e);
    }
};
