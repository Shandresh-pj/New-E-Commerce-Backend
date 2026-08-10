import { Router } from "express";
import { CalendarController } from "../controllers/calendar.controller";
import authenticateMiddleware from "../middleware/authenticate.middleware";

const router = Router();

/**
 * @swagger
 * /calendar/holidays:
 *   get:
 *     summary: List Company Holidays
 *     description: Retrieve list of public holidays and company events.
 *     tags: [Calendar]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *           example: 2026
 *     responses:
 *       200:
 *         description: Holiday list retrieved successfully
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/calendar/holidays", authenticateMiddleware, CalendarController.getHolidays);

/**
 * @swagger
 * /calendar/holidays:
 *   post:
 *     summary: Create Holiday Event
 *     description: Add a new company holiday or event to the calendar.
 *     tags: [Calendar]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - date
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Independence Day"
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2026-08-15"
 *               description:
 *                 type: string
 *                 example: "National holiday"
 *     responses:
 *       201:
 *         description: Holiday created
 *       400:
 *         $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/calendar/holidays", authenticateMiddleware, CalendarController.createHoliday);

/**
 * @swagger
 * /calendar/holidays/{id}:
 *   put:
 *     summary: Update Holiday Event
 *     description: Modify details of an existing holiday event.
 *     tags: [Calendar]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Holiday updated successfully
 *       404:
 *         $ref: '#/components/schemas/ErrorResponse'
 */
router.put("/calendar/holidays/:id", authenticateMiddleware, CalendarController.updateHoliday);

/**
 * @swagger
 * /calendar/holidays/{id}:
 *   delete:
 *     summary: Delete Holiday Event
 *     description: Remove a holiday event from the company calendar.
 *     tags: [Calendar]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Holiday deleted
 *       404:
 *         $ref: '#/components/schemas/ErrorResponse'
 */
router.delete("/calendar/holidays/:id", authenticateMiddleware, CalendarController.deleteHoliday);

export default router;
