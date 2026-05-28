// YourProfile.jsx
import { useState, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import styles from './YourProfile.module.scss';
import AlertBox from "../AlertBox/AlertBox";
import EmptyProfileState from './sections/EmptyProfileState';
import ProfileHeader from './sections/ProfileHeader';
import BillingSection from './sections/BillingSection';
import VisibilityNotice from './sections/VisibilityNotice';
import BasicInfoSection from './sections/BasicInfoSection';
import DescriptionSection from './sections/DescriptionSection';
import AppearanceSection from './sections/AppearanceSection';
import OfferSection from './sections/OfferSection';
import LinkMediaSection from './sections/LinkMediaSection';
import ContactSocialSection from './sections/ContactSocialSection';
import AdditionalInfoSection from './sections/AdditionalInfoSection';
import EditBar from './sections/EditBar';
import Lightbox from './sections/Lightbox';
import useProfileBilling from './hooks/useProfileBilling';
import useProfileStaff from './hooks/useProfileStaff';
import useProfilePhotos from './hooks/useProfilePhotos';
import useProfileSave from './hooks/useProfileSave';
import useProfileData from './hooks/useProfileData';
import useProfileServices from './hooks/useProfileServices';
import useAlert from './hooks/useAlert';
import useProfileVisibility from './hooks/useProfileVisibility';
import useAuthHeaders from './hooks/useAuthHeaders';
import useScrollToProfileSection from './hooks/useScrollToProfileSection';
import useProfileAvailability from './hooks/useProfileAvailability';
import useProfileLoader from './hooks/useProfileLoader';
import useLightbox from './hooks/useLightbox';
import {
  TAGS_LIMIT,
  TAG_MAX_LENGTH,
  LINK_MAX_LENGTH,
  SOCIAL_LINK_MAX_LENGTH,
  CONTACT_EMAIL_MAX_LENGTH,
  CONTACT_PHONE_MAX_LENGTH,
  CONTACT_STREET_MAX_LENGTH,
  CONTACT_POSTCODE_MAX_LENGTH,
} from "../constants/validationLimits";

const YourProfile = ({ user, setRefreshTrigger }) => {
  // =========================
  // Lokalne stany
  // =========================

  const [isEditing, setIsEditing] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const fileInputRef = useRef(null);
  const bannerInputRef = useRef(null);
  const location = useLocation();
  const addPhotoInputRef = useRef(null);

  const authHeaders = useAuthHeaders(user);
  const { alert, showAlert, clearAlert } = useAlert();
  const { fullscreenImage, openLightbox, closeLightbox } = useLightbox();

  const {
    billingStatus,
    billingLoading,
    billingActionLoading,
    isExtending,
    fetchBillingStatus,
    handleExtendVisibility,
    handleStartSubscription,
    handleOpenBillingPortal,
    billingPlan,
    billingLabel,
    billingCurrentStatus,
    billingLimits,
    isPaidActive,
    maxPhotos: MAX_PHOTOS,
    maxServices: MAX_SERVICES,
    maxStaff: MAX_STAFF,
    maxDescription: MAX_DESCRIPTION,
    maxLinks: MAX_LINKS,
    maxQuickAnswers: MAX_QUICK_ANSWERS,
    canUseBooking,
    canUseTeam,
    canUsePremiumThemes,
    canUseSocialMedia,
    canUseAutoAccept,
  } = useProfileBilling({ showAlert });

  const {
    profile,
    editData,
    setEditData,
    loading,
    notFound,
    initialEditData,
    fetchProfile,
  } = useProfileData({
    user,
    authHeaders,
    fetchBillingStatus,
  });

  const {
    newAvailabilityBlock,
    setNewAvailabilityBlock,
    handleAddAvailabilityBlock,
    handleRemoveAvailabilityBlock,
  } = useProfileAvailability({
    setEditData,
    showAlert,
  });

  const {
    staff,
    staffLoading,
    newStaff,
    setNewStaff,
    staffEdits,
    setStaffEdits,
    isCreatingStaff,
    deletingStaffIds,
    fetchStaff,
    createStaff,
    deleteStaff,
  } = useProfileStaff({
    profile,
    authHeaders,
    canUseTeam,
    maxStaff: MAX_STAFF,
    showAlert,
  });

  useScrollToProfileSection({ loading, location });

  const {
    avatarUploading,
    bannerUploading,
    photosUploading,
    serviceImageUploadingIds,
    newPhotoFiles,
    newPhotoPreviews,
    getAvatarUrl,
    getBannerUrl,
    getPhotoUrl,
    getServiceImageUrl,
    handleImageChange,
    handleBannerChange,
    handleRemoveAvatar,
    handleRemoveBanner,
    openAddPhotoPicker,
    handleAddPhotosSelect,
    removePendingPhoto,
    removeSavedPhoto,
    handleReplaceSavedPhoto,
    handleServiceImageChange,
    handleRemoveServiceImage,
    uploadPendingImages,
  } = useProfilePhotos({
    user,
    isEditing,
    editData,
    maxPhotos: MAX_PHOTOS,
    addPhotoInputRef,
    authHeaders,
    fetchProfile,
    setRefreshTrigger,
    showAlert,
  });

  useProfileLoader({
    user,
    location,
    fetchProfile,
    fetchStaff,
  });

  const {
    newService,
    setNewService,
    getDurationLimitText,
    mapUnit,
    mapServiceCategory,
    formatServicePrice,
    prettyUrl,
    cleanTagInput,
    cleanServiceText,
    cleanIntegerInput,
    validateServiceData,
    normalizeTagsForSave,
    handleAddEditableService,
  } = useProfileServices({
    editData,
    setEditData,
    setFormErrors,
    maxServices: MAX_SERVICES,
    showAlert,
  });

  // =========================
  // Zapis profilu
  // =========================
  const {
    isSaving,
    handleSaveChanges,
  } = useProfileSave({
    user,
    editData,
    profile,
    staffEdits,
    setStaffEdits,
    setIsEditing,
    setFormErrors,
    authHeaders,
    uploadPendingImages,
    fetchProfile,
    fetchStaff,
    showAlert,
    validateServiceData,
    normalizeTagsForSave,
    maxDescription: MAX_DESCRIPTION,
    maxServices: MAX_SERVICES,
    maxLinks: MAX_LINKS,
    maxQuickAnswers: MAX_QUICK_ANSWERS,
    canUseBooking,
    canUseTeam,
    canUseAutoAccept,
    canUsePremiumThemes,
    canUseSocialMedia,
    tagsLimit: TAGS_LIMIT,
    tagMaxLength: TAG_MAX_LENGTH,
    linkMaxLength: LINK_MAX_LENGTH,
    socialLinkMaxLength: SOCIAL_LINK_MAX_LENGTH,
    contactEmailMaxLength: CONTACT_EMAIL_MAX_LENGTH,
    contactPhoneMaxLength: CONTACT_PHONE_MAX_LENGTH,
    contactStreetMaxLength: CONTACT_STREET_MAX_LENGTH,
    contactPostcodeMaxLength: CONTACT_POSTCODE_MAX_LENGTH,
  });

  const handleCancelEdit = () => {
    setEditData(initialEditData || editData);
    setStaffEdits({});
    setFormErrors({});
    setIsEditing(false);
  };

  const {
    until,
    isAdminHidden,
    daysLeft,
    isExpired,
    canExtend,
    shouldShowVisibilityNotice,
  } = useProfileVisibility({
    profile,
    billingStatus,
  });

  if (!user) return <Navigate to="/login" replace />;
  if (loading) return <div className={styles.wrapper}>⏳ Ładowanie profilu…</div>;
  if (notFound || !profile) return <EmptyProfileState />;

  const hasAvatarNow =
    Object.prototype.hasOwnProperty.call(editData, 'avatar')
      ? Boolean(editData.avatar)
      : Boolean(profile?.avatar);

  const hasImageNow = (value) => {
    if (!value) return false;
    if (typeof value === 'string') return !!value.trim();
    return !!String(value?.url || '').trim();
  };

  const hasBannerNow =
    Object.prototype.hasOwnProperty.call(editData, 'banner')
      ? hasImageNow(editData.banner)
      : hasImageNow(profile?.banner);

  // =========================
  // Render
  // =========================
  return (
    <div className={styles.wrapper} id="scrollToId">
      {alert && (
        <AlertBox
          type={alert.type}
          message={alert.message}
          onClose={clearAlert}
        />
      )}

      <div className={styles.inner} id="profileWrapper">
        <ProfileHeader
          profile={profile}
          isEditing={isEditing}
          onEdit={() => setIsEditing(true)}
        />

        <BillingSection
          billingLoading={billingLoading}
          billingLabel={billingLabel}
          billingCurrentStatus={billingCurrentStatus}
          billingLimits={billingLimits}
          billingPlan={billingPlan}
          billingActionLoading={billingActionLoading}
          isPaidActive={isPaidActive}
          onStartSubscription={handleStartSubscription}
          onOpenBillingPortal={handleOpenBillingPortal}
        />

        {shouldShowVisibilityNotice && (
          <VisibilityNotice
            isAdminHidden={isAdminHidden}
            isExpired={isExpired}
            until={until}
            daysLeft={daysLeft}
            isExtending={isExtending}
            canExtend={canExtend}
            onExtendVisibility={handleExtendVisibility}
          />
        )}

        <BasicInfoSection
          profile={profile}
          editData={editData}
          isEditing={isEditing}
          formErrors={formErrors}
          hasAvatarNow={hasAvatarNow}
          hasBannerNow={hasBannerNow}
          fileInputRef={fileInputRef}
          bannerInputRef={bannerInputRef}
          getAvatarUrl={getAvatarUrl}
          getBannerUrl={getBannerUrl}
          onEditDataChange={setEditData}
          onImageChange={handleImageChange}
          onBannerChange={handleBannerChange}
          onRemoveAvatar={handleRemoveAvatar}
          onRemoveBanner={handleRemoveBanner}
          canUseBanner={isPaidActive}
          bannerUploading={bannerUploading}
          onStartSubscription={handleStartSubscription}
          billingActionLoading={billingActionLoading}
        />

        <DescriptionSection
          profile={profile}
          editData={editData}
          isEditing={isEditing}
          formErrors={formErrors}
          maxDescription={MAX_DESCRIPTION}
          onEditDataChange={setEditData}
        />

        <AppearanceSection
          profile={profile}
          editData={editData}
          isEditing={isEditing}
          canUsePremiumThemes={canUsePremiumThemes}
          onEditDataChange={setEditData}
        />

        <OfferSection
          profile={profile}
          editData={editData}
          isEditing={isEditing}
          formErrors={formErrors}
          setEditData={setEditData}
          newAvailabilityBlock={newAvailabilityBlock}
          setNewAvailabilityBlock={setNewAvailabilityBlock}
          handleAddAvailabilityBlock={handleAddAvailabilityBlock}
          handleRemoveAvailabilityBlock={handleRemoveAvailabilityBlock}
          maxServices={MAX_SERVICES}
          newService={newService}
          setNewService={setNewService}
          handleAddEditableService={handleAddEditableService}
          cleanServiceText={cleanServiceText}
          cleanIntegerInput={cleanIntegerInput}
          getDurationLimitText={getDurationLimitText}
          mapServiceCategory={mapServiceCategory}
          mapUnit={mapUnit}
          formatServicePrice={formatServicePrice}
          getServiceImageUrl={getServiceImageUrl}
          handleServiceImageChange={handleServiceImageChange}
          handleRemoveServiceImage={handleRemoveServiceImage}
          serviceImageUploadingIds={serviceImageUploadingIds}
          canUseBooking={canUseBooking}
          canUseTeam={canUseTeam}
          maxStaff={MAX_STAFF}
          canUseAutoAccept={canUseAutoAccept}
          billingActionLoading={billingActionLoading}
          handleStartSubscription={handleStartSubscription}
          staff={staff}
          staffLoading={staffLoading}
          staffEdits={staffEdits}
          setStaffEdits={setStaffEdits}
          deleteStaff={deleteStaff}
          deletingStaffIds={deletingStaffIds}
          newStaff={newStaff}
          setNewStaff={setNewStaff}
          createStaff={createStaff}
          isCreatingStaff={isCreatingStaff}
          showAlert={showAlert}
        />

        <LinkMediaSection
          profile={profile}
          editData={editData}
          isEditing={isEditing}
          formErrors={formErrors}
          setEditData={setEditData}
          tagsLimit={TAGS_LIMIT}
          tagMaxLength={TAG_MAX_LENGTH}
          linkMaxLength={LINK_MAX_LENGTH}
          maxLinks={MAX_LINKS}
          maxPhotos={MAX_PHOTOS}
          cleanTagInput={cleanTagInput}
          prettyUrl={prettyUrl}
          getPhotoUrl={getPhotoUrl}
          openLightbox={openLightbox}
          handleReplaceSavedPhoto={handleReplaceSavedPhoto}
          photosUploading={photosUploading}
          removeSavedPhoto={removeSavedPhoto}
          newPhotoPreviews={newPhotoPreviews}
          removePendingPhoto={removePendingPhoto}
          newPhotoFiles={newPhotoFiles}
          openAddPhotoPicker={openAddPhotoPicker}
          addPhotoInputRef={addPhotoInputRef}
          handleAddPhotosSelect={handleAddPhotosSelect}
          avatarUploading={avatarUploading}
        />

        <ContactSocialSection
          profile={profile}
          editData={editData}
          isEditing={isEditing}
          formErrors={formErrors}
          setEditData={setEditData}
          canUseSocialMedia={canUseSocialMedia}
          socialLinkMaxLength={SOCIAL_LINK_MAX_LENGTH}
          contactEmailMaxLength={CONTACT_EMAIL_MAX_LENGTH}
          contactPhoneMaxLength={CONTACT_PHONE_MAX_LENGTH}
          contactStreetMaxLength={CONTACT_STREET_MAX_LENGTH}
          contactPostcodeMaxLength={CONTACT_POSTCODE_MAX_LENGTH}
          prettyUrl={prettyUrl}
        />

        <AdditionalInfoSection
          profile={profile}
          editData={editData}
          isEditing={isEditing}
          formErrors={formErrors}
          setEditData={setEditData}
          maxQuickAnswers={MAX_QUICK_ANSWERS}
        />

        {/* Pasek zapisu edycji */}
        {isEditing && (
          <EditBar
            isSaving={isSaving}
            onSave={handleSaveChanges}
            onCancel={handleCancelEdit}
          />
        )}

        <Lightbox
          image={fullscreenImage}
          onClose={closeLightbox}
        />

      </div>
    </div>
  );
};

export default YourProfile;
