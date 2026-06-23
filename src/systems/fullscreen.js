export function getFullscreenElement(doc = globalThis.document) {
  return doc?.fullscreenElement ?? doc?.webkitFullscreenElement ?? null;
}

export function canFullscreen(element = globalThis.document?.documentElement) {
  return Boolean(element?.requestFullscreen || element?.webkitRequestFullscreen);
}

export async function enterFullscreen(element = globalThis.document?.documentElement) {
  const doc = element?.ownerDocument ?? globalThis.document;
  if (!element || getFullscreenElement(doc)) return Boolean(getFullscreenElement(doc));
  const request = element.requestFullscreen ?? element.webkitRequestFullscreen;
  if (!request) return false;
  try {
    await request.call(element);
    return true;
  } catch {
    return false;
  }
}

export async function leaveFullscreen(doc = globalThis.document) {
  if (!getFullscreenElement(doc)) return true;
  const exit = doc?.exitFullscreen ?? doc?.webkitExitFullscreen;
  if (!exit) return false;
  try {
    await exit.call(doc);
    return true;
  } catch {
    return false;
  }
}
