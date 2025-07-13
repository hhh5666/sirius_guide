let allPlaces = [];
let filteredPlaces = [];

async function loadPlaces() {
  const res = await fetch("/api/places");
  allPlaces = await res.json();
  populateCategorySelect();
  filteredPlaces = allPlaces;
  renderPlaces();
}

function renderPlaces() {
  const container = document.getElementById("places");
  container.innerHTML = "";
  for (const place of filteredPlaces) {
    const div = document.createElement("div");
    div.className = "place-card";
    div.innerHTML = `
      <h3>${place.name}</h3>
      <img src="/assets/${place.photo}" alt="${place.name} фото" class="place-photo" />
      <p><strong>Адрес:</strong> ${place.address} <button class="show-map-btn" data-place-id="${place.id}" data-address="${place.address}" style="margin-left:10px; font-size: 0.8em; padding: 3px 6px; cursor: pointer;">▼</button></p>
      <div id="map-${place.id}" class="map-container" style="display:none; margin-top:10px;"></div>

      <p><strong>Категория:</strong> ${place.category}</p>
      <p>${place.description}</p>
      
      <div id="avg-rating-${place.id}"><em>Загрузка средней оценки...</em></div>
      
      <button class="toggle-reviews-btn" data-place-id="${place.id}">Показать отзывы ▼</button>
      
      <div id="reviews-section-${place.id}" style="display:none;">
        <div id="reviews-${place.id}"></div>
        <form onsubmit="addReview(event, ${place.id})">
          <input type="number" min="1" max="5" required placeholder="1-5" id="rating-${place.id}" />
          <input type="text" placeholder="Комментарий" id="comment-${place.id}" required />
          <button type="submit">Оставить отзыв</button>
        </form>
      </div>
    `;
    container.appendChild(div);

    loadAverageRating(place.id);
  }

  document.querySelectorAll(".toggle-reviews-btn").forEach(button => {
    button.addEventListener("click", async () => {
      const placeId = button.getAttribute("data-place-id");
      const reviewsSection = document.getElementById(`reviews-section-${placeId}`);
      if (reviewsSection.style.display === "none") {
        reviewsSection.style.display = "block";
        button.textContent = "Скрыть отзывы ▲";

        if (!reviewsSection.dataset.loaded) {
          await loadReviews(placeId);
          reviewsSection.dataset.loaded = "true";
        }
      } else {
        reviewsSection.style.display = "none";
        button.textContent = "Показать отзывы ▼";
      }
    });
  });
  setupMapButtons();
}

function setupMapButtons() {
  document.querySelectorAll(".show-map-btn").forEach(btn => {
    btn.onclick = () => {
      const placeId = btn.dataset.placeId;
      const address = btn.dataset.address;
      const mapDiv = document.getElementById(`map-${placeId}`);

      if (mapDiv.style.display === "none" || mapDiv.style.display === "") {
        if (!mapDiv.dataset.loaded) {
          const encoded = encodeURIComponent(address);
          mapDiv.innerHTML = `<iframe
            src="https://yandex.ru/map-widget/v1/?text=${encoded}"
            width="100%" height="300" frameborder="0" allowfullscreen>
          </iframe>`;
          mapDiv.dataset.loaded = "true";
        }
        mapDiv.style.display = "block";
        btn.textContent = "▲";
      } else {
        mapDiv.style.display = "none";
        btn.textContent = "▼";
      }
    };
  });
}

async function loadAverageRating(placeId) {
  const res = await fetch(`/api/reviews/${placeId}`);
  const reviews = await res.json();
  const avgContainer = document.getElementById(`avg-rating-${placeId}`);
  if (reviews.length === 0) {
    avgContainer.innerHTML = "<p><strong>Средняя оценка:</strong> нет отзывов</p>";
    return;
  }
  const avg = (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(2);
  avgContainer.innerHTML = `<p><strong>Средняя оценка:</strong> ${avg}</p>`;
}

async function loadReviews(placeId) {
  const res = await fetch(`/api/reviews/${placeId}`);
  const reviews = await res.json();
  const container = document.getElementById(`reviews-${placeId}`);
  if (reviews.length === 0) {
    container.innerHTML = "<p>Отзывов пока нет.</p>";
    return;
  }
  container.innerHTML = "";
  reviews.forEach(r => {
    const d = new Date(r.date);
    container.innerHTML += `<p>⭐${r.rating} — ${r.comment} <small>(${d.toLocaleDateString()})</small></p>`;
  });
}

async function addReview(event, placeId) {
  event.preventDefault();
  const rating = +document.getElementById(`rating-${placeId}`).value;
  const comment = document.getElementById(`comment-${placeId}`).value;
  const res = await fetch("/api/add_review", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({place_id: placeId, rating, comment})
  });
  if ((await res.json()).success) {
    loadReviews(placeId);
    document.getElementById(`rating-${placeId}`).value = "";
    document.getElementById(`comment-${placeId}`).value = "";
  }
}

document.getElementById("addPlaceForm").addEventListener("submit", async e => {
  e.preventDefault();

  const form = document.getElementById("addPlaceForm");
  const formData = new FormData(form);

  const res = await fetch("/api/add_place", {
    method: "POST",
    body: formData
  });

  const data = await res.json();
  if (data.success) {
    alert("Место добавлено!");
    form.reset();
    loadPlaces();
  } else {
    alert("Ошибка: " + data.error);
  }
});

function filterCategory(cat) {
  if (cat === "all") filteredPlaces = allPlaces;
  else filteredPlaces = allPlaces.filter(p => p.category === cat);
  renderPlaces();
}

document.getElementById("toggleAddPlaceBtn").addEventListener("click", () => {
  const container = document.getElementById("addPlaceContainer");
  if (container.style.display === "none") {
    container.style.display = "block";
  } else {
    container.style.display = "none";
  }
});



function populateCategorySelect() {
  const select = document.getElementById("categorySelect");
  const categories = [...new Set(allPlaces.map(p => p.category))]; // уникальные

  // Очистка и добавление опций
  select.innerHTML = '<option value="all">Все категории</option>';
  categories.forEach(cat => {
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = cat.charAt(0).toUpperCase() + cat.slice(1); // с заглавной
    select.appendChild(option);
  });
}

document.getElementById("categorySelect").addEventListener("change", (e) => {
  filterCategory(e.target.value);
});

window.onload = loadPlaces;