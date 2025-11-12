const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Create uploads directory if it doesn't exist
const uploadsDir = './uploads';
const dataFile = './data.json';

// Storage configuration for multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|webm|mov/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images and videos are allowed!'));
    }
  }
});

// Initialize data structure
async function initializeData() {
  try {
    await fs.mkdir(uploadsDir, { recursive: true });
    
    try {
      await fs.access(dataFile);
    } catch {
      const initialData = {
        posts: [],
        polls: []
      };
      await fs.writeFile(dataFile, JSON.stringify(initialData, null, 2));
    }
  } catch (error) {
    console.error('Error initializing data:', error);
  }
}

// Read data
async function readData() {
  try {
    const data = await fs.readFile(dataFile, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { posts: [], polls: [] };
  }
}

// Write data
async function writeData(data) {
  await fs.writeFile(dataFile, JSON.stringify(data, null, 2));
}

// Routes

// Get all posts (images/videos and polls combined)
app.get('/api/posts', async (req, res) => {
  try {
    const data = await readData();
    // Combine posts and polls, sort by date
    const allPosts = [
      ...data.posts.map(p => ({ ...p, type: 'media' })),
      ...data.polls.map(p => ({ ...p, type: 'poll' }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json(allPosts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Get single post
app.get('/api/posts/:id', async (req, res) => {
  try {
    const data = await readData();
    const post = data.posts.find(p => p.id === req.params.id) || 
                 data.polls.find(p => p.id === req.params.id);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    res.json(post);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});

// Upload image/video post
app.post('/api/posts/upload', upload.single('media'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const data = await readData();
    const mediaType = req.file.mimetype.startsWith('video') ? 'video' : 'image';
    
    const newPost = {
      id: Date.now().toString(),
      title: req.body.title || 'Untitled',
      mediaUrl: `/uploads/${req.file.filename}`,
      mediaType: mediaType,
      reactions: 0,
      createdAt: new Date().toISOString()
    };

    data.posts.push(newPost);
    await writeData(data);

    res.status(201).json(newPost);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload post' });
  }
});

// Create poll
app.post('/api/posts/poll', async (req, res) => {
  try {
    const { question, options } = req.body;
    
    if (!question || !options || options.length < 2) {
      return res.status(400).json({ error: 'Invalid poll data' });
    }

    const data = await readData();
    
    const newPoll = {
      id: Date.now().toString(),
      question: question,
      options: options.map(opt => ({
        text: opt,
        votes: 0
      })),
      totalVotes: 0,
      reactions: 0,
      createdAt: new Date().toISOString()
    };

    data.polls.push(newPoll);
    await writeData(data);

    res.status(201).json(newPoll);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create poll' });
  }
});

// React to post (increment reactions)
app.post('/api/posts/:id/react', async (req, res) => {
  try {
    const data = await readData();
    const postIndex = data.posts.findIndex(p => p.id === req.params.id);
    const pollIndex = data.polls.findIndex(p => p.id === req.params.id);
    
    if (postIndex !== -1) {
      data.posts[postIndex].reactions += 1;
      await writeData(data);
      res.json({ reactions: data.posts[postIndex].reactions });
    } else if (pollIndex !== -1) {
      data.polls[pollIndex].reactions += 1;
      await writeData(data);
      res.json({ reactions: data.polls[pollIndex].reactions });
    } else {
      res.status(404).json({ error: 'Post not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to react to post' });
  }
});

// Vote on poll
app.post('/api/posts/:id/vote', async (req, res) => {
  try {
    const { optionIndex } = req.body;
    const data = await readData();
    const pollIndex = data.polls.findIndex(p => p.id === req.params.id);
    
    if (pollIndex === -1) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    if (optionIndex < 0 || optionIndex >= data.polls[pollIndex].options.length) {
      return res.status(400).json({ error: 'Invalid option' });
    }

    data.polls[pollIndex].options[optionIndex].votes += 1;
    data.polls[pollIndex].totalVotes += 1;
    await writeData(data);

    res.json(data.polls[pollIndex]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to vote' });
  }
});

// Delete post
app.delete('/api/posts/:id', async (req, res) => {
  try {
    const data = await readData();
    const postIndex = data.posts.findIndex(p => p.id === req.params.id);
    const pollIndex = data.polls.findIndex(p => p.id === req.params.id);
    
    if (postIndex !== -1) {
      // Delete the file if it exists
      const post = data.posts[postIndex];
      if (post.mediaUrl) {
        const filePath = path.join(__dirname, post.mediaUrl);
        try {
          await fs.unlink(filePath);
        } catch (err) {
          console.error('Error deleting file:', err);
        }
      }
      data.posts.splice(postIndex, 1);
      await writeData(data);
      res.json({ message: 'Post deleted successfully' });
    } else if (pollIndex !== -1) {
      data.polls.splice(pollIndex, 1);
      await writeData(data);
      res.json({ message: 'Poll deleted successfully' });
    } else {
      res.status(404).json({ error: 'Post not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// Start server
const PORT = process.env.PORT || 3000;

initializeData().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Laugh School backend running on https://laugh-school-backend.onrender.com`);
    console.log(`📁 Uploads directory: ${uploadsDir}`);
    console.log(`💾 Data file: ${dataFile}`);
  });
});
