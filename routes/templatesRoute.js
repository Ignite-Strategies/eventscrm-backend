import express from "express";
import Template from "../models/Template.js";

const router = express.Router();

// GET /templates - Get all templates for org
router.get("/", async (req, res) => {
  try {
    const { orgId } = req.query;
    
    if (!orgId) {
      return res.status(400).json({ error: "orgId is required" });
    }
    
    const templates = await Template.find({ orgId, isActive: true })
      .sort({ createdAt: -1 });
    
    res.json(templates);
  } catch (error) {
    console.error("Error fetching templates:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /templates/:templateId - Get specific template
router.get("/:templateId", async (req, res) => {
  try {
    const { templateId } = req.params;
    
    const template = await Template.findById(templateId);
    
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }
    
    res.json(template);
  } catch (error) {
    console.error("Error fetching template:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /templates - Create new template
router.post("/", async (req, res) => {
  try {
    const { orgId, name, description, subject, body, type, variables, createdBy } = req.body;
    
    if (!orgId || !name || !subject || !body) {
      return res.status(400).json({ 
        error: "orgId, name, subject, and body are required" 
      });
    }
    
    // Check if template name already exists for this org
    const existingTemplate = await Template.findOne({ orgId, name });
    if (existingTemplate) {
      return res.status(400).json({ 
        error: "Template name already exists for this organization" 
      });
    }
    
    const template = new Template({
      orgId,
      name,
      description,
      subject,
      body,
      type: type || "email",
      variables: variables || [],
      createdBy: createdBy || "admin"
    });
    
    await template.save();
    
    res.status(201).json(template);
  } catch (error) {
    console.error("Error creating template:", error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /templates/:templateId - Update template
router.patch("/:templateId", async (req, res) => {
  try {
    const { templateId } = req.params;
    const updates = req.body;
    
    // Remove fields that shouldn't be updated directly
    delete updates.orgId;
    delete updates.usageCount;
    delete updates.lastUsed;
    
    const template = await Template.findByIdAndUpdate(
      templateId,
      updates,
      { new: true, runValidators: true }
    );
    
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }
    
    res.json(template);
  } catch (error) {
    console.error("Error updating template:", error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /templates/:templateId - Soft delete template
router.delete("/:templateId", async (req, res) => {
  try {
    const { templateId } = req.params;
    
    const template = await Template.findByIdAndUpdate(
      templateId,
      { isActive: false },
      { new: true }
    );
    
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }
    
    res.json({ message: "Template deleted successfully" });
  } catch (error) {
    console.error("Error deleting template:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /templates/:templateId/use - Increment usage count
router.post("/:templateId/use", async (req, res) => {
  try {
    const { templateId } = req.params;
    
    const template = await Template.findByIdAndUpdate(
      templateId,
      { 
        $inc: { usageCount: 1 },
        lastUsed: new Date()
      },
      { new: true }
    );
    
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }
    
    res.json(template);
  } catch (error) {
    console.error("Error updating template usage:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
