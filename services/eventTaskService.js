/**
 * Event Task Service
 * Manages tasks for events with smart templates
 */

import { getPrismaClient } from '../config/database.js';

const prisma = getPrismaClient();

// Hardcoded task templates by category
const TASK_TEMPLATES = {
  design: [
    { title: "Hire graphic designer", description: "Find and onboard a designer for event branding", priority: "high" },
    { title: "Create event flyer", description: "Design promotional flyer with event details", priority: "high" },
    { title: "Design social media graphics", description: "Create templates for Instagram, Facebook posts", priority: "medium" }
  ],
  marketing: [
    { title: "Start posting videos", description: "Create and share promotional videos to build momentum", priority: "high" },
    { title: "Post flyer on social media", description: "Share event flyer with link to registration", priority: "high" },
    { title: "Create landing page", description: "Build event website with 3 design options", priority: "high" },
    { title: "Set up email campaign", description: "Create and schedule email invitations", priority: "medium" }
  ],
  tech: [
    { title: "Test Stripe integration", description: "Verify payment processing works end-to-end", priority: "high" },
    { title: "Upload contacts in CRM", description: "Import contact list and verify data", priority: "high" },
    { title: "Set up event pipeline", description: "Configure funnel stages and automation", priority: "medium" }
  ],
  logistics: [
    { title: "Book venue", description: "Confirm location, date, and capacity", priority: "high" },
    { title: "Arrange catering", description: "Select menu and confirm headcount", priority: "medium" },
    { title: "Coordinate volunteers", description: "Recruit and assign day-of roles", priority: "medium" }
  ],
  finance: [
    { title: "Set fundraising goal", description: "Determine target amount and ticket pricing", priority: "high" },
    { title: "Create budget", description: "List all expenses and revenue sources", priority: "high" },
    { title: "Track sponsorships", description: "Reach out to potential sponsors", priority: "low" }
  ]
};

/**
 * Get all task templates (for selection)
 */
export function getTaskTemplates() {
  return TASK_TEMPLATES;
}

/**
 * Generate initial tasks for a new event
 * Creates a default set of tasks across all categories
 */
export async function generateInitialTasks(eventId) {
  const tasks = [];
  let orderIndex = 0;

  // Add top priority tasks from each category
  for (const [category, templates] of Object.entries(TASK_TEMPLATES)) {
    // Add the first 2 tasks from each category
    for (const template of templates.slice(0, 2)) {
      tasks.push({
        eventId,
        title: template.title,
        description: template.description,
        category,
        priority: template.priority,
        completed: false,
        orderIndex: orderIndex++
      });
    }
  }

  // Create tasks in database
  const created = await prisma.eventTask.createMany({
    data: tasks
  });

  console.log(`✅ Generated ${created.count} initial tasks for event ${eventId}`);
  return created;
}

/**
 * Get all tasks for an event
 */
export async function getEventTasks(eventId) {
  return await prisma.eventTask.findMany({
    where: { eventId },
    orderBy: [
      { completed: 'asc' },
      { orderIndex: 'asc' }
    ]
  });
}

/**
 * Get tasks grouped by category
 */
export async function getEventTasksByCategory(eventId) {
  const tasks = await getEventTasks(eventId);
  
  const grouped = {};
  for (const task of tasks) {
    if (!grouped[task.category]) {
      grouped[task.category] = [];
    }
    grouped[task.category].push(task);
  }
  
  return grouped;
}

/**
 * Create a new task
 */
export async function createTask(eventId, taskData) {
  return await prisma.eventTask.create({
    data: {
      eventId,
      ...taskData
    }
  });
}

/**
 * Toggle task completion
 */
export async function toggleTaskCompletion(taskId) {
  const task = await prisma.eventTask.findUnique({
    where: { id: taskId }
  });

  return await prisma.eventTask.update({
    where: { id: taskId },
    data: { completed: !task.completed }
  });
}

/**
 * Update task
 */
export async function updateTask(taskId, updates) {
  return await prisma.eventTask.update({
    where: { id: taskId },
    data: updates
  });
}

/**
 * Delete task
 */
export async function deleteTask(taskId) {
  return await prisma.eventTask.delete({
    where: { id: taskId }
  });
}

/**
 * Get task stats for an event
 */
export async function getTaskStats(eventId) {
  const tasks = await prisma.eventTask.findMany({
    where: { eventId }
  });

  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const byCategory = {};

  for (const task of tasks) {
    if (!byCategory[task.category]) {
      byCategory[task.category] = { total: 0, completed: 0 };
    }
    byCategory[task.category].total++;
    if (task.completed) {
      byCategory[task.category].completed++;
    }
  }

  return {
    total,
    completed,
    remaining: total - completed,
    percentComplete: total > 0 ? Math.round((completed / total) * 100) : 0,
    byCategory
  };
}

