import { useCallback, useState } from "react";
import axios from "axios";

const DEFAULT_AVATAR = "/images/other/no-image.png";
const MAX_IMAGE_SIZE = 3 * 1024 * 1024;

const useProfilePhotos = ({
  user,
  isEditing,
  editData,
  maxPhotos,
  addPhotoInputRef,
  authHeaders,
  fetchProfile,
  setRefreshTrigger,
  showAlert,
}) => {
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [newPhotoFiles, setNewPhotoFiles] = useState([]);
  const [newPhotoPreviews, setNewPhotoPreviews] = useState([]);
  const [newPhotoHashes, setNewPhotoHashes] = useState([]);
  const [photosUploading, setPhotosUploading] = useState(false);

  const [serviceImageUploadingIds, setServiceImageUploadingIds] = useState([]);

  const hashFile = async (file) => {
    const buf = await file.arrayBuffer();
    const hashBuf = await crypto.subtle.digest("SHA-256", buf);

    return Array.from(new Uint8Array(hashBuf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  };

  const getAvatarUrl = useCallback(
    (profile) => {
      if (!profile) return DEFAULT_AVATAR;
      if (isEditing && avatarPreview) return avatarPreview;
      if (profile.avatar?.url) return profile.avatar.url;
      if (typeof profile.avatar === "string" && profile.avatar) return profile.avatar;

      return DEFAULT_AVATAR;
    },
    [avatarPreview, isEditing]
  );

  const getPhotoUrl = useCallback((photo) => {
    if (!photo) return "";
    if (typeof photo === "string") return photo;
    if (photo.url) return photo.url;

    return "";
  }, []);

  const getServiceImageUrl = useCallback((service) => {
    if (!service) return "";
    if (typeof service.image === "string") return service.image;
    if (service.image?.url) return service.image.url;

    return "";
  }, []);

  const markServiceImageUploading = (serviceId, add = true) => {
    setServiceImageUploadingIds((prev) =>
      add ? [...new Set([...prev, serviceId])] : prev.filter((id) => id !== serviceId)
    );
  };

  const cleanupAvatarPreview = () => {
    if (!avatarPreview) return;

    try {
      URL.revokeObjectURL(avatarPreview);
    } catch {
      // ignore revoke errors
    }
  };

  const cleanupPhotoPreviews = () => {
    newPhotoPreviews.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore revoke errors
      }
    });
  };

  const resetAvatarDraft = () => {
    cleanupAvatarPreview();
    setAvatarPreview("");
    setAvatarFile(null);
  };

  const resetPhotoDraft = () => {
    cleanupPhotoPreviews();
    setNewPhotoFiles([]);
    setNewPhotoPreviews([]);
    setNewPhotoHashes([]);
  };

  const uploadServiceImage = async (serviceId, file) => {
    if (!serviceId || !file) return;

    const fd = new FormData();
    fd.append("file", file);

    await axios.post(
      `${process.env.REACT_APP_API_URL}/api/profiles/${user.uid}/services/${serviceId}/image`,
      fd,
      { headers: await authHeaders({ "Content-Type": "multipart/form-data" }) }
    );
  };

  const removeServiceImage = async (serviceId) => {
    if (!serviceId) return;

    await axios.delete(
      `${process.env.REACT_APP_API_URL}/api/profiles/${user.uid}/services/${serviceId}/image`,
      { headers: await authHeaders() }
    );
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showAlert("Nieprawidłowy format. Wybierz obraz.", "warning");
      e.target.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      showAlert("Zdjęcie jest za duże (maks. 3MB).", "warning");
      e.target.value = "";
      return;
    }

    cleanupAvatarPreview();

    const blobUrl = URL.createObjectURL(file);
    setAvatarFile(file);
    setAvatarPreview(blobUrl);

    e.target.value = "";
  };

  const handleRemoveAvatar = async () => {
    try {
      setAvatarUploading(true);
      resetAvatarDraft();

      await axios.delete(
        `${process.env.REACT_APP_API_URL}/api/profiles/${user.uid}/avatar`,
        { headers: await authHeaders() }
      );

      await fetchProfile();
      setRefreshTrigger(Date.now());
      showAlert("Usunięto avatar.", "success");
    } catch (e) {
      console.error(e);
      showAlert("Nie udało się usunąć avatara.", "error");
    } finally {
      setAvatarUploading(false);
    }
  };

  const openAddPhotoPicker = () => {
    const current = (editData.photos || []).length;
    const pending = newPhotoFiles.length;

    if (current + pending >= maxPhotos) {
      showAlert(`Można dodać maksymalnie ${maxPhotos} zdjęć.`, "warning");
      return;
    }

    addPhotoInputRef.current?.click();
  };

  const handleAddPhotosSelect = async (e) => {
    const filesAll = Array.from(e.target.files || []);
    if (!filesAll.length) return;

    const current = (editData.photos || []).length;
    const pending = newPhotoFiles.length;
    const slotsLeft = Math.max(0, maxPhotos - (current + pending));
    const files = filesAll.slice(0, slotsLeft);

    const existingPending = new Set(newPhotoHashes);
    const existingSignatures = new Set(
      newPhotoFiles.map((file) => `${file.name}|${file.size}|${file.lastModified}`)
    );

    const okFiles = [];
    const okPreviews = [];
    const okHashes = [];
    let skippedDup = 0;

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        showAlert("Pominięto plik: nie jest obrazem.", "warning");
        continue;
      }

      if (file.size > MAX_IMAGE_SIZE) {
        showAlert("Pominięto plik > 3MB.", "warning");
        continue;
      }

      const sig = `${file.name}|${file.size}|${file.lastModified}`;
      if (existingSignatures.has(sig)) {
        skippedDup += 1;
        continue;
      }

      const hash = await hashFile(file);
      if (existingPending.has(hash)) {
        skippedDup += 1;
        continue;
      }

      existingSignatures.add(sig);
      existingPending.add(hash);
      okFiles.push(file);
      okHashes.push(hash);
      okPreviews.push(URL.createObjectURL(file));
    }

    if (!okFiles.length) {
      if (skippedDup) showAlert("Duplikaty zostały pominięte.", "info");
      e.target.value = "";
      return;
    }

    setNewPhotoFiles((prev) => [...prev, ...okFiles]);
    setNewPhotoHashes((prev) => [...prev, ...okHashes]);
    setNewPhotoPreviews((prev) => [...prev, ...okPreviews]);

    if (skippedDup) {
      showAlert("Część plików była duplikatami — pominięto.", "info");
    }

    e.target.value = "";
  };

  const removePendingPhoto = (idx) => {
    setNewPhotoFiles((prev) => prev.filter((_, i) => i !== idx));
    setNewPhotoHashes((prev) => prev.filter((_, i) => i !== idx));
    setNewPhotoPreviews((prev) => {
      const url = prev[idx];

      if (url) {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // ignore revoke errors
        }
      }

      return prev.filter((_, i) => i !== idx);
    });
  };

  const removeSavedPhoto = async (photo) => {
    const photoKey =
      typeof photo === "string"
        ? photo
        : photo?.publicId || photo?.url || "";

    if (!photoKey) {
      showAlert("Nie można usunąć tego zdjęcia.", "warning");
      return;
    }

    try {
      setPhotosUploading(true);

      await axios.delete(
        `${process.env.REACT_APP_API_URL}/api/profiles/${user.uid}/photos/${encodeURIComponent(photoKey)}`,
        { headers: await authHeaders() }
      );

      await fetchProfile();
      setRefreshTrigger(Date.now());
      showAlert("Usunięto zdjęcie.", "success");
    } catch (e) {
      console.error(e);

      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        "Nie udało się usunąć zdjęcia.";

      showAlert(msg, "error");
    } finally {
      setPhotosUploading(false);
    }
  };

  const handleReplaceSavedPhoto = async (e, photo) => {
    const file = e.target.files?.[0];
    const publicId = typeof photo === "string" ? "" : photo?.publicId;

    if (!file) return;

    if (!publicId) {
      showAlert("Nie można zamienić tego zdjęcia, bo brakuje publicId.", "warning");
      e.target.value = "";
      return;
    }

    if (!file.type.startsWith("image/")) {
      showAlert("Nieprawidłowy format. Wybierz obraz.", "warning");
      e.target.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      showAlert("Zdjęcie jest za duże (maks. 3MB).", "warning");
      e.target.value = "";
      return;
    }

    try {
      setPhotosUploading(true);

      await axios.delete(
        `${process.env.REACT_APP_API_URL}/api/profiles/${user.uid}/photos/${encodeURIComponent(publicId)}`,
        { headers: await authHeaders() }
      );

      const fd = new FormData();
      fd.append("files", file);

      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/profiles/${user.uid}/photos`,
        fd,
        { headers: await authHeaders({ "Content-Type": "multipart/form-data" }) }
      );

      await fetchProfile();
      setRefreshTrigger(Date.now());
      showAlert("Zamieniono zdjęcie.", "success");
    } catch (err) {
      console.error(err);
      showAlert("Nie udało się zamienić zdjęcia.", "error");
    } finally {
      setPhotosUploading(false);
      e.target.value = "";
    }
  };

  const handleServiceImageChange = async (e, serviceId) => {
    const file = e.target.files?.[0];
    if (!file || !serviceId) return;

    if (!file.type.startsWith("image/")) {
      showAlert("Nieprawidłowy format. Wybierz obraz.", "warning");
      e.target.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      showAlert("Zdjęcie usługi jest za duże (maks. 3MB).", "warning");
      e.target.value = "";
      return;
    }

    try {
      markServiceImageUploading(serviceId, true);
      await uploadServiceImage(serviceId, file);
      await fetchProfile();
      setRefreshTrigger(Date.now());
      showAlert("Zdjęcie usługi zapisane.", "success");
    } catch (err) {
      console.error(err);
      showAlert("Nie udało się zapisać zdjęcia usługi.", "error");
    } finally {
      markServiceImageUploading(serviceId, false);
      e.target.value = "";
    }
  };

  const handleRemoveServiceImage = async (serviceId) => {
    if (!serviceId) return;

    try {
      markServiceImageUploading(serviceId, true);
      await removeServiceImage(serviceId);
      await fetchProfile();
      setRefreshTrigger(Date.now());
      showAlert("Usunięto zdjęcie usługi.", "success");
    } catch (err) {
      console.error(err);
      showAlert("Nie udało się usunąć zdjęcia usługi.", "error");
    } finally {
      markServiceImageUploading(serviceId, false);
    }
  };

  const uploadPendingImages = async () => {
    if (avatarFile) {
      setAvatarUploading(true);

      const fd = new FormData();
      fd.append("file", avatarFile);

      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/profiles/${user.uid}/avatar`,
        fd,
        { headers: await authHeaders({ "Content-Type": "multipart/form-data" }) }
      );

      setAvatarUploading(false);
      resetAvatarDraft();
    }

    if (newPhotoFiles.length) {
      setPhotosUploading(true);

      const fd = new FormData();
      newPhotoFiles.forEach((file) => fd.append("files", file));

      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/profiles/${user.uid}/photos`,
        fd,
        { headers: await authHeaders({ "Content-Type": "multipart/form-data" }) }
      );

      resetPhotoDraft();
      setPhotosUploading(false);
    }
  };

  return {
    avatarUploading,
    photosUploading,
    serviceImageUploadingIds,
    newPhotoFiles,
    newPhotoPreviews,
    getAvatarUrl,
    getPhotoUrl,
    getServiceImageUrl,
    handleImageChange,
    handleRemoveAvatar,
    openAddPhotoPicker,
    handleAddPhotosSelect,
    removePendingPhoto,
    removeSavedPhoto,
    handleReplaceSavedPhoto,
    handleServiceImageChange,
    handleRemoveServiceImage,
    uploadPendingImages,
  };
};

export default useProfilePhotos;