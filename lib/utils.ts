import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// OpenRouteService Directions API utility
const ORS_API_KEY = "5b3ce3597851110001cf6248bda64cab470b440fbf700a86446fec38";

export async function fetchDirectionsORS(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): Promise<{ steps: string[]; geometry: any }> {
  const url = "https://api.openrouteservice.org/v2/directions/driving-car/geojson";
  const body = {
    coordinates: [
      [from.lng, from.lat],
      [to.lng, to.lat],
    ],
    instructions: true,
  };
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": ORS_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to fetch directions");
  const data = await res.json();
  const steps = data.features[0].properties.segments[0].steps.map(
    (step: any) => step.instruction
  );
  return { steps, geometry: data.features[0].geometry };
}
