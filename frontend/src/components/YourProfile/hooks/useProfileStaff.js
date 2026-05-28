import { useCallback, useState } from "react";
import axios from "axios";

const STAFF_NAME_MAX_LENGTH = 60;

const hasSpammyRepeatedChars = (value) => {
    return /(.)\1{9,}/i.test(String(value || ""));
};

const validateStaffName = (name) => {
    const cleaned = String(name || "").trim();

    if (!cleaned) {
        return "Podaj imię pracownika.";
    }

    if (cleaned.length < 2) {
        return "Nazwa pracownika jest za krótka.";
    }

    if (cleaned.length > STAFF_NAME_MAX_LENGTH) {
        return `Nazwa pracownika może mieć maksymalnie ${STAFF_NAME_MAX_LENGTH} znaków.`;
    }

    if (hasSpammyRepeatedChars(cleaned)) {
        return "Nazwa pracownika wygląda jak spam. Użyj normalnej nazwy.";
    }

    return "";
};

const useProfileStaff = ({
    profile,
    authHeaders,
    canUseTeam,
    maxStaff = 0,
    showAlert,
}) => {
    const [staff, setStaff] = useState([]);
    const [staffLoading, setStaffLoading] = useState(false);

    const [newStaff, setNewStaff] = useState({
        name: "",
        capacity: 1,
        active: true,
        serviceIds: [],
    });

    const [staffEdits, setStaffEdits] = useState({});
    const [isCreatingStaff, setIsCreatingStaff] = useState(false);
    const [deletingStaffIds, setDeletingStaffIds] = useState([]);

    const fetchStaff = useCallback(
        async (profileId) => {
            if (!profileId) return;

            try {
                setStaffLoading(true);

                const { data } = await axios.get(
                    `${process.env.REACT_APP_API_URL}/api/staff`,
                    {
                        params: { profileId },
                        headers: await authHeaders(),
                    }
                );

                setStaff(data || []);
            } catch (e) {
                console.error("Nie udało się pobrać pracowników", e);
                showAlert("Nie udało się pobrać pracowników.", "error");
            } finally {
                setStaffLoading(false);
            }
        },
        [authHeaders, showAlert]
    );

    const createStaff = useCallback(async () => {
        if (isCreatingStaff) return;
        if (!profile?._id) return;

        if (!canUseTeam) {
            showAlert("Zespół i pracownicy są dostępni tylko w planie Premium.", "warning");
            return;
        }

        if (staff.length >= maxStaff) {
            showAlert(`Plan Premium pozwala dodać maksymalnie ${maxStaff} pracowników.`, "warning");
            return;
        }

        const staffNameError = validateStaffName(newStaff.name);

        if (staffNameError) {
            showAlert(staffNameError, "warning");
            return;
        }

        setIsCreatingStaff(true);

        try {
            const payload = {
                profileId: profile._id,
                name: newStaff.name.trim(),
                capacity: Number(newStaff.capacity) || 1,
                active: !!newStaff.active,
                serviceIds: newStaff.serviceIds || [],
            };

            await axios.post(
                `${process.env.REACT_APP_API_URL}/api/staff`,
                payload,
                {
                    headers: await authHeaders({
                        "Content-Type": "application/json",
                    }),
                }
            );

            setNewStaff({
                name: "",
                capacity: 1,
                active: true,
                serviceIds: [],
            });

            await fetchStaff(profile._id);

            showAlert("Dodano pracownika.", "success");
        } catch (e) {
            console.error("Błąd dodawania pracownika", e);
            const apiMessage =
                e?.response?.data?.errors?.[0]?.message ||
                e?.response?.data?.message ||
                "Błąd dodawania pracownika.";

            showAlert(apiMessage, "error");
        } finally {
            setIsCreatingStaff(false);
        }
    }, [
        isCreatingStaff,
        profile,
        canUseTeam,
        maxStaff,
        staff.length,
        newStaff,
        authHeaders,
        fetchStaff,
        showAlert,
    ]);

    const deleteStaff = useCallback(
        async (id) => {
            if (!id) return;
            if (deletingStaffIds.includes(id)) return;

            setDeletingStaffIds((prev) => [...prev, id]);
            setStaff((prev) => prev.filter((s) => s._id !== id));

            try {
                await axios.delete(
                    `${process.env.REACT_APP_API_URL}/api/staff/${id}`,
                    {
                        headers: await authHeaders(),
                    }
                );

                showAlert("Usunięto pracownika.", "success");
            } catch (e) {
                console.error("Błąd usuwania pracownika", e);

                if (profile?._id) {
                    await fetchStaff(profile._id);
                }

                showAlert("Błąd usuwania pracownika.", "error");
            } finally {
                setDeletingStaffIds((prev) => prev.filter((x) => x !== id));
            }
        },
        [
            deletingStaffIds,
            profile,
            authHeaders,
            fetchStaff,
            showAlert,
        ]
    );

    return {
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
    };
};

export default useProfileStaff;
