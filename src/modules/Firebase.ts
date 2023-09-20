import firebase from "firebase/app";
import "firebase/auth";
import "firebase/firestore";
import "firebase/storage";
import { createContext, useState, useEffect } from "react";
import { User } from "@firebase/auth-types";
import Config from "./Config";

const firebaseConfig = {
  apiKey: Config.FIREBASE_API_KEY,
  authDomain: Config.FIREBASE_AUTH_DOMAIN,
  projectId: Config.FIREBASE_PROJECT_ID,
  storageBucket: Config.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: Config.FIREBASE_MESSAGING_SENDER_ID,
  appId: Config.FIREBASE_APP_ID,
  measurementId: Config.FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app: firebase.app.App = firebase.initializeApp(firebaseConfig);
const storage = firebase.storage(app);
const provider = new firebase.auth.GoogleAuthProvider();
const signInWithGoogle = () => firebase.auth().signInWithPopup(provider);

class UserData {
  email: string | null | undefined;
  canUse: string[];
  deployment: string[];

  constructor(email: string, canUse: string[], deployment: string[] = []) {
    this.email = email;
    this.canUse = canUse;
    this.deployment = deployment;
  }
}

const UserDataConverter = {
  fromFirestore: function (snapshot: firebase.firestore.DocumentSnapshot) {
    const data = snapshot.data();
    return new UserData(data?.email, data?.canUse, data?.deployment);
  },

  toFirestore: function (userData: UserData) {
    return {
      email: userData.email,
      canUse: userData.canUse,
      deployment: userData.deployment,
    };
  },
};

const useAuthListener = () => {
  localStorage.clear();

  const [user, setUser] = useState<User | null>(() =>
    JSON.parse(localStorage.getItem("authUser") || "{}"),
  );

  const [userData, setUserData] = useState<UserData | null>(() =>
    JSON.parse(localStorage.getItem("userData") || "{}"),
  );

  useEffect(() => {
    const listener = firebase.auth().onAuthStateChanged((authUser) => {
      if (authUser) {
        // fetch userDataDict from firestore
        firebase
          .firestore()
          .collection("userData")
          .doc(authUser.uid)
          .onSnapshot((doc) => {
            let firebaseUserData: UserData;
            if (!doc.exists && authUser.email) {
              firebaseUserData = new UserData(authUser.email, [], []);
              firebase
                .firestore()
                .collection("userData")
                .doc(authUser.uid)
                .set(UserDataConverter.toFirestore(firebaseUserData))
                .then(() => {
                  setUser(authUser);
                  setUserData(firebaseUserData);
                  localStorage.setItem("authUser", JSON.stringify(authUser));
                  localStorage.setItem(
                    "userData",
                    JSON.stringify(firebaseUserData),
                  );
                });
            } else {
              firebaseUserData = UserDataConverter.fromFirestore(doc);
              setUser(authUser);
              setUserData(firebaseUserData);
              localStorage.setItem("authUser", JSON.stringify(authUser));
              localStorage.setItem(
                "userData",
                JSON.stringify(firebaseUserData),
              );
            }
          });
      } else {
        localStorage.removeItem("authUser");
        localStorage.removeItem("userData");
        setUser(null);
        setUserData(null);
      }
    });

    return () => listener?.();
  }, [user]);

  return { user, userData };
};

type ContextType = {
  user: User | null;
  userData: UserData | undefined;
};

const UserContext = createContext<ContextType | null>(null);

export { useAuthListener, UserContext, signInWithGoogle, storage };

export default firebase;
