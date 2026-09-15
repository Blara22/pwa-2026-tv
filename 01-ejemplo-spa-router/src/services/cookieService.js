export function setCookie(name, value, days) {
  let expires = "";

  if(typeof days === "number") {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    expires = `; expires=${date.toUTCString()}`;
  }

  document.cookie = `${name}=${encodeURIComponent(value)}${expires}; path=/`;

}

export function getCookie(name) {
  const cookies = document.cookie.split("; ");
  const encontrada = cookies.find((row) => row.startsWith(`${name}=`));

  if(!encontrada) {
    return null;
  }

  const valor = encontrada.substring(name.length + 1);
  return decodeURIComponent(valor);
}

export function deleteCookie(name) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
}