import { MessagesClient } from "./MessagesClient";

export const metadata = {
    title: 'Messages | Grandmothers of the World',
    description: 'Your conversations',
};

export default function MessagesPage() {
    return (
        <MessagesClient />
    );
}
