import { Request, Response, NextFunction } from "express";

export const userAccess = (
  userTypes: string[] = [],
  returnData: boolean = false
) => {
  return (
    req: Request & { user?: any },
    res: Response,
    next: NextFunction
  ): any => {
    const user = req.user;

    // Check UserType
    if (userTypes.includes(user?.UserType)) {
      if (returnData) return true;

      return next();
    }

    // Check special permission field
    if (
      userTypes.length > 0 &&
      user?.[userTypes[0]]
    ) {
      if (returnData) return true;

      return next();
    }

    if (returnData) return false;

    return res.status(403).json({
      success: false,
      message:
        "You don't have permission to access this resource",
    });
  };
};

export default userAccess;