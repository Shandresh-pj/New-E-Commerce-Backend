export const permissionGuard = (menu: string, action: string) => {
  return (req: any, res: any, next: any) => {

    if (req.user.isSuperAdmin) return next();

    const permissions = req.user.permissions || [];

    const allowed = permissions.some(
      (p: any) =>
        p.menu === menu &&
        p.permission === action
    );

    if (!allowed) {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    next();
  };
};