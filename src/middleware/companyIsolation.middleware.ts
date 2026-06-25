export const companyIsolation = (req: any, res: any, next: any) => {

  if (!req.user.companyId && !req.user.isSuperAdmin) {
    return res.status(403).json({
      message: "Company access denied"
    });
  }

  req.companyId = req.user.companyId;
  next();
};