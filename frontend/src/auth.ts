// Simple auth utility for storing and retrieving JWT token
export function setToken(token: string) {
  localStorage.setItem("jwt_token", token);
}

export function getToken(): string | null {
  return localStorage.getItem("jwt_token");
}

export function removeToken() {
  localStorage.removeItem("jwt_token");
}