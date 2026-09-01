export const BASE_URL = "https://jsonplaceholder.typicode.com";

export default class ApiService {

  async getPosts() {
    const response = await fetch(`${BASE_URL}/posts?_limit=5`);

    if(!response.ok) throw new Error("No se pudo obtener la información");

    return response.json();
  }

}