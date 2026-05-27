import { useMemo } from "react";

const DAY_MS = 1000 * 60 * 60 * 24;

const useProfileVisibility = ({ profile, billingStatus }) => {
  return useMemo(() => {
    const now = new Date();
    const until = profile?.visibleUntil ? new Date(profile.visibleUntil) : null;

    const isTimeExpired = until ? until.getTime() < now.getTime() : false;
    const isAdminHidden = profile?.isVisible === false && !isTimeExpired;

    const daysLeft = until
      ? Math.ceil((until.getTime() - now.getTime()) / DAY_MS)
      : 0;

    const isExpired = isTimeExpired;

    const canExtend =
      !isAdminHidden &&
      (isExpired || !!billingStatus?.canExtend || !!billingStatus?.legacy?.canExtend);

    const shouldShowVisibilityNotice =
      isAdminHidden ||
      isExpired ||
      !!billingStatus?.canExtend ||
      !!billingStatus?.legacy?.canExtend;

    return {
      until,
      isAdminHidden,
      daysLeft,
      isExpired,
      canExtend,
      shouldShowVisibilityNotice,
    };
  }, [profile, billingStatus]);
};

export default useProfileVisibility;