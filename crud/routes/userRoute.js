import express from 'express';

// Create dummy functions to test if the issue is with missing controllers
const dummyFetch = (req, res) => res.json({ message: 'fetch works' });
const dummyCreate = (req, res) => res.json({ message: 'create works' });
const dummyUpdate = (req, res) => res.json({ message: 'update works' });
const dummyDelete = (req, res) => res.json({ message: 'delete works' });

// Import your actual controllers - comment out if they don't exist
// import {fetch, create, update, deleteUser} from '../controller/userController.js';

const route = express.Router();

// Use dummy functions first to test route patterns
route.post('/create', dummyCreate);
route.get('/getAllUsers', dummyFetch);
route.put('/update/:id', dummyUpdate);
route.delete('/delete/:id', dummyDelete);

// Uncomment these when you confirm controllers exist:
// route.post('/create', create);
// route.get('/getAllUsers', fetch);
// route.put('/update/:id', update);
// route.delete('/delete/:id', deleteUser);

export default route;