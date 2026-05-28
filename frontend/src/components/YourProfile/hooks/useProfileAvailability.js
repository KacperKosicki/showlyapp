import { useState } from "react";

const DEFAULT_BLOCK = {
    type: "day",
    date: "",
    dateFrom: "",
    dateTo: "",
    fromTime: "",
    toTime: "",
    reason: "",
};

const isValidTimeRange = (fromTime, toTime) => {
    if (!fromTime || !toTime) return false;
    return fromTime < toTime;
};

const formatDateLocal = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
};

const getDateRange = (dateFrom, dateTo) => {
    if (!dateFrom || !dateTo) return [];

    const start = new Date(`${dateFrom}T00:00:00`);
    const end = new Date(`${dateTo}T00:00:00`);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return [];
    }

    if (start > end) return [];

    const dates = [];
    const cursor = new Date(start);

    while (cursor <= end) {
        dates.push(formatDateLocal(cursor));
        cursor.setDate(cursor.getDate() + 1);
    }

    return dates;
};

const useProfileAvailability = ({ setEditData, showAlert }) => {
    const [newAvailabilityBlock, setNewAvailabilityBlock] = useState(DEFAULT_BLOCK);

    const resetAvailabilityBlock = () => {
        setNewAvailabilityBlock({ ...DEFAULT_BLOCK });
    };

    const handleAddAvailabilityBlock = () => {
        const block = {
            type: newAvailabilityBlock.type || "day",
            date: String(newAvailabilityBlock.date || "").trim(),
            dateFrom: String(newAvailabilityBlock.dateFrom || "").trim(),
            dateTo: String(newAvailabilityBlock.dateTo || "").trim(),
            fromTime: String(newAvailabilityBlock.fromTime || "").trim(),
            toTime: String(newAvailabilityBlock.toTime || "").trim(),
            reason: String(newAvailabilityBlock.reason || "").trim().slice(0, 120),
        };

        if (!["day", "dayRange", "slot"].includes(block.type)) {
            showAlert("Nieprawidłowy typ blokady.", "warning");
            return;
        }

        let blocksToAdd = [];

        if (block.type === "day") {
            if (!block.date) {
                showAlert("Wybierz datę blokady.", "warning");
                return;
            }

            blocksToAdd = [
                {
                    type: "day",
                    date: block.date,
                    fromTime: "",
                    toTime: "",
                    reason: block.reason,
                },
            ];
        }

        if (block.type === "dayRange") {
            if (!block.dateFrom || !block.dateTo) {
                showAlert("Wybierz datę od i datę do.", "warning");
                return;
            }

            const dates = getDateRange(block.dateFrom, block.dateTo);

            if (!dates.length) {
                showAlert("Data końcowa musi być taka sama lub późniejsza niż data początkowa.", "warning");
                return;
            }

            if (dates.length > 60) {
                showAlert("Jednorazowo możesz dodać maksymalnie 60 dni blokady.", "warning");
                return;
            }

            blocksToAdd = dates.map((date) => ({
                type: "day",
                date,
                fromTime: "",
                toTime: "",
                reason: block.reason,
            }));
        }

        if (block.type === "slot") {
            if (!block.date) {
                showAlert("Wybierz datę blokady.", "warning");
                return;
            }

            if (!isValidTimeRange(block.fromTime, block.toTime)) {
                showAlert("Godzina końcowa musi być późniejsza niż początkowa.", "warning");
                return;
            }

            blocksToAdd = [
                {
                    type: "slot",
                    date: block.date,
                    fromTime: block.fromTime,
                    toTime: block.toTime,
                    reason: block.reason,
                },
            ];
        }

        setEditData((prev) => {
            const current = Array.isArray(prev.availabilityOverrides)
                ? prev.availabilityOverrides
                : [];

            const uniqueBlocks = blocksToAdd.filter((newItem) => {
                return !current.some((item) => {
                    if (!item) return false;

                    return (
                        item.type === newItem.type &&
                        item.date === newItem.date &&
                        String(item.fromTime || "") === String(newItem.fromTime || "") &&
                        String(item.toTime || "") === String(newItem.toTime || "")
                    );
                });
            });

            if (!uniqueBlocks.length) {
                showAlert("Wszystkie wybrane dni są już dodane jako blokady.", "warning");
                return prev;
            }

            if (current.length + uniqueBlocks.length > 365) {
                showAlert("Możesz dodać maksymalnie 365 wyjątków dostępności.", "warning");
                return prev;
            }

            return {
                ...prev,
                availabilityOverrides: [...current, ...uniqueBlocks],
            };
        });

        resetAvailabilityBlock();
    };

    const handleRemoveAvailabilityBlock = (index) => {
        setEditData((prev) => ({
            ...prev,
            availabilityOverrides: Array.isArray(prev.availabilityOverrides)
                ? prev.availabilityOverrides.filter((_, i) => i !== index)
                : [],
        }));
    };

    return {
        newAvailabilityBlock,
        setNewAvailabilityBlock,
        handleAddAvailabilityBlock,
        handleRemoveAvailabilityBlock,
        resetAvailabilityBlock,
    };
};

export default useProfileAvailability;