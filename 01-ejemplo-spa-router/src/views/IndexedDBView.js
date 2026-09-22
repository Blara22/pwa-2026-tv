import {
  addNote,
  getNotes,
  deleteNote,
  getNotesByCategory
} from "../services/dbService.js";

const CATEGORIES = ["personal", "trabajo", "estudio"];

/* Genera el HTML de una lista de notas ya obtenida de dbService.js. */
function renderNotes(notes) {
  if (notes.length === 0) {
    return `<p class="storage-meta">Sin notas todavía. Agrega la primera.</p>`;
  }

  const sortedNotes = [...notes].sort((a, b) =>
    a.createdAt < b.createdAt ? 1 : -1
  );

  return sortedNotes
    .map(
      (note) => `
    <div class="note-card">
      <span class="note-category">${note.category}</span>
      <p>${note.text}</p>
      <button
        type="button"
        class="secondary-button"
        data-action="delete-note"
        data-id="${note.id}"
      >Eliminar</button>
    </div>
  `
    )
    .join("");
}

/* Vuelve a pintar SOLO la lista de notas, sin re-renderizar toda la vista. */
async function updateList(categoryFilter) {
  const container = document.getElementById("notes-list");
  if (!container) return; // el usuario ya navegó a otra vista

  const notes = categoryFilter
    ? await getNotesByCategory(categoryFilter)
    : await getNotes();

  console.log(notes);

  container.innerHTML = renderNotes(notes);
}

/** Lee el valor actual del filtro de categoría, o null si está en "Todas". */
function getCurrentFilter() {
  const select = document.getElementById("category-filter");

  return select && select.value ? select.value : null;
}

document.addEventListener("submit", async (event) => {
  const form = event.target.closest("#note-form");
  if (!form) return;

  event.preventDefault();

  const textInput = document.getElementById("note-input");
  const categorySelect = document.getElementById("category-select");
  const text = textInput.value.trim();

  if (!text) return;

  try {
    await addNote({
      text,
      category: categorySelect.value,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("No se pudo guardar la nota:", error);
    alert("No se pudo guardar la nota.");
    return;
  }

  textInput.value = "";
  await updateList(getCurrentFilter());
});

document.addEventListener("click", async (event) => {
  const button = event.target.closest('[data-action="delete-note"]');
  if (!button) return;

  const id = Number(button.dataset.id);

  try {
    await deleteNote(id);
    await updateList(getCurrentFilter());
  } catch (error) {
    console.error("No se pudo eliminar la nota:", error);
    alert("No se pudo eliminar la nota.");
  }
});

// Filtro por categoría
document.addEventListener("change", async (event) => {
  const select = event.target.closest("#category-filter");
  if (!select) return;

  await updateList(getCurrentFilter());
});

export default async function IndexedDBView() {
  const notes = await getNotes();

  const categoryOptions = CATEGORIES.map(
    (category) => `<option value="${category}">${category}</option>`
  ).join("");

  return `
    <div class="card">
      <h2>Notas (demo IndexedDB)</h2>
      <p>Cada nota se guarda en un <strong>object store</strong> llamado
      "notes", con un <strong>índice</strong> sobre "category". Recarga la
      página (F5): a diferencia de sessionStorage, las notas siguen aquí.
      Abre DevTools → <strong>Application → IndexedDB</strong> para ver la
      base de datos "por dentro".</p>
    </div>

    <div class="card">
      <h3>Agregar nota</h3>
      <form id="note-form">
        <input
          type="text"
          id="note-input"
          placeholder="Escribe una nota..."
        />

        <select id="category-select">
          ${categoryOptions}
        </select>

        <div class="storage-actions">
          <button type="submit">Guardar nota</button>
        </div>
      </form>
    </div>

    <div class="card">
      <h3>Notas guardadas</h3>

      <label for="category-filter">
        Filtrar por categoría (usa el índice):
      </label>

      <select id="category-filter">
        <option value="">Todas</option>
        ${categoryOptions}
      </select>

      <div id="notes-list" class="notes-grid">
        ${renderNotes(notes)}
      </div>
    </div>
  `;
}