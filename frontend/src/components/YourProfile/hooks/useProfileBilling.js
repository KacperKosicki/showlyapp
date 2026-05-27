import { useMemo, useState } from "react";
import {
  getBillingStatus,
  startSubscriptionCheckout,
  openBillingPortal,
  startExtensionCheckout,
} from "../../../api/billingApi";

const DEFAULT_LIMITS = {
  photos: 3,
  services: 3,
  serviceGallery: 2,
  links: 1,
  quickAnswers: 1,
  descriptionLength: 200,
};

const useProfileBilling = ({ showAlert }) => {
  const [billingStatus, setBillingStatus] = useState(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingActionLoading, setBillingActionLoading] = useState("");
  const [isExtending, setIsExtending] = useState(false);

  const fetchBillingStatus = async () => {
    try {
      setBillingLoading(true);

      const data = await getBillingStatus();
      setBillingStatus(data);
    } catch (err) {
      console.error("❌ billing status error:", err);
      setBillingStatus(null);
    } finally {
      setBillingLoading(false);
    }
  };

  const handleExtendVisibility = async () => {
    if (isExtending) return;

    setIsExtending(true);

    try {
      const data = await startExtensionCheckout();

      if (!data?.url) {
        showAlert("Nie udało się rozpocząć płatności (brak URL).", "error");
        return;
      }

      window.location.href = data.url;
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Nie udało się rozpocząć płatności.";

      console.error("❌ checkout-extension:", err);
      showAlert(msg, "error");
    } finally {
      setIsExtending(false);
    }
  };

  const handleStartSubscription = async (plan) => {
    if (billingActionLoading) return;

    try {
      setBillingActionLoading(plan);

      const data = await startSubscriptionCheckout(plan);

      if (!data?.url) {
        showAlert("Nie udało się utworzyć płatności za plan.", "error");
        return;
      }

      window.location.href = data.url;
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Nie udało się rozpocząć płatności za plan.";

      console.error("❌ checkout-subscription:", err);
      showAlert(msg, "error");
    } finally {
      setBillingActionLoading("");
    }
  };

  const handleOpenBillingPortal = async () => {
    if (billingActionLoading) return;

    try {
      setBillingActionLoading("portal");

      const data = await openBillingPortal();

      if (!data?.url) {
        showAlert("Nie udało się otworzyć panelu subskrypcji.", "error");
        return;
      }

      window.location.href = data.url;
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Nie udało się otworzyć zarządzania subskrypcją.";

      console.error("❌ billing portal:", err);
      showAlert(msg, "error");
    } finally {
      setBillingActionLoading("");
    }
  };

  const computedBilling = useMemo(() => {
    const billingPublic = billingStatus?.billing || {};

    const billingPlan =
      billingPublic?.effectivePlan ||
      billingPublic?.plan ||
      billingStatus?.plan?.effectivePlan ||
      billingStatus?.plan?.plan ||
      "free";

    const billingLabel =
      billingPublic?.label ||
      billingStatus?.plan?.label ||
      (billingPlan === "premium"
        ? "Premium"
        : billingPlan === "standard"
          ? "Standard"
          : "Free");

    const billingCurrentStatus = billingPublic?.status || "inactive";

    const billingLimits = {
      ...DEFAULT_LIMITS,
      ...(billingPublic?.limits || billingStatus?.plan?.limits || {}),
    };

    const billingFeatures =
      billingPublic?.features ||
      billingStatus?.plan?.features ||
      {};

    const isPaidActive = ["standard", "premium"].includes(billingPlan);

    const maxPhotos = Number(billingLimits.photos || DEFAULT_LIMITS.photos);
    const maxServices = Number(billingLimits.services || DEFAULT_LIMITS.services);
    const maxDescription = Number(
      billingLimits.descriptionLength || DEFAULT_LIMITS.descriptionLength
    );
    const maxLinks = Number(billingLimits.links || DEFAULT_LIMITS.links);
    const maxQuickAnswers = Number(
      billingLimits.quickAnswers || DEFAULT_LIMITS.quickAnswers
    );

    const canUseBooking = !!billingFeatures.booking;
    const canUseTeam = !!billingFeatures.team;
    const canUsePremiumThemes = !!billingFeatures.premiumThemes;
    const canUseSocialMedia = !!billingFeatures.socialMedia;
    const canUseAutoAccept = canUseBooking && billingPlan === "premium";

    return {
      billingPlan,
      billingLabel,
      billingCurrentStatus,
      billingLimits,
      billingFeatures,
      isPaidActive,
      maxPhotos,
      maxServices,
      maxDescription,
      maxLinks,
      maxQuickAnswers,
      canUseBooking,
      canUseTeam,
      canUsePremiumThemes,
      canUseSocialMedia,
      canUseAutoAccept,
    };
  }, [billingStatus]);

  return {
    billingStatus,
    billingLoading,
    billingActionLoading,
    isExtending,
    fetchBillingStatus,
    handleExtendVisibility,
    handleStartSubscription,
    handleOpenBillingPortal,
    ...computedBilling,
  };
};

export default useProfileBilling;