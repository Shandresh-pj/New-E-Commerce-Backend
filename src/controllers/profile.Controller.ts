import bcrypt from "bcrypt";
import {
Request,
Response
} from "express";

import {
Controller,
Post,
Get,
Put,
Delete,
Middleware
} from "../decorators";

import authenticateMiddleware
from "../middleware/authenticate.middleware";

import dataSource from "../config/database";

import { User } from "../entities/user";
import { UserAddress } from "../entities/userAddress";
import { Register } from "../entities/register";

import {
CreateProfileDto,
UpdateProfileDto
} from "../dto";

import validate from "../middleware/validate";

@Controller("/profile")
export class ProfileController{


// =====================================
// CREATE
// =====================================

@Post("/")
@Middleware([
authenticateMiddleware,
validate(CreateProfileDto)
])
public async create(
req:any,
res:any
){

try{

const repo=
dataSource.getRepository(
User
);

const exists=
await repo.findOne({

where:{
email:req.body.email
}

});

if(exists){

return res.status(400)
.json({

success:false,
message:"Email already exists"

});

}

const hashedPassword=
await bcrypt.hash(
req.body.password,
12
);

const imgFile = req.files && !Array.isArray(req.files) ? ((req.files as any)['image']?.[0] || (req.files as any)['profile_image']?.[0]) : req.file;
const bgFile = req.files && !Array.isArray(req.files) ? ((req.files as any)['background_image']?.[0] || (req.files as any)['cover_image']?.[0]) : undefined;

const image = imgFile ? `/uploads/images/${imgFile.filename}` : undefined;
const background_image = bgFile ? `/uploads/images/${bgFile.filename}` : req.body.background_image;

const user=
repo.create({

name:req.body.name,

email:req.body.email,

password:hashedPassword,

mobilenumber:req.body.mobilenumber,

address:req.body.address,

status:req.body.status,

image:image,

background_image:background_image

});

const saved=
await repo.save(user);

const{
password,
...safeUser
}=saved;

return res.status(201)
.json({

success:true,
message:"Profile created successfully",
data:safeUser

});

}
catch(error:any){

return res.status(500)
.json({

success:false,
message:error.message

});

}

}


// =====================================
// GET BY ID
// =====================================

@Get("/:id")
@Middleware([
authenticateMiddleware
])
  public async getById(
    req: any,
    res: any
  ) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized"
        });
      }

      const userId = Number(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid user id"
        });
      }

      const { Register } = require("../entities/register");
      let repo = dataSource.getRepository(User);
      let isCustomer = false;

      if (req.user && req.user.id === userId) {
        isCustomer = req.user.userType === "Customer";
      } else {
        const existsInUser = await repo.findOne({ where: { id: userId } });
        if (!existsInUser) {
          isCustomer = true;
        }
      }

      if (isCustomer) {
        repo = dataSource.getRepository(Register) as any;
      }

      const user = await repo.findOne({
        where: { id: userId }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      if (
        !req.user?.isSuperAdmin &&
        req.user?.id !== user.id
      ) {
        return res.status(403).json({
          success: false,
          message: "Forbidden"
        });
      }

      const {
        password,
        verificationToken,
        resetPasswordToken,
        ...safeUser
      } = user as any;

      return res.status(200).json({
        success: true,
        data: safeUser
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

// =====================================
// GET ALL
// =====================================

@Get("/")
@Middleware([
authenticateMiddleware
])
public async getAll(
req:any,
res:any
){

try{

const userType = req.user?.userType || req.user?.user_type;
if (userType === "Customer") {
  const { Register } = require("../entities/register");
  const registerRepo = dataSource.getRepository(Register);
  const registerUser = await registerRepo.findOne({
    where: { id: req.user.id }
  });

  if (registerUser) {
    const { password, ...safeUser } = registerUser;
    return res.json({
      success: true,
      page: 1,
      limit: 1,
      total: 1,
      data: [safeUser]
    });
  } else {
    return res.json({
      success: true,
      page: 1,
      limit: 1,
      total: 0,
      data: []
    });
  }
}

const repo=
dataSource.getRepository(
User
);

const page=
Math.max(
1,
Number(req.query.page)||1
);

const limit=
Math.min(
50,
Number(req.query.limit)||10
);

const [users,total]=
await repo.findAndCount({

skip:
(page-1)*limit,

take:
limit,

order:{
id:"DESC"
}

});


const safeUsers=
users.map(

({password,...rest})=>rest

);

return res.json({

success:true,

page,
limit,
total,

data:safeUsers

});

}
catch(error:any){

return res.status(500)
.json({

success:false,
message:error.message

});

}

}


// =====================================
// UPDATE
// =====================================

  @Put("/:id")
  @Middleware([
    authenticateMiddleware,
    validate(UpdateProfileDto)
  ])
  public async update(
    req: any,
    res: any
  ) {
    try {
      const userId = Number(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid user id"
        });
      }

      const { Register } = require("../entities/register");
      let repo = dataSource.getRepository(User);
      let isCustomer = false;

      if (req.user && req.user.id === userId) {
        isCustomer = req.user.userType === "Customer";
      } else {
        const existsInUser = await repo.findOne({ where: { id: userId } });
        if (!existsInUser) {
          isCustomer = true;
        }
      }

      if (isCustomer) {
        repo = dataSource.getRepository(Register) as any;
      }

      const user = await repo.findOne({
        where: { id: userId }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      // self or super admin
      if (
        !req.user.isSuperAdmin &&
        req.user.id !== user.id
      ) {
        return res.status(403).json({
          success: false,
          message: "Forbidden"
        });
      }

      const emailExists = await repo.findOne({
        where: { email: req.body.email }
      });

      if (
        emailExists &&
        emailExists.id !== user.id
      ) {
        return res.status(400).json({
          success: false,
          message: "Email already exists"
        });
      }

      const imgFile = req.files && !Array.isArray(req.files) ? ((req.files as any)['image']?.[0] || (req.files as any)['profile_image']?.[0]) : req.file;
      const bgFile = req.files && !Array.isArray(req.files) ? ((req.files as any)['background_image']?.[0] || (req.files as any)['cover_image']?.[0]) : undefined;

      const image = imgFile
        ? `/uploads/images/${imgFile.filename}`
        : (req.body.image !== undefined ? req.body.image : user.image);

      const background_image = bgFile
        ? `/uploads/images/${bgFile.filename}`
        : (req.body.background_image !== undefined ? req.body.background_image : user.background_image);

      const updateData: any = {
        name: req.body.name,
        email: req.body.email,
        mobilenumber: req.body.mobilenumber,
        address: req.body.address,
        status: req.body.status,
        image: image,
      };

      if (!isCustomer) {
        updateData.background_image = background_image;
      }

      repo.merge(user, updateData);

      const updated = await repo.save(user);

      const {
        password,
        ...safeUser
      } = updated as any;

      return res.json({
        success: true,
        message: "Updated successfully",
        data: safeUser
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

@Delete("/:id")
@Middleware([
authenticateMiddleware
])
  public async delete(
    req: any,
    res: any
  ) {
    try {
      if (!req.user.isSuperAdmin) {
        return res.status(403).json({
          success: false,
          message: "Only Super Admin"
        });
      }

      const userId = Number(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid user id"
        });
      }

      const { Register } = require("../entities/register");
      let repo = dataSource.getRepository(User);
      let isCustomer = false;

      const existsInUser = await repo.findOne({ where: { id: userId } });
      if (!existsInUser) {
        isCustomer = true;
      }

      if (isCustomer) {
        repo = dataSource.getRepository(Register) as any;
      }

      const result = await repo.delete(userId);

      if (!result.affected) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      return res.json({
        success: true,
        message: "Deleted successfully"
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // =====================================
  // ADDRESS MANAGEMENT METHODS
  // =====================================

  public async getAddresses(req: any, res: Response, next: any) {
    try {
      const userId = Number(req.user?.id || req.user?.userId || req.user?.user_id);
      if (!userId || isNaN(userId)) {
        return res.status(401).json({ success: false, message: "Unauthorized or invalid user session" });
      }

      const addresses = await dataSource.getRepository(UserAddress).find({
        where: { userId },
        order: { isDefault: "DESC", created_at: "DESC" },
      });

      return res.json({
        success: true,
        message: "Addresses fetched successfully",
        data: addresses,
      });
    } catch (error) {
      next(error);
    }
  }

  public async addAddress(req: any, res: Response, next: any) {
    try {
      const userId = Number(req.user?.id || req.user?.userId || req.user?.user_id);
      if (!userId || isNaN(userId)) {
        return res.status(401).json({ success: false, message: "Unauthorized or invalid user session" });
      }

      const { label, name, phone, line1, line2, city, state, pincode, isDefault, receiver_type, receiverType } = req.body;

      if (!name || !phone || !line1 || !city || !state || !pincode) {
        return res.status(400).json({ success: false, message: "Missing required address fields" });
      }

      // Check if user exists in Register or User table
      const registerRepo = dataSource.getRepository(Register);
      const userRepo = dataSource.getRepository(User);

      const customerExists = await registerRepo.findOne({ where: { id: userId } });
      const internalUserExists = customerExists ? null : await userRepo.findOne({ where: { id: userId } });

      if (!customerExists && !internalUserExists) {
        return res.status(404).json({ success: false, message: "User account not found" });
      }

      const repository = dataSource.getRepository(UserAddress);

      if (isDefault) {
        await repository.update({ userId }, { isDefault: false });
      }

      const address = repository.create({
        userId,
        label: label || "Home",
        name,
        phone,
        line1,
        line2: line2 || "",
        city,
        state,
        pincode,
        isDefault: !!isDefault,
        receiverType: receiver_type || receiverType || "myself",
      });

      await repository.save(address);

      return res.status(201).json({
        success: true,
        message: "Address saved successfully",
        data: address,
      });
    } catch (error) {
      next(error);
    }
  }

  public async updateAddress(req: any, res: Response, next: any) {
    try {
      const userId = Number(req.user?.id || req.user?.userId || req.user?.user_id);
      const addressId = Number(req.params.id);

      if (!userId || isNaN(userId)) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      if (!addressId || isNaN(addressId)) {
        return res.status(400).json({ success: false, message: "Invalid address ID" });
      }

      const { label, name, phone, line1, line2, city, state, pincode, isDefault, receiver_type, receiverType } = req.body;
      const repository = dataSource.getRepository(UserAddress);

      const address = await repository.findOne({
        where: { id: addressId, userId },
      });

      if (!address) {
        return res.status(404).json({ success: false, message: "Address not found" });
      }

      if (isDefault) {
        await repository.update({ userId }, { isDefault: false });
      }

      await repository.update(addressId, {
        label: label || address.label,
        name: name || address.name,
        phone: phone || address.phone,
        line1: line1 || address.line1,
        line2: line2 ?? address.line2,
        city: city || address.city,
        state: state || address.state,
        pincode: pincode || address.pincode,
        isDefault: isDefault !== undefined ? !!isDefault : address.isDefault,
        receiverType: receiver_type || receiverType || address.receiverType,
      });

      const updated = await repository.findOneBy({ id: addressId });

      return res.json({
        success: true,
        message: "Address updated successfully",
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  public async deleteAddress(req: any, res: Response, next: any) {
    try {
      const userId = Number(req.user?.id || req.user?.userId || req.user?.user_id);
      const addressId = Number(req.params.id);

      if (!userId || isNaN(userId)) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      if (!addressId || isNaN(addressId)) {
        return res.status(400).json({ success: false, message: "Invalid address ID" });
      }

      const repository = dataSource.getRepository(UserAddress);
      const result = await repository.delete({
        id: addressId,
        userId,
      });

      if (!result.affected) {
        return res.status(404).json({ success: false, message: "Address not found" });
      }

      return res.json({ success: true, message: "Address deleted successfully" });
    } catch (error) {
      next(error);
    }
  }

  public async setDefaultAddress(req: any, res: Response, next: any) {
    try {
      const userId = Number(req.user?.id || req.user?.userId || req.user?.user_id);
      const addressId = Number(req.params.id);

      if (!userId || isNaN(userId)) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      if (!addressId || isNaN(addressId)) {
        return res.status(400).json({ success: false, message: "Invalid address ID" });
      }

      const repository = dataSource.getRepository(UserAddress);
      const address = await repository.findOne({
        where: { id: addressId, userId },
      });

      if (!address) {
        return res.status(404).json({ success: false, message: "Address not found" });
      }

      await repository.update({ userId }, { isDefault: false });
      await repository.update(addressId, { isDefault: true });

      return res.json({ success: true, message: "Default address updated successfully" });
    } catch (error) {
      next(error);
    }
  }
}