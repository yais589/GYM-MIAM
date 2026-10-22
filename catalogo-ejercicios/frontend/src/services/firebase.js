import { getApps, initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: 'AIzaSyBSCrZD2zzfraO_R7d9NdusTOCcZW7jSS0',
  authDomain: 'titansgym.firebaseapp.com',
  projectId: 'titansgym',
  storageBucket: 'titansgym.firebasestorage.app',
  messagingSenderId: '1067904804353',
  appId: '1:1067904804353:web:4dbe79594355b751200200',
  measurementId: 'G-2WLKW46W42'
}

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
export const auth = getAuth(app)
