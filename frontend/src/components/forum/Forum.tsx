import React, { useState, useEffect, useCallback } from 'react';
import CreatePost from './CreatePost';
import PostList from './PostList';
import ForumSidebar from './ForumSidebar';
import { IconButton, Tooltip } from '@mui/material';
import GridViewIcon from '@mui/icons-material/GridView';
import ViewListIcon from '@mui/icons-material/ViewList';
import { Post, Comment } from '../../types/forum'; // Remove unused NewPost import
import '../../styles/Forum.css';
import ForumIcon from '@mui/icons-material/Forum';
import PeopleIcon from '@mui/icons-material/People';
import PollIcon from '@mui/icons-material/Poll';
import CircleIcon from '@mui/icons-material/Circle';
import MenuIcon from '@mui/icons-material/Menu'; // Add this import

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5175';

const Forum: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('All');
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [highlightedPostId, setHighlightedPostId] = useState<string | null>(null);
  const [hasHighlighted, setHasHighlighted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('postId');
    
    if (postId && !hasHighlighted && posts.length > 0) {
      setHighlightedPostId(postId);
      setHasHighlighted(true);
      
      setTimeout(() => {
        const postElement = document.getElementById(`post-${postId}`);
        if (postElement) {
          postElement.scrollIntoView({ behavior: 'smooth' });
          postElement.classList.add('highlighted-post');
          
          setTimeout(() => {
            postElement.classList.remove('highlighted-post');
            setHighlightedPostId(null);
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);
          }, 3500);
        }
      }, 300);
    }
  }, [posts, hasHighlighted]);

  // Reset hasHighlighted when navigating away or when URL changes
  useEffect(() => {
    const handlePopState = () => {
      setHasHighlighted(false);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      setHasHighlighted(false);
    };
  }, []);

  // Add useEffect to handle body scroll
  useEffect(() => {
    if (isSidebarOpen) {
      document.body.classList.add('sidebar-open');
    } else {
      document.body.classList.remove('sidebar-open');
    }

    // Cleanup
    return () => {
      document.body.classList.remove('sidebar-open');
    };
  }, [isSidebarOpen]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_URL}/api/forum/posts`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setPosts(data);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
      setError('Failed to load posts. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPost = async (postData: FormData) => {
    try {
      const response = await fetch(`${API_URL}/api/forum/posts`, {
        method: 'POST',
        body: postData, // FormData will automatically set the correct content-type
      });

      if (!response.ok) {
        throw new Error('Failed to create post');
      }

      const createdPost = await response.json();
      setPosts(prevPosts => [createdPost, ...prevPosts]);
    } catch (error) {
      console.error('Failed to create post:', error);
    }
  };

  const handleCategoryChange = (newCategory: string) => {
    setActiveCategory(newCategory);
  };

  const handleAddComment = (postId: string, newComment: Comment) => {
    setPosts(prevPosts => 
      prevPosts.map(post => {
        if (post.id === postId) {
          const updatedComments = [...(post.comments || []), {
            ...newComment,
            author_id: newComment.author_id,
            author_name: newComment.author_name,
            author_avatar: newComment.author_avatar,
            created_at: newComment.created_at
          }];
          return { ...post, comments: updatedComments };
        }
        return post;
      })
    );
  };

  const handleVote = async (postId: string, optionId: string) => {
    setPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === postId && post.poll
          ? {
              ...post,
              poll: {
                ...post.poll,
                totalVotes: post.poll.totalVotes + 1,
                options: post.poll.options.map(option => ({
                  ...option,
                  votes: option.id === optionId ? option.votes + 1 : option.votes
                }))
              }
            }
          : post
      )
    );
  };

  const handleCommentLike = useCallback(async (postId: string, commentId: string) => {
    setPosts(prevPosts => 
      prevPosts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            comments: post.comments.map(comment => {
              if (comment.id === commentId) {
                // Instead of incrementing/decrementing, just return the new count from the server
                return {
                  ...comment
                };
              }
              return comment;
            })
          };
        }
        return post;
      })
    );
    
    // Fetch the updated posts to get the correct like count
    try {
      const response = await fetch(`${API_URL}/api/forum/posts`);
      if (response.ok) {
        const updatedPosts = await response.json();
        setPosts(updatedPosts);
      }
    } catch (error) {
      console.error('Failed to refresh posts:', error);
    }
  }, []);

  const handleDeletePost = (postId: string) => {
    setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
  };

  const handleUpdatePost = (postId: string, updatedPost: Partial<Post>) => {
    setPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === postId 
          ? { ...post, ...updatedPost }
          : post
      )
    );
    fetchPosts();
  };

  return (
    <>
      <div className="forum-banner">
        <div className="forum-banner-content">
          <h1>Community Forum</h1>
          <p>Join the conversation, share your thoughts, and connect with others</p>
          <div className="forum-stats">
            <div className="stat-item">
              <ForumIcon />
              <div>
                <h3>{posts.length}</h3>
                <p>Discussions</p>
              </div>
            </div>
            <div className="stat-item">
              <PeopleIcon />
              <div>
                <h3>
                  {Array.from(new Set(posts.map(post => post.author_id))).length}
                </h3>
                <p>Members</p>
              </div>
            </div>
            <div className="stat-item">
              <PollIcon />
              <div>
                <h3>{posts.filter(post => post.type === 'poll').length}</h3>
                <p>Active Polls</p>
              </div>
            </div>
          </div>
          {/* Add this new section for role legends */}
          <div className="role-legends" style={{ 
            display: 'flex', 
            gap: '20px', 
            justifyContent: 'center',
            marginTop: '20px',
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            padding: '10px',
            borderRadius: '8px'
          }}>
            {[
              { role: 'Volunteer', color: '#4CAF50' },
              { role: 'Scholar', color: '#2196F3' },
              { role: 'Sponsor', color: '#f99407' }
            ].map(({ role, color }) => (
              <div key={role} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '5px'
              }}>
                <CircleIcon sx={{ color, fontSize: 12 }} />
                <span style={{ 
                  color: 'white',
                  fontSize: '0.9rem',
                  fontFamily: '"Poppins", sans-serif'
                }}>
                  {role}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="forum-container">
        <ForumSidebar 
          activeCategory={activeCategory}
          onCategoryChange={handleCategoryChange}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
        <div className="forum-main">
          <div className="forum-header">
            <div className="header-left">
              <IconButton 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                sx={{ 
                  color: '#f99407', // Match the color
                  '&:hover': {
                    backgroundColor: 'rgba(249, 148, 7, 0.1)',
                  },
                  width: 40,
                  height: 40,
                  padding: '8px',
                  marginRight: '8px',
                  // Show only below 768px (mobile)
                  display: { xs: 'flex', md: 'none' }
                }}
              >
                <MenuIcon />
              </IconButton>
              <h1>Community Forum</h1>
            </div>
            <div className="forum-controls">
              <Tooltip title={`Switch to ${view === 'list' ? 'grid' : 'list'} view`}>
                <IconButton 
                  onClick={() => setView(view === 'list' ? 'grid' : 'list')}
                  sx={{ 
                    color: '#f99407',
                    '&:hover': {
                      backgroundColor: 'rgba(249, 148, 7, 0.1)',
                    }
                  }}
                >
                  {view === 'list' ? <GridViewIcon /> : <ViewListIcon />}
                </IconButton>
              </Tooltip>
              <CreatePost onPostCreate={handleAddPost} />
            </div>
          </div>
          {loading ? (
            <div className="loading-state">Loading posts...</div>
          ) : error ? (
            <div className="error-state">{error}</div>
          ) : (
            <PostList 
              view={view} 
              category={activeCategory} 
              posts={posts} 
              highlightedPostId={highlightedPostId}
              onAddComment={handleAddComment}
              onVote={handleVote}  // Make sure this prop is passed
              onCommentLike={handleCommentLike}
              onDeletePost={handleDeletePost}
              onUpdatePost={handleUpdatePost}
            />
          )}
        </div>
      </div>
    </>
  );
};

export default Forum;
