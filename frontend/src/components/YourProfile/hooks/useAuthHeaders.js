import { useCallback } from "react";
import { auth } from "../../../firebase";

const useAuthHeaders = (user) => {
  return useCallback(
    async (extra = {}) => {
      const firebaseUser = auth.currentUser;

      const uid = firebaseUser?.uid || user?.uid || "";
      let token = "";

      try {
        token = firebaseUser?.getIdToken ? await firebaseUser.getIdToken() : "";
      } catch {
        token = "";
      }

      return {
        ...(uid ? { uid } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...extra,
      };
    },
    [user?.uid]
  );
};

export default useAuthHeaders;