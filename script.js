// TMDB API Configuration
const TMDB_API_KEY = "2d0a75dbd66f2b90fbb44cf9a407a54d";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

// Vidking Embed URLs
const VIDKING_MOVIE_URL = "https://vidking.net/embed/movie/";
const VIDKING_TV_URL = "https://vidking.net/embed/tv/";

// State
let currentCategory = "home";
let heroMovie = null;
let trending = [];
let popularMovies = [];
let topRatedMovies = [];
let upcomingMovies = [];
let popularTV = [];
let topRatedTV = [];
let selectedMovie = null;
let isPlaying = false;
let selectedSeason = 1;
let selectedEpisode = 1;
let tvDetails = null;
let searchTimeout = null;

// DOM Elements
const navbar = document.getElementById("navbar");
const navLinks = document.querySelectorAll(".nav-link");
const heroSection = document.getElementById("heroSection");
const heroBackdrop = document.getElementById("heroBackdrop");
const heroContent = document.getElementById("heroContent");
const mainContent = document.getElementById("mainContent");
const movieModal = document.getElementById("movieModal");
const modalBody = document.getElementById("modalBody");
const modalClose = document.getElementById("modalClose");
const searchBtn = document.getElementById("searchBtn");
const searchModal = document.getElementById("searchModal");
const searchInput = document.getElementById("searchInput");
const searchResults = document.getElementById("searchResults");
const searchClose = document.getElementById("searchClose");

// Initialize
document.addEventListener("DOMContentLoaded", init);

async function init() {
  setupEventListeners();
  await fetchAllData();
  renderHero();
  renderContent();
}

// Event Listeners
function setupEventListeners() {
  // Navbar scroll effect
  window.addEventListener("scroll", () => {
    navbar.classList.toggle("scrolled", window.scrollY > 50);
  });

  // Navigation
  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      const category = link.dataset.category;
      setActiveCategory(category);
    });
  });

  // Modal close
  modalClose.addEventListener("click", closeMovieModal);
  movieModal.addEventListener("click", (e) => {
    if (e.target === movieModal) closeMovieModal();
  });

  // Search
  searchBtn.addEventListener("click", openSearchModal);
  searchClose.addEventListener("click", closeSearchModal);
  searchModal.addEventListener("click", (e) => {
    if (e.target === searchModal) closeSearchModal();
  });
  searchInput.addEventListener("input", handleSearch);

  // Keyboard
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeMovieModal();
      closeSearchModal();
    }
  });
}

function setActiveCategory(category) {
  currentCategory = category;
  navLinks.forEach((link) => {
    link.classList.toggle("active", link.dataset.category === category);
  });
  renderContent();
}

// API Functions
async function fetchFromTMDB(endpoint, params = {}) {
  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
  url.searchParams.append("api_key", TMDB_API_KEY);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("API Error");
    return await response.json();
  } catch (error) {
    console.error("TMDB API Error:", error);
    return null;
  }
}

async function fetchAllData() {
  showLoading();

  const [
    trendingData,
    popularMoviesData,
    topRatedMoviesData,
    upcomingData,
    popularTVData,
    topRatedTVData,
  ] = await Promise.all([
    fetchFromTMDB("/trending/all/week"),
    fetchFromTMDB("/movie/popular"),
    fetchFromTMDB("/movie/top_rated"),
    fetchFromTMDB("/movie/upcoming"),
    fetchFromTMDB("/tv/popular"),
    fetchFromTMDB("/tv/top_rated"),
  ]);

  trending = trendingData?.results || [];
  popularMovies = popularMoviesData?.results || [];
  topRatedMovies = topRatedMoviesData?.results || [];
  upcomingMovies = upcomingData?.results || [];
  popularTV = popularTVData?.results || [];
  topRatedTV = topRatedTVData?.results || [];

  // Set hero movie
  if (trending.length > 0) {
    heroMovie = trending.find((m) => m.backdrop_path) || trending[0];
  }
}

async function searchMovies(query) {
  const data = await fetchFromTMDB("/search/multi", { query });
  return data?.results?.filter((r) => r.media_type !== "person") || [];
}

async function getTVDetails(tvId) {
  return await fetchFromTMDB(`/tv/${tvId}`);
}

// Image URLs
function getImageUrl(path, size = "w500") {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

function getBackdropUrl(path) {
  return getImageUrl(path, "original");
}

// Vidking Embed URLs
function getMovieEmbedUrl(tmdbId) {
  return `${VIDKING_MOVIE_URL}${tmdbId}`;
}

function getTVEmbedUrl(tmdbId, season = 1, episode = 1) {
  return `${VIDKING_TV_URL}${tmdbId}/${season}/${episode}`;
}

// Render Functions
function showLoading() {
  mainContent.innerHTML = `
    <div class="carousel-section">
      <div class="carousel-header">
        <div class="skeleton" style="width: 200px; height: 30px;"></div>
      </div>
      <div class="carousel-container">
        ${Array(6).fill('<div class="movie-card"><div class="skeleton" style="aspect-ratio: 2/3;"></div></div>').join("")}
      </div>
    </div>
  `;
}

function renderHero() {
  if (!heroMovie) return;

  const backdropUrl = getBackdropUrl(heroMovie.backdrop_path);
  if (backdropUrl) {
    heroBackdrop.style.backgroundImage = `url(${backdropUrl})`;
  }

  const title = heroMovie.title || heroMovie.name;
  const overview = heroMovie.overview || "";
  const rating = heroMovie.vote_average?.toFixed(1) || "N/A";
  const year = (heroMovie.release_date || heroMovie.first_air_date || "").split("-")[0];
  const mediaType = heroMovie.media_type === "tv" ? "TV Series" : "Movie";

  heroContent.innerHTML = `
    <div class="hero-badge">
      <span>🔥</span>
      <span>Featured ${mediaType}</span>
    </div>
    <h1 class="hero-title">${title}</h1>
    <p class="hero-description">${overview.length > 200 ? overview.slice(0, 200) + "..." : overview}</p>
    <div class="hero-meta">
      <span class="hero-rating">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
        ${rating}
      </span>
      <span class="hero-year">${year}</span>
      <span class="hero-type">${mediaType}</span>
    </div>
    <div class="hero-buttons">
      <button class="btn btn-primary" onclick="openMovieModal(heroMovie, true)">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
        Play Now
      </button>
      <button class="btn btn-glass" onclick="openMovieModal(heroMovie)">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 16v-4"/>
          <path d="M12 8h.01"/>
        </svg>
        More Info
      </button>
    </div>
  `;
}

function renderContent() {
  let html = "";

  switch (currentCategory) {
    case "movies":
      html = `
        ${renderCarousel("Popular Movies", popularMovies, true)}
        ${renderCarousel("Top Rated Movies", topRatedMovies)}
        ${renderCarousel("Upcoming Movies", upcomingMovies)}
      `;
      break;
    case "tv":
      html = `
        ${renderCarousel("Popular TV Shows", popularTV, true)}
        ${renderCarousel("Top Rated TV Shows", topRatedTV)}
      `;
      break;
    case "trending":
      html = renderCarousel("Trending This Week", trending, true);
      break;
    default:
      html = `
        ${renderCarousel("Trending Now", trending.slice(0, 10), true)}
        ${renderCarousel("Popular Movies", popularMovies)}
        ${renderCarousel("Popular TV Shows", popularTV)}
        ${renderCarousel("Top Rated Movies", topRatedMovies)}
        ${renderCarousel("Coming Soon", upcomingMovies)}
      `;
  }

  mainContent.innerHTML = html;
  setupCarouselNavigation();
}

function renderCarousel(title, movies, isLarge = false) {
  const carouselId = title.replace(/\s+/g, "-").toLowerCase();
  
  return `
    <section class="carousel-section">
      <div class="carousel-header">
        <h2 class="carousel-title">${title}</h2>
        <div class="carousel-nav">
          <button class="carousel-btn" data-carousel="${carouselId}" data-direction="left">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </button>
          <button class="carousel-btn" data-carousel="${carouselId}" data-direction="right">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m9 18 6-6-6-6"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="carousel-container" id="${carouselId}">
        ${movies.map((movie) => renderMovieCard(movie, isLarge)).join("")}
      </div>
    </section>
  `;
}

function renderMovieCard(movie, isLarge = false) {
  const posterUrl = getImageUrl(movie.poster_path) || "";
  const title = movie.title || movie.name || "Unknown";
  const year = (movie.release_date || movie.first_air_date || "").split("-")[0];
  const rating = movie.vote_average?.toFixed(1) || "N/A";
  const movieData = encodeURIComponent(JSON.stringify(movie));

  return `
    <div class="movie-card ${isLarge ? "large" : ""}" onclick="handleMovieClick('${movieData}')">
      <div class="movie-poster-container">
        ${posterUrl 
          ? `<img src="${posterUrl}" alt="${title}" class="movie-poster" loading="lazy">`
          : `<div class="movie-poster skeleton"></div>`
        }
        <div class="movie-overlay">
          <button class="movie-play-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
          </button>
          <div class="movie-rating">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            ${rating}
          </div>
        </div>
      </div>
      <div class="movie-info">
        <div class="movie-title">${title}</div>
        <div class="movie-year">${year}</div>
      </div>
    </div>
  `;
}

function setupCarouselNavigation() {
  document.querySelectorAll(".carousel-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const carouselId = btn.dataset.carousel;
      const direction = btn.dataset.direction;
      const carousel = document.getElementById(carouselId);
      
      if (carousel) {
        const scrollAmount = carousel.clientWidth * 0.8;
        carousel.scrollBy({
          left: direction === "left" ? -scrollAmount : scrollAmount,
          behavior: "smooth",
        });
      }
    });
  });
}

// Movie Modal
function handleMovieClick(movieData) {
  const movie = JSON.parse(decodeURIComponent(movieData));
  openMovieModal(movie);
}

async function openMovieModal(movie, autoPlay = false) {
  selectedMovie = movie;
  isPlaying = autoPlay;
  selectedSeason = 1;
  selectedEpisode = 1;
  tvDetails = null;

  const isTV = movie.media_type === "tv" || movie.first_air_date;
  
  if (isTV) {
    tvDetails = await getTVDetails(movie.id);
  }

  renderModalContent();
  movieModal.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeMovieModal() {
  movieModal.classList.remove("active");
  document.body.style.overflow = "";
  selectedMovie = null;
  isPlaying = false;
  tvDetails = null;
}

function renderModalContent() {
  if (!selectedMovie) return;

  const isTV = selectedMovie.media_type === "tv" || selectedMovie.first_air_date;
  const title = selectedMovie.title || selectedMovie.name;
  const backdropUrl = getBackdropUrl(selectedMovie.backdrop_path);
  const rating = selectedMovie.vote_average?.toFixed(1) || "N/A";
  const year = (selectedMovie.release_date || selectedMovie.first_air_date || "").split("-")[0];
  const mediaType = isTV ? "TV Series" : "Movie";

  let embedUrl = "";
  if (isPlaying) {
    embedUrl = isTV
      ? getTVEmbedUrl(selectedMovie.id, selectedSeason, selectedEpisode)
      : getMovieEmbedUrl(selectedMovie.id);
  }

  let tvControlsHtml = "";
  if (isTV && tvDetails && isPlaying) {
    const seasons = tvDetails.seasons?.filter((s) => s.season_number > 0) || [];
    const currentSeasonData = seasons.find((s) => s.season_number === selectedSeason);
    const episodeCount = currentSeasonData?.episode_count || 1;

    tvControlsHtml = `
      <div class="tv-controls">
        <div class="select-wrapper">
          <button class="select-btn" onclick="toggleSeasonDropdown()">
            Season ${selectedSeason}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m6 9 6 6 6-6"/>
            </svg>
          </button>
          <div class="select-dropdown" id="seasonDropdown">
            ${seasons.map((s) => `
              <div class="select-option ${s.season_number === selectedSeason ? "selected" : ""}" 
                   onclick="selectSeason(${s.season_number})">
                Season ${s.season_number}
              </div>
            `).join("")}
          </div>
        </div>
        <div class="select-wrapper">
          <button class="select-btn" onclick="toggleEpisodeDropdown()">
            Episode ${selectedEpisode}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m6 9 6 6 6-6"/>
            </svg>
          </button>
          <div class="select-dropdown" id="episodeDropdown">
            ${Array.from({ length: episodeCount }, (_, i) => i + 1).map((ep) => `
              <div class="select-option ${ep === selectedEpisode ? "selected" : ""}" 
                   onclick="selectEpisode(${ep})">
                Episode ${ep}
              </div>
            `).join("")}
          </div>
        </div>
      </div>
    `;
  }

  modalBody.innerHTML = `
    ${isPlaying ? `
      <div class="video-container">
        <iframe 
          src="${embedUrl}" 
          allowfullscreen 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        ></iframe>
      </div>
    ` : `
      <div class="modal-backdrop" style="background-image: url(${backdropUrl})">
        <div class="modal-backdrop-gradient"></div>
      </div>
    `}
    <div class="modal-info">
      <h2 class="modal-title">${title}</h2>
      <div class="modal-meta">
        <span class="modal-rating">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          ${rating}
        </span>
        <span>${year}</span>
        <span>${mediaType}</span>
      </div>
      ${tvControlsHtml}
      <p class="modal-description">${selectedMovie.overview || "No description available."}</p>
      ${!isPlaying ? `
        <button class="modal-play-btn" onclick="startPlaying()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
          Play ${isTV ? "Episode" : "Movie"}
        </button>
      ` : ""}
    </div>
  `;
}

function startPlaying() {
  isPlaying = true;
  renderModalContent();
}

function toggleSeasonDropdown() {
  document.getElementById("seasonDropdown")?.classList.toggle("active");
  document.getElementById("episodeDropdown")?.classList.remove("active");
}

function toggleEpisodeDropdown() {
  document.getElementById("episodeDropdown")?.classList.toggle("active");
  document.getElementById("seasonDropdown")?.classList.remove("active");
}

function selectSeason(season) {
  selectedSeason = season;
  selectedEpisode = 1;
  document.getElementById("seasonDropdown")?.classList.remove("active");
  renderModalContent();
}

function selectEpisode(episode) {
  selectedEpisode = episode;
  document.getElementById("episodeDropdown")?.classList.remove("active");
  renderModalContent();
}

// Search Modal
function openSearchModal() {
  searchModal.classList.add("active");
  searchInput.focus();
  document.body.style.overflow = "hidden";
}

function closeSearchModal() {
  searchModal.classList.remove("active");
  searchInput.value = "";
  searchResults.innerHTML = "";
  document.body.style.overflow = "";
}

function handleSearch() {
  const query = searchInput.value.trim();
  
  clearTimeout(searchTimeout);
  
  if (!query) {
    searchResults.innerHTML = `<div class="search-empty">Start typing to search...</div>`;
    return;
  }

  searchResults.innerHTML = `<div class="search-empty">Searching...</div>`;

  searchTimeout = setTimeout(async () => {
    const results = await searchMovies(query);
    renderSearchResults(results);
  }, 300);
}

function renderSearchResults(results) {
  if (!results.length) {
    searchResults.innerHTML = `<div class="search-empty">No results found</div>`;
    return;
  }

  searchResults.innerHTML = results.map((item) => {
    const posterUrl = getImageUrl(item.poster_path, "w92");
    const title = item.title || item.name;
    const year = (item.release_date || item.first_air_date || "").split("-")[0];
    const type = item.media_type === "tv" ? "TV Series" : "Movie";
    const itemData = encodeURIComponent(JSON.stringify(item));

    return `
      <div class="search-result-item" onclick="handleSearchResultClick('${itemData}')">
        ${posterUrl 
          ? `<img src="${posterUrl}" alt="${title}" class="search-result-poster">`
          : `<div class="search-result-poster skeleton"></div>`
        }
        <div class="search-result-info">
          <div class="search-result-title">${title}</div>
          <div class="search-result-meta">${year} • ${type}</div>
        </div>
      </div>
    `;
  }).join("");
}

function handleSearchResultClick(itemData) {
  const item = JSON.parse(decodeURIComponent(itemData));
  closeSearchModal();
  openMovieModal(item);
}

// Make functions available globally
window.handleMovieClick = handleMovieClick;
window.openMovieModal = openMovieModal;
window.startPlaying = startPlaying;
window.toggleSeasonDropdown = toggleSeasonDropdown;
window.toggleEpisodeDropdown = toggleEpisodeDropdown;
window.selectSeason = selectSeason;
window.selectEpisode = selectEpisode;
window.handleSearchResultClick = handleSearchResultClick;
window.heroMovie = null;

// Update heroMovie reference when it's set
const originalFetchAllData = fetchAllData;
fetchAllData = async function() {
  await originalFetchAllData();
  window.heroMovie = heroMovie;
};
