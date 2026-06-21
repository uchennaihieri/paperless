import EventsClientPage from "./client-page";
import { apiClient } from "@/lib/apiClient";

export const metadata = { title: "Events — Extended Services" };

export default async function EventsPage() {
  let initialEvents = [];
  let initialTemplates = [];

  try {
    const res = await apiClient("/events");
    if (res?.success && res.events) initialEvents = res.events;
  } catch (err) {
    console.error("Failed to fetch events:", err);
  }

  try {
    const res = await apiClient("/templates?availableFor=events");
    if (res?.success && res.data) {
      initialTemplates = res.data;
    }
  } catch (err) {
    console.error("Failed to fetch templates:", err);
  }

  return <EventsClientPage initialEvents={initialEvents} initialTemplates={initialTemplates} />;
}
