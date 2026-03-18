export const timeToMins = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return 0;
    return h * 60 + m;
};

export const getRoundByTime = (timeStr: string, runType: "PICKUP" | "DROPOFF" | string) => {
    const mins = timeToMins(timeStr);
    if (runType === "PICKUP") {
        if (mins < 16 * 60 + 40) return 1;
        if (mins < 18 * 60 + 0) return 2;
        if (mins < 20 * 60 + 0) return 3;
        return 4;
    } else {
        if (mins < 19 * 60 + 5) return 1;
        if (mins < 20 * 60 + 45) return 2;
        if (mins < 22 * 60 + 10) return 3;
        return 4;
    }
};

export const TARGET_ROUNDS = [1, 2, 3, 4];

export const ROUND_LABELS: Record<number, { pickUp: string, dropOff: string }> = {
    1: { pickUp: "15:40", dropOff: "17:35" },
    2: { pickUp: "16:40", dropOff: "19:05" },
    3: { pickUp: "18:00", dropOff: "20:45" },
    4: { pickUp: "20:00", dropOff: "22:10" }
};
