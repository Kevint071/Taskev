/** Redirects to /login when the API reports no valid session, and returns whether that happened. */
export function handleUnauthenticated(res: Response): boolean {
  if (res.status === 401) {
    window.location.href = "/login";
    return true;
  }
  return false;
}
