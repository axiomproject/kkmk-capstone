const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');
const roleAuth = require('../middleware/roleAuth');

// Staff dashboard routes
router.get('/dashboard', roleAuth(['staff']), staffController.getDashboardData);

// Profile management
router.get('/profile', roleAuth(['staff']), staffController.getProfile);
router.put('/profile', roleAuth(['staff']), staffController.updateProfile);

// Volunteer management routes - staff can only view and update
router.get('/volunteers', roleAuth(['staff']), staffController.getVolunteers);
router.get('/volunteers/:id', roleAuth(['staff']), staffController.getVolunteerById);
router.put('/volunteers/:id', roleAuth(['staff']), staffController.updateVolunteer);

// Event management routes
router.get('/events', roleAuth(['staff']), staffController.getEvents);
router.post('/events', roleAuth(['staff']), staffController.createEvent);
router.put('/events/:id', roleAuth(['staff']), staffController.updateEvent);

module.exports = router;
