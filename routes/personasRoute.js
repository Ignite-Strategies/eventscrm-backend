import express from 'express';
import { getPrismaClient } from '../config/database.js';

const router = express.Router();
const prisma = getPrismaClient();

// GET /api/personas - Get all personas for org
router.get("/", async (req, res) => {
  try {
    const { orgId } = req.query;
    
    if (!orgId) {
      return res.status(400).json({ error: "orgId is required" });
    }

    const personas = await prisma.persona.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            googleAdCampaigns: true,
            engagementActions: true
          }
        }
      }
    });

    res.json(personas);
  } catch (error) {
    console.error("❌ Error fetching personas:", error);
    res.status(500).json({ error: "Failed to fetch personas" });
  }
});

// GET /api/personas/:id - Get single persona
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { orgId } = req.query;

    const persona = await prisma.persona.findFirst({
      where: { id, orgId },
      include: {
        googleAdCampaigns: {
          select: {
            id: true,
            name: true,
            status: true,
            createdAt: true
          }
        },
        engagementActions: {
          select: {
            id: true,
            type: true,
            status: true,
            createdAt: true
          },
          orderBy: { createdAt: "desc" },
          take: 10
        }
      }
    });

    if (!persona) {
      return res.status(404).json({ error: "Persona not found" });
    }

    res.json(persona);
  } catch (error) {
    console.error("❌ Error fetching persona:", error);
    res.status(500).json({ error: "Failed to fetch persona" });
  }
});

// POST /api/personas - Create new persona
router.post("/", async (req, res) => {
  try {
    const {
      orgId,
      personaName,
      demographics,
      painPoint,
      desire,
      motivators,
      barriers,
      tone,
      channels,
      primaryStage,
      notes
    } = req.body;

    // Validation
    if (!orgId || !personaName || !demographics || !painPoint || !desire || !tone || !channels || !primaryStage) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const persona = await prisma.persona.create({
      data: {
        orgId,
        personaName,
        demographics,
        painPoint,
        desire,
        motivators: motivators || "",
        barriers: barriers || "",
        tone,
        channels,
        primaryStage,
        notes: notes || ""
      }
    });

    console.log(`✅ Persona created: ${persona.personaName} (${persona.id})`);
    res.status(201).json(persona);
  } catch (error) {
    console.error("❌ Error creating persona:", error);
    res.status(500).json({ error: "Failed to create persona" });
  }
});

// PATCH /api/personas/:id - Update persona
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      orgId,
      personaName,
      demographics,
      painPoint,
      desire,
      motivators,
      barriers,
      tone,
      channels,
      primaryStage,
      notes
    } = req.body;

    // Verify ownership
    const existing = await prisma.persona.findFirst({
      where: { id, orgId }
    });

    if (!existing) {
      return res.status(404).json({ error: "Persona not found" });
    }

    const persona = await prisma.persona.update({
      where: { id },
      data: {
        personaName,
        demographics,
        painPoint,
        desire,
        motivators,
        barriers,
        tone,
        channels,
        primaryStage,
        notes
      }
    });

    console.log(`✅ Persona updated: ${persona.personaName} (${persona.id})`);
    res.json(persona);
  } catch (error) {
    console.error("❌ Error updating persona:", error);
    res.status(500).json({ error: "Failed to update persona" });
  }
});

// DELETE /api/personas/:id - Delete persona
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { orgId } = req.query;

    // Verify ownership
    const existing = await prisma.persona.findFirst({
      where: { id, orgId }
    });

    if (!existing) {
      return res.status(404).json({ error: "Persona not found" });
    }

    await prisma.persona.delete({
      where: { id }
    });

    console.log(`✅ Persona deleted: ${id}`);
    res.json({ message: "Persona deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting persona:", error);
    res.status(500).json({ error: "Failed to delete persona" });
  }
});

export default router;

