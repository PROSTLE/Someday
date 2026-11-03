import type { Item } from "./types";

export function directionsUrl(item: Item) {
  const address = item.data.address;
  // OpenStreetMap addresses often start with the place's name already.
  const query = address?.toLowerCase().startsWith(item.title.toLowerCase())
    ? address
    : [item.title, address].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

const calendarStamp = (date: Date) => date.toISOString().replace(/[-:]|\.\d{3}/g, "");

export function calendarUrl(item: Item) {
  const start = new Date(item.due_at!);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: item.title,
    dates: `${calendarStamp(start)}/${calendarStamp(end)}`,
  });
  if (item.summary) params.set("details", item.summary);
  return `https://calendar.google.com/calendar/render?${params}`;
}
