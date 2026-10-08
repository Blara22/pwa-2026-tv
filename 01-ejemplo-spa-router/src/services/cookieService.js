export function setCookie(name, value, days) {
  let expires = "";

  if(typeof days === "number") {
    const fecha = new Date();
    fecha.setTime(fecha.getTime() + days * 24 * 60 * 60 * 1000);
    expires = `; expires=${fecha.toUTCString()}`;
  }

  document.cookie = `${name}=${encodeURIComponent(value)}${expires}; path="/"`;
}

export function getCookie(name) {
  const cookies = document.cookie.split("; ");
  const found = cookies.find((row) => row.startsWith(`${name}=`));

  if(!found) {
    return null;
  }

  const value = found.substring(name.length + 1);

  return decodeURIComponent(value);
}

export function deleteCookie(name) {

  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;

}


