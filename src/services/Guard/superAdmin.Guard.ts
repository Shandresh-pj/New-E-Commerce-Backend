export const superAdminGuard = (
  req: any,
  res: any,
  next: any
) => {

  if (!req.user?.isSuperAdmin) {

    return res.status(403).json({
      success: false,
      message: "Super Admin only"
    });

  }

  next();

};