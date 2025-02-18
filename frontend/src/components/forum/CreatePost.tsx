import React, { useState } from 'react';
import { Post, Poll } from '../../types/forum';
import { 
  Button, 
  Dialog, 
  DialogActions, 
  DialogContent, 
  DialogTitle, 
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
  Typography,
  Alert,
  Snackbar
} from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import ClearIcon from '@mui/icons-material/Clear';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { checkProfanity } from '../../utils/profanityFilter';
import { validateContent } from '../../utils/profanityFilter';

interface CreatePostProps {
  onPostCreate: (postData: FormData) => Promise<void>;
}

const CreatePost: React.FC<CreatePostProps> = ({ onPostCreate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [postType, setPostType] = useState<'discussion' | 'poll'>('discussion');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [category, setCategory] = useState('general');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [profanityError, setProfanityError] = useState<string | null>(null);
  const [profanityField, setProfanityField] = useState<string | null>(null);
  const [showAlert, setShowAlert] = useState(false);

  const categories = [
    'General',
    'Announcements',
    'Events',
    'Questions',
    'Support',
    'Suggestions'
  ];

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTextChange = (field: 'title' | 'content', value: string) => {
    if (checkProfanity(value)) {
      setShowAlert(true);
      setProfanityError(`Your ${field} contains inappropriate language`);
      setProfanityField(field);
    } else {
      setProfanityError(null);
      setProfanityField(null);
    }

    if (field === 'title') setTitle(value);
    else setContent(value);
  };

  const handlePollOptionChange = (index: number, value: string) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;

    const validation = validateContent({ pollOptions: [value] });
    if (!validation.isValid && validation.error) {
      setProfanityError(validation.error);
    } else {
      setProfanityError(null);
    }

    setPollOptions(newOptions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all content before submission
    const validation = validateContent({
      title,
      content: postType === 'discussion' ? content : undefined,
      pollOptions: postType === 'poll' ? pollOptions : undefined
    });

    if (!validation.isValid) {
      setProfanityError(validation.error || 'Content contains inappropriate language');
      return;
    }

    if (!title.trim()) {
      alert('Please enter a title');
      return;
    }

    if (postType === 'discussion' && !content.trim()) {
      alert('Please enter content');
      return;
    }

    if (postType === 'poll' && pollOptions.filter(opt => opt.trim()).length < 2) {
      alert('Please add at least 2 poll options');
      return;
    }

    const userData = localStorage.getItem('user');
    const user = userData ? JSON.parse(userData) : null;

    const formData = new FormData();
    formData.append('title', title.trim());
    formData.append('content', content.trim());
    formData.append('authorId', user?.id || '0');
    formData.append('category', category);
    formData.append('type', postType);
    if (selectedImage) {
      formData.append('image', selectedImage);
    }

    if (postType === 'poll') {
      formData.append('poll', JSON.stringify({
        question: title.trim(),
        options: pollOptions
          .filter(option => option.trim() !== '')
          .map((text, index) => ({
            id: index.toString(),
            text: text.trim(),
            votes: 0
          }))
      }));
    }

    console.log('Submitting new post:', formData);
    await onPostCreate(formData);
    setIsOpen(false);
    resetForm();
  };

  const handleAddOption = () => {
    setPollOptions([...pollOptions, '']);
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setPollOptions(['', '']);
    setCategory('general');
    setSelectedImage(null);
    setImagePreview(null);
  };

  return (
    <>
      <Tooltip title="Create new post">
        <IconButton 
          onClick={() => setIsOpen(true)}
          sx={{ 
            color: '#f99407',
            '&:hover': {
              backgroundColor: 'rgba(249, 148, 7, 0.1)',
            }
          }}
        >
          <AddCircleIcon />
        </IconButton>
      </Tooltip>

      <Dialog 
        open={isOpen} 
        onClose={() => setIsOpen(false)} 
        maxWidth="sm" 
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            margin: '32px',
            borderRadius: '12px',
            padding: '16px'
          },
          '& .MuiDialogTitle-root': {
            fontFamily: '"Poppins", sans-serif',
            fontSize: '1.5rem',
            fontWeight: 600,
            color: '#242424',
            padding: '16px 24px'
          },
          '& .MuiDialogContent-root': {
            padding: '24px',
            paddingTop: '8px'
          }
        }}
      >
        <DialogTitle>Create New Post</DialogTitle>
        <DialogContent>
          <Snackbar 
            open={showAlert} 
            autoHideDuration={6000} 
            onClose={() => setShowAlert(false)}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            sx={{ width: '100%' }}
          >
            <Alert 
              severity="error" 
              variant="filled"
              onClose={() => setShowAlert(false)}
              sx={{
                width: '100%',
                fontSize: '1rem',
                alignItems: 'center',
                '& .MuiAlert-icon': {
                  fontSize: '24px'
                }
              }}
            >
              {profanityError}
            </Alert>
          </Snackbar>

          <TextField
            fullWidth
            margin="normal"
            label="Post Title"
            value={title}
            onChange={(e) => handleTextChange('title', e.target.value)}
            error={!!profanityField && profanityField === 'title'}
            helperText={profanityField === 'title' ? profanityError : ''}
            sx={{
              '& .MuiFormHelperText-root': {
                color: '#d32f2f',
                marginTop: '4px',
                fontSize: '0.875rem'
              }
            }}
          />

          <FormControl fullWidth margin="normal">
            <InputLabel>Category</InputLabel>
            <Select
              value={category}
              label="Category"
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.map((cat) => (
                <MenuItem key={cat} value={cat.toLowerCase()}>
                  {cat}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {postType === 'discussion' ? (
            <>
              <TextField
                fullWidth
                margin="normal"
                label="Write your post..."
                multiline
                rows={4}
                value={content}
                onChange={(e) => handleTextChange('content', e.target.value)}
                error={profanityField === 'content'}
                helperText={profanityField === 'content' ? profanityError : ''}
              />
              <input
                accept="image/*"
                style={{ display: 'none' }}
                id="post-image-upload"
                type="file"
                onChange={handleImageSelect}
              />
              <label htmlFor="post-image-upload">
                <Button
                  component="span"
                  variant="outlined"
                  startIcon={<AddPhotoAlternateIcon />}
                  sx={{ mt: 2 }}
                >
                  Add Image
                </Button>
              </label>
              {imagePreview && (
                <div style={{ marginTop: 16, position: 'relative' }}>
                  <img
                    src={imagePreview}
                    alt="Preview"
                    style={{ maxWidth: '100%', maxHeight: 200 }}
                  />
                  <IconButton
                    onClick={() => {
                      setSelectedImage(null);
                      setImagePreview(null);
                    }}
                    sx={{ position: 'absolute', top: 8, right: 8 }}
                  >
                    <ClearIcon />
                  </IconButton>
                </div>
              )}
            </>
          ) : (
            <div className="poll-options">
              {pollOptions.map((option, index) => (
                <TextField
                  key={index}
                  fullWidth
                  margin="normal"
                  label={`Option ${index + 1}`}
                  value={option}
                  onChange={(e) => handlePollOptionChange(index, e.target.value)}
                  error={profanityField === `pollOption-${index}`}
                  helperText={profanityField === `pollOption-${index}` ? profanityError : ''}
                />
              ))}
              <Button 
                variant="outlined"
                onClick={handleAddOption}
              >
                Add Option
              </Button>
            </div>
          )}
        </DialogContent>
        <DialogActions sx={{ padding: '16px 24px' }}>
          <Button 
            onClick={() => setIsOpen(false)} 
            sx={{
              fontFamily: '"Poppins", sans-serif',
              color: '#666'
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            sx={{
              fontFamily: '"Poppins", sans-serif',
              backgroundColor: '#f99407',
              color: 'white',
              '&:hover': {
                backgroundColor: '#e88a06'
              }
            }}
          >
            Create Post
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CreatePost;
