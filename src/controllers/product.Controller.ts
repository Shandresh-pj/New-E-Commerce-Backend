import {
  Request,
  Response,
  NextFunction,
} from "express";

import {
  Controller,
  Post,
  Get,
  Delete,
  Middleware,
  Swagger,
} from "../decorators";

import { dataSource } from "../server";
import { uploadAny } from "../utils/upload";
import { Product } from "../entities/products";
import validate from "../middleware/validate";
import { Put } from "../decorators/put";
import { ScanProductDto } from "../dto";

@Controller("/products")
export class ProductController {

  // ================= CREATE =================
  @Post("/create")
  @Middleware([
    uploadAny.upload.fields([
      { name: "image", maxCount: 1 },
      { name: "images", maxCount: 10 },
      { name: "video", maxCount: 1 },
    ]),
    uploadAny.compressor,
  ])
  @Swagger("Create Product", "Create product with images and video")
  async create(req: Request, res: Response, next: NextFunction) {

    const qr = dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {

      const repo = qr.manager.getRepository(Product);

      const {
        name,
        description,
        price,
        barcode,
        stock,
        category,
        registration_id,
      } = req.body;

      const files = req as any;

      const image = files.files?.image?.[0]
        ? `/uploads/images/${files.files.image[0].filename}`
        : undefined;

      const video = files.files?.video?.[0]
        ? `/uploads/videos/${files.files.video[0].filename}`
        : undefined;

      const images = files.files?.images?.length
        ? files.files.images.map(
            (f: any) => `/uploads/images/${f.filename}`
          )
        : [];

      const product = repo.create({
        name,
        description,
        price,
        stock,
        barcode,
        category,
        registration_id,
        image,
        images,
        video,
      });

      await repo.save(product);

      await qr.commitTransaction();

      return res.json({
        success: true,
        message: "Product created",
        data: product,
      });

    } catch (err) {
      await qr.rollbackTransaction();
      next(err);
    } finally {
      await qr.release();
    }
  }

  // ================= SCAN BARCODE / QR =================
  @Post("/scan")
@Middleware([validate(ScanProductDto)])
@Swagger("Scan Product", "Scan barcode or QR to verify product")
async scan(req: Request, res: Response, next: NextFunction) {

  try {

    const repo = dataSource.getRepository(Product);

    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Code is required",
      });
    }

    // FIXED QUERY (safe + compatible)
    const product = await repo
      .createQueryBuilder("product")
      .where("product.barcode = :code", { code })
      .orWhere("product.qr_code = :code", { code })
      .getOne();

    if (!product) {
      return res.status(404).json({
        success: false,
        verified: false,
        message: "Invalid barcode / QR code",
      });
    }

    return res.json({
      success: true,
      verified: true,
      message: "Product verified successfully",
      data: product,
    });

  } catch (err) {
    next(err);
  }
}

  // ================= GET ALL =================
  @Get("/")
  async getAll(req: Request, res: Response) {

    const repo = dataSource.getRepository(Product);

    const data = await repo.find({
      relations: { couponProducts: true, creator: true, },
      order: { id: "DESC" },
    });

    return res.json({
      success: true,
      data,
    });
  }

  // ================= GET BY ID =================
  @Get("/:id")
  async getById(req: Request, res: Response) {

    const repo = dataSource.getRepository(Product);

    const data = await repo.findOne({
      where: { id: Number(req.params.id) },
      relations: { couponProducts: true, creator: true, },
    });

    return res.json({
      success: true,
      data,
    });
  }

  // ================= UPDATE =================
  @Put("/:id")
  @Middleware([
    uploadAny.upload.fields([
      { name: "image", maxCount: 1 },
      { name: "images", maxCount: 10 },
      { name: "video", maxCount: 1 },
    ]),
    uploadAny.compressor,
  ])
  async update(req: Request, res: Response) {

    const repo = dataSource.getRepository(Product);

    const product = await repo.findOneBy({
      id: Number(req.params.id),
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const files = req as any;

    product.name = req.body.name ?? product.name;
    product.description = req.body.description ?? product.description;
    product.price = req.body.price ?? product.price;
    product.barcode = req.body.barcode ?? product.barcode;

    if (files.files?.image) {
      product.image = `/uploads/images/${files.files.image[0].filename}`;
    }

    if (files.files?.video) {
      product.video = `/uploads/videos/${files.files.video[0].filename}`;
    }

    if (files.files?.images) {
      const newImages = files.files.images.map(
        (f: any) => `/uploads/images/${f.filename}`
      );
      product.images = [...(product.images || []), ...newImages];
    }

    await repo.save(product);

    return res.json({
      success: true,
      message: "Updated successfully",
      data: product,
    });
  }

  // ================= DELETE =================
  @Delete("/:id")
  async delete(req: Request, res: Response) {

    const repo = dataSource.getRepository(Product);

    await repo.delete(req.params.id);

    return res.json({
      success: true,
      message: "Deleted",
    });
  }

 // ================== BarCode Verify ============
 
// ================= SCAN BARCODE / QR =================

}