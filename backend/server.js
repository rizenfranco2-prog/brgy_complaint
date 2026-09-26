require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(",").map(v => v.trim())
    : true
}));
app.use(express.json({ limit: "2mb" }));

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const postSchema = new mongoose.Schema({
    authorId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "User"
    },

    authorName: {
        type: String,
        required: true
    },

    content: {
        type: String,
        required: true,
        trim: true,
        maxlength: 5000
    },

    image: {
        type: String,
        default: ""
    },

    isAnnouncement: {
        type: Boolean,
        default: false
    },

    createdAt: {
        type: Date,
        default: Date.now
    },

    updatedAt: {
        type: Date,
        default: Date.now
    }
});
const commentSchema = new mongoose.Schema({
  postId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Post" },
  authorId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
  authorName: { type: String, required: true },
  content: { type: String, required: true, trim: true, maxlength: 1000 },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model("User", userSchema);
const Admin = mongoose.model("Admin", adminSchema);
const Post = mongoose.model("Post", postSchema);
const Comment = mongoose.model("Comment", commentSchema);

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });
}

function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) return res.status(401).json({ message: "Authentication required." });

  try {
    req.auth = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired session." });
  }
}

function userOnly(req, res, next) {
  if (req.auth?.role !== "user") {
    return res.status(403).json({ message: "User access required." });
  }
  next();
}

function adminOnly(req, res, next) {
  if (req.auth?.role !== "admin") {
    return res.status(403).json({ message: "Admin access required." });
  }
  next();
}

app.get("/", (req, res) => {
  res.json({ message: "Barangay Complaint API is running." });
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

// USER AUTH
app.post("/api/auth/register", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required." });
    }
    if (name.length < 2) {
      return res.status(400).json({ message: "Please enter a valid name." });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: "Email is already registered." });

    const hash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, password: hash });

    const token = signToken({ id: user._id.toString(), role: "user", name: user.name, email: user.email });
    res.status(201).json({
      message: "Registration successful.",
      token,
      user: { id: user._id, name: user.name, email: user.email }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Registration failed." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const token = signToken({ id: user._id.toString(), role: "user", name: user.name, email: user.email });
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Login failed." });
  }
});

app.post("/api/auth/admin-login", async (req, res) => {
  try {
    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "");

    const admin = await Admin.findOne({ username });
    if (!admin || !(await bcrypt.compare(password, admin.password))) {
      return res.status(401).json({ message: "Invalid admin username or password." });
    }

    const token = signToken({ id: admin._id.toString(), role: "admin", username: admin.username });
    res.json({ token, admin: { id: admin._id, username: admin.username } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Admin login failed." });
  }
});

app.get("/api/auth/me", auth, async (req, res) => {
  if (req.auth.role === "admin") {
    const admin = await Admin.findById(req.auth.id).select("-password");
    return res.json({ role: "admin", account: admin });
  }

  const user = await User.findById(req.auth.id).select("-password");
  if (!user) return res.status(404).json({ message: "Account not found." });
  res.json({ role: "user", account: user });
});

app.put("/api/auth/change-password", auth, async (req, res) => {
  try {
    const currentPassword = String(req.body.currentPassword || "");
    const newPassword = String(req.body.newPassword || "");

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters." });
    }

    const Model = req.auth.role === "admin" ? Admin : User;
    const account = await Model.findById(req.auth.id);

    if (!account || !(await bcrypt.compare(currentPassword, account.password))) {
      return res.status(401).json({ message: "Current password is incorrect." });
    }

    account.password = await bcrypt.hash(newPassword, 12);
    await account.save();

    res.json({ message: "Password changed successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not change password." });
  }
});

// POSTS
app.get("/api/posts", auth, async (req, res) => {
  try {
    const q = String(req.query.search || "").trim();
    const filter = q
      ? { $or: [
          { content: { $regex: q, $options: "i" } },
          { authorName: { $regex: q, $options: "i" } }
        ] }
      : {};

    const posts = await Post.find(filter).sort({ createdAt: -1 }).limit(100).lean();

    const ids = posts.map(p => p._id);
    const comments = await Comment.find({ postId: { $in: ids } }).sort({ createdAt: 1 }).lean();

    const commentMap = {};
    for (const c of comments) {
      const key = c.postId.toString();
      if (!commentMap[key]) commentMap[key] = [];
      commentMap[key].push(c);
    }

    res.json(posts.map(p => ({
      ...p,
      comments: commentMap[p._id.toString()] || []
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not load posts." });
  }
});

app.post("/api/posts", auth, async (req, res) => {
    try {
        const content = String(req.body.content || "").trim();
        const image = String(req.body.image || "").trim();

        if (!content) {
            return res.status(400).json({
                message: "Post content is required."
            });
        }

        // Validate image if provided
        if (image) {
            const validImage =
                /^data:image\/(jpeg|png|webp);base64,/.test(image);

            if (!validImage) {
                return res.status(400).json({
                    message: "Invalid image format."
                });
            }

            if (image.length > 1200000) {
                return res.status(400).json({
                    message: "Image is too large."
                });
            }
        }

        // ADMIN POST
        if (req.auth.role === "admin") {
            const admin = await Admin.findById(req.auth.id);

            if (!admin) {
                return res.status(404).json({
                    message: "Admin account not found."
                });
            }

            const post = await Post.create({
                authorId: admin._id,
                authorName: `${admin.username} (Admin)`,
                content,
                image,
                isAnnouncement: true
            });

            return res.status(201).json(post);
        }

        // USER POST
        const user = await User.findById(req.auth.id);

        if (!user) {
            return res.status(404).json({
                message: "User account not found."
            });
        }

        const post = await Post.create({
            authorId: user._id,
            authorName: user.name,
            content,
            image
        });

        res.status(201).json(post);

    } catch (err) {
        console.error("CREATE POST ERROR:", err);

        res.status(500).json({
            message: "Could not create post."
        });
    }
});

// GET BARANGAY ANNOUNCEMENTS
app.get("/api/announcements", auth, async (req, res) => {
    try {

        const announcements = await Post.find({
            $or: [
                { isAnnouncement: true },
                { authorName: { $regex: /\(Admin\)$/ } }
            ]
        })
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();


        const postIds =
            announcements.map(post => post._id);


        const comments =
            await Comment.find({
                postId: {
                    $in: postIds
                }
            })
                .sort({ createdAt: 1 })
                .lean();


        const commentMap = {};


        for (const comment of comments) {

            const key =
                comment.postId.toString();

            if (!commentMap[key]) {
                commentMap[key] = [];
            }

            commentMap[key].push(comment);
        }


        const posts =
            announcements.map(post => ({
                ...post,

                comments:
                    commentMap[
                    post._id.toString()
                    ] || []
            }));


        res.json(posts);

    } catch (err) {

        console.error(
            "GET ANNOUNCEMENTS ERROR:",
            err
        );

        res.status(500).json({
            message:
                "Could not load announcements."
        });

    }
});

app.put("/api/posts/:id", auth, adminOnly, async (req, res) => {
  try {
    const content = String(req.body.content || "").trim();
    if (!content) return res.status(400).json({ message: "Post content is required." });

    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { content, updatedAt: new Date() },
      { new: true }
    );

    if (!post) return res.status(404).json({ message: "Post not found." });
    res.json(post);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not update post." });
  }
});

app.delete("/api/posts/:id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found." });

    const isOwner = post.authorId.toString() === req.auth.id;
    if (req.auth.role !== "admin" && !isOwner) {
      return res.status(403).json({ message: "You can only delete your own posts." });
    }

    await Comment.deleteMany({ postId: post._id });
    await post.deleteOne();

    res.json({ message: "Post deleted." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not delete post." });
  }
});

// COMMENTS
app.post("/api/posts/:id/comments", auth, userOnly, async (req, res) => {
  try {
    const content = String(req.body.content || "").trim();
    if (!content) return res.status(400).json({ message: "Comment cannot be empty." });

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found." });

    const user = await User.findById(req.auth.id);
    const comment = await Comment.create({
      postId: post._id,
      authorId: user._id,
      authorName: user.name,
      content
    });

    res.status(201).json(comment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not add comment." });
  }
});

// GET POSTS OF A SPECIFIC USER
app.get("/api/users/:userId/posts", auth, async (req, res) => {
    try {
        const { userId } = req.params;

        // Check that the ID is a valid MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                message: "Invalid user ID."
            });
        }

        // Find posts made by this user
        const userPosts = await Post.find({
            authorId: new mongoose.Types.ObjectId(userId)
        })
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        // Get comments for these posts
        const postIds = userPosts.map(post => post._id);

        const comments = await Comment.find({
            postId: { $in: postIds }
        })
            .sort({ createdAt: 1 })
            .lean();

        // Group comments by post
        const commentMap = {};

        for (const comment of comments) {
            const key = comment.postId.toString();

            if (!commentMap[key]) {
                commentMap[key] = [];
            }

            commentMap[key].push(comment);
        }

        // Attach comments to each post
        const posts = userPosts.map(post => ({
            ...post,
            comments: commentMap[post._id.toString()] || []
        }));

        res.json({ posts });

    } catch (err) {
        console.error("GET USER POSTS ERROR:", err);

        res.status(500).json({
            message: "Could not load user posts."
        });
    }
});

app.delete("/api/comments/:id", auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: "Comment not found." });

    const isOwner = comment.authorId.toString() === req.auth.id;
    if (req.auth.role !== "admin" && !isOwner) {
      return res.status(403).json({ message: "You can only delete your own comments." });
    }

    await comment.deleteOne();
    res.json({ message: "Comment deleted." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not delete comment." });
  }
});

const PORT = process.env.PORT || 5000;

async function start() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is missing.");
    process.exit(1);
  }
  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is missing.");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected.");
    app.listen(PORT, () => console.log(`API running on port ${PORT}`));
  } catch (err) {
    console.error("MongoDB connection failed:", err);
    process.exit(1);
  }
}

start();
