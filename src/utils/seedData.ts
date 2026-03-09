import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, collection, addDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import * as geofire from 'geofire-common';

export const seedDatabase = async () => {
    console.log("Starting database seed...");
    // We will create 2 providers and 1 customer.
    // Note: Creating users logs them in, so we will log out at the very end.

    try {
        // 1. Create Provider Alice
        console.log("Creating Provider Alice...");
        const resAlice = await createUserWithEmailAndPassword(auth, 'alice@test.com', 'password123');
        await setDoc(doc(db, 'providers', resAlice.user.uid), {
            uid: resAlice.user.uid,
            firstName: 'Alice',
            lastName: 'Walker',
            name: 'Alice Walker',
            email: 'alice@test.com',
            role: 'provider',
            isVerified: true,
            hourlyRate: 15,
            cancellationWindowHours: 24,
            bio: 'I love dogs! I have 5 years of professional walking experience in the local area.',
            createdAt: new Date()
        });

        // 2. Create Provider Bob
        console.log("Creating Provider Bob...");
        const resBob = await createUserWithEmailAndPassword(auth, 'bob@test.com', 'password123');
        await setDoc(doc(db, 'providers', resBob.user.uid), {
            uid: resBob.user.uid,
            firstName: 'Bob',
            lastName: 'Boarder',
            name: 'Bob Boarder',
            email: 'bob@test.com',
            role: 'provider',
            isVerified: true,
            hourlyRate: 20,
            cancellationWindowHours: 48,
            bio: 'Experienced in handling large breeds. I offer excellent overnight boarding services.',
            createdAt: new Date()
        });

        // 3. Create Customer Charlie
        console.log("Creating Customer Charlie...");
        const resCharlie = await createUserWithEmailAndPassword(auth, 'charlie@test.com', 'password123');
        const charlieId = resCharlie.user.uid;
        await setDoc(doc(db, 'users', charlieId), {
            uid: charlieId,
            firstName: 'Charlie',
            lastName: 'Owner',
            name: 'Charlie Owner',
            email: 'charlie@test.com',
            role: 'customer',
            createdAt: new Date()
        });

        // Add dogs to Charlie
        console.log("Adding dogs for Charlie...");
        const dog1Ref = await addDoc(collection(db, 'users', charlieId, 'dogs'), {
            name: 'Max',
            breed: 'Golden Retriever',
            age: 3,
            traits: ['Friendly', 'Good with kids'],
            commands: [{ cueWord: 'Sit', command: 'Sit down', isCustom: false }]
        });

        const dog2Ref = await addDoc(collection(db, 'users', charlieId, 'dogs'), {
            name: 'Luna',
            breed: 'Husky',
            age: 2,
            traits: ['High Energy', 'Pulls on lead'],
            commands: [{ cueWord: 'Wait', command: 'Stand still', isCustom: false }]
        });

        // Add a fake pending job for Charlie
        console.log("Adding dummy jobs...");
        const lat = 51.5074; // London
        const lng = -0.1278;
        const hash = geofire.geohashForLocation([lat, lng]);

        // Job 1 (Pending)
        await addDoc(collection(db, 'jobs'), {
            customerId: charlieId,
            dogId: dog1Ref.id,
            serviceType: 'walk',
            date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
            notes: 'Max loves his tennis ball!',
            status: 'pending',
            location: { lat, lng },
            geohash: hash,
            createdAt: new Date()
        });

        // Job 2 (Accepted by Alice)
        await addDoc(collection(db, 'jobs'), {
            customerId: charlieId,
            dogId: dog2Ref.id,
            serviceType: 'boarding',
            date: new Date(Date.now() + 172800000).toISOString(), // Day after tomorrow
            notes: 'Luna needs lots of exercise.',
            status: 'accepted',
            providerId: resAlice.user.uid,
            location: { lat, lng },
            geohash: hash,
            createdAt: new Date()
        });

        console.log("Seed complete! Signing out...");
        await signOut(auth);
        alert('Dummy Data Seeded Successfully!\n\nCustomer: charlie@test.com\nProviders: alice@test.com, bob@test.com\nPassword: password123');

    } catch (error) {
        console.error("Seeding failed", error);
        alert('Seeding failed! Check the console.');
    }
};
