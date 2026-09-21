import { getApps, initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: 'AIzaSyCpozhvGcNTCiSMEeUKcd99CJcJ-RA3c2U',
  authDomain: 'miam-gym.firebaseapp.com',
  projectId: 'miam-gym',
  storageBucket: 'miam-gym.firebasestorage.app',
  messagingSenderId: '632517021942',
  appId: '1:632517021942:web:4a90e95f19396ec092dcd7',
  measurementId: 'G-60V4HS93XL'
}

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
export const auth = getAuth(app)
