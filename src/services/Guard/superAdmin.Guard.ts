export const superAdminGuard = (req: any, res: any, next: any) => {
  if (req.user.isSuperAdmin) return next();

  return res.status(403).json({ message: "Super Admin only" });
};