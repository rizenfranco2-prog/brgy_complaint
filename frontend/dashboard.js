app.get("/api/users/:userId/posts", auth, async (req, res) => {
    try {
        const userPosts = await Post.find({
            authorId: req.params.userId
        })
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        const postIds = userPosts.map(post => post._id);

        const comments = await Comment.find({
            postId: { $in: postIds }
        })
            .sort({ createdAt: 1 })
            .lean();

        const commentMap = {};

        for (const comment of comments) {
            const key = comment.postId.toString();

            if (!commentMap[key]) {
                commentMap[key] = [];
            }

            commentMap[key].push(comment);
        }

        const posts = userPosts.map(post => ({
            ...post,
            comments: commentMap[post._id.toString()] || []
        }));

        res.json({ posts });

    } catch (err) {
        console.error(err);

        res.status(500).json({
            message: "Could not load user posts."
        });
    }
});