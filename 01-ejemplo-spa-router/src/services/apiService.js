export const BASE_URL = "https://jsonplaceholder.typicode.com";

const TIMEOUT_MS = 4000;
const MAX_RETRIES = 5;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithTimeout(url, ms = TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);

  try {
    return await fetch(url, {signal: controller.signal});
  } finally {
    clearTimeout(timeoutId);
  }
}
export default class ApiService {

  async getPosts(retries = MAX_RETRIES) {
    try {
      const response = await fetchWithTimeout(`${BASE_URL}/posts?_limit=5`);
  
      if(!response.ok) throw new Error("No se pudo obtener la información");
  
      return response.json();

    }catch(error) {
      const isNetworkError = error instanceof TypeError;
      if(isNetworkError && retries > 0) {
        await delay(1000);
        return this.getPosts(retries - 1);
      }
      throw error;
    }
  }

}