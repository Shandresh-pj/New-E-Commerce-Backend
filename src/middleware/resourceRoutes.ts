import { Request, Response, NextFunction } from "express";
import { Global } from "../global";
// import Global from "../global";

const publicResourceRouteCheck = (
  req: Request,
  res: Response,
  next: NextFunction
): Response | void => {
  try {
    const langCodes: string[] = Object.keys(Global.lang || {});

    let newUrl: string = req.originalUrl;

    // Remove language codes from URL
    langCodes.forEach((lang: string) => {
      const regex = new RegExp(`/${lang}`, "g");
      newUrl = newUrl.replace(regex, "");
    });

    // Remove query string
    newUrl = newUrl.split("?")[0];

    console.log("Checking Route:", newUrl);

    if (
      Array.isArray(Global.publicApiUrl) &&
      Global.publicApiUrl.includes(newUrl)
    ) {
      return next();
    }

    return res.status(404).json({
      success: false,
      message: "Route resource not found. Please check.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Middleware Error",
      error: error instanceof Error ? error.message : "Unknown Error",
    });
  }
};

export default publicResourceRouteCheck;