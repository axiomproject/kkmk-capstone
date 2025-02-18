const db = require('../config/db');

const forumModel = {
  async createPost(postData) {
    return db.tx(async t => {
      // Create the post with added image_url field
      const post = await t.one(`
        INSERT INTO forum_posts 
        (title, content, author_id, category, type, image_url)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, title, content, author_id, category, type, image_url, created_at`,
        [
          postData.title,
          postData.content,
          postData.authorId,
          postData.category,
          postData.type,
          postData.imageUrl || null
        ]
      );

      // Get author details from users table
      const author = await t.one(
        'SELECT name, profile_photo FROM users WHERE id = $1',
        [postData.authorId]
      );

      // If it's a poll, create the poll and options
      if (postData.type === 'poll' && postData.poll) {
        try {
          const pollData = typeof postData.poll === 'string' 
            ? JSON.parse(postData.poll) 
            : postData.poll;

          const poll = await t.one(`
            INSERT INTO forum_polls (post_id, question, total_votes)
            VALUES ($1, $2, 0)
            RETURNING *`,
            [post.id, pollData.question || postData.title] // Use title as fallback
          );

          const pollOptions = await Promise.all(
            pollData.options.map(option =>
              t.one(`
                INSERT INTO forum_poll_options (poll_id, text, votes)
                VALUES ($1, $2, 0)
                RETURNING *`,
                [poll.id, option.text]
              )
            )
          );

          return {
            ...post,
            author_name: author.name,
            author_avatar: author.profile_photo,
            poll: {
              id: poll.id,
              question: poll.question,
              totalVotes: 0,
              options: pollOptions.map(opt => ({
                id: opt.id,
                text: opt.text,
                votes: 0
              }))
            },
            comments: []
          };
        } catch (error) {
          console.error('Error creating poll:', error);
          throw new Error('Failed to create poll: ' + error.message);
        }
      }

      return {
        ...post,
        author_name: author.name,
        author_avatar: author.profile_photo,
        comments: []
      };
    });
  },

  async getPosts() {
    return db.any(`
      SELECT 
        p.*,
        u.name as author_name,
        u.profile_photo as author_avatar,
        u.role as author_role,
        to_char(p.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
        p.image_url,
        COALESCE(
          json_agg(
            json_build_object(
              'id', c.id,
              'content', c.content,
              'author_id', c.author_id,
              'author_name', cu.name,
              'author_avatar', cu.profile_photo,
              'author_role', cu.role,
              'created_at', to_char(c.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
              'likes', c.likes
            ) ORDER BY c.created_at DESC
          ) FILTER (WHERE c.id IS NOT NULL),
          '[]'
        ) as comments,
        CASE 
          WHEN p.type = 'poll' THEN 
            json_build_object(
              'id', pl.id,
              'question', pl.question,
              'totalVotes', pl.total_votes,
              'options', (
                SELECT json_agg(
                  json_build_object(
                    'id', po.id,
                    'text', po.text,
                    'votes', po.votes
                  )
                )
                FROM forum_poll_options po
                WHERE po.poll_id = pl.id
              )
            )
          ELSE NULL
        END as poll
      FROM forum_posts p
      JOIN users u ON p.author_id = u.id
      LEFT JOIN forum_comments c ON p.id = c.post_id
      LEFT JOIN users cu ON c.author_id = cu.id
      LEFT JOIN forum_polls pl ON p.id = pl.post_id
      GROUP BY p.id, pl.id, u.name, u.profile_photo, u.role
      ORDER BY p.created_at DESC
    `);
  },

  async addComment(postId, commentData) {
    return db.tx(async t => {
      // Create comment with only necessary fields
      const comment = await t.one(`
        INSERT INTO forum_comments 
        (post_id, content, author_id, likes)
        VALUES ($1, $2, $3, $4)
        RETURNING 
          id,
          content,
          author_id,
          to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
          likes`,
        [postId, commentData.content, commentData.author_id, 0]
      );

      // Get author details from users table
      const author = await t.one(
        'SELECT name, profile_photo FROM users WHERE id = $1',
        [commentData.author_id]
      );

      // Create notification for post author
      const post = await t.one('SELECT author_id FROM forum_posts WHERE id = $1', [postId]);
      if (post.author_id !== commentData.author_id) {
        await t.none(`
          INSERT INTO notifications (user_id, type, content, related_id, actor_id, actor_name, actor_avatar)
          VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            post.author_id,
            'new_comment',
            `${author.name} commented on your post`,
            postId,
            commentData.author_id,
            author.name,
            author.profile_photo
          ]
        );
      }

      return {
        ...comment,
        author_name: author.name,
        author_avatar: author.profile_photo
      };
    });
  },

  async updatePostVote(postId, optionId) {
    await db.tx(async t => {
      await t.none(
        `UPDATE forum_poll_options 
         SET votes = votes + 1 
         WHERE id = $1`,
        [optionId]
      );

      await t.none(
        `UPDATE forum_polls 
         SET total_votes = total_votes + 1 
         WHERE post_id = $1`,
        [postId]
      );
    });
  },

  async updateCommentLike(postId, commentId, userId, increment = true) {
    return db.tx(async t => {
      const userIdInt = parseInt(userId, 10);
      
      if (increment) {
        const existing = await t.oneOrNone(
          'SELECT id FROM forum_comment_likes WHERE comment_id = $1 AND user_id = $2',
          [commentId, userIdInt]
        );

        if (existing) {
          throw new Error('User already liked this comment');
        }

        await t.none(
          'INSERT INTO forum_comment_likes (comment_id, user_id) VALUES ($1, $2)',
          [commentId, userIdInt]
        );

        // Get comment author, user info, and post title
        const [commentData, user] = await Promise.all([
          t.one(`
            SELECT 
              c.author_id, 
              c.content, 
              p.title as post_title 
            FROM forum_comments c 
            JOIN forum_posts p ON c.post_id = p.id 
            WHERE c.id = $1`, 
            [commentId]
          ),
          t.one('SELECT name, profile_photo FROM users WHERE id = $1', [userIdInt])
        ]);

        // Create notification if the liker is not the comment author
        if (commentData.author_id !== userIdInt) {
          await t.none(`
            INSERT INTO notifications 
            (user_id, type, content, related_id, actor_id, actor_name, actor_avatar, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
            [
              commentData.author_id,
              'comment_like',
              `${user.name} liked your comment on "${commentData.post_title}"`,
              postId,
              userIdInt,
              user.name,
              user.profile_photo
            ]
          );
        }

      } else {
        const deleted = await t.result(
          'DELETE FROM forum_comment_likes WHERE comment_id = $1 AND user_id = $2',
          [commentId, userIdInt]
        );

        if (deleted.rowCount === 0) {
          return await t.one(`
            SELECT 
              c.id,
              c.content,
              c.author_id,
              u.name as author_name,
              u.profile_photo as author_avatar,
              to_char(c.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
              c.likes
            FROM forum_comments c
            JOIN users u ON c.author_id = u.id
            WHERE c.id = $1 AND c.post_id = $2`,
            [commentId, postId]
          );
        }
      }

      // Update and return comment with accurate like count
      const result = await t.one(`
        WITH like_count AS (
          SELECT COUNT(*) as count
          FROM forum_comment_likes
          WHERE comment_id = $1
        )
        UPDATE forum_comments c
        SET likes = (SELECT count FROM like_count)
        WHERE id = $1 AND post_id = $2
        RETURNING 
          c.id,
          c.content,
          c.author_id,
          (SELECT name FROM users WHERE id = c.author_id) as author_name,
          (SELECT profile_photo FROM users WHERE id = c.author_id) as author_avatar,
          to_char(c.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
          c.likes`,
        [commentId, postId]
      );

      return result;
    });
  },

  async updatePostLike(postId, userId, increment = true) {
    return db.tx(async t => {
      const userIdInt = parseInt(userId, 10);
      
      if (increment) {
        const existing = await t.oneOrNone(
          'SELECT id FROM forum_post_likes WHERE post_id = $1 AND user_id = $2',
          [postId, userIdInt]
        );

        if (existing) {
          throw new Error('User already liked this post');
        }

        await t.none(
          'INSERT INTO forum_post_likes (post_id, user_id) VALUES ($1, $2)',
          [postId, userIdInt]
        );

        // Get post author and user info
        const [post, user] = await Promise.all([
          t.one('SELECT author_id, title FROM forum_posts WHERE id = $1', [postId]),
          t.one('SELECT name, profile_photo FROM users WHERE id = $1', [userIdInt])
        ]);

        // Create notification if the liker is not the post author
        if (post.author_id !== userIdInt) {
          // Use database timestamp instead of JavaScript Date
          await t.none(`
            INSERT INTO notifications 
            (user_id, type, content, related_id, actor_id, actor_name, actor_avatar, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
            [
              post.author_id,
              'post_like',
              `${user.name} liked your post "${post.title}"`,
              postId,
              userIdInt,
              user.name,
              user.profile_photo
            ]
          );
        }

      } else {
        await t.none(
          'DELETE FROM forum_post_likes WHERE post_id = $1 AND user_id = $2',
          [postId, userIdInt]
        );
      }

      // Updated query to join with users table
      const result = await t.one(`
        WITH like_count AS (
          SELECT COUNT(*) as count
          FROM forum_post_likes
          WHERE post_id = $1
        )
        UPDATE forum_posts p
        SET likes = (SELECT count FROM like_count)
        WHERE id = $1
        RETURNING 
          p.id,
          p.title,
          p.content,
          p.author_id,
          p.category,
          p.type,
          p.likes,
          to_char(p.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
          (SELECT name FROM users WHERE id = p.author_id) as author_name,
          (SELECT profile_photo FROM users WHERE id = p.author_id) as author_avatar`,
        [postId]
      );

      return result;
    });
  },

  async getUserLikedPosts(userId) {
    const userIdInt = parseInt(userId, 10);
    return db.map(
      'SELECT post_id FROM forum_post_likes WHERE user_id = $1',
      [userIdInt],
      row => row.post_id
    );
  },

  async getUserLikedComments(userId) {
    // Convert userId to integer
    const userIdInt = parseInt(userId, 10);
    return db.map(
      'SELECT comment_id FROM forum_comment_likes WHERE user_id = $1',
      [userIdInt],
      row => row.comment_id
    );
  },

  async updatePollVote(postId, optionId, userId) {
    return db.tx(async t => {
      // Check if user already voted
      const existingVote = await t.oneOrNone(
        `SELECT id FROM forum_poll_votes 
         WHERE poll_id = (SELECT id FROM forum_polls WHERE post_id = $1)
         AND user_id = $2`,
        [postId, userId]
      );

      if (existingVote) {
        throw new Error('User has already voted on this poll');
      }

      // Get poll id
      const poll = await t.one(
        'SELECT id FROM forum_polls WHERE post_id = $1',
        [postId]
      );

      // Record the vote
      await t.none(
        `INSERT INTO forum_poll_votes (poll_id, user_id, option_id)
         VALUES ($1, $2, $3)`,
        [poll.id, userId, optionId]
      );

      // Update vote counts
      await t.none(
        `UPDATE forum_poll_options 
         SET votes = votes + 1 
         WHERE id = $1`,
        [optionId]
      );

      await t.none(
        `UPDATE forum_polls 
         SET total_votes = total_votes + 1 
         WHERE id = $1`,
        [poll.id]
      );

      // Return updated poll data
      return await t.one(`
        SELECT 
          p.id,
          p.question,
          p.total_votes as "totalVotes",
          (
            SELECT json_agg(
              json_build_object(
                'id', po.id,
                'text', po.text,
                'votes', po.votes
              )
            )
            FROM forum_poll_options po
            WHERE po.poll_id = p.id
          ) as options
        FROM forum_polls p
        WHERE p.post_id = $1`,
        [postId]
      );
    });
  },

  async getUserVotedPolls(userId) {
    return db.map(
      `SELECT DISTINCT p.post_id 
       FROM forum_poll_votes v
       JOIN forum_polls p ON v.poll_id = p.id
       WHERE v.user_id = $1`,
      [userId],
      row => row.post_id
    );
  },

  async deletePost(postId, userId) {
    return db.tx(async t => {
      try {
        // Check if user is the post author
        const post = await t.oneOrNone(
          'SELECT id FROM forum_posts WHERE id = $1 AND author_id = $2',
          [postId, userId]
        );

        if (!post) {
          throw new Error('Unauthorized to delete this post');
        }

        // Delete all related records in correct order
        await t.none('DELETE FROM forum_post_likes WHERE post_id = $1', [postId]);
        await t.none('DELETE FROM forum_comment_likes WHERE comment_id IN (SELECT id FROM forum_comments WHERE post_id = $1)', [postId]);
        await t.none('DELETE FROM forum_comments WHERE post_id = $1', [postId]);
        await t.none('DELETE FROM forum_poll_votes WHERE poll_id IN (SELECT id FROM forum_polls WHERE post_id = $1)', [postId]);
        await t.none('DELETE FROM forum_poll_options WHERE poll_id IN (SELECT id FROM forum_polls WHERE post_id = $1)', [postId]);
        await t.none('DELETE FROM forum_polls WHERE post_id = $1', [postId]);
        await t.none('DELETE FROM forum_posts WHERE id = $1', [postId]);

        return { success: true };
      } catch (error) {
        console.error('Database error while deleting post:', error);
        throw error;
      }
    });
  },

  async updatePost(postId, userId, updateData) {
    return db.tx(async t => {
      try {
        // Check if user is the post author
        const existingPost = await t.oneOrNone(
          'SELECT p.id, p.type, pl.total_votes FROM forum_posts p LEFT JOIN forum_polls pl ON p.id = pl.post_id WHERE p.id = $1 AND p.author_id = $2',
          [postId, userId]
        );

        if (!existingPost) {
          throw new Error('Unauthorized to edit this post');
        }

        // If it's a poll and has votes, prevent editing
        if (existingPost.type === 'poll' && existingPost.total_votes > 0) {
          throw new Error('Cannot edit poll after votes have been cast');
        }

        // Update post basic info
        const updatedPost = await t.one(`
          UPDATE forum_posts 
          SET 
            title = $1,
            content = $2,
            category = $3
          WHERE id = $4 
          RETURNING *
        `, [updateData.title, updateData.content, updateData.category, postId]);

        // If it's a poll, update poll options
        if (updatedPost.type === 'poll' && updateData.poll) {
          // Update poll question
          await t.none(`
            UPDATE forum_polls 
            SET question = $1 
            WHERE post_id = $2
          `, [updateData.title, postId]);

          // Update poll options that have no votes
          for (const option of updateData.poll.options) {
            if (option.votes === 0) {
              await t.none(`
                UPDATE forum_poll_options 
                SET text = $1 
                WHERE id = $2 AND votes = 0
              `, [option.text, option.id]);
            }
          }
        }

        // Get author details
        const author = await t.one(
          'SELECT name, profile_photo FROM users WHERE id = $1',
          [userId]
        );

        // Get comments
        const comments = await t.any(`
          SELECT 
            c.*,
            u.name as author_name,
            u.profile_photo as author_avatar
          FROM forum_comments c
          JOIN users u ON c.author_id = u.id
          WHERE c.post_id = $1
          ORDER BY c.created_at DESC
        `, [postId]);

        // Combine all data
        const fullPost = {
          ...updatedPost,
          author_name: author.name,
          author_avatar: author.profile_photo,
          comments: comments || []
        };

        return fullPost;

      } catch (error) {
        console.error('Error in updatePost:', error);
        throw error;
      }
    });
  }
};

module.exports = forumModel;
