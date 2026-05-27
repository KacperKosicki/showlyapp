import { useEffect } from "react";

const useProfileLoader = ({ user, location, fetchProfile, fetchStaff }) => {
  useEffect(() => {
    if (!user?.uid) return;

    const cameFromBilling = !!location.state?.refresh;

    const loadProfile = async () => {
      const loadedProfile = await fetchProfile();

      if (loadedProfile?._id) {
        await fetchStaff(loadedProfile._id);
      }
    };

    loadProfile();

    if (cameFromBilling) {
      window.history.replaceState({}, document.title, location.pathname);
    }

    // fetchProfile/fetchStaff są funkcjami z hooków i mogą zmieniać referencje po zmianie zależności.
    // Ten efekt celowo reaguje na zmianę użytkownika oraz powrót z billing success/cancel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, location.state?.refresh]);
};

export default useProfileLoader;