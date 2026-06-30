import {
  Controller,
  Post,
  Get,
  Delete,
  Middleware,
  Put
} from "../decorators";

import { dataSource } from "../server";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { RolePermission } from "../entities/role-access";
import { StatusType } from "../utils/Role-Access";
import { User } from "../entities/user";
import { approveGuard } from "../middleware/approve.middleware";


@Controller("/role-access")
export class RoleAccessController {

  // =====================================================
  // ASSIGN ROLE PERMISSION (CREATE)
  // =====================================================
  @Post("/")
  @Middleware([authenticateMiddleware])
  async create(req: any, res: any) {

    const { role_id, permission_id } = req.body;

    if (!role_id || !permission_id) {
      return res.status(400).json({
        success: false,
        message: "role_id & permission_id required"
      });
    }

    const repo = dataSource.getRepository(RolePermission);

    const exists = await repo.findOne({
      where: { role_id, permission_id }
    });

    if (exists) {
      return res.status(409).json({
        success: false,
        message: "Already assigned"
      });
    }

    const data = repo.create({ role_id, permission_id });

    await repo.save(data);

    return res.status(201).json({
      success: true,
      data
    });
  }


   // ==========================================
  // UPDATE ROLE PERMISSION
  // ==========================================

  @Put("/:id")
  @Middleware([authenticateMiddleware])
  async update(req: any, res: any) {

    const queryRunner =
      dataSource.createQueryRunner();

    await queryRunner.connect();

    await queryRunner.startTransaction();

    try {

      const id =
        Number(req.params.id);

      const {
        role_id,
        permission_id
      } = req.body;

      const repo =
        queryRunner.manager.getRepository(
          RolePermission
        );

      const record =
        await repo.findOne({

          where: {
            id
          }

        });

      if (!record) {

        await queryRunner.rollbackTransaction();

        return res.status(404).json({

          success: false,
          message:
            "Role access not found"

        });

      }

      const duplicate =
        await repo.findOne({

          where: {

            role_id,
            permission_id

          }

        });

      if (
        duplicate &&
        duplicate.id !== id
      ) {

        await queryRunner.rollbackTransaction();

        return res.status(409).json({

          success: false,
          message:
            "Already exists"

        });

      }

      record.role_id =
        role_id;

      record.permission_id =
        permission_id;

      await repo.save(
        record
      );

      await queryRunner.commitTransaction();

      return res.json({

        success: true,
        message:
          "Role access updated successfully",

        data: record

      });

    }
    catch (error: any) {

      await queryRunner.rollbackTransaction();

      return res.status(500).json({

        success: false,
        message:
          error.message

      });

    }
    finally {

      await queryRunner.release();

    }

  }


  // =====================================================
  // GET ALL ROLE ACCESS
  // =====================================================
  @Get("/")
  @Middleware([authenticateMiddleware])
  async getAll(req: any, res: any) {

    const data = await dataSource.getRepository(RolePermission).find({
      relations: {
        role: true,
        permission: {
          menu: true
        }
      },
      order: {
        id: "DESC"
      }
    });

    return res.json({
      success: true,
      count: data.length,
      data
    });
  }

  // =====================================================
  // GET BY ROLE ID
  // =====================================================
  @Get("/role/:role_id")
  @Middleware([authenticateMiddleware])
  async getByRole(req: any, res: any) {

    const role_id = Number(req.params.role_id);

    const data = await dataSource.getRepository(RolePermission).find({
      where: { role_id },
      relations: {
        role: true,
        permission: { menu: true }
      }
    });

    return res.json({
      success: true,
      count: data.length,
      data
    });
  }

  // =====================================================
  // DELETE ROLE PERMISSION
  // =====================================================
  @Delete("/:id")
  @Middleware([authenticateMiddleware])
  async delete(req: any, res: any) {

    const id = Number(req.params.id);

    const repo = dataSource.getRepository(RolePermission);

    const record = await repo.findOne({ where: { id } });

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Not found"
      });
    }

    await repo.remove(record);

    return res.json({
      success: true,
      message: "Deleted successfully"
    });
  }


  @Put("/:id/approve")
@Middleware([authenticateMiddleware,approveGuard()])
public async approve(req:any,res:any){

const repo = dataSource.getRepository(User);

const user = await repo.findOne({

where:{id:Number(req.params.id)}
});

if(!user){

return res.status(404).json({
success:false,
message:"User not found"
});

}

user.status=StatusType.ACTIVE;

await repo.save(user);

return res.json({
success:true,
message:"User approved successfully"
});

}
}