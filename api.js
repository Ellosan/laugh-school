// API Configuration
// IMPORTANT: Replace this URL with your Railway/Render backend URL after deployment
const API_BASE_URL = 'https://laugh-school-backend.onrender.com';
// Example: const API_BASE_URL = 'https://your-app-name.up.railway.app/api';

// API Client for Laugh School
class LaughSchoolAPI {
  
  // Fetch all posts (media + polls)
  static async getAllPosts() {
    try {
      const response = await fetch(`${API_BASE_URL}/posts`);
      if (!response.ok) throw new Error('Failed to fetch posts');
      return await response.json();
    } catch (error) {
      console.error('Error fetching posts:', error);
      throw error;
    }
  }

  // Fetch single post by ID
  static async getPost(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/posts/${id}`);
      if (!response.ok) throw new Error('Failed to fetch post');
      return await response.json();
    } catch (error) {
      console.error('Error fetching post:', error);
      throw error;
    }
  }

  // Upload image or video
  static async uploadMedia(file, title) {
    try {
      const formData = new FormData();
      formData.append('media', file);
      formData.append('title', title);

      const response = await fetch(`${API_BASE_URL}/posts/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Failed to upload media');
      return await response.json();
    } catch (error) {
      console.error('Error uploading media:', error);
      throw error;
    }
  }

  // Create poll
  static async createPoll(question, options) {
    try {
      const response = await fetch(`${API_BASE_URL}/posts/poll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ question, options })
      });

      if (!response.ok) throw new Error('Failed to create poll');
      return await response.json();
    } catch (error) {
      console.error('Error creating poll:', error);
      throw error;
    }
  }

  // Add reaction to post
  static async reactToPost(postId) {
    try {
      const response = await fetch(`${API_BASE_URL}/posts/${postId}/react`, {
        method: 'POST'
      });

      if (!response.ok) throw new Error('Failed to react');
      return await response.json();
    } catch (error) {
      console.error('Error reacting to post:', error);
      throw error;
    }
  }

  // Vote on poll
  static async voteOnPoll(pollId, optionIndex) {
    try {
      const response = await fetch(`${API_BASE_URL}/posts/${pollId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ optionIndex })
      });

      if (!response.ok) throw new Error('Failed to vote');
      return await response.json();
    } catch (error) {
      console.error('Error voting on poll:', error);
      throw error;
    }
  }

  // Delete post
  static async deletePost(postId) {
    try {
      const response = await fetch(`${API_BASE_URL}/posts/${postId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete post');
      return await response.json();
    } catch (error) {
      console.error('Error deleting post:', error);
      throw error;
    }
  }
}

// Example usage functions for your frontend

// Load and display all posts
async function loadFeed() {
  try {
    const posts = await LaughSchoolAPI.getAllPosts();
    const feedContainer = document.getElementById('feed');
    
    if (!feedContainer) {
      console.error('Feed container not found');
      return;
    }
    
    feedContainer.innerHTML = '';

    if (posts.length === 0) {
      feedContainer.innerHTML = '<p class="no-posts">No posts yet. Be the first to post! 🚀</p>';
      return;
    }

    posts.forEach(post => {
      const postElement = createPostElement(post);
      feedContainer.appendChild(postElement);
    });
  } catch (error) {
    console.error('Failed to load feed:', error);
    const feedContainer = document.getElementById('feed');
    if (feedContainer) {
      feedContainer.innerHTML = '<p class="error">Failed to load posts. Please refresh the page.</p>';
    }
  }
}

// Create HTML element for a post
function createPostElement(post) {
  const article = document.createElement('article');
  article.className = 'post';
  article.dataset.id = post.id;

  if (post.type === 'media') {
    // Media post (image/video)
    const mediaUrl = post.mediaUrl.startsWith('http') 
      ? post.mediaUrl 
      : API_BASE_URL.replace('/api', '') + post.mediaUrl;
    
    article.innerHTML = `
      <h3>${escapeHtml(post.title)}</h3>
      ${post.mediaType === 'video' 
        ? `<video controls src="${mediaUrl}"></video>`
        : `<img src="${mediaUrl}" alt="${escapeHtml(post.title)}">`
      }
      <div class="post-actions">
        <button class="react-btn" onclick="handleReaction('${post.id}')">
          😂 <span class="reaction-count">${post.reactions}</span>
        </button>
        <span class="post-date">${formatDate(post.createdAt)}</span>
      </div>
    `;
  } else if (post.type === 'poll') {
    // Poll post
    const optionsHTML = post.options.map((option, index) => {
      const percentage = post.totalVotes > 0 
        ? Math.round((option.votes / post.totalVotes) * 100) 
        : 0;
      return `
        <div class="poll-option" onclick="handleVote('${post.id}', ${index})">
          <div class="option-bar" style="width: ${percentage}%"></div>
          <div class="option-content">
            <div class="option-text">${escapeHtml(option.text)}</div>
            <div class="option-votes">${option.votes} votes (${percentage}%)</div>
          </div>
        </div>
      `;
    }).join('');

    article.innerHTML = `
      <h3>${escapeHtml(post.question)}</h3>
      <div class="poll-options">
        ${optionsHTML}
      </div>
      <div class="post-actions">
        <button class="react-btn" onclick="handleReaction('${post.id}')">
          😂 <span class="reaction-count">${post.reactions}</span>
        </button>
        <span class="poll-votes">Total votes: ${post.totalVotes}</span>
        <span class="post-date">${formatDate(post.createdAt)}</span>
      </div>
    `;
  }

  return article;
}

// Handle reaction click
async function handleReaction(postId) {
  try {
    const result = await LaughSchoolAPI.reactToPost(postId);
    const postElement = document.querySelector(`[data-id="${postId}"]`);
    if (postElement) {
      const countElement = postElement.querySelector('.reaction-count');
      if (countElement) {
        countElement.textContent = result.reactions;
        // Add animation
        countElement.style.transform = 'scale(1.3)';
        setTimeout(() => {
          countElement.style.transform = 'scale(1)';
        }, 200);
      }
    }
  } catch (error) {
    console.error('Failed to react:', error);
  }
}

// Handle poll vote
async function handleVote(pollId, optionIndex) {
  try {
    const updatedPoll = await LaughSchoolAPI.voteOnPoll(pollId, optionIndex);
    // Refresh the post to show updated vote counts
    const postElement = document.querySelector(`[data-id="${pollId}"]`);
    if (postElement) {
      const newPostElement = createPostElement({ ...updatedPoll, type: 'poll' });
      postElement.replaceWith(newPostElement);
    }
  } catch (error) {
    console.error('Failed to vote:', error);
    alert('Failed to vote. Please try again.');
  }
}

// Handle media upload
async function handleMediaUpload(event) {
  event.preventDefault();
  
  const fileInput = document.getElementById('mediaFile');
  const titleInput = document.getElementById('mediaTitle');
  
  if (!fileInput || !titleInput) {
    console.error('Form elements not found');
    return;
  }
  
  if (!fileInput.files[0]) {
    alert('Please select a file');
    return;
  }

  const submitBtn = event.target.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Uploading...';
  }

  try {
    const result = await LaughSchoolAPI.uploadMedia(
      fileInput.files[0],
      titleInput.value || 'Untitled'
    );
    
    alert('Media uploaded successfully! 🎉');
    fileInput.value = '';
    titleInput.value = '';
    
    // Redirect to feed after 1 second
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1000);
  } catch (error) {
    alert('Failed to upload media. Please try again.');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Upload';
    }
  }
}

// Handle poll creation
async function handlePollCreation(event) {
  event.preventDefault();
  
  const questionInput = document.getElementById('pollQuestion');
  const optionsInputs = document.querySelectorAll('.poll-option-input');
  
  if (!questionInput) {
    console.error('Poll question input not found');
    return;
  }
  
  const options = Array.from(optionsInputs)
    .map(input => input.value.trim())
    .filter(value => value !== '');

  if (options.length < 2) {
    alert('Please provide at least 2 options');
    return;
  }

  const submitBtn = event.target.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating...';
  }

  try {
    await LaughSchoolAPI.createPoll(questionInput.value, options);
    alert('Poll created successfully! 🎉');
    questionInput.value = '';
    optionsInputs.forEach(input => input.value = '');
    
    // Redirect to feed after 1 second
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1000);
  } catch (error) {
    alert('Failed to create poll. Please try again.');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Poll';
    }
  }
}

// Utility functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return date.toLocaleDateString();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  // If on feed page, load posts
  if (document.getElementById('feed')) {
    loadFeed();
  }
  
  // If on upload page, attach form handlers
  const mediaForm = document.getElementById('mediaUploadForm');
  if (mediaForm) {
    mediaForm.addEventListener('submit', handleMediaUpload);
  }
  
  const pollForm = document.getElementById('pollCreationForm');
  if (pollForm) {
    pollForm.addEventListener('submit', handlePollCreation);
  }
});
