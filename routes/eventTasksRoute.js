import express from 'express';
import {
  getTaskTemplates,
  generateInitialTasks,
  getEventTasks,
  getEventTasksByCategory,
  createTask,
  toggleTaskCompletion,
  updateTask,
  deleteTask,
  getTaskStats
} from '../services/eventTaskService.js';

const router = express.Router();

// Get task templates
router.get('/templates', (req, res) => {
  try {
    const templates = getTaskTemplates();
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all tasks for an event
router.get('/:eventId/tasks', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { grouped } = req.query;

    if (grouped === 'true') {
      const tasks = await getEventTasksByCategory(eventId);
      res.json(tasks);
    } else {
      const tasks = await getEventTasks(eventId);
      res.json(tasks);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get task stats
router.get('/:eventId/tasks/stats', async (req, res) => {
  try {
    const { eventId } = req.params;
    const stats = await getTaskStats(eventId);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate initial tasks for event
router.post('/:eventId/tasks/generate', async (req, res) => {
  try {
    const { eventId } = req.params;
    const result = await generateInitialTasks(eventId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new task
router.post('/:eventId/tasks', async (req, res) => {
  try {
    const { eventId } = req.params;
    const task = await createTask(eventId, req.body);
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle task completion
router.patch('/tasks/:taskId/toggle', async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = await toggleTaskCompletion(taskId);
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update task
router.patch('/tasks/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = await updateTask(taskId, req.body);
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete task
router.delete('/tasks/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    await deleteTask(taskId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

