import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

export const getCreatorByUsername = async (username) => {
    try {
        const creatorsRef = collection(db, 'creators');
        const q = query(creatorsRef, where('username', '==', username));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return null;
        }

        // Username should be unique, so we take the first match
        const doc = querySnapshot.docs[0];
        return {
            id: doc.id,
            ...doc.data()
        };
    } catch (error) {
        console.error('Error fetching creator by username:', error);
        throw error;
    }
};
