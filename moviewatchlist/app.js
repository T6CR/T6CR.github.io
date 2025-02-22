class WatchList {
  constructor() {
    this.movies = JSON.parse(localStorage.getItem('movies')) || [];
    this.initElements();
    this.init();
    this.searchInput = document.getElementById('searchInput');
    this.currentSearch = '';
    this.notifications = new NotificationManager();
    this.activeTooltip = null;
    this.tooltipTimeout = null;
    this.movieCache = new Map();
    this.editMovieId = null;

    // Add search input listener
    this.searchInput.addEventListener('input', () => {
      this.currentSearch = this.searchInput.value.toLowerCase();
      this.renderMovies();
    });
  }

  initElements() {
    this.movieInput = document.getElementById('movieInput');
    this.addButton = document.getElementById('addButton');
    this.movieList = document.getElementById('movieList');
    this.sortButtons = document.querySelectorAll('.sort-button');
    this.modal = document.getElementById('addMovieModal');
    this.saveButton = document.getElementById('saveButton');
    this.cancelButton = document.getElementById('cancelButton');
    this.durationInput = null;
    this.scanButton = null;
    this.currentSort = 'date';
    this.sortDirection = 'desc';
  }

  init() {
    this.addButton.addEventListener('click', (e) => {
      e.stopPropagation();
      this.openModal();
    });
    this.saveButton.addEventListener('click', () => {
      if (this.editMovieId) {
        this.updateMovie();
      } else {
        this.addMovie();
      }
    });
    this.cancelButton.addEventListener('click', () => this.closeModal());

    this.sortButtons.forEach(button => {
      button.addEventListener('click', () => this.handleSort(button));
    });

    // Close modal when clicking outside
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.closeModal();
    });

    // Setup type select in modal
    const typeSelect = document.querySelector('.type-select-modal');
    const typeHeader = typeSelect.querySelector('.type-select-header');
    const typeOptions = typeSelect.querySelector('.type-select-options');

    typeHeader.addEventListener('click', (e) => {
      e.stopPropagation();
      typeSelect.classList.toggle('open');
    });

    typeOptions.querySelectorAll('.type-select-option').forEach(option => {
      option.addEventListener('click', () => {
        const value = option.dataset.value;
        const text = option.textContent;

        typeSelect.dataset.value = value;
        typeHeader.querySelector('.header-text').textContent = text;
        typeSelect.classList.remove('open');
      });
    });

    // Close type select when clicking outside
    document.addEventListener('click', () => {
      typeSelect.classList.remove('open');
    });

    this.renderMovies();
  }

  openModal(movieId = null) {
    this.modal.classList.add('active');
    this.movieInput.focus();

    if (movieId) {
      this.editMovieId = movieId;
      const movie = this.movies.find(m => m.id === movieId);
      if (movie) {
        this.movieInput.value = movie.title;

        const typeSelect = document.querySelector('.type-select-modal');
        const typeHeader = typeSelect.querySelector('.type-select-header');
        typeSelect.dataset.value = movie.type;
        typeHeader.querySelector('.header-text').textContent = movie.type === 'movie' ? 'Movie' : 'TV Series';
      }
    } else {
      this.editMovieId = null;
    }
  }

  closeModal() {
    this.modal.classList.remove('active');
    this.movieInput.value = '';
    this.resetModalSelect();
    this.editMovieId = null;
  }

  async addMovie() {
    const title = this.movieInput.value.trim();
    if (!title) {
      this.notifications.show('Please enter a title', 'error');
      return;
    }

    const typeSelect = document.querySelector('.type-select-modal');
    const selectedType = typeSelect.dataset.value || 'movie';
    const duration = 'Unknown';

    const movie = {
      id: Date.now(),
      title,
      type: selectedType,
      duration,
      dateAdded: new Date().toISOString(),
      watchStatus: 'not-watched'
    };

    this.movies.push(movie);
    this.saveMovies();
    this.renderMovies();
    this.closeModal();
    this.resetModalSelect();

    this.notifications.show(`Successfully added "${title}"`, 'success');
  }

  async updateMovie() {
    const title = this.movieInput.value.trim();

    if (!title) {
      this.notifications.show('Please enter a title', 'error');
      return;
    }

    const typeSelect = document.querySelector('.type-select-modal');
    const selectedType = typeSelect.dataset.value || 'movie';

    const movieIndex = this.movies.findIndex(m => m.id === this.editMovieId);

    if (movieIndex !== -1) {
      this.movies[movieIndex] = {
        ...this.movies[movieIndex],
        title: title,
        type: selectedType
      };

      this.saveMovies();
      this.renderMovies();
      this.closeModal();
      this.notifications.show(`Successfully updated "${title}"`, 'success');
    } else {
      this.notifications.show('Movie not found', 'error');
    }
  }

  resetModalSelect() {
    const typeSelect = document.querySelector('.type-select-modal');
    const header = typeSelect.querySelector('.type-select-header');
    header.querySelector('.header-text').textContent = 'Movie';
    typeSelect.dataset.value = 'movie';
  }

  updateWatchStatus(id, status) {
    const movie = this.movies.find(m => m.id === id);
    if (movie) {
      movie.watchStatus = status;
      this.saveMovies();
    }
  }

  handleSort(button) {
    const sortType = button.dataset.sort;

    if (this.currentSort === sortType) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.currentSort = sortType;
      this.sortDirection = 'asc';
    }

    // Update button states
    this.sortButtons.forEach(btn => {
      btn.classList.remove('active', 'asc', 'desc');
    });
    button.classList.add('active', this.sortDirection);

    this.renderMovies();
  }

  sortMovies(movies) {
    // First filter by search term
    let filteredMovies = movies;
    if (this.currentSearch) {
      filteredMovies = movies.filter(movie =>
        movie.title.toLowerCase().includes(this.currentSearch)
      );
    }

    // Then sort the filtered results
    return filteredMovies.sort((a, b) => {
      let comparison = 0;

      switch (this.currentSort) {
        case 'name':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'date':
          comparison = new Date(a.dateAdded) - new Date(b.dateAdded);
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'watched':
          comparison = a.watchStatus === 'watched' ? -1 : 1;
          break;
      }

      return this.sortDirection === 'asc' ? comparison : -comparison;
    });
  }

  deleteMovie(id) {
    const movie = this.movies.find(m => m.id === id);
    this.movies = this.movies.filter(movie => movie.id !== id);
    this.saveMovies();
    this.renderMovies();
    this.notifications.show(`"${movie.title}" removed from watchlist`, 'success');
  }

  saveMovies() {
    localStorage.setItem('movies', JSON.stringify(this.movies));
  }

  formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  async fetchMovieInfo(title) {
    // Check cache first
    const cacheKey = `${title}`;
    if (this.movieCache.has(cacheKey)) {
      return this.movieCache.get(cacheKey);
    }

    try {
      // Find the movie/show in our list to get its type
      const mediaItem = this.movies.find(m => m.title === title);
      const mediaType = mediaItem ? mediaItem.type : 'movie';

      const response = await fetch('/api/ai_completion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: `Based on the title "${title}" and type "${mediaType}", provide accurate information specifically for the ${mediaType} version (not TV series if movie, not movie if TV series) in the following JSON format:

          {
            "description": "Brief plot summary (1-2 sentences)",
            "genre": "Main genres (comma separated)",
            "rating": "IMDb rating (0-10)",
            "releaseDate": "Release date (YYYY-MM-DD)"
          }`,
          data: title
        })
      });

      const data = await response.json();

      // Cache the result
      this.movieCache.set(cacheKey, data);
      return data;

    } catch (error) {
      console.error('Error fetching movie info:', error);
      return null;
    }
  }

  async showMovieInfoModal(title) {
    // Create and add modal to DOM if it doesn't exist
    let infoModal = document.getElementById('movieInfoModal');
    if (!infoModal) {
      infoModal = document.createElement('div');
      infoModal.id = 'movieInfoModal';
      infoModal.className = 'modal';
      document.body.appendChild(infoModal);
    }

    // Show loading state
    infoModal.innerHTML = `
      <div class="modal-content movie-info-modal">
        <div class="loading">
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path d="M12 21a9 9 0 100-18 9 9 0 000 18zm0-2a7 7 0 110-14 7 7 0 010 14z" fill="currentColor"/>
            <path d="M12 7v5l3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>
      </div>
    `;

    infoModal.classList.add('active');

    try {
      const info = await this.fetchMovieInfo(title);

      if (!info) {
        this.notifications.show('Could not fetch media information', 'error');
        infoModal.classList.remove('active');
        return;
      }

      // Find the media item to get its type
      const mediaItem = this.movies.find(m => m.title === title);
      const mediaType = mediaItem ? mediaItem.type : 'movie';

      infoModal.innerHTML = `
        <div class="modal-content movie-info-modal">
          <button class="close-modal">
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" fill="currentColor"/>
            </svg>
          </button>
          <h2>${title}</h2>
          <div class="movie-info-content">
            <div class="info-section">
              <h3>Description</h3>
              <p>${info.description}</p>
            </div>
            <div class="info-section meta-info">
              <div class="meta-item">
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" fill="#ffd700"/>
                </svg>
                <span>${info.rating} / 10</span>
              </div>
              <div class="meta-item">
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" fill="currentColor"/>
                </svg>
                <span>${new Date(info.releaseDate).toLocaleDateString()}</span>
              </div>
              <div class="meta-item">
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" fill="currentColor"/>
                </svg>
                <span>${info.genre}</span>
              </div>
            </div>
          </div>
        </div>
      `;

      // Add close button handler
      infoModal.querySelector('.close-modal').addEventListener('click', () => {
        infoModal.classList.remove('active');
      });

      // Close modal when clicking outside
      infoModal.addEventListener('click', (e) => {
        if (e.target === infoModal) {
          infoModal.classList.remove('active');
        }
      });

    } catch (error) {
      console.error('Error showing movie info:', error);
      this.notifications.show('Failed to load media information', 'error');
      infoModal.classList.remove('active');
    }
  }

  showTooltip(event, title) {
    // Clear any existing tooltip timeout
    if (this.tooltipTimeout) {
      clearTimeout(this.tooltipTimeout);
    }

    // Remove any existing tooltip
    this.hideTooltip();

    const titleElement = event.target;
    
    // Create tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.innerHTML = `
      <div class="loading">
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path d="M12 21a9 9 0 100-18 9 9 0 000 18zm0-2a7 7 0 110-14 7 7 0 010 14z" fill="currentColor"/>
          <path d="M12 7v5l3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>
    `;

    // Position tooltip
    const rect = titleElement.getBoundingClientRect();
    tooltip.style.left = rect.left + 'px';
    tooltip.style.top = (rect.bottom + window.scrollY + 10) + 'px';

    // Add tooltip to DOM
    document.body.appendChild(tooltip);
    this.activeTooltip = tooltip;

    // Show tooltip after a small delay
    this.tooltipTimeout = setTimeout(() => {
      tooltip.classList.add('active');
      
      // Fetch and display movie info
      this.fetchMovieInfo(title).then(info => {
        if (!info) {
          tooltip.remove();
          return;
        }

        tooltip.innerHTML = `
          <div class="tooltip-content">
            <div class="tooltip-section">
              <div class="tooltip-title">Description</div>
              <div class="tooltip-text">${info.description}</div>
            </div>
            <div class="tooltip-section">
              <div class="tooltip-meta">
                <span>${info.genre}</span>
                <div class="tooltip-rating">
                  <svg viewBox="0 0 24 24" width="12" height="12">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" fill="#ffd700"/>
                  </svg>
                  ${info.rating}
                </div>
                <span>${new Date(info.releaseDate).getFullYear()}</span>
              </div>
            </div>
            <div class="tooltip-section">
              <a href="${info.trailerUrl}" target="_blank" class="tooltip-link">Watch Trailer</a>
            </div>
          </div>
        `;
      });
    }, 300);
  }

  hideTooltip() {
    if (this.activeTooltip) {
      this.activeTooltip.remove();
      this.activeTooltip = null;
    }
  }

  renderMovies() {
    const sortedMovies = this.sortMovies(this.movies);
    
    this.movieList.innerHTML = sortedMovies
      .map(movie => `
        <div class="movie-item">
          <div class="custom-select" data-value="${movie.watchStatus}" data-id="${movie.id}">
            <div class="custom-select-header">
              ${movie.watchStatus === 'watched' ? 'Watched' : 'Not Watched'}
              <svg viewBox="0 0 24 24" width="12" height="12">
                <path d="M7 10l5 5 5-5z" fill="currentColor"/>
              </svg>
            </div>
            <div class="custom-select-options">
              <div class="custom-select-option" data-value="not-watched">Not Watched</div>
              <div class="custom-select-option" data-value="watched">Watched</div>
            </div>
          </div>
          <span class="movie-title" data-title="${movie.title}">${movie.title}</span>
          <span class="tag type-tag">${movie.type}</span>
          <span class="tag date-tag">${this.formatDate(movie.dateAdded)}</span>
          <button class="edit-btn" onclick="watchList.editMovie(${movie.id})">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 0 0 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/>
            </svg>
          </button>
          <button class="delete-btn" onclick="watchList.deleteMovie(${movie.id})">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" 
                fill="currentColor"/>
            </svg>
          </button>
        </div>
      `)
      .join('');

    // Add event listeners for custom dropdowns
    document.querySelectorAll('.custom-select').forEach(select => {
      const header = select.querySelector('.custom-select-header');
      const options = select.querySelector('.custom-select-options');

      header.addEventListener('click', (e) => {
        e.stopPropagation();
        select.classList.toggle('open');
        
        // Close other open dropdowns
        document.querySelectorAll('.custom-select.open').forEach(openSelect => {
          if (openSelect !== select) openSelect.classList.remove('open');
        });
      });

      select.querySelectorAll('.custom-select-option').forEach(option => {
        option.addEventListener('click', (e) => {
          const value = option.dataset.value;
          const id = parseInt(select.dataset.id);
          this.updateWatchStatus(id, value);
          select.dataset.value = value;
          
          header.innerHTML = `
            ${value === 'watched' ? 'Watched' : 'Not Watched'}
            <svg viewBox="0 0 24 24" width="12" height="12">
              <path d="M7 10l5 5 5-5z" fill="currentColor"/>
            </svg>
          `;
          
          select.classList.remove('open');
        });
      });
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', () => {
      document.querySelectorAll('.custom-select.open').forEach(select => {
        select.classList.remove('open');
      });
    });

    // Add event listeners to movie titles to copy name to clipboard
    document.querySelectorAll('.movie-title').forEach(title => {
      title.addEventListener('click', async (e) => {
        const movieTitle = e.target.dataset.title;
        try {
          await navigator.clipboard.writeText(movieTitle);
          this.notifications.show(`"${movieTitle}" title copied to clipboard`, 'success');
        } catch (err) {
          console.error('Failed to copy: ', err);
          this.notifications.show('Failed to copy title to clipboard', 'error');
        }
      });
    });
  }

  editMovie(id) {
    console.log(`Editing movie with ID: ${id}`);
    this.openModal(id);
  }
}

class NotificationManager {
  constructor() {
    this.container = document.getElementById('notificationsContainer');
  }

  show(message, type = 'success') {
    const id = Date.now();
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.setAttribute('data-id', id);
    
    const icon = type === 'success' 
      ? '<svg class="notification-icon" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor"/></svg>'
      : '<svg class="notification-icon" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" fill="currentColor"/></svg>';
    
    notification.innerHTML = `
      ${icon}
      <div class="notification-content">${message}</div>
      <button class="notification-close" onclick="this.parentElement.remove()">
        <svg viewBox="0 0 24 24" width="16" height="16">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" fill="currentColor"/>
        </svg>
      </button>
    `;
    
    this.container.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      const element = document.querySelector(`.notification[data-id="${id}"]`);
      if (element) element.remove();
    }, 3000);
  }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  window.watchList = new WatchList();
});