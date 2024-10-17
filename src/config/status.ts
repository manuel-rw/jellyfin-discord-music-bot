import { PresenceData } from "discord.js";

export const BotStatusConfig: PresenceData = {
    status: "online", // online, idle, dnd, invisible
    activities: [{
        name: "with your feelings",
        type: 2, // 0: Playing, 1: Streaming, 2: Listening to, 3: Watching, 4: Custom, 5: Competing
        // url: "", for streaming only
    }]
}