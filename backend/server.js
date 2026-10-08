require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();


/* =========================================================
   MIDDLEWARE
========================================================= */

app.use(cors({
    origin: process.env.FRONTEND_URL
        ? process.env.FRONTEND_URL
            .split(",")
            .map(v => v.trim())
        : true
}));

app.use(express.json({ limit: "2mb" }));


/* =========================================================
   USER SCHEMA
========================================================= */

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 80
    },

    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },

    password: {
        type: String,
        required: true
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});


/* =========================================================
   ADMIN SCHEMA
========================================================= */

const adminSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },

    password: {
        type: String,
        required: true
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});


/* =========================================================
   POST / COMPLAINT SCHEMA
========================================================= */

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

    // complaint or announcement
    type: {
        type: String,
        enum: [
            "complaint",
            "announcement"
        ],
        default: "complaint"
    },

    content: {
        type: String,
        required: true,
        trim: true,
        maxlength: 5000
    },

    /* =========================
       COMPLAINT INFORMATION
    ========================= */

    category: {
        type: String,
        default: ""
    },

    address: {
        type: String,
        default: "",
        maxlength: 300
    },

    age: {
        type: Number,
        min: 1,
        max: 120
    },

    gender: {
        type: String,
        enum: [
            "Male",
            "Female",
            "Other",
            ""
        ],
        default: ""
    },

    contactNumber: {
        type: String,
        default: "",
        maxlength: 30
    },

    /* =========================
       COMPLAINT STATUS
    ========================= */

    status: {
        type: String,
        enum: [
            "Pending",
            "In Progress",
            "Resolved"
        ],
        default: "Pending"
    },

    archived: {
        type: Boolean,
        default: false
    },

    resolvedAt: {
        type: Date,
        default: null
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




/* =========================================================
   COMMENT SCHEMA
========================================================= */

const commentSchema = new mongoose.Schema({

    postId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "Post"
    },

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
        maxlength: 1000
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});


/* =========================================================
   MODELS
========================================================= */

const User = mongoose.model(
    "User",
    userSchema
);

const Admin = mongoose.model(
    "Admin",
    adminSchema
);

const Post = mongoose.model(
    "Post",
    postSchema
);

const Comment = mongoose.model(
    "Comment",
    commentSchema
);


/* =========================================================
   JWT
========================================================= */

function signToken(payload) {

    return jwt.sign(
        payload,
        process.env.JWT_SECRET,
        {
            expiresIn: "7d"
        }
    );
}

const officialSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },

    position: {
        type: String,
        required: true,
        trim: true
    },

    government: {
        type: String,
        enum: ["City Government", "Barangay Government"],
        required: true
    },

    barangay: {
        type: String,
        default: ""
    },

    contactNumber: {
        type: String,
        default: ""
    },

    email: {
        type: String,
        default: ""
    },

    image: {
        type: String,
        default: ""
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

const Official = mongoose.model("Official", officialSchema);


/* =========================================================
   AUTH MIDDLEWARE
========================================================= */

function auth(req, res, next) {

    const header =
        req.headers.authorization || "";

    const token =
        header.startsWith("Bearer ")
            ? header.slice(7)
            : null;


    if (!token) {

        return res.status(401).json({
            message:
                "Authentication required."
        });
    }


    try {

        req.auth =
            jwt.verify(
                token,
                process.env.JWT_SECRET
            );

        next();

    } catch {

        return res.status(401).json({
            message:
                "Invalid or expired session."
        });
    }
}


/* =========================================================
   USER ONLY
========================================================= */

function userOnly(req, res, next) {

    if (req.auth?.role !== "user") {

        return res.status(403).json({
            message:
                "User access required."
        });
    }

    next();
}


/* =========================================================
   ADMIN ONLY
========================================================= */

function adminOnly(req, res, next) {

    if (req.auth?.role !== "admin") {

        return res.status(403).json({
            message:
                "Admin access required."
        });
    }

    next();
}


/* =========================================================
   BASIC ROUTES
========================================================= */

app.get("/", (req, res) => {

    res.json({
        message:
            "Barangay Complaint API is running."
    });

});


app.get("/api/health", (req, res) => {

    res.json({
        ok: true
    });

});


/* =========================================================
   USER REGISTER
========================================================= */

app.post(
    "/api/auth/register",
    async (req, res) => {

        try {

            const name =
                String(
                    req.body.name || ""
                ).trim();

            const email =
                String(
                    req.body.email || ""
                )
                    .trim()
                    .toLowerCase();

            const password =
                String(
                    req.body.password || ""
                );


            if (!name || !email || !password) {

                return res.status(400).json({
                    message:
                        "Name, email and password are required."
                });
            }


            if (name.length < 2) {

                return res.status(400).json({
                    message:
                        "Please enter a valid name."
                });
            }


            if (password.length < 6) {

                return res.status(400).json({
                    message:
                        "Password must be at least 6 characters."
                });
            }


            const existing =
                await User.findOne({
                    email
                });


            if (existing) {

                return res.status(409).json({
                    message:
                        "Email is already registered."
                });
            }


            const hash =
                await bcrypt.hash(
                    password,
                    12
                );


            const user =
                await User.create({
                    name,
                    email,
                    password: hash
                });


            const token =
                signToken({
                    id: user._id.toString(),
                    role: "user",
                    name: user.name,
                    email: user.email
                });


            res.status(201).json({

                message:
                    "Registration successful.",

                token,

                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email
                }

            });

        } catch (err) {

            console.error(err);

            res.status(500).json({
                message:
                    "Registration failed."
            });

        }

    }
);

app.get("/api/officials", auth, async (req, res) => {
    try {
        const { search = "", government = "" } = req.query;

        const filter = {};

        if (government) {
            filter.government = government;
        }

        if (search.trim()) {
            const regex = new RegExp(search.trim(), "i");

            filter.$or = [
                { name: regex },
                { position: regex },
                { barangay: regex }
            ];
        }

        const officials = await Official.find(filter)
            .sort({
                government: 1,
                position: 1,
                name: 1
            });

        res.json({
            officials
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to load officials."
        });
    }
});

app.post("/api/officials", adminOnly, async (req, res) => {
    try {
        const {
            name,
            position,
            government,
            barangay,
            contactNumber,
            email,
            image
        } = req.body;

        if (!name || !position || !government) {
            return res.status(400).json({
                message: "Name, position, and government are required."
            });
        }

        const official = await Official.create({
            name: name.trim(),
            position: position.trim(),
            government,
            barangay: barangay?.trim() || "",
            contactNumber: contactNumber?.trim() || "",
            email: email?.trim() || "",
            image: image || ""
        });

        res.status(201).json({
            message: "Official added successfully.",
            official
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to add official."
        });
    }
});

app.put("/api/officials/:id", adminOnly, async (req, res) => {
    try {
        const {
            name,
            position,
            government,
            barangay,
            contactNumber,
            email,
            image
        } = req.body;

        const official = await Official.findByIdAndUpdate(
            req.params.id,
            {
                name: name?.trim(),
                position: position?.trim(),
                government,
                barangay: barangay?.trim() || "",
                contactNumber: contactNumber?.trim() || "",
                email: email?.trim() || "",
                image: image || "",
                updatedAt: new Date()
            },
            {
                new: true,
                runValidators: true
            }
        );

        if (!official) {
            return res.status(404).json({
                message: "Official not found."
            });
        }

        res.json({
            message: "Official updated successfully.",
            official
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to update official."
        });
    }
});

app.delete("/api/officials/:id", adminOnly, async (req, res) => {
    try {
        const official = await Official.findByIdAndDelete(
            req.params.id
        );

        if (!official) {
            return res.status(404).json({
                message: "Official not found."
            });
        }

        res.json({
            message: "Official deleted successfully."
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to delete official."
        });
    }
});


/* =========================================================
   USER LOGIN
========================================================= */

app.post(
    "/api/auth/login",
    async (req, res) => {

        try {

            const email =
                String(
                    req.body.email || ""
                )
                    .trim()
                    .toLowerCase();

            const password =
                String(
                    req.body.password || ""
                );


            const user =
                await User.findOne({
                    email
                });


            if (
                !user ||
                !(await bcrypt.compare(
                    password,
                    user.password
                ))
            ) {

                return res.status(401).json({
                    message:
                        "Invalid email or password."
                });
            }


            const token =
                signToken({
                    id: user._id.toString(),
                    role: "user",
                    name: user.name,
                    email: user.email
                });


            res.json({

                token,

                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email
                }

            });

        } catch (err) {

            console.error(err);

            res.status(500).json({
                message:
                    "Login failed."
            });

        }

    }
);


/* =========================================================
   ADMIN LOGIN
========================================================= */

app.post(
    "/api/auth/admin-login",
    async (req, res) => {

        try {

            const username =
                String(
                    req.body.username || ""
                ).trim();

            const password =
                String(
                    req.body.password || ""
                );


            const admin =
                await Admin.findOne({
                    username
                });


            if (
                !admin ||
                !(await bcrypt.compare(
                    password,
                    admin.password
                ))
            ) {

                return res.status(401).json({
                    message:
                        "Invalid admin username or password."
                });
            }


            const token =
                signToken({
                    id: admin._id.toString(),
                    role: "admin",
                    username: admin.username
                });


            res.json({

                token,

                admin: {
                    id: admin._id,
                    username: admin.username
                }

            });

        } catch (err) {

            console.error(err);

            res.status(500).json({
                message:
                    "Admin login failed."
            });

        }

    }
);


/* =========================================================
   AUTH ME
========================================================= */

app.get(
    "/api/auth/me",
    auth,
    async (req, res) => {

        try {

            if (
                req.auth.role === "admin"
            ) {

                const admin =
                    await Admin.findById(
                        req.auth.id
                    )
                        .select("-password");


                if (!admin) {

                    return res.status(404).json({
                        message:
                            "Admin account not found."
                    });
                }


                return res.json({

                    role: "admin",

                    account: admin

                });

            }


            const user =
                await User.findById(
                    req.auth.id
                )
                    .select("-password");


            if (!user) {

                return res.status(404).json({
                    message:
                        "Account not found."
                });
            }


            res.json({

                role: "user",

                account: user

            });

        } catch (err) {

            console.error(err);

            res.status(500).json({
                message:
                    "Could not load account."
            });

        }

    }
);


/* =========================================================
   CHANGE PASSWORD
========================================================= */

app.put(
    "/api/auth/change-password",
    auth,
    async (req, res) => {

        try {

            const currentPassword =
                String(
                    req.body.currentPassword || ""
                );

            const newPassword =
                String(
                    req.body.newPassword || ""
                );


            if (newPassword.length < 6) {

                return res.status(400).json({
                    message:
                        "New password must be at least 6 characters."
                });
            }


            const Model =
                req.auth.role === "admin"
                    ? Admin
                    : User;


            const account =
                await Model.findById(
                    req.auth.id
                );


            if (
                !account ||
                !(await bcrypt.compare(
                    currentPassword,
                    account.password
                ))
            ) {

                return res.status(401).json({
                    message:
                        "Current password is incorrect."
                });
            }


            account.password =
                await bcrypt.hash(
                    newPassword,
                    12
                );


            await account.save();


            res.json({
                message:
                    "Password changed successfully."
            });

        } catch (err) {

            console.error(err);

            res.status(500).json({
                message:
                    "Could not change password."
            });

        }

    }
);


/* =========================================================
   GET POSTS
========================================================= */

app.get(
    "/api/posts",
    auth,
    async (req, res) => {

        try {

            const q =
                String(
                    req.query.search || ""
                ).trim();


            const filter = {

                $or: [
                    {
                        archived: false
                    },

                    {
                        archived: {
                            $exists: false
                        }
                    }
                ]

            };


            if (q) {

                filter.$and = [

                    {
                        $or: [

                            {
                                content: {
                                    $regex: q,
                                    $options: "i"
                                }
                            },

                            {
                                authorName: {
                                    $regex: q,
                                    $options: "i"
                                }
                            },

                            {
                                category: {
                                    $regex: q,
                                    $options: "i"
                                }
                            },

                            {
                                address: {
                                    $regex: q,
                                    $options: "i"
                                }
                            }

                        ]
                    }

                ];

            }


            const posts =
                await Post.find(filter)
                    .sort({
                        createdAt: -1
                    })
                    .limit(100)
                    .lean();


            const ids =
                posts.map(
                    post => post._id
                );


            const comments =
                await Comment.find({
                    postId: {
                        $in: ids
                    }
                })
                    .sort({
                        createdAt: 1
                    })
                    .lean();


            const commentMap = {};


            for (const comment of comments) {

                const key =
                    comment.postId.toString();


                if (!commentMap[key]) {

                    commentMap[key] = [];

                }


                commentMap[key].push(
                    comment
                );

            }


            const result =
                posts.map(post => ({

                    ...post,

                    comments:
                        commentMap[
                        post._id.toString()
                        ] || []

                }));


            /*
             * ADMIN
             *
             * Admin receives:
             * name
             * category
             * address
             * age
             * gender
             * contact number
             * status
             */

            if (
                req.auth.role === "admin"
            ) {

                return res.json({
                    posts: result
                });

            }


            /*
             * RESIDENT
             *
             * Remove sensitive complaint information.
             */

            const safeResult =
                result.map(post => {

                    const {
                        address,
                        age,
                        gender,
                        contactNumber,
                        ...safePost
                    } = post;


                    return safePost;

                });


            res.json({
                posts: safeResult
            });

        } catch (err) {

            console.error(
                "GET POSTS ERROR:",
                err
            );


            res.status(500).json({
                message:
                    "Could not load posts."
            });

        }

    }
);


/* =========================================================
   CREATE POST / COMPLAINT
========================================================= */

app.post(
    "/api/posts",
    auth,
    async (req, res) => {

        try {

            const content =
                String(
                    req.body.content || ""
                ).trim();


            const image =
                String(
                    req.body.image || ""
                ).trim();


            const category =
                String(
                    req.body.category || ""
                ).trim();


            const address =
                String(
                    req.body.address || ""
                ).trim();


            const gender =
                String(
                    req.body.gender || ""
                ).trim();


            const contactNumber =
                String(
                    req.body.contactNumber || ""
                ).trim();


            const age =
                Number(
                    req.body.age
                );


            if (!content) {

                return res.status(400).json({
                    message:
                        "Complaint description is required."
                });
            }


            /* =========================================
               ADMIN ANNOUNCEMENT
            ========================================= */

            if (
                req.auth.role === "admin"
            ) {

                const admin =
                    await Admin.findById(
                        req.auth.id
                    );


                if (!admin) {

                    return res.status(404).json({
                        message:
                            "Admin account not found."
                    });

                }


                const post =
                    await Post.create({

                        authorId:
                            admin._id,

                        authorName:
                            `${admin.username} (Admin)`,

                        type:
                            "announcement",

                        content,

                        image,

                        isAnnouncement:
                            true,

                        archived:
                            false

                    });


                return res.status(201).json({
                    message:
                        "Announcement published.",
                    post
                });

            }


            /* =========================================
               RESIDENT COMPLAINT
            ========================================= */

            const user =
                await User.findById(
                    req.auth.id
                );


            if (!user) {

                return res.status(404).json({
                    message:
                        "User account not found."
                });

            }


            if (!category) {

                return res.status(400).json({
                    message:
                        "Complaint category is required."
                });

            }


            if (!address) {

                return res.status(400).json({
                    message:
                        "Address is required."
                });

            }


            if (
                !Number.isInteger(age) ||
                age < 1 ||
                age > 120
            ) {

                return res.status(400).json({
                    message:
                        "Please enter a valid age."
                });

            }


            if (
                ![
                    "Male",
                    "Female",
                    "Other"
                ].includes(gender)
            ) {

                return res.status(400).json({
                    message:
                        "Please select a valid gender."
                });

            }


            if (!contactNumber) {

                return res.status(400).json({
                    message:
                        "Contact number is required."
                });

            }


            if (image) {

                const validImage =
                    /^data:image\/(jpeg|png|webp);base64,/
                        .test(image);


                if (!validImage) {

                    return res.status(400).json({
                        message:
                            "Invalid image format."
                    });

                }


                if (image.length > 1200000) {

                    return res.status(400).json({
                        message:
                            "Image is too large."
                    });

                }

            }


            const post =
                await Post.create({

                    authorId:
                        user._id,

                    authorName:
                        user.name,

                    type:
                        "complaint",

                    content,

                    image,

                    category,

                    address,

                    age,

                    gender,

                    contactNumber,

                    status:
                        "Pending",

                    archived:
                        false,

                    resolvedAt:
                        null,

                    isAnnouncement:
                        false

                });


            res.status(201).json({

                message:
                    "Complaint submitted successfully.",

                post

            });

        } catch (err) {

            console.error(
                "CREATE POST ERROR:",
                err
            );


            res.status(500).json({
                message:
                    "Could not create complaint."
            });

        }

    }
);


/* =========================================================
   ADMIN EDIT POST
========================================================= */

app.put(
    "/api/posts/:id",
    auth,
    adminOnly,
    async (req, res) => {

        try {

            const content =
                String(
                    req.body.content || ""
                ).trim();


            if (!content) {

                return res.status(400).json({
                    message:
                        "Post content is required."
                });

            }


            const post =
                await Post.findById(
                    req.params.id
                );


            if (!post) {

                return res.status(404).json({
                    message:
                        "Post not found."
                });

            }


            post.content =
                content;

            post.updatedAt =
                new Date();


            await post.save();


            res.json({

                message:
                    "Post updated successfully.",

                post

            });

        } catch (err) {

            console.error(
                "EDIT POST ERROR:",
                err
            );


            res.status(500).json({
                message:
                    "Could not update post."
            });

        }

    }
);


/* =========================================================
   ANNOUNCEMENTS
========================================================= */

app.get(
    "/api/announcements",
    auth,
    async (req, res) => {

        try {

            const announcements =
                await Post.find({

                    $or: [
                        {
                            isAnnouncement:
                                true
                        },

                        {
                            authorName: {
                                $regex:
                                    /\(Admin\)$/
                            }
                        }
                    ]

                })
                    .sort({
                        createdAt: -1
                    })
                    .limit(100)
                    .lean();


            const postIds =
                announcements.map(
                    post => post._id
                );


            const comments =
                await Comment.find({

                    postId: {
                        $in: postIds
                    }

                })
                    .sort({
                        createdAt: 1
                    })
                    .lean();


            const commentMap = {};


            for (const comment of comments) {

                const key =
                    comment.postId.toString();


                if (!commentMap[key]) {
                    commentMap[key] = [];
                }


                commentMap[key].push(
                    comment
                );

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

    }
);


/* =========================================================
   RESOLVE COMPLAINT
========================================================= */

app.put(
    "/api/posts/:id/resolve",
    auth,
    adminOnly,
    async (req, res) => {

        try {

            const post =
                await Post.findById(
                    req.params.id
                );


            if (!post) {

                return res.status(404).json({
                    message:
                        "Complaint not found."
                });

            }


            if (
                post.type !== "complaint"
            ) {

                return res.status(400).json({
                    message:
                        "Only complaints can be resolved."
                });

            }


            post.status =
                "Resolved";

            post.archived =
                true;

            post.resolvedAt =
                new Date();

            post.updatedAt =
                new Date();


            await post.save();


            res.json({

                message:
                    "Complaint resolved and archived.",

                post

            });

        } catch (err) {

            console.error(
                "RESOLVE COMPLAINT ERROR:",
                err
            );


            res.status(500).json({
                message:
                    "Could not resolve complaint."
            });

        }

    }
);


/* =========================================================
   UPDATE COMPLAINT STATUS
========================================================= */

app.put(
    "/api/posts/:id/status",
    auth,
    adminOnly,
    async (req, res) => {

        try {

            const status =
                String(
                    req.body.status || ""
                ).trim();


            const validStatuses = [
                "Pending",
                "In Progress",
                "Resolved"
            ];


            if (
                !validStatuses.includes(
                    status
                )
            ) {

                return res.status(400).json({
                    message:
                        "Invalid complaint status."
                });

            }


            const post =
                await Post.findById(
                    req.params.id
                );


            if (!post) {

                return res.status(404).json({
                    message:
                        "Complaint not found."
                });

            }


            if (
                post.type !== "complaint"
            ) {

                return res.status(400).json({
                    message:
                        "Only complaints have statuses."
                });

            }


            post.status =
                status;

            post.updatedAt =
                new Date();


            if (
                status === "Resolved"
            ) {

                post.archived =
                    true;

                post.resolvedAt =
                    new Date();

            } else {

                post.archived =
                    false;

                post.resolvedAt =
                    null;

            }


            await post.save();


            res.json({

                message:
                    `Complaint status changed to ${status}.`,

                post

            });

        } catch (err) {

            console.error(
                "UPDATE STATUS ERROR:",
                err
            );


            res.status(500).json({
                message:
                    "Could not update complaint status."
            });

        }

    }
);


/* =========================================================
   ARCHIVE
========================================================= */

app.get(
    "/api/archive",
    auth,
    adminOnly,
    async (req, res) => {

        try {

            const archived =
                await Post.find({

                    type:
                        "complaint",

                    archived:
                        true,

                    status:
                        "Resolved"

                })
                    .sort({
                        resolvedAt: -1
                    })
                    .limit(200)
                    .lean();


            res.json(archived);

        } catch (err) {

            console.error(
                "GET ARCHIVE ERROR:",
                err
            );


            res.status(500).json({
                message:
                    "Could not load archived complaints."
            });

        }

    }
);


/* =========================================================
   REPORTS
========================================================= */

app.get(
    "/api/reports/complaints",
    auth,
    adminOnly,
    async (req, res) => {

        try {

            const complaints =
                await Post.find({

                    type:
                        "complaint"

                })
                    .sort({
                        createdAt: -1
                    })
                    .limit(1000)
                    .lean();


            res.json({
                complaints
            });

        } catch (err) {

            console.error(
                "GET REPORTS ERROR:",
                err
            );


            res.status(500).json({
                message:
                    "Could not load complaint reports."
            });

        }

    }
);


/* =========================================================
   DELETE POST
========================================================= */

app.delete(
    "/api/posts/:id",
    auth,
    async (req, res) => {

        try {

            const post =
                await Post.findById(
                    req.params.id
                );


            if (!post) {

                return res.status(404).json({
                    message:
                        "Post not found."
                });

            }


            const isOwner =
                post.authorId.toString() ===
                req.auth.id;


            if (
                req.auth.role !== "admin" &&
                !isOwner
            ) {

                return res.status(403).json({
                    message:
                        "You can only delete your own posts."
                });

            }


            await Comment.deleteMany({
                postId:
                    post._id
            });


            await post.deleteOne();


            res.json({
                message:
                    "Post deleted."
            });

        } catch (err) {

            console.error(err);

            res.status(500).json({
                message:
                    "Could not delete post."
            });

        }

    }
);


/* =========================================================
   CREATE COMMENT
========================================================= */

app.post(
    "/api/posts/:id/comments",
    auth,
    async (req, res) => {

        try {

            const content =
                String(
                    req.body.content || ""
                ).trim();


            if (!content) {

                return res.status(400).json({
                    message:
                        "Comment cannot be empty."
                });

            }


            const post =
                await Post.findById(
                    req.params.id
                );


            if (!post) {

                return res.status(404).json({
                    message:
                        "Post not found."
                });

            }


            let authorId;
            let authorName;


            if (
                req.auth.role === "admin"
            ) {

                const admin =
                    await Admin.findById(
                        req.auth.id
                    );


                if (!admin) {

                    return res.status(404).json({
                        message:
                            "Admin account not found."
                    });

                }


                authorId =
                    admin._id;

                authorName =
                    `${admin.username} (Admin)`;

            } else {

                const user =
                    await User.findById(
                        req.auth.id
                    );


                if (!user) {

                    return res.status(404).json({
                        message:
                            "User account not found."
                    });

                }


                authorId =
                    user._id;

                authorName =
                    user.name;

            }


            const comment =
                await Comment.create({

                    postId:
                        post._id,

                    authorId,

                    authorName,

                    content

                });


            res.status(201).json(
                comment
            );

        } catch (err) {

            console.error(
                "CREATE COMMENT ERROR:",
                err
            );


            res.status(500).json({
                message:
                    "Could not add comment."
            });

        }

    }
);


/* =========================================================
   GET USER POSTS
========================================================= */

app.get(
    "/api/users/:userId/posts",
    auth,
    async (req, res) => {

        try {

            const {
                userId
            } = req.params;


            if (
                !mongoose.Types.ObjectId.isValid(
                    userId
                )
            ) {

                return res.status(400).json({
                    message:
                        "Invalid user ID."
                });

            }


            const userPosts =
                await Post.find({

                    authorId:
                        new mongoose.Types.ObjectId(
                            userId
                        )

                })
                    .sort({
                        createdAt: -1
                    })
                    .limit(100)
                    .lean();


            const postIds =
                userPosts.map(
                    post => post._id
                );


            const comments =
                await Comment.find({

                    postId: {
                        $in: postIds
                    }

                })
                    .sort({
                        createdAt: 1
                    })
                    .lean();


            const commentMap = {};


            for (const comment of comments) {

                const key =
                    comment.postId.toString();


                if (!commentMap[key]) {
                    commentMap[key] = [];
                }


                commentMap[key].push(
                    comment
                );

            }


            let posts =
                userPosts.map(post => ({

                    ...post,

                    comments:
                        commentMap[
                        post._id.toString()
                        ] || []

                }));


            /*
             * Residents should not receive
             * sensitive complaint information.
             */

            if (
                req.auth.role !== "admin"
            ) {

                posts =
                    posts.map(post => {

                        const {
                            address,
                            age,
                            gender,
                            contactNumber,
                            ...safePost
                        } = post;


                        return safePost;

                    });

            }


            res.json({
                posts
            });

        } catch (err) {

            console.error(
                "GET USER POSTS ERROR:",
                err
            );


            res.status(500).json({
                message:
                    "Could not load user posts."
            });

        }

    }
);




/* =========================================================
   DELETE COMMENT
========================================================= */

app.delete(
    "/api/comments/:id",
    auth,
    async (req, res) => {

        try {

            const comment =
                await Comment.findById(
                    req.params.id
                );


            if (!comment) {

                return res.status(404).json({
                    message:
                        "Comment not found."
                });

            }


            const isOwner =
                comment.authorId.toString() ===
                req.auth.id;


            if (
                req.auth.role !== "admin" &&
                !isOwner
            ) {

                return res.status(403).json({
                    message:
                        "You can only delete your own comments."
                });

            }


            await comment.deleteOne();


            res.json({
                message:
                    "Comment deleted."
            });

        } catch (err) {

            console.error(err);

            res.status(500).json({
                message:
                    "Could not delete comment."
            });

        }

    }
);


/* =========================================================
   SERVER
========================================================= */

const PORT =
    process.env.PORT || 5000;


async function start() {

    if (!process.env.MONGODB_URI) {

        console.error(
            "MONGODB_URI is missing."
        );

        process.exit(1);

    }


    if (!process.env.JWT_SECRET) {

        console.error(
            "JWT_SECRET is missing."
        );

        process.exit(1);

    }


    try {

        await mongoose.connect(
            process.env.MONGODB_URI
        );


        console.log(
            "MongoDB connected."
        );


        app.listen(
            PORT,
            () => {

                console.log(
                    `API running on port ${PORT}`
                );

            }
        );

    } catch (err) {

        console.error(
            "MongoDB connection failed:",
            err
        );

        process.exit(1);

    }

}


start();