import React, { useState, KeyboardEvent, useEffect } from 'react';
import { Post, Comment } from '../../types/forum';
import { 
  Card, CardContent, Typography, Avatar, Button, Chip, 
  TextField, Collapse, IconButton, InputAdornment,
  Menu, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, InputLabel, Select, Modal, Box, Snackbar, Alert // Add Modal, Box, Snackbar, and Alert imports
} from '@mui/material';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbUpOutlinedIcon from '@mui/icons-material/ThumbUpOutlined';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import SendIcon from '@mui/icons-material/Send';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { checkProfanity } from '../../utils/profanityFilter'; // Remove showProfanityWarning
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5175';

interface PostListProps {
  view: 'list' | 'grid';
  category: string;
  posts: Post[];
  onAddComment: (postId: string, comment: Comment) => void;
  onVote: (postId: string, optionId: string) => void;  // Add this prop
  onCommentLike: (postId: string, commentId: string) => void;
  onDeletePost: (postId: string) => void;
  onUpdatePost: (postId: string, updatedPost: Partial<Post>) => void;
  highlightedPostId?: string | null;
}

interface EditData {
  title: string;
  content: string;
  category: string;
  type: 'discussion' | 'poll';
  poll: {
    options: { id: string; text: string; votes: number; }[];
  };
}

// Add this helper function at the top level
const getRoleBorderColor = (role?: string) => {
  switch (role?.toLowerCase()) {
    case 'volunteer':
      return '#4CAF50'; // Green
    case 'scholar':
      return '#2196F3'; // Blue
    case 'sponsor':
      return '#f99407'; // Orange
    default:
      return 'transparent';
  }
};

const PostList: React.FC<PostListProps> = ({ view, category, posts = [], onAddComment, onVote, onCommentLike, onDeletePost, onUpdatePost, highlightedPostId }) => {
  const [likedPosts, setLikedPosts] = useState<string[]>([]);
  const [expandedPosts, setExpandedPosts] = useState<string[]>([]);
  const [newComments, setNewComments] = useState<{ [key: string]: string }>({});
  const [votedPolls, setVotedPolls] = useState<string[]>([]);
  const [likedComments, setLikedComments] = useState<string[]>([]);
  const [allPosts, setPosts] = useState<Post[]>(posts);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedPost, setSelectedPost] = useState<string | null>(null);
  const [editDialog, setEditDialog] = useState(false);
  const [editData, setEditData] = useState<EditData>({
    title: '',
    content: '',
    category: '',
    type: 'discussion',
    poll: { options: [] }
  });
  const [selectedImage, setSelectedImage] = useState<string | null>(null); // Add this state
  const [commentError, setCommentError] = useState<{ [key: string]: string }>({});
  const [showProfanityAlert, setShowProfanityAlert] = useState(false); // Add this state

  const modalStyle = { // Add this style object
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    '& img': {
      maxWidth: '90vw',
      maxHeight: '90vh',
      objectFit: 'contain'
    }
  };

  const handleImageClick = (imageUrl: string) => { // Add this handler
    setSelectedImage(imageUrl);
  };

  useEffect(() => {
    const fetchUserLikes = async () => {
      const userData = localStorage.getItem('user');
      const user = userData ? JSON.parse(userData) : null;
      
      if (!user) return;

      try {
        // Fetch liked posts
        const postsResponse = await fetch(`${API_URL}/api/forum/user-liked-posts/${user.id}`);
        if (postsResponse.ok) {
          const likedPostIds = await postsResponse.json();
          setLikedPosts(likedPostIds);
        }

        // Fetch liked comments (existing code)
        const commentsResponse = await fetch(`${API_URL}/api/forum/user-likes/${user.id}`);
        if (commentsResponse.ok) {
          const likedCommentIds = await commentsResponse.json();
          setLikedComments(likedCommentIds);
        }
      } catch (error) {
        console.error('Error fetching user likes:', error);
      }
    };

    fetchUserLikes();
  }, []);

  useEffect(() => {
    const fetchUserVotes = async () => {
      const userData = localStorage.getItem('user');
      const user = userData ? JSON.parse(userData) : null;
      
      if (!user) return;

      try {
        const response = await fetch(`${API_URL}/api/forum/user-voted-polls/${user.id}`);
        if (response.ok) {
          const votedPollIds = await response.json();
          setVotedPolls(votedPollIds);
        }
      } catch (error) {
        console.error('Error fetching voted polls:', error);
      }
    };

    fetchUserVotes();
  }, []);

  // Update allPosts when props.posts changes
  useEffect(() => {
    setPosts(posts);
  }, [posts]);

  const handleLike = async (postId: string) => {
    const userData = localStorage.getItem('user');
    const user = userData ? JSON.parse(userData) : null;

    if (!user) {
      console.error('No user data found');
      return;
    }

    const increment = !likedPosts.includes(postId);
    try {
      const response = await fetch(
        `${API_URL}/api/forum/posts/${postId}/like`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            increment,
            userId: user.id
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update like');
      }

      const updatedPost = await response.json();
      
      // Update liked posts state
      if (increment) {
        setLikedPosts(prev => [...prev, postId]);
      } else {
        setLikedPosts(prev => prev.filter(id => id !== postId));
      }

      // Use the server's like count instead of calculating locally
      setPosts((prevPosts: Post[]) => 
        prevPosts.map((post: Post) => 
          post.id === postId ? { ...post, likes: updatedPost.likes } : post
        )
      );
    } catch (error) {
      console.error('Error updating like:', error);
    }
  };

  const toggleComments = (postId: string) => {
    setExpandedPosts(prev => 
      prev.includes(postId) 
        ? prev.filter(id => id !== postId)
        : [...prev, postId]
    );
  };

  const handleAddComment = async (postId: string) => {
    if (!newComments[postId]?.trim()) return;

    if (checkProfanity(newComments[postId])) {
      setCommentError({
        ...commentError,
        [postId]: 'Your comment contains inappropriate language'
      });
      setShowProfanityAlert(true);
      return;
    }

    setCommentError({ ...commentError, [postId]: '' });

    const userData = localStorage.getItem('user');
    const user = userData ? JSON.parse(userData) : null;

    if (!user) return;

    const commentData = {
      content: newComments[postId].trim(),
      author_id: user.id,
      author_name: user.name,
      author_avatar: user.profilePhoto || 'https://mui.com/static/images/avatar/1.jpg'
    };

    try {
      const response = await fetch(`${API_URL}/api/forum/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(commentData),
      });

      if (!response.ok) {
        throw new Error('Failed to add comment');
      }

      const newComment = await response.json();
      onAddComment(postId, newComment);
      setNewComments(prev => ({ ...prev, [postId]: '' }));
    } catch (error) {
      // Optionally show error to user
    }
  };

  const handleCommentSubmit = (postId: string, event?: KeyboardEvent) => {
    if (event) {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleAddComment(postId);
      }
    } else {
      handleAddComment(postId);
    }
  };

  const handleVote = async (postId: string, optionId: string) => {
    const userData = localStorage.getItem('user');
    const user = userData ? JSON.parse(userData) : null;

    if (!user) {
      console.error('No user data found');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/forum/posts/${postId}/vote/${optionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId: user.id })
      });

      if (!response.ok) {
        throw new Error('Failed to record vote');
      }

      const updatedPoll = await response.json();

      // Update the posts state with the new poll data
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.id === postId 
            ? { ...post, poll: updatedPoll }
            : post
        )
      );

      setVotedPolls(prev => [...prev, postId]);
      onVote(postId, optionId);
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const handleCommentLike = async (postId: string, commentId: string) => {
    const userData = localStorage.getItem('user');
    const user = userData ? JSON.parse(userData) : null;

    if (!user) {
      console.error('No user data found');
      return;
    }

    const increment = !likedComments.includes(commentId);
    try {
      const response = await fetch(
        `${API_URL}/api/forum/posts/${postId}/comments/${commentId}/like`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            increment,
            userId: user.id
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update like');
      }

      const updatedComment = await response.json();
      
      if (increment) {
        setLikedComments(prev => [...prev, commentId]);
      } else {
        setLikedComments(prev => prev.filter(id => id !== commentId));
      }

      onCommentLike(postId, commentId);
    } catch (error) {
      console.error('Error updating like:', error);
    }
  };

  const getVotePercentage = (votes: number, totalVotes: number) => {
    if (totalVotes === 0) return 0;
    return Math.round((votes / totalVotes) * 100);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Invalid date';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      return date.toLocaleDateString();
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return 'Invalid date';
    }
  };

  const getCommentsCount = (post: Post) => {
    return post.comments ? post.comments.length : 0;
  };

  const filteredPosts = allPosts ? (
    category.toLowerCase() === 'all' 
      ? allPosts 
      : allPosts.filter((post: Post) => post.category.toLowerCase() === category.toLowerCase())
  ) : [];

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, postId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedPost(postId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEditClick = (post: Post) => {
    if (!post) return;
    
    // Add type guard for poll
    const totalVotes = post.type === 'poll' && post.poll ? post.poll.totalVotes : 0;
    
    if (post.type === 'poll' && totalVotes > 0) {
      alert('Cannot edit poll after votes have been cast');
      handleMenuClose();
      return;
    }
    
    setEditData({
      title: post.title,
      content: post.content,
      category: post.category.toLowerCase(),
      type: post.type,
      poll: post.poll || { options: [] }
    });
    
    setSelectedPost(post.id);
    setEditDialog(true);
    handleMenuClose();
  };

  const handleDeleteClick = async () => {
    if (!selectedPost) return;

    const userData = localStorage.getItem('user');
    const user = userData ? JSON.parse(userData) : null;

    try {
      const response = await fetch(`${API_URL}/api/forum/posts/${selectedPost}`, {  // Changed from query params to body
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId: user.id })  // Send userId in request body
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete post');
      }
      
      onDeletePost(selectedPost);
      handleMenuClose();
    } catch (error) {
      console.error('Error deleting post:', error);
      // You might want to show an error message to the user here
    }
  };

  const handleUpdateSubmit = async () => {
    if (!selectedPost) return;
    
    const userData = localStorage.getItem('user');
    const user = userData ? JSON.parse(userData) : null;
    
    if (!user) return;
    
    if (!editData.title.trim() || (editData.type === 'discussion' && !editData.content.trim())) {
      return;
    }
    
    try {
      const requestData = {
        userId: user.id,
        title: editData.title.trim(),
        content: editData.type === 'poll' ? '' : editData.content.trim(),
        category: editData.category,
        type: editData.type,
        ...(editData.type === 'poll' && {
          poll: editData.poll
        })
      };

      const response = await fetch(`${API_URL}/api/forum/posts/${selectedPost}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error('Failed to update post');
      }

      const updatedPost = await response.json();
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.id === selectedPost ? { ...post, ...updatedPost } : post
        )
      );

      onUpdatePost(selectedPost, updatedPost);
      setEditDialog(false);
      resetEditData();
      setSelectedPost(null);
      
      const refreshResponse = await fetch(`${API_URL}/api/forum/posts`);
      if (refreshResponse.ok) {
        const refreshedPosts = await refreshResponse.json();
        setPosts(refreshedPosts);
      }

    } catch (error) {
      alert('Failed to update post. Please try again.');
    }
  };

  const handleEditTextChange = (field: keyof EditData, value: string) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const resetEditData = () => {
    setEditData({
      title: '',
      content: '',
      category: '',
      type: 'discussion',
      poll: { options: [] }
    });
  };

  if (!posts || posts.length === 0) {
    return (
      <div className="no-posts">
        <Typography variant="h6" color="textSecondary" align="center">
          No posts available. Be the first to create a post!
        </Typography>
      </div>
    );
  }

  return (
    <>
      <Snackbar 
        open={showProfanityAlert} 
        autoHideDuration={6000} 
        onClose={() => setShowProfanityAlert(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ width: '100%' }}
      >
        <Alert 
          severity="error" 
          variant="filled"
          onClose={() => setShowProfanityAlert(false)}
          sx={{
            width: '100%',
            fontSize: '1rem',
            alignItems: 'center',
            '& .MuiAlert-icon': {
              fontSize: '24px'
            }
          }}
        >
          Comment contains inappropriate language
        </Alert>
      </Snackbar>

      <div className={`post-list ${view}`}>
        {filteredPosts.map(post => {
          const isAuthor = post.author_id === JSON.parse(localStorage.getItem('user') || '{}').id;
          const isHighlighted = post.id === highlightedPostId;
          
          return (
            <Card 
              key={post.id} 
              id={`post-${post.id}`}
              sx={{ 
                mb: 2,
                position: 'relative',
                transition: 'all 0.5s ease',
                borderLeft: '4px solid transparent',
                ...(isHighlighted && {
                  borderLeft: '4px solid #f99407',
                  backgroundColor: 'rgba(249, 148, 7, 0.05)',
                })
              }}
            >
              <CardContent>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                  <Avatar 
                    src={post.author_avatar} 
                    sx={{ 
                      marginRight: '1rem',
                      border: `3px solid ${getRoleBorderColor(post.author_role)}`,
                    }} 
                  />
                  <div>
                    <Typography 
                      variant="subtitle1"
                      sx={{ 
                        fontFamily: '"Poppins", sans-serif',
                        fontWeight: 500
                      }}
                    >
                      {post.author_name}
                    </Typography>
                    <Typography 
                      variant="caption" 
                      color="text.secondary"
                      sx={{ 
                        display: 'block', 
                        textAlign: 'left',
                        fontFamily: '"Poppins", sans-serif'
                      }}
                    >
                      {formatDate(post.created_at)}
                    </Typography>
                  </div>
                  <Chip 
                    label={post.category} 
                    size="small" 
                    sx={{ 
                      marginLeft: 'auto',
                      fontFamily: '"Poppins", sans-serif',
                        marginBottom: '20px',
                      '& .MuiChip-label': {
                        fontFamily: '"Poppins", sans-serif'
                      
                      }
                    }} 
                  />
                  {isAuthor && (
                    <IconButton
                      onClick={(e) => handleMenuOpen(e, post.id)}
                      sx={{ marginLeft: 'auto' }}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  )}
                </div>

                <Typography 
                  variant="h6" 
                  gutterBottom
                  sx={{ 
                    fontFamily: '"Poppins", sans-serif',
                    fontWeight: 600,
                  }}
                >
                  {post.title}
                </Typography>

                <Typography 
                  variant="body1" 
                  paragraph
                  sx={{ 
                    textAlign: 'left', 
                    width: '100%',
                    fontFamily: '"Poppins", sans-serif'
                  }}
                >
                  {post.content}
                </Typography>

                {post.image_url && (
                  <div style={{ marginBottom: 16 }}>
                    <img
                      src={`${API_URL}${post.image_url}`}
                      alt="Post attachment"
                      style={{
                        maxWidth: '100%',
                        maxHeight: 400,
                        objectFit: 'contain',
                        cursor: 'pointer' // Add this to show it's clickable
                      }}
                      onClick={() => handleImageClick(`${API_URL}${post.image_url}`)}
                    />
                  </div>
                )}

                {post.type === 'poll' && post.poll && post.poll.options && (
                  <div className="poll-container">
                    {post.poll.options.map(option => {
                      // Add safe access to totalVotes with default value
                      const totalVotes = post.poll?.totalVotes ?? 0;
                      const percentage = getVotePercentage(option.votes, totalVotes);
                      return (
                        <Button
                          key={option.id}
                          variant="outlined"
                          fullWidth
                          disabled={votedPolls.includes(post.id)}
                          onClick={() => handleVote(post.id, option.id)}
                          sx={{ 
                            mb: 1,
                            fontFamily: '"Poppins", sans-serif',
                            color: votedPolls.includes(post.id) ? '#666' : '#242424',
                            borderColor: votedPolls.includes(post.id) ? '#ddd' : '#e0e0e0',
                            justifyContent: 'space-between',
                            padding: '12px 20px',
                            position: 'relative',
                            overflow: 'hidden',
                            '&::before': votedPolls.includes(post.id) ? {
                              content: '""',
                              position: 'absolute',
                              left: 0,
                              top: 0,
                              height: '100%',
                              width: `${percentage}%`,
                              backgroundColor: 'rgba(249, 148, 7, 0.1)',
                              zIndex: 0
                            } : {},
                            '&:hover': {
                              backgroundColor: votedPolls.includes(post.id) ? 'transparent' : 'rgba(249, 148, 7, 0.1)',
                              borderColor: votedPolls.includes(post.id) ? '#ddd' : '#f99407',
                              color: votedPolls.includes(post.id) ? '#666' : '#f99407'
                            }
                          }}
                        >
                          <span style={{ zIndex: 1 }}>{option.text}</span>
                          <span style={{ 
                            color: '#666',
                            fontSize: '0.9em',
                            fontWeight: 500,
                            zIndex: 1 
                          }}>
                            {option.votes} votes ({percentage}%)
                          </span>
                        </Button>
                      );
                    })}
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        display: 'block',
                        textAlign: 'right',
                        marginTop: '0.5rem',
                        color: '#666',
                        fontFamily: '"Poppins", sans-serif'
                      }}
                    >
                      Total votes: {post.poll?.totalVotes ?? 0} {votedPolls.includes(post.id) && '• You voted'}
                    </Typography>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <Button 
                    startIcon={likedPosts.includes(post.id) ? <ThumbUpIcon /> : <ThumbUpOutlinedIcon />}
                    size="small"
                    onClick={() => handleLike(post.id)}
                    sx={{
                      color: likedPosts.includes(post.id) ? '#f99407' : 'inherit',
                      fontFamily: '"Poppins", sans-serif',
                      '&:hover': {
                        color: '#f99407',
                      }
                    }}
                  >
                    {post.likes} Likes
                  </Button>
                  <Button 
                    startIcon={expandedPosts.includes(post.id) ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    size="small"
                    onClick={() => toggleComments(post.id)}
                    sx={{
                      color: expandedPosts.includes(post.id) ? '#f99407' : 'inherit',
                      fontFamily: '"Poppins", sans-serif',
                      '&:hover': {
                        color: '#f99407',
                      }
                    }}
                  >
                    {getCommentsCount(post)} Comments
                  </Button>
                </div>

                <Collapse in={expandedPosts.includes(post.id)}>
                  <div className="comments-section">
                    <div className="comments-list">
                      {post.comments && post.comments.map(comment => (
                        <div key={comment.id} className="comment-item">
                          <div className="comment-header">
                            <Avatar 
                              src={comment.author_avatar} 
                              sx={{ 
                                width: 32, 
                                height: 32,
                                border: `2px solid ${getRoleBorderColor(comment.author_role)}`,
                                padding: '1px'
                              }} 
                            />
                            <div className="comment-info">
                              <Typography 
                                variant="subtitle2" 
                                sx={{ 
                                  textAlign: 'left',
                                  fontFamily: '"Poppins", sans-serif',
                                  fontWeight: 600
                                }}
                              >
                                {comment.author_name}
                              </Typography>
                              <Typography 
                                variant="caption" 
                                color="text.secondary"
                                sx={{ 
                                  textAlign: 'left', 
                                  display: 'block',
                                  fontFamily: '"Poppins", sans-serif'
                                }}
                              >
                                {formatDate(comment.created_at)}
                              </Typography>
                            </div>
                            <IconButton
                              size="small"
                              onClick={() => handleCommentLike(post.id, comment.id)}
                              sx={{
                                marginLeft: 'auto',
                                color: likedComments.includes(comment.id) ? '#f99407' : 'inherit',
                                '&:hover': {
                                  color: '#f99407',
                                }
                              }}
                            >
                              {likedComments.includes(comment.id) ? <ThumbUpIcon fontSize="small" /> : <ThumbUpOutlinedIcon fontSize="small" />}
                              <Typography
                                variant="caption"
                                sx={{
                                  ml: 0.5,
                                  color: 'inherit'
                                }}
                              >
                                {comment.likes}
                              </Typography>
                            </IconButton>
                          </div>
                          <Typography 
                            variant="body2" 
                            className="comment-content"
                            sx={{ 
                              textAlign: 'left',
                              fontFamily: '"Poppins", sans-serif'
                            }}
                          >
                            {comment.content}
                          </Typography>
                        </div>
                      ))}
                    </div>
                    <div className="add-comment">
                      {commentError[post.id] && (
                        <Typography 
                          color="error" 
                          sx={{ 
                            mb: 1,
                            p: 1,
                            bgcolor: 'rgba(211, 47, 47, 0.1)',
                            borderRadius: 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            fontSize: '0.875rem'
                          }}
                        >
                          <ErrorOutlineIcon fontSize="small" color="error" />
                          {commentError[post.id]}
                        </Typography>
                      )}
                      <TextField
                        fullWidth
                        size="small"
                        placeholder="Write a comment..."
                        value={newComments[post.id] || ''}
                        onChange={(e) => setNewComments(prev => ({
                          ...prev,
                          [post.id]: e.target.value
                        }))}
                        onKeyPress={(e: KeyboardEvent) => handleCommentSubmit(post.id, e)}
                        onFocus={() => {
                          // Clear error when user starts typing again
                          if (commentError[post.id]) {
                            setCommentError({ ...commentError, [post.id]: '' });
                          }
                        }}
                        InputProps={{
                          style: { 
                            fontFamily: '"Poppins", sans-serif',
                            margin: 0,
                           
                          },
                          className: 'comment-input',
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton 
                                onClick={() => handleCommentSubmit(post.id)}
                                size="small"
                                sx={{ 
                                  color: '#f99407',
                                  '&:hover': {
                                    backgroundColor: 'rgba(249, 148, 7, 0.1)',
                                  }
                                }}
                              >
                                <SendIcon />
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            margin: 0,
                            padding: 0
                          },
                          '& .MuiOutlinedInput-input': {
                            margin: 0,
                            padding: '8px 14px'
                          }
                        }}
                      />
                    </div>
                  </div>
                </Collapse>
              </CardContent>
            </Card>
          );
        })}

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={() => {
            const post = posts.find(p => p.id === selectedPost);
            if (post) {
              handleEditClick(post);
            } else {
              console.error('Post not found:', selectedPost);
            }
          }}>
            <EditIcon sx={{ mr: 1 }} /> Edit
          </MenuItem>
          <MenuItem onClick={handleDeleteClick}>
            <DeleteIcon sx={{ mr: 1 }} /> Delete
          </MenuItem>
        </Menu>

        <Dialog 
          open={editDialog} 
          onClose={() => setEditDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Edit {editData.type === 'poll' ? 'Poll' : 'Post'}</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              fullWidth
              margin="normal"
              label={editData.type === 'poll' ? 'Poll Question' : 'Title'}
              value={editData.title}
              onChange={(e) => handleEditTextChange('title', e.target.value)}
            />
            
            {editData.type === 'discussion' ? (
              <TextField
                fullWidth
                margin="normal"
                label="Content"
                multiline
                rows={4}
                value={editData.content}
                onChange={(e) => handleEditTextChange('content', e.target.value)}
              />
            ) : (
              <div className="poll-options">
                {editData.poll?.options.map((option, index) => (
                  <TextField
                    key={option.id}
                    fullWidth
                    margin="normal"
                    label={`Option ${index + 1}`}
                    value={option.text}
                    onChange={(e) => {
                      const newOptions = [...editData.poll.options];
                      newOptions[index] = { ...option, text: e.target.value };
                      setEditData(prev => ({
                        ...prev,
                        poll: { ...prev.poll, options: newOptions }
                      }));
                    }}
                    // Only enable editing if there are no votes
                    disabled={option.votes > 0}
                    helperText={option.votes > 0 ? `${option.votes} votes - Cannot edit` : ''}
                  />
                ))}
              </div>
            )}

            <FormControl fullWidth margin="normal">
              <InputLabel>Category</InputLabel>
              <Select
                value={editData.category}
                label="Category"
                onChange={(e) => handleEditTextChange('category', e.target.value)}
              >
                {['General', 'Announcements', 'Events', 'Questions', 'Support', 'Suggestions'].map((cat) => (
                  <MenuItem key={cat} value={cat.toLowerCase()}>
                    {cat}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions sx={{ padding: '16px 24px' }}>
            <Button 
              onClick={() => setEditDialog(false)}
              sx={{ color: '#666' }}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                console.log('Save button clicked');
                console.log('Current edit data:', editData);
                handleUpdateSubmit();
              }}
              variant="contained"
              sx={{
                backgroundColor: '#f99407',
                color: 'white',
                '&:hover': {
                  backgroundColor: '#e88a06'
                }
              }}
              disabled={
                !editData.title.trim() || 
                (editData.type === 'discussion' && !editData.content.trim())
              }
            >
              Save Changes
            </Button>
          </DialogActions>
        </Dialog>

        {/* Add this Modal component */}
        <Modal
          open={!!selectedImage}
          onClose={() => setSelectedImage(null)}
          onClick={() => setSelectedImage(null)}
          sx={modalStyle}
        >
          <Box
            onClick={(e) => e.stopPropagation()}
            sx={{
              outline: 'none',
              bgcolor: 'transparent'
            }}
          >
            {selectedImage && (
              <img
                src={selectedImage}
                alt="Enlarged post"
                style={{
                  display: 'block',
                  maxWidth: '90vw',
                  maxHeight: '90vh',
                  objectFit: 'contain'
                }}
              />
            )}
          </Box>
        </Modal>
      </div>
    </>
  );
};

export default PostList;
