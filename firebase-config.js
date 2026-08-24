// Firebase project config for Boutique Kastel accounts (boutiq-kastel project).
// The apiKey below is not a secret - Firebase client config is meant to be public;
// access is controlled by Firestore security rules + Firebase Auth, not by hiding this.
const firebaseConfig = {
  apiKey: "AIzaSyBldE_233PzGbB1SpjFQVD-zYHosDs5Wug",
  authDomain: "boutiq-kastel.firebaseapp.com",
  projectId: "boutiq-kastel",
  storageBucket: "boutiq-kastel.firebasestorage.app",
  messagingSenderId: "241465988879",
  appId: "1:241465988879:web:c33ab28f5f19893fec107a",
};

firebase.initializeApp(firebaseConfig);
