import { LOS_PENASQUITOS_ELEMENTARY } from "./data";

// Google Maps Embed API iframe. Free, unlimited, no per-request billing.
// Shows helper → student → school when a candidate is selected, else just
// student → school as the baseline orient-view.

const CONTAINER = {
  width: "100%",
  height: "540px",
  borderRadius: "8px",
  border: 0,
  display: "block",
};

export default function GoogleMapView({ student, selectedMatch }) {
  const apiKey =
    import.meta.env.VITE_GOOGLE_MAPS_EMBED_API_KEY ||
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
    import.meta.env.GOOGLE_MAPS_API_KEY ||
    "";

  if (!apiKey) {
    return (
      <div
        style={{ ...CONTAINER, border: "1px solid #FCD34D" }}
        className="bg-amber-50 text-amber-900 text-sm flex items-center justify-center text-center px-6"
      >
        <div>
          <div className="font-medium mb-1">Google Maps Embed API key missing</div>
          <div className="text-xs text-amber-800 leading-relaxed">
            Set <code>VITE_GOOGLE_MAPS_API_KEY</code> in{" "}
            <code>app/.env.local</code> and enable the{" "}
            <strong>Maps Embed API</strong> in your Google Cloud project, then
            restart the dev server.
          </div>
        </div>
      </div>
    );
  }

  // Destination uses the school's address string so Google's geocoder pins
  // to the building, not to whatever service-area business has a registered
  // territory overlapping the lat/lng. Student uses address + zip for the
  // same reason. Helpers fall back to coords (no real address on file).
  const kidLocation = student.address
    ? `${student.address}, San Diego, CA 92129`
    : `${student.home.lat},${student.home.lng}`;
  const destination = LOS_PENASQUITOS_ELEMENTARY.address;

  const origin = selectedMatch
    ? `${selectedMatch.coords.lat},${selectedMatch.coords.lng}`
    : kidLocation;

  const params = new URLSearchParams({
    key: apiKey,
    origin,
    destination,
    mode: "walking",
  });
  if (selectedMatch) params.set("waypoints", kidLocation);

  const src = `https://www.google.com/maps/embed/v1/directions?${params.toString()}`;

  const title = selectedMatch
    ? `Walking route: ${selectedMatch.family} to ${student.name} to ${LOS_PENASQUITOS_ELEMENTARY.name}`
    : `Walking route: ${student.name}'s home to ${LOS_PENASQUITOS_ELEMENTARY.name}`;

  return (
    <iframe
      title={title}
      src={src}
      style={CONTAINER}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      allowFullScreen
    />
  );
}
