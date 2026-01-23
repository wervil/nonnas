import { MessagesClient } from "./MessagesClient";

export const metadata = {
    title: 'Messages | Nonnas',
    description: 'Your conversations',
};

export default function MessagesPage() {
    return (
        <MessagesClient />
    );
}
