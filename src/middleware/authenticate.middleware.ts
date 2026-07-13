import jwt from "jsonwebtoken";
import { UserType } from "../utils/Role-Access";

const authenticateMiddleware = (req: any, res: any, next: any) => {

  try {

    const auth = req.headers.authorization;

    if (!auth || !auth.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const token = auth.split(" ")[1];
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error("❌ [Auth] JWT_SECRET is not set. All authenticated requests will fail.");
      return res.status(500).json({ success: false, message: "Server configuration error" });
    }
    const decoded: any = jwt.verify(token, jwtSecret);

    if (decoded.type === "refresh") {
      console.log("[Auth Middleware] Rejected: Token is a refresh token");
      return res.status(401).json({ success: false, message: "Invalid token type" });
    }

    req.user = {
      // handle both login JWT (userId) and select-context JWT (user_id)
      userId:      decoded.userId    ?? decoded.user_id,
      companyId:   decoded.company_id ?? decoded.companyId,
      branchId:    decoded.branch_id  ?? decoded.branchId,
      roleId:      decoded.role_id    ?? decoded.roleId,
      userType:    decoded.userType,
      roles:       decoded.roles       || [],
      permissions: decoded.permissions || [],
      isSuperAdmin:
        decoded.isSuperAdmin === true ||
        decoded.userType === UserType.SUPER_ADMIN,
    };

    next();

  } catch {

    return res.status(401).json({ success: false, message: "Invalid token" });

  }

};

export default authenticateMiddleware;