import { Request, Response } from "express";
import dataSource from "../config/database";
import { Raw } from "typeorm";
import { Controller, Get, Post, Put, Delete, Middleware, Swagger } from "../decorators";
import validate from "../middleware/validate";
import { CreateUnitOptionDto, UpdateUnitOptionDto } from "../dto/unitOption.dto";
import { UnitOption } from "../entities/unitOption.entity";
import { UnitCategory } from "../entities/unit.entity";

const DEFAULT_UNITS = [
  { name: 'Piece', symbol: 'pc', category: UnitCategory.COUNT },
  { name: 'Kg', symbol: 'kg', category: UnitCategory.WEIGHT },
  { name: 'Gram', symbol: 'g', category: UnitCategory.WEIGHT },
  { name: 'Ton', symbol: 't', category: UnitCategory.WEIGHT },
  { name: 'Liter', symbol: 'l', category: UnitCategory.VOLUME },
  { name: 'ml', symbol: 'ml', category: UnitCategory.VOLUME },
  { name: 'Box', symbol: 'box', category: UnitCategory.COUNT },
  { name: 'Packet', symbol: 'pkt', category: UnitCategory.COUNT },
  { name: 'Carton', symbol: 'ctn', category: UnitCategory.COUNT },
  { name: 'Dozen', symbol: 'doz', category: UnitCategory.COUNT },
  { name: 'Bundle', symbol: 'bdl', category: UnitCategory.COUNT },
  { name: 'Roll', symbol: 'roll', category: UnitCategory.COUNT },
  { name: 'Meter', symbol: 'm', category: UnitCategory.LENGTH },
  { name: 'Feet', symbol: 'ft', category: UnitCategory.LENGTH }
];

@Controller("/unit-options")
export class UnitOptionController {
  private get repo() {
    return dataSource.getRepository(UnitOption);
  }

  private async ensureSeedData() {
    try {
      const existingUnits = await this.repo.find();
      const existingNames = new Set(existingUnits.map(u => (u.name || '').trim().toLowerCase()));
      const existingSymbols = new Set(existingUnits.map(u => (u.symbol || '').trim().toLowerCase()));

      const missingUnits = DEFAULT_UNITS.filter(
        u => !existingNames.has(u.name.trim().toLowerCase()) &&
             !existingSymbols.has(u.symbol.trim().toLowerCase())
      );

      if (missingUnits.length > 0) {
        const unitsToCreate = missingUnits.map(u => this.repo.create({ ...u, status: true }));
        await this.repo.save(unitsToCreate);
      }
    } catch (err) {
      console.error("[UnitOptionController] Error seeding default units:", err);
    }
  }

  // ==========================================
  // SEED / RESTORE DEFAULT UNITS
  // ==========================================
  @Post("/seed-defaults")
  @Swagger("Seed Default Unit Options", "Auto-create missing standard default unit options")
  async seedDefaults(req: Request, res: Response) {
    try {
      const existingUnits = await this.repo.find();
      const existingNames = new Set(existingUnits.map(u => (u.name || '').trim().toLowerCase()));
      const existingSymbols = new Set(existingUnits.map(u => (u.symbol || '').trim().toLowerCase()));

      const missingUnits = DEFAULT_UNITS.filter(
        u => !existingNames.has(u.name.trim().toLowerCase()) &&
             !existingSymbols.has(u.symbol.trim().toLowerCase())
      );

      if (missingUnits.length > 0) {
        const unitsToCreate = missingUnits.map(u => this.repo.create({ ...u, status: true }));
        const created = await this.repo.save(unitsToCreate);
        return res.status(201).json({
          success: true,
          message: `Successfully seeded ${created.length} default unit(s)`,
          data: created
        });
      }

      return res.json({
        success: true,
        message: "All default units are already present in the database",
        data: []
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: "Failed to seed default unit options",
        error: error.message
      });
    }
  }


  // ==========================================
  // GET ALL UNIT OPTIONS
  // ==========================================
  @Get("/")
  @Swagger("Get All Unit Options", "Retrieve list of all master unit options (auto-seeds defaults if empty)")
  async getAll(req: Request, res: Response) {
    try {
      await this.ensureSeedData();
      const units = await this.repo.find({
        order: { id: "ASC" }
      });
      return res.json({
        success: true,
        data: units
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch unit options",
        error: error.message
      });
    }
  }

  // ==========================================
  // GET UNIT OPTION BY ID
  // ==========================================
  @Get("/:id")
  @Swagger("Get Unit Option By ID", "Retrieve unit option details by ID")
  async getOne(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const unit = await this.repo.findOne({ where: { id } });
      if (!unit) {
        return res.status(404).json({
          success: false,
          message: "Unit option not found"
        });
      }
      return res.json({
        success: true,
        data: unit
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: "Error fetching unit option",
        error: error.message
      });
    }
  }

  // ==========================================
  // CREATE UNIT OPTION
  // ==========================================
  @Post("/create")
  @Middleware([validate(CreateUnitOptionDto)])
  @Swagger("Create Unit Option", "Create a new unit option")
  async create(req: Request, res: Response) {
    try {
      const name = String(req.body.name || "").trim();
      const symbol = String(req.body.symbol || "").trim();
      const category = req.body.category as UnitCategory;

      if (!name || !symbol || !category) {
        return res.status(400).json({
          success: false,
          message: "Name, symbol, and category are required"
        });
      }

      const existingName = await this.repo.findOne({
        where: { name: Raw(alias => `LOWER(${alias}) = :name`, { name: name.toLowerCase() }) }
      });

      if (existingName) {
        return res.status(400).json({
          success: false,
          message: `Unit with name '${name}' already exists`
        });
      }

      const newUnit = this.repo.create({
        name,
        symbol,
        category,
        status: req.body.status !== undefined ? Boolean(req.body.status) : true
      });

      await this.repo.save(newUnit);

      return res.status(201).json({
        success: true,
        message: "Unit option created successfully",
        data: newUnit
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: "Failed to create unit option",
        error: error.message
      });
    }
  }

  // ==========================================
  // UPDATE UNIT OPTION
  // ==========================================
  @Put("/:id")
  @Middleware([validate(UpdateUnitOptionDto)])
  @Swagger("Update Unit Option", "Modify an existing unit option by ID")
  async update(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const unit = await this.repo.findOne({ where: { id } });

      if (!unit) {
        return res.status(404).json({
          success: false,
          message: "Unit option not found"
        });
      }

      if (req.body.name) {
        const name = String(req.body.name).trim();
        const existingName = await this.repo.findOne({
          where: { name: Raw(alias => `LOWER(${alias}) = :name`, { name: name.toLowerCase() }) }
        });
        if (existingName && existingName.id !== id) {
          return res.status(400).json({
            success: false,
            message: `Another unit with name '${name}' already exists`
          });
        }
        unit.name = name;
      }

      if (req.body.symbol) {
        unit.symbol = String(req.body.symbol).trim();
      }

      if (req.body.category) {
        unit.category = req.body.category;
      }

      if (req.body.status !== undefined) {
        unit.status = Boolean(req.body.status);
      }

      await this.repo.save(unit);

      return res.json({
        success: true,
        message: "Unit option updated successfully",
        data: unit
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: "Failed to update unit option",
        error: error.message
      });
    }
  }

  // ==========================================
  // TOGGLE STATUS
  // ==========================================
  @Put("/:id/status")
  @Swagger("Toggle Unit Option Status", "Enable or disable a unit option")
  async toggleStatus(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const unit = await this.repo.findOne({ where: { id } });

      if (!unit) {
        return res.status(404).json({
          success: false,
          message: "Unit option not found"
        });
      }

      unit.status = req.body.status !== undefined ? Boolean(req.body.status) : !unit.status;
      await this.repo.save(unit);

      return res.json({
        success: true,
        message: `Unit option status updated to ${unit.status ? "Active" : "Inactive"}`,
        data: unit
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: "Failed to update status",
        error: error.message
      });
    }
  }

  // ==========================================
  // DELETE UNIT OPTION
  // ==========================================
  @Delete("/:id")
  @Swagger("Delete Unit Option", "Remove a unit option by ID")
  async delete(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const unit = await this.repo.findOne({ where: { id } });

      if (!unit) {
        return res.status(404).json({
          success: false,
          message: "Unit option not found"
        });
      }

      await this.repo.remove(unit);

      return res.json({
        success: true,
        message: "Unit option deleted successfully"
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: "Failed to delete unit option",
        error: error.message
      });
    }
  }
}
