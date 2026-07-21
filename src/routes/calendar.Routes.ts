import { Router } from "express";
import { CalendarController } from "../controllers/calendar.controller";
import authenticateMiddleware from "../middleware/authenticate.middleware";

const router = Router();

router.get("/calendar/holidays", authenticateMiddleware, CalendarController.getHolidays);
router.post("/calendar/holidays", authenticateMiddleware, CalendarController.createHoliday);
router.put("/calendar/holidays/:id", authenticateMiddleware, CalendarController.updateHoliday);
router.delete("/calendar/holidays/:id", authenticateMiddleware, CalendarController.deleteHoliday);

export default router;
